# -*- coding: utf-8 -*-
"""ONNX → 파이토치 체크포인트 역복원.

증류(distill_search.py)는 `--resume`으로 원본 가중치가 필요한데, v13의 학습
체크포인트가 이 머신에 남아 있지 않다(배포용 ONNX만 있다). 다행히 export_onnx가
파라미터 이름을 그대로 보존해 내보내므로(`net.trunk.0.weight` 등) 초기값을 읽어
state_dict로 되돌릴 수 있다.

보조 헤드(aux_*)는 ONNX로 내보내지 않으므로 복원되지 않는다. 증류는 정책·가치만
쓰므로 상관없다(distill_search도 strict=False로 적재한다).

복원 후 **반드시 수치 검증한다** — 무작위 관측에서 ONNX와 파이토치의 로짓·가치가
일치하지 않으면 조용히 다른 모델을 학습시키게 된다.

사용: python onnx_to_ckpt.py <입력.onnx> <출력디렉터리>
"""
from __future__ import annotations
import os, sys
import numpy as np
import onnx
from onnx import numpy_helper
import torch

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from mighty_encode import OBS_DIM, ACTION_DIM
from train_ppo import PolicyValueNet


def main():
    src = sys.argv[1] if len(sys.argv) > 1 else '../web/model/mighty_master_v13.onnx'
    dst = sys.argv[2] if len(sys.argv) > 2 else 'ckpt_v13'
    m = onnx.load(src)
    raw = {i.name: numpy_helper.to_array(i) for i in m.graph.initializer}
    sd = {}
    for k, v in raw.items():
        if not k.startswith('net.'):
            continue                      # val_17 같은 상수는 가중치가 아니다
        sd[k[len('net.'):]] = torch.from_numpy(np.array(v))

    # 구조는 가중치 모양에서 읽는다 — 사람이 인자로 넣으면 틀릴 여지가 있다
    w0 = sd['trunk.0.weight']
    hidden, d_in = w0.shape
    depth = sum(1 for k in sd if k.startswith('trunk.') and k.endswith('.weight'))
    attn = any(k.startswith('tok_enc.') for k in sd)
    print(f'구조 추정 — hidden={hidden} depth={depth} attn={attn} '
          f'입력={d_in} (OBS_DIM={OBS_DIM})')

    net = PolicyValueNet(hidden, depth, aux_head=False, attn=attn, fut_head=False)

    # 트랜스포머 안의 Linear는 exporter가 MatMul 상수로 접어 넣어 이름이 val_*로
    # 바뀌고 전치돼 있다. 모양과 그래프 순서로 짝지은 뒤 아래 수치 검증이 확인한다.
    want = net.state_dict()
    anon = [(k, v) for k, v in raw.items() if not k.startswith('net.') and v.ndim == 2]
    used = set()
    for key in [k for k in want if k not in sd and want[k].ndim == 2]:
        tgt = tuple(want[key].shape)
        for name, arr in anon:
            if name in used or tuple(arr.shape) != (tgt[1], tgt[0]):
                continue
            sd[key] = torch.from_numpy(np.array(arr).T.copy())
            used.add(name)
            print(f'  전치 복원 {key} ← {name} {list(arr.shape)}')
            break

    missing, unexpected = net.load_state_dict(sd, strict=False)
    print(f'적재 — 누락 {len(missing)}개 · 예상밖 {len(unexpected)}개')
    if unexpected:
        print('  예상밖:', unexpected[:8])
    if missing:
        print('  누락:', missing[:8])
        # 트렁크·정책·가치가 빠지면 복원 실패다
        core = [k for k in missing if k.startswith(('trunk.', 'pi.', 'v.', 'tok_'))]
        if core:
            sys.exit(f'핵심 가중치가 누락됐다: {core[:5]}')

    # ---- 수치 검증: ONNX와 같은 입력에 같은 출력을 내는가 ----
    import onnxruntime as ort
    sess = ort.InferenceSession(src, providers=['CPUExecutionProvider'])
    in_dim = sess.get_inputs()[0].shape[-1]
    # 배포 ONNX는 배치 1로 고정 내보내져 있다 — 한 건씩 비교한다
    names = [o.name for o in sess.get_outputs()]
    rng = np.random.default_rng(0)
    net.eval()
    dlog = dval = 0.0
    for t in range(16):
        obs = rng.random((1, in_dim), dtype=np.float32)
        mask = np.zeros((1, ACTION_DIM), dtype=bool)
        mask[0, rng.choice(ACTION_DIM, 12, replace=False)] = True
        out = sess.run(None, {'obs': obs, 'mask': mask})
        with torch.no_grad():
            t_log, t_val = net(torch.from_numpy(obs), torch.from_numpy(mask))
        sel = mask                              # 마스킹된 자리는 -1e9라 비교에서 뺀다
        dlog = max(dlog, float(np.abs(out[names.index('logits')][sel] - t_log.numpy()[sel]).max()))
        if 'value' in names:
            dval = max(dval, float(np.abs(out[names.index('value')].ravel()
                                          - t_val.numpy().ravel()).max()))
    print(f'로짓 최대 오차 {dlog:.3e} · 가치 최대 오차 {dval:.3e} (16표본)')
    if dlog > 1e-3 or dval > 1e-3:
        sys.exit('검증 실패 — 복원된 가중치가 ONNX와 다른 출력을 낸다')

    os.makedirs(dst, exist_ok=True)
    path = os.path.join(dst, 'latest.pt')
    # export_onnx가 확인하는 키까지 채워야 내보내기가 통과한다
    torch.save({'net': net.state_dict(), 'hidden': hidden, 'depth': depth,
                'aux_head': False, 'attn': attn, 'fut_head': False,
                'obs_dim': OBS_DIM, 'action_dim': ACTION_DIM,
                'restored_from': os.path.basename(src)}, path)
    print(f'검증 통과 → {path}')


if __name__ == '__main__':
    main()
