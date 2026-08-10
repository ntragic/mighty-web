"""
train_ppo.py — 마이티 self-play PPO 학습 스캐폴드 (DGX Spark 타깃)

핵심 설계:
- 5좌석 전부가 동일 정책(파라미터 공유)으로 self-play → 제로섬 상금(/2000)이 보상
- 행동 마스킹된 카테고리 정책 + 가치 헤드, GAE(λ), PPO-clip
- 환경은 CPU(파이썬 엔진), 정책 추론/학습은 GPU(bf16) — Spark GB10에 적합
- 좌석별 궤적을 독립 에피소드로 취급 (에피소드 내 보상은 종료 시 1회)

사용:
  python train_ppo.py --smoke                       # CPU 동작 검증 (수 분)
  python train_ppo.py --envs 64 --updates 2000      # Spark 본 학습
  python train_ppo.py --resume ckpt/latest.pt
"""
from __future__ import annotations
import argparse, os, time, math
import numpy as np

import torch
import torch.nn as nn
import torch.nn.functional as F

from mighty_encode import (MightyEnv, OBS_DIM, ACTION_DIM, O_FDMODE, O_PHASE,
                           O_GIRUDA, aux_labels, conv_target, A_PLAY0, cidx,
                           idx_card, O_TOK, TOK_N, TOK_D, A_PLAY_JOKERCALL)


# ---------------- 모델 ----------------
class PolicyValueNet(nn.Module):
    def __init__(self, hidden=512, depth=3, aux_head=False, attn=False):
        super().__init__()
        # Phase B: 관측 끝의 트릭 토큰 블록을 [11,81]로 세워 소형 트랜스포머로
        # 인코딩하고, 풀링 벡터를 관측에 concat해 트렁크에 넣는다.
        self.use_attn = attn
        d_in = OBS_DIM
        if attn:
            dm = 64
            self.tok_proj = nn.Linear(TOK_D, dm)
            el = nn.TransformerEncoderLayer(dm, nhead=4, dim_feedforward=128,
                                            dropout=0.0, batch_first=True)
            self.tok_enc = nn.TransformerEncoder(el, num_layers=2)
            d_in = OBS_DIM + dm
        layers, d = [], d_in
        for _ in range(depth):
            layers += [nn.Linear(d, hidden), nn.ReLU()]
            d = hidden
        self.trunk = nn.Sequential(*layers)
        self.pi = nn.Linear(d, ACTION_DIM)
        self.v = nn.Linear(d, 1)
        # 보조 헤드: 프렌드 좌석(6) + 좌석×무늬 보유(16) + 좌석 잔여기루다(4) + 트릭 승자(5)
        self.aux = nn.Linear(d, 6) if aux_head else None
        self.aux_suit = nn.Linear(d, 16) if aux_head else None
        self.aux_trump = nn.Linear(d, 4) if aux_head else None
        self.aux_win = nn.Linear(d, 5) if aux_head else None
        # v9: 마이티/조커 보유 좌석 예측 (rel0..4) — 프렌드 선언 함의 소화 강제
        self.aux_mkey = nn.Linear(d, 5) if aux_head else None
        self.aux_jkey = nn.Linear(d, 5) if aux_head else None

    def _feat(self, obs):
        if not self.use_attn:
            return obs
        tok = obs[:, O_TOK:O_TOK + TOK_N * TOK_D].reshape(-1, TOK_N, TOK_D)
        h = self.tok_enc(self.tok_proj(tok)).mean(dim=1)
        return torch.cat([obs, h], dim=-1)

    def forward(self, obs, mask):
        h = self.trunk(self._feat(obs))
        logits = self.pi(h)
        logits = logits.masked_fill(~mask, -1e9)
        return logits, self.v(h).squeeze(-1)

    def forward_aux(self, obs, mask):
        h = self.trunk(self._feat(obs))
        logits = self.pi(h).masked_fill(~mask, -1e9)
        if self.aux is None:
            return logits, self.v(h).squeeze(-1), None
        return logits, self.v(h).squeeze(-1), {
            'friend': self.aux(h), 'suit': self.aux_suit(h),
            'trump': self.aux_trump(h), 'win': self.aux_win(h),
            'mkey': self.aux_mkey(h) if self.aux_mkey is not None else None,
            'jkey': self.aux_jkey(h) if self.aux_jkey is not None else None}


