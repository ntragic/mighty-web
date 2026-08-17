# -*- coding: utf-8 -*-
"""관측 확장 net2net — 기존 가중치를 함수 보존으로 새 입력 차원에 옮긴다.

v16에서 관측에 파생량 23차원을 덧붙였다(slack4·table_pts3·suit_top_cand16).
기존 모델(v13)은 기력이 충분하므로 처음부터 다시 돌리지 않고 첫 층만 넓혀 이어받는다.

**주의할 점 하나.** PolicyValueNet._feat는 `cat([obs, attn])`이라 어텐션 풀링
64차원이 관측 **뒤에** 붙는다. 관측이 1630 → 1653으로 늘면 어텐션 블록의 열
위치가 1630..1693 → 1653..1716으로 **밀린다.** 열을 뒤에 이어붙이기만 하면
어텐션 가중치가 통째로 어긋난다. 그래서 세 구간으로 나눠 옮긴다.

  새 W[:, 0:1630]     ← 옛 W[:, 0:1630]        (기존 관측 — 그대로)
  새 W[:, 1630:1653]  ← 0                       (새 파생량 — 함수 보존)
  새 W[:, 1653:1717]  ← 옛 W[:, 1630:1694]      (어텐션 — 자리 이동)

새 열을 0으로 두므로 확장 직후 출력은 원본과 **완전히 같다**. 그것을 실제로
검증한다 — 같은 국면에서 ONNX 원본과 로짓이 어긋나면 중단한다.

사용: python net2net_obs.py <입력ckpt> <출력디렉터리> [검증용.onnx]
"""
from __future__ import annotations
import os, sys
import numpy as np
import torch

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from mighty_encode import OBS_DIM, ACTION_DIM, encode, MightyEnv
from mighty_engine import MightyGame
from train_ppo import PolicyValueNet

ATTN_DIM = 64          # PolicyValueNet의 dm — 어텐션 풀링 폭


def expand(ck, new_obs_dim):
    old_obs_dim = ck.get('obs_dim')
    if old_obs_dim is None:
        sys.exit('체크포인트에 obs_dim이 없다 — onnx_to_ckpt.py가 채워준다')
    if old_obs_dim == new_obs_dim:
        print(f'관측 차원이 이미 {new_obs_dim}이다 — 확장할 것이 없다')
        return None
    if old_obs_dim > new_obs_dim:
        sys.exit(f'관측이 줄었다({old_obs_dim} → {new_obs_dim}) — net2net으로 못 다룬다')

    hidden, depth = ck.get('hidden', 512), ck.get('depth', 3)
    attn = ck.get('attn', False)
    sd = dict(ck['net'])
    w = sd['trunk.0.weight']
    expect_old = old_obs_dim + (ATTN_DIM if attn else 0)
    if w.shape[1] != expect_old:
        sys.exit(f'첫 층 입력이 {w.shape[1]}인데 {expect_old}를 기대했다')

    add = new_obs_dim - old_obs_dim
    neww = torch.zeros(w.shape[0], w.shape[1] + add, dtype=w.dtype)
    neww[:, :old_obs_dim] = w[:, :old_obs_dim]              # 기존 관측
    # 새 열은 0 — 함수 보존
    if attn:
        neww[:, new_obs_dim:] = w[:, old_obs_dim:]          # 어텐션 자리 이동
    sd['trunk.0.weight'] = neww
    print(f'첫 층 확장 {w.shape[1]} → {neww.shape[1]} '
          f'(관측 {old_obs_dim}→{new_obs_dim}, 새 열 {add}개는 0, '
          f'어텐션 {ATTN_DIM}열 이동)' if attn else
          f'첫 층 확장 {w.shape[1]} → {neww.shape[1]}')

    net = PolicyValueNet(hidden, depth, aux_head=ck.get('aux_head', False),
                         attn=attn, fut_head=ck.get('fut_head', False))
    missing, unexpected = net.load_state_dict(sd, strict=False)
    core = [k for k in missing if k.startswith(('trunk.', 'pi.', 'v.', 'tok_'))]
    if core:
        sys.exit(f'핵심 가중치 누락: {core[:5]}')
    return net


def sample_states(n=24, path='key_labels_1.jsonl'):
    """검증용 실제 국면 — 이미 뽑아 둔 PIMC 라벨을 재생해 얻는다.
    파이썬 엔진에는 범용 legal_actions가 없고, distill_search가 쓰는 재생 경로가
    이미 검증돼 있으므로 그대로 쓴다. 랜덤 벡터로는 어텐션 경로가 제대로 안 깨어난다."""
    import json
    from distill_search import pya
    out = []
    if not os.path.exists(path):
        return out
    for line in open(path, encoding='utf-8'):
        if len(out) >= n:
            break
        r = json.loads(line)
        try:
            g = MightyGame(r['cfg'])
            g.start(r['dealer'])
            for a in r['actions']:
                g.act(pya(a))
            if g.phase != 'play':
                continue
            out.append(encode(g, r['seat']).copy())
        except Exception:
            continue
    return out


def main():
    src = sys.argv[1] if len(sys.argv) > 1 else 'ckpt_v13/latest.pt'
    dst = sys.argv[2] if len(sys.argv) > 2 else 'ckpt_v16'
    onnx_ref = sys.argv[3] if len(sys.argv) > 3 else '../web/model/mighty_master_v13.onnx'

    ck = torch.load(src, map_location='cpu', weights_only=False)
    old_obs_dim = ck.get('obs_dim')
    net = expand(ck, OBS_DIM)
    if net is None:
        return
    net.eval()

    # ---- 검증: 확장 직후 출력이 원본 ONNX와 같아야 한다 ----
    import onnxruntime as ort
    sess = ort.InferenceSession(onnx_ref, providers=['CPUExecutionProvider'])
    states = sample_states()
    if not states:
        sys.exit('검증용 국면을 모으지 못했다')
    rng = np.random.default_rng(0)
    dmax = 0.0
    for o in states:
        mask = np.zeros((1, ACTION_DIM), dtype=bool)
        mask[0, rng.choice(ACTION_DIM, 12, replace=False)] = True
        old_in = o[:old_obs_dim][None, :].astype(np.float32)
        out = sess.run(None, {'obs': old_in, 'mask': mask})
        names = [x.name for x in sess.get_outputs()]
        with torch.no_grad():
            t_log, _ = net(torch.from_numpy(o[None, :].astype(np.float32)),
                           torch.from_numpy(mask))
        d = np.abs(out[names.index('logits')][mask] - t_log.numpy()[mask]).max()
        dmax = max(dmax, float(d))
    print(f'함수 보존 검증 — 로짓 최대 오차 {dmax:.3e} ({len(states)}국면)')
    if dmax > 1e-3:
        sys.exit('검증 실패 — 확장이 함수를 바꿨다. 열 매핑을 확인하라')

    os.makedirs(dst, exist_ok=True)
    out = dict(ck)
    out['net'] = net.state_dict()
    out['obs_dim'] = OBS_DIM
    out['expanded_from'] = os.path.basename(src)
    path = os.path.join(dst, 'latest.pt')
    torch.save(out, path)
    print(f'저장 → {path}')


if __name__ == '__main__':
    main()
