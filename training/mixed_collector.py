"""Phase 2: 파트너 다양화 롤아웃 수집기.

좌석별로 현재 정책(net) / 휴리스틱 파트너를 섞어 배치한다. 휴리스틱 행동은 Node
미러 브리지에서 받아오고(엔진 파리티 검증됨), 학습 표본은 net 좌석에서만 만든다.
목적은 자기복제 공적응 해소 — 특히 사람(=휴리스틱 대리) 주공과 함께 뛰는 프렌드 학습.
"""
from __future__ import annotations
import json, subprocess
import numpy as np
import torch

from mighty_engine import MightyGame, parse_card, is_point, same, is_joker
import mighty_encode
from mighty_encode import MightyEnv, aux_labels

PERSONAS = ('gambler', 'balanced', 'careful')
TIERS = ('intermediate', 'advanced')
# (net 좌석 수, 비중) — 전원 net은 표본 효율, 소수 net은 파트너 다양성
# 배치 모드와 비중.
#  all        전원 학습 (표본 효율)
#  defenders  야당 3석 동시 학습 — 야당 협력은 서로가 학습 주체일 때만 공진화한다
#  ruling     주공+프렌드 동시 학습 — 여당 시너지(기루다 정리 등)
#  mixed2/1   소수 학습 + 다수 파트너 (사람과 뛰는 상황)
# defenders/ruling은 경매 전에 역할을 모르므로 프렌드 확정 시점에 좌석을 갈아끼운다.
# 순수 자가대전('all')을 뺐다. 경매까지 전원 net이면 "모두 패스"가 안정적 함정이 되어
# 학습이 붕괴한다(실측: 30 업데이트 만에 유찰율 0.91). 모든 모드에 휴리스틱 입찰자를
# 최소 2석 남겨 경매가 실제 게임처럼 굴러가게 한다. 마스크·보상은 룰 그대로 둔다.
SEAT_MODES = (('defenders', 0.30), ('ruling', 0.35),
              ('mixed2', 0.20), ('mixed1', 0.15))
SNAP_P = 0.35          # 파트너 좌석이 과거 스냅샷으로 대체될 확률


def de_action(a):
    out = {'type': a['type']}
    if a['type'] == 'bid':
        out.update(count=a['count'], giruda=a['giruda'])
    elif a['type'] == 'exchange':
        out['discard'] = [parse_card(c) for c in a['discard']]
        if 'revise' in a:
            out['revise'] = a['revise']
    elif a['type'] == 'friend':
        out['mode'] = a['mode']
        if 'card' in a:
            out['card'] = parse_card(a['card'])
    elif a['type'] == 'play':
        out['card'] = parse_card(a['card'])
        if 'jokerSuit' in a:
            out['jokerSuit'] = a['jokerSuit']
        if 'jokerCall' in a:
            out['jokerCall'] = True
    return out


def derive_rates(c):
    """원시 카운터 → 조기경보 지표 (핸드오프 §5-2)"""
    out = dict(c)
    out['redeal'] = c['redeal_n'] / max(c['ep_n'], 1)
    out['decl_rate'] = c['decl_n'] / max(c['seat_n'], 1)
    out['decl_win'] = c['decl_win_n'] / max(c['decl_n'], 1)
    out['key_waste'] = c['kw_n'] / max(c['kc_n'], 1)
    return out