def team_diff(cp, decl, fr):
    """여당-야당 획득점 차 / 20 (주공 관점, 범위 [-1,1])"""
    ruling = cp[decl] + (cp[fr] if fr is not None else 0)
    return (ruling - (sum(cp) - ruling)) / 20.0


# ---------------- 롤아웃 수집 ----------------
class Collector:
    """N개 환경 병렬(단일 프로세스 배치 추론). Spark에선 --workers로 멀티프로세스 확장."""

    def __init__(self, n_envs, seed, device, config=None, shape=0.0, rule_random=False,
                 alloc=0.0, conv=0.0):
        self.conv = conv
        self.envs = [MightyEnv(config=config, seed=seed + i * 1_000_000,
                              rule_random=rule_random, rule_seed=seed + i)
                     for i in range(n_envs)]
        if alloc:
            for e in self.envs:
                e.alloc_on = True
        self.device = device
        self.shape = shape
        self.alloc = alloc
        self.states = [e.reset() for e in self.envs]           # (obs, mask, player)
        # 좌석·환경별 열린 궤적 버퍼
        self.open = [[[] for _ in range(5)] for _ in range(n_envs)]

    @torch.no_grad()
    def collect(self, net, n_steps, temperature=1.0):
        traj = []          # 완결 에피소드 조각: (obs, mask, act, logp, val, ret 자리)
        ep_prizes = []
        n_ep = n_redeal = 0
        steps = 0
        while steps < n_steps:
            obs = torch.as_tensor(np.stack([s[0] for s in self.states]),
                                  device=self.device)
            mask = torch.as_tensor(np.stack([s[1] for s in self.states]),
                                   device=self.device)
            logits, vals = net(obs, mask)
            dist = torch.distributions.Categorical(logits=logits / temperature)
            acts = dist.sample()
            logps = dist.log_prob(acts)
            acts_np = acts.cpu().numpy()
            logps_np = logps.float().cpu().numpy()
            vals_np = vals.float().cpu().numpy()

            for i, env in enumerate(self.envs):
                o, m, p = self.states[i]
                g_ = env.game
                is_play = g_.phase == 'play'
                cp = tuple(g_.play['capturedPoints']) if is_play else (0,) * 5
                sl, tl, mk, jk = aux_labels(g_, p)
                tno = g_.play['trickNo'] if is_play else -1
                ca = -1
                if self.conv and is_play:
                    ai_ = int(acts_np[i])
                    tc = conv_target(g_, p,
                                     idx_card(ai_ - A_PLAY0)
                                     if A_PLAY0 <= ai_ < A_PLAY0 + 52 else None,
                                     act_jcall=(ai_ == A_PLAY_JOKERCALL))
                    if tc is not None:
                        ca = A_PLAY0 + cidx(tc)
                rec_i = [o, m, int(acts_np[i]), float(logps_np[i]),
                         float(vals_np[i]), (cp, sl, tl, tno, ca, mk, jk)]
                self.open[i][p].append(rec_i)
                no, nm, np_, rew, done = env.step(int(acts_np[i]))
                # Phase A: 이 결정이 '아군 확정승 트릭에 비싼 카드' 였는가
                if self.alloc and env.alloc_flag is not None:
                    fseat, fw = env.alloc_flag
                    rec_i.append(bool(fw) and fseat == p)
                    env.alloc_flag = (None, False)
                elif self.alloc:
                    rec_i.append(False)
                steps += 1
                if done:
                    ep_prizes.append(rew * MightyEnv.PRIZE_SCALE)
                    g = env.game
                    decl = g.declarer
                    fr = g.friend if (g.friend is not None and g.friend != decl) else None
                    n_ep += 1
                    pl_T = getattr(g, 'play', None)   # 유찰 종료면 play 없음
                    n_redeal += (pl_T is None)        # 전원패스·딜미스창구 모두 포함
                    cp_T = tuple(pl_T['capturedPoints']) if pl_T else (0,) * 5
                    for seat in range(5):
                        segs = self.open[i][seat]
                        R = float(rew[seat])
                        ruling_side = (decl is not None and
                                       (seat == decl or seat == fr))
                        sign = 1.0 if ruling_side else -1.0
                        phi_T = sign * team_diff(cp_T, decl, fr) if decl is not None else 0.0
                        # 프렌드 상대좌석 라벨 (rel), 없으면 5
                        lab = 5 if fr is None else (fr - seat) % 5
                        role = 0 if seat == decl else (1 if seat == fr else 2)
                        winners = {t['trickNo']: t['winner']
                                   for t in (pl_T['history'] if pl_T else [])}
                        for rec in segs:
                            wflag = rec.pop() if self.alloc else False
                            cp_t, sl, tl, tno, ca, mk, jk = rec.pop()
                            phi_t = (sign * team_diff(cp_t, decl, fr)
                                     if decl is not None else 0.0)
                            w = winners.get(tno)
                            lw = -1 if w is None else (w - seat) % 5
                            # 종단보상 + 잠재함수 셰이핑(텔레스코핑 → 최적정책 불변)
                            traj.append(rec + [R + self.shape * (phi_T - phi_t)
                                               - (self.alloc if wflag else 0.0),
                                               role, lab, sl, tl, lw, ca, mk, jk])
                        self.open[i][seat] = []
                    self.states[i] = env.reset()
                else:
                    self.states[i] = (no, nm, np_)
        return traj, ep_prizes, (n_redeal / max(n_ep, 1))


