# -*- coding: utf-8 -*-
"""탐색 교사 증류 (ExIt) — docs/LOOKAHEAD-PLAN.md 2단계.

tools/research/pimc_label.js가 뽑은 PIMC 라벨(jsonl)을 읽어, 같은 판을 파이썬
엔진으로 재현하고 관측을 만들어 CE 목표로 쓴다. 엔진·인코더 파리티가 보장하므로
JS에서 탐색하고 파이썬에서 학습해도 안전하다.

규칙 기반 conv_target과 다른 점은 하나다 — **클래스를 사람이 정의하지 않는다.**
컷·조커콜·기루다 소진이 한 탐색에서 동시에 나온다.

앵커 증류와 같은 안전장치를 쓴다: PPO를 끄고 (탐색 CE) + (원본 정책 KL 앵커)
+ (가치 MSE 앵커)만 돌린다. 3차 증류에서 확인했듯 KL이 총 이동량을 묶으므로
클래스가 늘면 KL을 비례 상향해야 한다.

사용:
  python distill_search.py --labels 'pimc_labels_*.jsonl' --resume ckpt_v9/latest.pt \
      --ckpt ckpt_v12 --kl 2.0 --ce 1.0 --epochs 4
"""
from __future__ import annotations
import argparse, glob, json, sys
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F

from mighty_engine import MightyGame, JOKER
from mighty_encode import encode, MightyEnv, OBS_DIM, ACTION_DIM


def play_mask(game):
    """플레이 페이즈 합법수 마스크 — MightyEnv.legal_mask를 게임 객체에 붙여 쓴다.
    라벨은 플레이 결정만 담으므로 pick 버퍼는 비어 있다."""
    env = MightyEnv.__new__(MightyEnv)
    env.game = game
    env.pick = []
    return env.legal_mask()
from train_ppo import PolicyValueNet


def pyc(c):
    """JS 카드 표기 → 파이썬 표기"""
    if c is None:
        return None
    if isinstance(c, str):
        return JOKER if c == 'JOKER' else c
    if isinstance(c, dict):
        return JOKER if c.get('suit') is None else (c['suit'], c['rank'])
    if isinstance(c, (list, tuple)):
        return (c[0], c[1])
    return c


def pya(a):
    a = dict(a)
    if 'card' in a:
        a['card'] = pyc(a['card'])
    if 'discard' in a and a['discard']:
        a['discard'] = [pyc(x) for x in a['discard']]
    return a