class MixedCollector:
    def __init__(self, n_envs, seed, device, sync_every=50, feed_coef=0.0,
                 infer_fn=None):
        self.n = n_envs
        self.device = device
        self.rng = np.random.default_rng(seed)
        self.sync_every = sync_every
        # 선호 주입: 프렌드가 주공 승 트릭에 점수카드를 넣어준 만큼 보너스.
        # 규칙상 여당 점수는 합산이라 승률 중립 → RL이 스스로 배우지 않는다.
        # 사람이 읽는 협력 신호를 만들기 위한 의도적 선호 주입(정책 불변 아님).
        self.feed_coef = feed_coef
        # infer_fn(kind, idxs, obs, mask) → (acts, logps, vals)
        #   kind: ('net', None) 또는 ('snap', k). 기본은 로컬 추론.
        self.infer_fn = infer_fn
        self.envs = [MightyEnv(seed=seed + i * 1_000_000) for i in range(n_envs)]
        self.net_seats = [set() for _ in range(n_envs)]     # 학습 주체 좌석
        self.snap_seats = [dict() for _ in range(n_envs)]   # 좌석 → 스냅샷 index
        self.mode = [''] * n_envs
        self.pending = [False] * n_envs                     # 역할 확정 후 재배정 대기
        self.resolved = [False] * n_envs                    # 목표 배치로 실제 전환됐는가
        self.n_snaps = 0
        self.open = [[[] for _ in range(5)] for _ in range(n_envs)]
        self.states = [None] * n_envs
        self.br = subprocess.Popen(['node', 'mirror-bridge.js'],
                                   stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                                   text=True, bufsize=1)
        self._round = 0
        new = [self._reset_env(i) for i in range(n_envs)]
        self._rpc({'new': new})

    # ---------- 브리지 ----------
    @staticmethod
    def _episode_metrics(g, seats):
        """핸드오프 §5-2 조기경보 지표.
        key_waste = 아군이 이미 확정으로 이긴 트릭에 마이티·조커를 버린 비율.
        분모는 그런 상황에서의 플레이 횟수(리드 제외)."""
        decl = g.declarer
        fr = g.friend if (g.friend is not None and g.friend != decl) else None
        pl = getattr(g, 'play', None)
        out = {'decl_n': 0, 'decl_win': 0, 'key_waste': 0, 'key_chance': 0}
        for s in seats:
            if s == decl:
                out['decl_n'] += 1
                out['decl_win'] += bool(g.result['win']) if getattr(g, 'result', None) else 0
        if pl is None:
            return out
        team = lambda p: 'ruling' if (p == decl or p == fr) else 'opp'
        for t in pl['history']:
            leader = t['plays'][0]['player']
            p0 = t['plays'][0]
            led = p0.get('jokerSuit') or (None if is_joker(p0['card']) else p0['card'][0])
            stub = {'ledSuit': led, 'trickNo': t['trickNo'],
                    'jokerCallActive': any(e.get('jokerCall') for e in t['plays'])}
            key = lambda e: tuple(g.card_strength(e, stub))
            for e in t['plays']:
                if e['player'] not in seats or e['player'] == leader:
                    continue
                best, bestp = (-2, -1), None
                for x in t['plays']:
                    if x['player'] == e['player']:
                        continue
                    k = key(x)
                    if k > best:
                        best, bestp = k, x['player']
                if bestp is None or team(bestp) != team(e['player']):
                    continue
                if t['winner'] != bestp:          # 아군 확정승이 아니었음
                    continue
                out['key_chance'] += 1
                c = e['card']
                if is_joker(c) or (g.contract and same(c, g.mighty_card)):
                    out['key_waste'] += 1
        return out

    def _rpc(self, msg):
        self.br.stdin.write(json.dumps(msg) + '\n')
        self.br.stdin.flush()
        r = json.loads(self.br.stdout.readline())
        if 'error' in r:
            raise RuntimeError(f"mirror bridge: {r['error']} {r.get('stack','')}")
        return r

    def close(self):
        try:
            self.br.stdin.close()
            self.br.terminate()
        except Exception:
            pass

    # ---------- 좌석 배치 ----------
    def _partner_spec(self, seats, snap):
        """학습 좌석 외의 좌석을 휴리스틱/과거 스냅샷으로 채운다."""
        hs = {}
        for st in range(5):
            if st in seats:
                continue
            if self.n_snaps and self.rng.random() < SNAP_P:
                snap[st] = int(self.rng.integers(self.n_snaps))
            else:
                snap.pop(st, None)
                hs[str(st)] = {'persona': str(self.rng.choice(PERSONAS)),
                               'tier': str(self.rng.choice(TIERS))}
        return hs

    def _assign(self, i):
        modes = [m[0] for m in SEAT_MODES]
        probs = [m[1] for m in SEAT_MODES]
        mode = str(self.rng.choice(modes, p=probs))
        self.mode[i] = mode
        snap = {}
        if mode in ('defenders', 'ruling'):
            # 경매 구간은 2~3석만 net (나머지는 휴리스틱이 입찰) → 역할 확정 후 전환
            self.pending[i] = True
            k = int(self.rng.integers(2, 4))
        else:
            self.pending[i] = False
            k = {'mixed2': 2, 'mixed1': 1}[mode]
        seats = set(int(x) for x in self.rng.choice(5, size=k, replace=False))
        self.snap_seats[i] = snap
        self.resolved[i] = False
        return seats, self._partner_spec(seats, snap)

    def _resolve_roles(self, i):
        """프렌드 확정 후 목표 배치로 전환. 브리지 assign 스펙 또는 None."""
        g = self.envs[i].game
        if g.phase not in ('play', 'done') or g.declarer is None:
            return None
        fd = g.friend_decl
        if not fd or fd['mode'] != 'card' or fd.get('card') is None:
            self.pending[i] = False         # 초구·노프렌드는 전원 학습 유지
            return None
        fr = None
        for p in range(5):
            if any(same(c, fd['card']) for c in g.hands[p]):
                fr = p
                break
        if fr is None or fr == g.declarer:  # 셀프 프렌드
            self.pending[i] = False
            return None
        ruling = {g.declarer, fr}
        seats = (set(range(5)) - ruling) if self.mode[i] == 'defenders' else ruling
        snap = {}
        hs = self._partner_spec(seats, snap)
        for st in range(5):                 # 학습에서 빠진 좌석의 경매 표본은 폐기
            if st not in seats:
                self.open[i][st] = []
        self.net_seats[i] = seats
        self.snap_seats[i] = snap
        self.pending[i] = False
        self.resolved[i] = True
        return {'env': i, 'hseats': hs}

    def _reset_env(self, i):
        """Python 환경을 리셋하고 미러가 재현할 시드를 돌려준다."""
        env = self.envs[i]
        obs, mask, p = env.reset()
        self.states[i] = (obs, mask, p)
        self.open[i] = [[] for _ in range(5)]
        seats, hs = self._assign(i)
        self.net_seats[i] = seats
        return {'env': i, 'seed': env.game.config['seed'], 'hseats': hs}

    def _infer(self, kind, k, idxs, model):
        obs = np.stack([self.states[i][0] for i in idxs])
        mask = np.stack([self.states[i][1] for i in idxs])
        if self.infer_fn is not None:
            return self.infer_fn(kind, k, obs, mask)
        o = torch.as_tensor(obs, device=self.device)
        m = torch.as_tensor(mask, device=self.device)
        logits, vals = model(o, m)
        dist = torch.distributions.Categorical(logits=logits)
        a = dist.sample()
        return (a.cpu().numpy(), dist.log_prob(a).float().cpu().numpy(),
                vals.float().cpu().numpy())

    # ---------- 수집 ----------
    @torch.no_grad()
    def collect(self, net, n_steps, snapshots=None, stop_fn=None, force_bid=False):
        snapshots = snapshots or []
        self.n_snaps = len(snapshots)
        mighty_encode.FORCE_LAST_BID = float(force_bid)
        traj, ep_prizes = [], []
        n_ep = n_redeal = 0
        agg = {'decl_n': 0, 'decl_win': 0, 'key_waste': 0, 'key_chance': 0, 'seat_n': 0}
        steps = 0
        # stop_fn: 멀티프로세스에서 메인이 전역 예산 도달을 알린다 (동적 분배)
        while steps < n_steps and not (stop_fn is not None and stop_fn()):
            self._round += 1
            ask, net_idx = [], []
            snap_idx = [[] for _ in range(self.n_snaps)]
            for i in range(self.n):
                _, _, p = self.states[i]
                if p in self.net_seats[i]:
                    net_idx.append(i)
                elif p in self.snap_seats[i]:
                    snap_idx[self.snap_seats[i][p]].append(i)
                else:
                    ask.append(i)

            # 1) net 좌석 일괄 추론
            acts_np = logps_np = vals_np = None
            if net_idx:
                acts_np, logps_np, vals_np = self._infer('net', None, net_idx, net)

            snap_acts = {}
            for k, idxs in enumerate(snap_idx):
                if not idxs:
                    continue
                sa, _, _ = self._infer('snap', k, idxs,
                                       snapshots[k] if snapshots else None)
                for t_, i in enumerate(idxs):
                    snap_acts[i] = int(sa[t_])

            # 2) 미러에 net·스냅샷 행동 반영 + 휴리스틱 행동 요청
            applies = [{'env': i, 'a': int(acts_np[j])} for j, i in enumerate(net_idx)]
            applies += [{'env': i, 'a': a} for i, a in snap_acts.items()]
            msg = {'apply': applies, 'ask': ask}
            if self._round % self.sync_every == 0:
                msg['sync'] = list(range(self.n))
            resp = self._rpc(msg)

            fresh, done_envs = [], []
            # 3) net 좌석 스텝 (Python 엔진이 권위)
            for j, i in enumerate(net_idx):
                env = self.envs[i]
                o, m, p = self.states[i]
                g_ = env.game
                is_play = g_.phase == 'play'
                cp = tuple(g_.play['capturedPoints']) if is_play else (0,) * 5
                sl, tl = aux_labels(g_, p)
                tno = g_.play['trickNo'] if is_play else -1
                self.open[i][p].append([o, m, int(acts_np[j]), float(logps_np[j]),
                                        float(vals_np[j]), (cp, sl, tl, tno)])
                steps += 1
                no, nm, np_, rew, done = env.step(int(acts_np[j]))
                if done:
                    done_envs.append((i, rew))
                else:
                    self.states[i] = (no, nm, np_)

            for i, a in snap_acts.items():
                env = self.envs[i]
                no, nm, np_, rew, done = env.step(a)
                if done:
                    done_envs.append((i, rew))
                else:
                    self.states[i] = (no, nm, np_)

            # 4) 휴리스틱 행동을 Python 엔진에 적용
            for item in resp['acts']:
                i = item['env']
                env = self.envs[i]
                g = env.game
                g.act(de_action(item['action']))
                if g.phase == 'done':
                    rew = np.array(g.result['prizes'], dtype=np.float32) / env.PRIZE_SCALE
                    done_envs.append((i, rew))
                elif g.phase == 'redeal':
                    done_envs.append((i, np.full(5, env.REDEAL_PENALTY, dtype=np.float32)))
                else:
                    self.states[i] = env._out()

            # 4.5) 프렌드 확정 시점에 목표 배치로 전환
            reassign = []
            done_ids = {d[0] for d in done_envs}
            for i in range(self.n):
                if self.pending[i] and i not in done_ids:
                    spec = self._resolve_roles(i)
                    if spec:
                        reassign.append(spec)
            if reassign:
                self._rpc({'assign': reassign})

            # 5) 동기 검증
            for s in resp.get('sync', []):
                i = s['env']
                if i in [d[0] for d in done_envs]:
                    continue
                g = self.envs[i].game
                cur = g.current_player if g.phase not in ('done', 'redeal') else None
                if g.phase != s['phase'] or cur != s['cur']:
                    raise RuntimeError(
                        f"미러 desync env {i}: py({g.phase},{cur}) js({s['phase']},{s['cur']})")

            # 6) 에피소드 종료 처리
            for i, rew in done_envs:
                g = self.envs[i].game
                ep_prizes.append(rew * MightyEnv.PRIZE_SCALE)
                n_ep += 1
                pl_T = getattr(g, 'play', None)
                n_redeal += (pl_T is None)
                decl = g.declarer
                fr = g.friend if (g.friend is not None and g.friend != decl) else None
                fed = played_pts = 0
                if self.feed_coef and fr is not None and pl_T is not None:
                    for t in pl_T['history']:
                        for e in t['plays']:
                            if e['player'] != fr or not is_point(e['card']):
                                continue
                            played_pts += 1
                            fed += (t['winner'] == decl)
                em = self._episode_metrics(g, self.net_seats[i])
                for k_ in ('decl_n', 'decl_win', 'key_waste', 'key_chance'):
                    agg[k_] += em[k_]
                agg['seat_n'] += len(self.net_seats[i])
                winners = {t['trickNo']: t['winner']
                           for t in (pl_T['history'] if pl_T else [])}
                for seat in self.net_seats[i]:
                    segs = self.open[i][seat]
                    R = float(rew[seat])
                    lab = 5 if fr is None else (fr - seat) % 5
                    role = 0 if seat == decl else (1 if seat == fr else 2)
                    # 낸 점수카드 중 주공에게 간 비율 (사람이 읽는 협력 신호와 동일 정의)
                    if role == 1 and self.feed_coef and played_pts:
                        R += self.feed_coef * fed / played_pts
                    for rec in segs:
                        _, sl, tl, tno = rec.pop()
                        w = winners.get(tno)
                        lw = -1 if w is None else (w - seat) % 5
                        traj.append(rec + [R, role, lab, sl, tl, lw])
                fresh.append(self._reset_env(i))
            if fresh:
                self._rpc({'new': fresh})   # 같은 env id로 덮어쓴다 (drop 불필요)

        # 원시 카운터를 함께 담는다 (멀티프로세스에서 워커별 합산이 필요)
        stats = {
            'ep_n': n_ep, 'redeal_n': n_redeal,
            'decl_n': agg['decl_n'], 'decl_win_n': agg['decl_win'],
            'kw_n': agg['key_waste'], 'kc_n': agg['key_chance'],
            'seat_n': agg['seat_n'],
        }
        return traj, ep_prizes, derive_rates(stats)
