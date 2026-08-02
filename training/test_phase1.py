"""Phase 1 불변식 자가검증: 역할 태깅·프렌드 라벨·셰이핑 범위."""
import numpy as np, torch
from train_ppo import Collector, PolicyValueNet
from mighty_encode import MightyEnv

SHAPE = 0.2
net = PolicyValueNet(64, 2, aux_head=True)
col = Collector(16, 4242, 'cpu', shape=SHAPE)
traj, prizes, redeal = col.collect(net, 4000)

assert traj and all(len(t) == 11 for t in traj), 'traj 스키마 11필드'
assert all(t[8].shape == (16,) and t[9].shape == (4,) for t in traj), '보조 라벨 형상'
roles = np.array([t[6] for t in traj])
labs = np.array([t[7] for t in traj])
rets = np.array([t[5] for t in traj], dtype=np.float64)

assert set(np.unique(roles)) <= {0, 1, 2}
assert labs.min() >= 0 and labs.max() <= 5
# 프렌드 좌석의 라벨은 자기 자신(rel 0)
assert (labs[roles == 1] == 0).all(), '프렌드 좌석 라벨은 rel0'
# 주공 좌석은 자기 자신을 프렌드로 라벨하지 않음
assert not (labs[roles == 0] == 0).any(), '주공 라벨 rel0 금지'
# 셰이핑 범위: |R| ≤ 6.0 (노기루다캡 3000 × 셀프주공지분 4 / PRIZE_SCALE) + shape×2
assert np.isfinite(rets).all() and np.abs(rets).max() <= 6.0 + 2 * SHAPE + 1e-6, \
    f'ret 범위 초과 {np.abs(rets).max()}'
# 역할 분포: 야당 > 주공, 프렌드 존재
assert (roles == 2).sum() > (roles == 0).sum() > 0 and (roles == 1).sum() > 0

assert 0.0 <= redeal <= 1.0
print(f'steps {len(traj)} | 유찰율 {redeal:.2f} | 주공 {(roles==0).sum()} 프렌드 {(roles==1).sum()} '
      f'야당 {(roles==2).sum()} | ret [{rets.min():+.2f},{rets.max():+.2f}] | OK')
