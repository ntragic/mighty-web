"""Phase 2 미러 동기·표본 불변식 검증 (모든 라운드 동기 확인)."""
import numpy as np, torch
from mixed_collector import MixedCollector
from train_ppo import PolicyValueNet

net = PolicyValueNet(64, 2, aux_head=True)
col = MixedCollector(16, 909, 'cpu', sync_every=1)   # 매 라운드 동기 검증
traj, prizes, cstat = col.collect(net, 6000)
redeal = cstat['redeal']

# 학습 표본은 net 좌석에서만 나와야 한다
assert traj and all(len(t) == 11 for t in traj), '궤적 스키마 11필드'
assert all(t[8].shape == (16,) and t[9].shape == (4,) for t in traj), '보조 라벨 형상'
lw = np.array([t[10] for t in traj])
assert lw.min() >= -1 and lw.max() <= 4, '트릭 승자 라벨 범위'
play_frac = (lw >= 0).mean()
assert 0.5 < play_frac < 1.0, f'플레이 페이즈 비율 이상 {play_frac:.2f}'
roles = np.array([t[6] for t in traj]); labs = np.array([t[7] for t in traj])
rets = np.array([t[5] for t in traj], dtype=np.float64)
assert set(np.unique(roles)) <= {0, 1, 2}
assert (labs[roles == 1] == 0).all(), '프렌드 좌석 라벨은 rel0'
assert not (labs[roles == 0] == 0).any(), '주공 라벨 rel0 금지'
assert np.isfinite(rets).all() and np.abs(rets).max() <= 6.0 + 1e-6
assert len(prizes) > 20 and 0.0 <= redeal <= 1.0
assert 0.0 <= cstat['decl_rate'] <= 1.0 and 0.0 <= cstat['key_waste'] <= 1.0
# 파트너 혼합이 실제로 일어났는지: 좌석배치 다양성
sizes = {len(s) for s in col.net_seats}
assert sizes & {1, 2}, f'파트너 혼합 배치가 없음 {sizes}'
# 역할 표적 배치가 실제로 지켜지는가 (진행 중인 판을 직접 검사)
checked = 0
for i in range(col.n):
    g = col.envs[i].game
    if col.pending[i] or g.phase != 'play' or g.declarer is None:
        continue
    if col.mode[i] in ('defenders', 'ruling') and not col.resolved[i]:
        continue          # 초구·셀프프렌드는 전원 학습으로 폴백 (정상)
    if col.mode[i] == 'defenders':
        assert g.declarer not in col.net_seats[i], 'defenders 배치에 주공이 학습 좌석'
        assert len(col.net_seats[i]) == 3, f'defenders 좌석 수 {len(col.net_seats[i])}'
        checked += 1
    elif col.mode[i] == 'ruling':
        assert g.declarer in col.net_seats[i], 'ruling 배치에 주공이 빠짐'
        assert len(col.net_seats[i]) == 2, f'ruling 좌석 수 {len(col.net_seats[i])}'
        checked += 1
    # 스냅샷 좌석과 학습 좌석은 겹치지 않아야 한다
    assert not (set(col.snap_seats[i]) & col.net_seats[i]), '스냅샷·학습 좌석 중복'
assert checked >= 3, f'역할 표적 배치 검사 표본 부족 {checked}'
print(f'역할 표적 배치 검사 {checked}건 통과')
col.close()
print(f'steps {len(traj)} | 게임 {len(prizes)} | 유찰율 {redeal:.2f} | '
      f'주공 {(roles==0).sum()} 프렌드 {(roles==1).sum()} 야당 {(roles==2).sum()} | '
      f'배치 {sorted(sizes)} | 주공비율 {cstat["decl_rate"]:.2f} '
      f'주공승률 {cstat["decl_win"]:.2f} | 키카드낭비 {cstat["key_waste"]*100:.1f}% | 동기 OK')