# ---------------- PPO 업데이트 ----------------
def ppo_update(net, opt, traj, device, epochs=4, mb=4096, clip=0.2,
               vf_coef=0.5, ent_coef=0.05, bf16=False, aux_coef=0.1, role_norm=False,
               conv_coef=0.0, anchor=None, kl_coef=1.0, jcall_w=1.0):
    obs = torch.as_tensor(np.stack([t[0] for t in traj]), device=device)
    mask = torch.as_tensor(np.stack([t[1] for t in traj]), device=device)
    act = torch.as_tensor([t[2] for t in traj], device=device)
    logp_old = torch.as_tensor([t[3] for t in traj], device=device)
    val_old = torch.as_tensor([t[4] for t in traj], device=device)
    ret = torch.as_tensor([t[5] for t in traj], device=device)
    role = torch.as_tensor([t[6] for t in traj], device=device)
    lab = torch.as_tensor([t[7] for t in traj], device=device)
    lab_suit = torch.as_tensor(np.stack([t[8] for t in traj]), device=device)
    lab_trump = torch.as_tensor(np.stack([t[9] for t in traj]), device=device)
    lab_win = torch.as_tensor([t[10] for t in traj], device=device)
    # E2: 관례 교사 액션 (인증 클래스 밖은 -1)
    conv_a = torch.as_tensor([t[11] if len(t) > 11 else -1 for t in traj], device=device)
    # v9: 마이티/조커 보유 좌석 라벨 (rel0..4, 소진 -1)
    lab_mk = torch.as_tensor([t[12] if len(t) > 12 else -1 for t in traj], device=device)
    lab_jk = torch.as_tensor([t[13] if len(t) > 13 else -1 for t in traj], device=device)
    # 프렌드 선언 이전 스텝은 예측 대상이 없음 → 보조손실에서 제외
    aux_ok = obs[:, O_FDMODE] < 0.5
    play_ok = obs[:, O_PHASE + 4] > 0.5                    # 플레이 페이즈만
    trump_ok = play_ok & (obs[:, O_GIRUDA + 4] < 0.5)      # 노기루다 제외
    win_ok = play_ok & (lab_win >= 0)
    adv = ret - val_old
    # 정규화 그룹 분리:
    #  - 경매 구간(비딩/딜미스창구)은 하나의 그룹. 역할별로 쪼개면 "입찰해서 주공이
    #    된다 vs 패스해서 야당이 된다"의 스케일 비교가 깨져 입찰 회피로 붕괴한다.
    #  - 경매 이후 플레이 구간만 역할별 정규화 → 프렌드(상금지분 1)의 학습 압력 회복.
    if role_norm:
        auction = (obs[:, O_PHASE + 0] > 0.5) | (obs[:, O_PHASE + 3] > 0.5)
        groups = [auction] + [(~auction) & (role == r) for r in (0, 1, 2)]
        for sel in groups:
            if int(sel.sum()) > 1:
                a = adv[sel]
                adv[sel] = (a - a.mean()) / (a.std() + 1e-8)
    else:
        adv = (adv - adv.mean()) / (adv.std() + 1e-8)

    n = len(traj)
    stats = {}
    amp = torch.autocast(device_type='cuda', dtype=torch.bfloat16, enabled=bf16)

    # ---- 앵커 증류 모드: PPO를 끄고 (인증 클래스 CE) + (앵커 KL) + (가치 고정)만.
    # b2x·b3top의 실패 원인이 '증류와 동반된 PPO 계속학습의 드리프트'였으므로
    # 정책 이동 자체를 앵커로 묶는다. 관례는 CE가 끌고, 나머지 행동은 앵커가 지킨다.
    if anchor is not None:
        for _ in range(epochs):
            perm = torch.randperm(n, device=device)
            for s in range(0, n, mb):
                idx = perm[s:s + mb]
                with amp:
                    logits, v, _ = net.forward_aux(obs[idx], mask[idx])
                    with torch.no_grad():
                        a_logits, a_v, _ = anchor.forward_aux(obs[idx], mask[idx])
                    lp = F.log_softmax(logits.float(), -1)
                    ap = F.softmax(a_logits.float(), -1)
                    # 마스크된 액션은 ap=0 — 0*(-inf)=nan 차단
                    kl = -(torch.where(ap > 1e-8, ap * lp, torch.zeros_like(lp))).sum(-1).mean()
                    vloss = F.mse_loss(v, a_v.float())
                    loss = kl_coef * kl + 0.5 * vloss
                    convacc, convn = 0.0, 0
                    if conv_coef:
                        ck = conv_a[idx] >= 0
                        if bool(ck.any()):
                            ce = F.cross_entropy(logits[ck].float(), conv_a[idx][ck],
                                                 reduction='none')
                            # 원래 고른 액션이 조커콜이면 그 샘플이 jcall 클래스다
                            w = torch.where(act[idx][ck] == A_PLAY_JOKERCALL,
                                            torch.full_like(ce, jcall_w),
                                            torch.ones_like(ce))
                            cl = (ce * w).sum() / w.sum()
                            loss = loss + conv_coef * cl
                            convacc = (logits[ck].argmax(-1) == conv_a[idx][ck]).float().mean().item()
                            convn = int(ck.sum())
                opt.zero_grad(set_to_none=True)
                loss.backward()
                nn.utils.clip_grad_norm_(net.parameters(), 1.0)
                opt.step()
                stats = {'pg': 0.0, 'v': vloss.item(), 'ent': kl.item(), 'aux': 0.0,
                         'auxacc': 0.0, 'suit': 0.0, 'trump': 0.0, 'win': 0.0,
                         'conv': convacc, 'conv_n': convn}
        return stats

    for _ in range(epochs):
        perm = torch.randperm(n, device=device)
        for s in range(0, n, mb):
            idx = perm[s:s + mb]
            with amp:
                logits, v, auxlog = net.forward_aux(obs[idx], mask[idx])
                dist = torch.distributions.Categorical(logits=logits)
                logp = dist.log_prob(act[idx])
                ratio = (logp - logp_old[idx]).exp()
                a = adv[idx]
                pg = -torch.min(ratio * a,
                                ratio.clamp(1 - clip, 1 + clip) * a).mean()
                vloss = F.mse_loss(v, ret[idx])
                ent = dist.entropy().mean()
                loss = pg + vf_coef * vloss - ent_coef * ent
                auxl = torch.zeros((), device=device)
                auxacc = 0.0
                auxsub = {}
                if auxlog is not None:
                    ok = aux_ok[idx]
                    if bool(ok.any()):
                        al, tl = auxlog['friend'][ok].float(), lab[idx][ok]
                        auxl = F.cross_entropy(al, tl)
                        auxacc = (al.argmax(-1) == tl).float().mean().item()
                        loss = loss + aux_coef * auxl
                    pk = play_ok[idx]
                    if bool(pk.any()):                      # 좌석×무늬 보유 예측
                        sl = F.binary_cross_entropy_with_logits(
                            auxlog['suit'][pk].float(), lab_suit[idx][pk])
                        loss = loss + 0.5 * aux_coef * sl
                        auxsub['suit'] = ((auxlog['suit'][pk] > 0).float()
                                          == lab_suit[idx][pk]).float().mean().item()
                    tk = trump_ok[idx]
                    if bool(tk.any()):                      # 좌석 잔여 기루다 예측
                        tlz = F.mse_loss(auxlog['trump'][tk].float(), lab_trump[idx][tk])
                        loss = loss + 0.5 * aux_coef * tlz
                        auxsub['trump'] = tlz.item()
                    wk = win_ok[idx]
                    if bool(wk.any()):                      # 이번 트릭 승자 예측
                        wl = F.cross_entropy(auxlog['win'][wk].float(), lab_win[idx][wk])
                        loss = loss + 0.5 * aux_coef * wl
                        auxsub['win'] = (auxlog['win'][wk].argmax(-1)
                                         == lab_win[idx][wk]).float().mean().item()
                    if auxlog.get('mkey') is not None:      # v9: 특수카드 보유 좌석
                        mk2 = play_ok[idx] & (lab_mk[idx] >= 0)
                        jk2 = play_ok[idx] & (lab_jk[idx] >= 0)
                        acc = []
                        if bool(mk2.any()):
                            ml = F.cross_entropy(auxlog['mkey'][mk2].float(), lab_mk[idx][mk2])
                            loss = loss + 0.5 * aux_coef * ml
                            acc.append((auxlog['mkey'][mk2].argmax(-1) == lab_mk[idx][mk2]).float().mean().item())
                        if bool(jk2.any()):
                            jl = F.cross_entropy(auxlog['jkey'][jk2].float(), lab_jk[idx][jk2])
                            loss = loss + 0.5 * aux_coef * jl
                            acc.append((auxlog['jkey'][jk2].argmax(-1) == lab_jk[idx][jk2]).float().mean().item())
                        if acc:
                            auxsub['key'] = sum(acc) / len(acc)
                # E2: 인증 클래스 관례 증류 — 클래스 밖(-1)은 계수 0, 승률 최적화 불변
                if conv_coef:
                    ck = conv_a[idx] >= 0
                    if bool(ck.any()):
                        ce = F.cross_entropy(logits[ck].float(), conv_a[idx][ck],
                                             reduction='none')
                        w = torch.where(act[idx][ck] == A_PLAY_JOKERCALL,
                                        torch.full_like(ce, jcall_w),
                                        torch.ones_like(ce))
                        cl = (ce * w).sum() / w.sum()
                        loss = loss + conv_coef * cl
                        auxsub['conv'] = (logits[ck].argmax(-1)
                                          == conv_a[idx][ck]).float().mean().item()
                        auxsub['conv_n'] = int(ck.sum())
            opt.zero_grad(set_to_none=True)
            loss.backward()
            nn.utils.clip_grad_norm_(net.parameters(), 1.0)
            opt.step()
            stats = {'pg': pg.item(), 'v': vloss.item(), 'ent': ent.item(),
                     'aux': auxl.item(), 'auxacc': auxacc,
                     'suit': auxsub.get('suit', 0.0), 'trump': auxsub.get('trump', 0.0),
                     'win': auxsub.get('win', 0.0),
                     'key': auxsub.get('key', 0.0),
                     'conv': auxsub.get('conv', 0.0), 'conv_n': auxsub.get('conv_n', 0)}
    return stats