def build(paths, limit=None):
    """라벨 jsonl → (obs, mask, target) 텐서 재료"""
    obs_l, mask_l, tgt_l, gain_l, jc_l, cls_l = [], [], [], [], [], []
    bad = 0
    files = []
    for p in paths:
        files.extend(sorted(glob.glob(p)))
    for f in files:
        for line in open(f, encoding='utf-8'):
            if not line.strip():
                continue
            r = json.loads(line)
            try:
                g = MightyGame(r['cfg'])
                g.start(r['dealer'])
                for a in r['actions']:
                    g.act(pya(a))
                if g.phase != 'play' or g.current_player != r['seat']:
                    bad += 1
                    continue
                o = encode(g, r['seat'])
                m = play_mask(g)
                if not m[r['target']]:
                    bad += 1                       # 목표가 불법 — 재현 어긋남
                    continue
                obs_l.append(o); mask_l.append(m)
                tgt_l.append(r['target']); gain_l.append(r.get('gain', 0.0))
                jc_l.append(int(r.get('jc', 0)))
                # 프렌드 개입 국면(weaklead·oppwin) — 2026-08-16 제보 2건에서 온 클래스
                cls_l.append(1.0 if r.get('cls') else 0.0)
            except Exception:
                bad += 1
            if limit and len(obs_l) >= limit:
                break
        if limit and len(obs_l) >= limit:
            break
    print(f'라벨 {len(obs_l)}건 적재 (조커콜 {sum(jc_l)}건 · 프렌드 개입 {int(sum(cls_l))}건) · '
          f'재현 실패 {bad}건 · 파일 {len(files)}개')
    return (np.stack(obs_l), np.stack(mask_l),
            np.array(tgt_l, dtype=np.int64), np.array(gain_l, dtype=np.float32),
            np.array(jc_l, dtype=np.float32), np.array(cls_l, dtype=np.float32))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--labels', nargs='+', required=True)
    ap.add_argument('--resume', required=True, help='앵커이자 초기값이 될 체크포인트')
    ap.add_argument('--ckpt', default='ckpt_v12')
    ap.add_argument('--kl', type=float, default=2.0, help='앵커 KL 계수')
    ap.add_argument('--ce', type=float, default=1.0, help='탐색 교사 CE 계수')
    ap.add_argument('--vloss', type=float, default=0.5, help='가치 앵커 MSE 계수')
    ap.add_argument('--epochs', type=int, default=4)
    ap.add_argument('--mb', type=int, default=1024)
    ap.add_argument('--lr', type=float, default=1e-4)
    ap.add_argument('--limit', type=int, default=0)
    ap.add_argument('--jc-weight', type=float, default=1.0,
                    help='조커콜 국면 라벨의 CE 가중치. 과표집해도 전체의 1%% 수준이라 '
                         '균등 가중이면 신호가 컷에 묻힌다(v12 실측)')
    ap.add_argument('--cls-weight', type=float, default=1.0,
                    help='프렌드 개입 국면(weaklead·oppwin) 라벨의 CE 가중치. 조커콜과 같은 이유로 '
                         '드물어서 균등 가중이면 신호가 묻힌다')
    ap.add_argument('--val-frac', type=float, default=0.0,
                    help='홀드아웃 비율. in-sample만 오르고 홀드아웃이 안 오르면 암기다')
    ap.add_argument('--weight-by-gain', action='store_true',
                    help='탐색 이득 크기로 CE 가중 (작은 이득은 노이즈일 수 있다)')
    args = ap.parse_args()

    dev = 'cuda' if torch.cuda.is_available() else 'cpu'
    ck = torch.load(args.resume, map_location=dev, weights_only=False)
    net = PolicyValueNet(ck.get('hidden', 512), ck.get('depth', 3),
                         aux_head=ck.get('aux_head', False),
                         attn=ck.get('attn', False),
                         fut_head=ck.get('fut_head', False)).to(dev)
    net.load_state_dict(ck['net'], strict=False)
    anchor = PolicyValueNet(ck.get('hidden', 512), ck.get('depth', 3),
                            aux_head=ck.get('aux_head', False),
                            attn=ck.get('attn', False),
                            fut_head=ck.get('fut_head', False)).to(dev).eval()
    anchor.load_state_dict(ck['net'], strict=False)
    for p_ in anchor.parameters():
        p_.requires_grad_(False)

    obs_np, mask_np, tgt_np, gain_np, jc_np, cls_np = build(args.labels, args.limit or None)
    if len(obs_np) < 100:
        sys.exit('라벨이 너무 적다')
    obs = torch.as_tensor(obs_np, device=dev)
    mask = torch.as_tensor(mask_np, device=dev)
    tgt = torch.as_tensor(tgt_np, device=dev)
    gain = torch.as_tensor(gain_np, device=dev).clamp(min=0)
    w = (gain / gain.mean().clamp(min=1e-6)).clamp(0.2, 5.0) if args.weight_by_gain \
        else torch.ones_like(gain)
    jc = torch.as_tensor(jc_np, device=dev)
    w = w * torch.where(jc > 0, torch.full_like(w, args.jc_weight), torch.ones_like(w))
    print(f'  조커콜 라벨 {int(jc.sum().item())}건 · CE 가중 x{args.jc_weight} '
          f'(실효 비중 {100 * (w * jc).sum().item() / w.sum().item():.1f}%)')
    cls_t = torch.as_tensor(cls_np, device=dev)
    w = w * torch.where(cls_t > 0, torch.full_like(w, args.cls_weight), torch.ones_like(w))
    print(f'  프렌드 개입 라벨 {int(cls_t.sum().item())}건 · CE 가중 x{args.cls_weight} '
          f'(실효 비중 {100 * (w * cls_t).sum().item() / w.sum().item():.1f}%)')

    opt = torch.optim.AdamW(net.parameters(), lr=args.lr)
    # 홀드아웃 — 학습에 안 쓴 라벨에서의 교사 일치. 이게 안 오르면 in-sample이
    # 아무리 올라도 새 국면에서는 그대로다(2026-08-17 weaklead 사이클의 실패 모드).
    # 앵커 시점 값도 같이 찍어 "얼마나 올랐나"를 볼 수 있게 한다.
    n_all = len(obs)
    n_val = int(n_all * args.val_frac)
    v_obs = v_mask = v_tgt = None
    if n_val:
        vperm = torch.randperm(n_all, device=dev)
        vi, ti = vperm[:n_val], vperm[n_val:]
        v_obs, v_mask, v_tgt = obs[vi], mask[vi], tgt[vi]
        with torch.no_grad():
            base_acc = (anchor.forward_aux(v_obs, v_mask)[0].argmax(-1) == v_tgt).float().mean().item()
        print(f'  홀드아웃 {n_val}건 · 앵커(v16e) 교사 일치 {base_acc:.3f}')
    else:
        ti = torch.arange(n_all, device=dev)
    obs, mask, tgt, w = obs[ti], mask[ti], tgt[ti], w[ti]
    n = len(obs)
    print(f'증류 시작 · n={n} · kl={args.kl} ce={args.ce} epochs={args.epochs}')
    for ep in range(args.epochs):
        perm = torch.randperm(n, device=dev)
        tot_ce = tot_kl = 0.0; acc = 0.0; nb = 0
        for s in range(0, n, args.mb):
            idx = perm[s:s + args.mb]
            logits, v, _ = net.forward_aux(obs[idx], mask[idx])
            with torch.no_grad():
                a_logits, a_v, _ = anchor.forward_aux(obs[idx], mask[idx])
            lp = F.log_softmax(logits.float(), -1)
            ap_ = F.softmax(a_logits.float(), -1)
            kl = -(torch.where(ap_ > 1e-8, ap_ * lp, torch.zeros_like(lp))).sum(-1).mean()
            ce = (F.cross_entropy(logits.float(), tgt[idx], reduction='none') * w[idx]).sum() / w[idx].sum()
            vloss = F.mse_loss(v, a_v.float())
            loss = args.kl * kl + args.ce * ce + args.vloss * vloss
            opt.zero_grad(set_to_none=True)
            loss.backward()
            nn.utils.clip_grad_norm_(net.parameters(), 1.0)
            opt.step()
            tot_ce += ce.item(); tot_kl += kl.item()
            acc += (logits.argmax(-1) == tgt[idx]).float().mean().item(); nb += 1
        vtxt = ''
        if v_obs is not None:
            with torch.no_grad():
                va = (net.forward_aux(v_obs, v_mask)[0].argmax(-1) == v_tgt).float().mean().item()
            vtxt = f' 홀드아웃 {va:.3f}'
        print(f'  ep{ep + 1} ce {tot_ce / nb:.4f} kl {tot_kl / nb:.4f} 교사일치 {acc / nb:.3f}{vtxt}')

    import os
    os.makedirs(args.ckpt, exist_ok=True)
    out = dict(ck)
    out['net'] = net.state_dict()
    out['update'] = ck.get('update', 0)
    torch.save(out, f'{args.ckpt}/latest.pt')
    print(f'저장 → {args.ckpt}/latest.pt')


if __name__ == '__main__':
    main()