# ---------------- 학습 루프 ----------------
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--envs', type=int, default=64)
    ap.add_argument('--steps', type=int, default=16384, help='update당 결정 수')
    ap.add_argument('--updates', type=int, default=2000)
    ap.add_argument('--lr', type=float, default=3e-4)
    ap.add_argument('--hidden', type=int, default=512)
    ap.add_argument('--depth', type=int, default=3)
    ap.add_argument('--seed', type=int, default=7)
    ap.add_argument('--ckpt', default='ckpt')
    ap.add_argument('--resume', default=None)
    ap.add_argument('--smoke', action='store_true')
    ap.add_argument('--snap-every', type=int, default=400,
                    help='파트너 풀에 넣을 스냅샷 저장 주기 (0이면 사용 안 함)')
    ap.add_argument('--snap-pool', type=int, default=3, help='스냅샷 풀 크기')
    ap.add_argument('--partners', action='store_true',
                    help='휴리스틱 파트너 혼합(Phase 2). 미러 브리지 필요')
    ap.add_argument('--force-bid-anneal', type=int, default=1500,
                    help='강제입찰 커리큘럼을 이 업데이트에 걸쳐 1→0으로 감쇠 '
                         '(끝나면 마스크가 실제 룰과 완전 일치)')
    ap.add_argument('--workers', type=int, default=0,
                    help='수집 워커 프로세스 수 (0=단일 프로세스). CPU 병목 완화')
    ap.add_argument('--role-norm', action='store_true',
                    help='역할별 advantage 정규화 (Phase1에서 회귀 확인 — 기본 해제)')
    ap.add_argument('--feed', type=float, default=0.0,
                    help='프렌드 점수공급 선호 주입 계수 (Phase2 파트너 모드 전용)')
    ap.add_argument('--shape', type=float, default=0.0,
                    help='잠재함수 셰이핑 계수 (여당-야당 점수차 진행도)')
    ap.add_argument('--alloc', type=float, default=0.0,
                    help='아군 확정승 트릭에 비싼 카드를 낸 결정에 주는 선호 벌점(Phase A)')
    ap.add_argument('--rule-random', action='store_true',
                    help='에피소드마다 룰을 무작위 샘플 (지역룰 일반화)')
    ap.add_argument('--aux', type=float, default=0.1,
                    help='프렌드 좌석 예측 보조손실 계수 (0이면 헤드 없음)')
    ap.add_argument('--conv', type=float, default=0.0,
                    help='E2 관례 증류 계수 — 개입 인증 클래스에서만 교사 CE를 더한다')
    ap.add_argument('--distill', action='store_true',
                    help='앵커 증류 모드: PPO 끄고 인증 클래스 CE + 재개 시점 정책 KL 앵커만')
    ap.add_argument('--anchor-ckpt', default=None,
                    help='앵커를 재개 체크포인트가 아닌 다른 체크포인트에서 로드 (교차 앵커)')
    ap.add_argument('--kl', type=float, default=1.0, help='앵커 KL 계수')
    ap.add_argument('--jcall-w', type=float, default=1.0,
                    help='조커콜 클래스 CE 가중치. 이 클래스는 발화가 희소해 '
                         '(update당 ~1.6샘플 대 다른 관례 40~57샘플) 균등 가중이면 '
                         'KL에 눌려 이식되지 않는다')
    ap.add_argument('--attn', action='store_true',
                    help='Phase B: 트릭 토큰 트랜스포머 인코더')
    args = ap.parse_args()

    if args.smoke:
        args.envs, args.steps, args.updates = 8, 512, 3
        args.hidden, args.depth = 128, 2

    device = 'cuda' if torch.cuda.is_available() else 'cpu'
    bf16 = device == 'cuda'
    torch.manual_seed(args.seed)
    os.makedirs(args.ckpt, exist_ok=True)

    net = PolicyValueNet(args.hidden, args.depth, aux_head=args.aux > 0,
                         attn=args.attn).to(device)
    opt = torch.optim.AdamW(net.parameters(), lr=args.lr)
    start = 0
    if args.resume:
        st = torch.load(args.resume, map_location=device)
        missing = net.load_state_dict(st['net'], strict=False)
        if missing.missing_keys:
            print(f'[warm] 신규 파라미터 초기화: {missing.missing_keys}')
        try:
            opt.load_state_dict(st['opt'])
        except ValueError:
            print('[warm] 옵티마이저 파라미터 불일치 — 새로 시작')
        start = st['update']
        print(f'resumed @ update {start}')

    if args.partners and args.workers > 0:
        from mp_collector import MPCollector
        col = MPCollector(args.envs, args.seed * 1000, device,
                          n_workers=args.workers, feed_coef=args.feed,
                          conv=args.conv)
    elif args.partners:
        from mixed_collector import MixedCollector
        col = MixedCollector(args.envs, args.seed * 1000, device, feed_coef=args.feed,
                             conv=args.conv)
    else:
        col = Collector(args.envs, args.seed * 1000, device, shape=args.shape,
                        rule_random=args.rule_random, alloc=args.alloc, conv=args.conv)
    print(f'device={device} bf16={bf16} | obs {OBS_DIM} act {ACTION_DIM} | '
          f'params {sum(p.numel() for p in net.parameters()):,}')

    import copy
    anchor = None
    if args.distill:
        if not args.resume:
            raise SystemExit('--distill은 --resume(앵커가 될 체크포인트)이 필요하다')
        anchor = copy.deepcopy(net).eval()
        if args.anchor_ckpt:
            ast_ = torch.load(args.anchor_ckpt, map_location=device)
            miss = anchor.load_state_dict(ast_['net'], strict=False)
            print(f'[distill] 교차 앵커 {args.anchor_ckpt} (미로드 헤드 {len(miss.missing_keys)}개)')
        for p_ in anchor.parameters():
            p_.requires_grad_(False)
        print(f'[distill] 앵커 고정 @ update {start} · kl={args.kl} conv={args.conv}')
    snaps = []
    for u in range(start + 1, args.updates + 1):
        # 과거 자신을 파트너 풀에 넣는다 — 휴리스틱 과적합 방지
        if args.partners and args.snap_every and u > 1 and (u - 1) % args.snap_every == 0:
            sn = copy.deepcopy(net).eval()
            for p_ in sn.parameters():
                p_.requires_grad_(False)
            snaps.append(sn)
            if len(snaps) > args.snap_pool:
                snaps.pop(0)
            print(f'[snapshot] pool={len(snaps)} @ upd {u}')
        t0 = time.time()
        fb = max(0.0, 1.0 - u / max(args.force_bid_anneal, 1))
        if args.partners:
            traj, prizes, cstat = col.collect(net, args.steps, snapshots=snaps,
                                              force_bid=fb)
        else:
            traj, prizes, cstat = col.collect(net, args.steps)
        if not isinstance(cstat, dict):          # 자기대전 수집기는 유찰율만 반환
            cstat = {'redeal': cstat, 'decl_rate': 0.0, 'decl_win': 0.0, 'key_waste': 0.0}
        t1 = time.time()
        if not traj:
            print(f'upd {u:4d} | empty traj (no completed episodes) — skip update')
            continue
        st = ppo_update(net, opt, traj, device, bf16=bf16, aux_coef=args.aux,
                        role_norm=args.role_norm, conv_coef=args.conv,
                        anchor=anchor, kl_coef=args.kl, jcall_w=args.jcall_w)
        t2 = time.time()
        if prizes:
            P = np.stack(prizes)
            decl_abs = np.abs(P).max(1).mean()
        if u % 1 == 0:
            print(f'upd {u:4d} | steps {len(traj):6d} | games {len(prizes):4d} | '
                  f'|prize| {decl_abs:6.0f} | pg {st["pg"]:+.3f} v {st["v"]:.3f} '
                  f'ent {st["ent"]:.2f} aux {st["aux"]:.2f}/{st["auxacc"]:.2f} '
                  f'redeal {cstat["redeal"]:.2f} '
                  f'dcl {cstat["decl_rate"]:.2f}/{cstat["decl_win"]:.2f} '
                  f'kw {cstat["key_waste"]*100:.1f}% fb {fb:.2f} '
                  f'sui {st["suit"]:.2f} trp {st["trump"]:.3f} win {st["win"]:.2f} key {st.get("key",0):.2f} '
                  f'cv {st["conv"]:.2f}/{st["conv_n"]} '
                  f'| env {t1-t0:.1f}s gpu {t2-t1:.1f}s '
                  f'({len(traj)/(t1-t0):.0f} steps/s)')
        if u % 25 == 0 or u == args.updates:
            torch.save({'net': net.state_dict(), 'opt': opt.state_dict(),
                        'update': u, 'obs_dim': OBS_DIM, 'action_dim': ACTION_DIM,
                        'aux_head': args.aux > 0, 'hidden': args.hidden,
                        'depth': args.depth, 'shape': args.shape, 'alloc': args.alloc,
                        'partners': args.partners, 'feed': args.feed,
                        'conv': args.conv, 'attn': args.attn},
                       f'{args.ckpt}/latest.pt')
    if hasattr(col, 'close'):
        col.close()
    print('done.')


if __name__ == '__main__':
    main()
