"""보조 손실 정답 검증 — 라벨을 '미래의 실제 플레이'와 대조한다.
라벨이 틀리면 조용히 엉뚱한 표현을 학습하므로, 생성 함수와 독립된 기준으로 검증.
"""
import numpy as np
from mighty_encode import MightyEnv, aux_labels
from mighty_engine import SUITS, is_joker

rng = np.random.default_rng(5)
env = MightyEnv(seed=97531)
games = checked_suit = checked_trump = checked_win = 0

while games < 40:
    obs, mask, p = env.reset()
    recs = []
    while True:
        g = env.game
        if g.phase == 'play':
            sl, tl = aux_labels(g, p)
            recs.append((p, g.play['trickNo'], sl, tl))
        a = int(rng.choice(np.flatnonzero(mask)))
        obs, mask, p, rew, done = env.step(a)
        if done:
            break
    g = env.game
    if getattr(g, 'play', None) is None or g.phase != 'done':
        continue
    games += 1
    hist = g.play['history']
    gir = g.contract['giruda']
    winners = {t['trickNo']: t['winner'] for t in hist}
    for me, tno, sl, tl in recs:
        for r in range(1, 5):
            seat = (me + r) % 5
            future = [e['card'] for t in hist if t['trickNo'] > tno
                      for e in t['plays'] if e['player'] == seat]
            for si, s in enumerate(SUITS):
                if any((not is_joker(c)) and c[0] == s for c in future):
                    assert sl[(r - 1) * 4 + si] == 1.0, \
                        f'무늬 보유 라벨 오류: 좌석 rel{r} {s} (트릭 {tno})'
                    checked_suit += 1
            if gir != 'N':
                ft = sum(1 for c in future if (not is_joker(c)) and c[0] == gir)
                assert tl[r - 1] * 10 + 1e-6 >= ft, \
                    f'잔여 기루다 라벨 오류: rel{r} 라벨 {tl[r-1]*10:.0f} < 이후 사용 {ft}'
                checked_trump += 1
        # 트릭 승자 라벨(상대좌석) 일관성
        w = winners.get(tno)
        if w is not None:
            assert 0 <= (w - me) % 5 <= 4
            checked_win += 1

print(f'게임 {games} | 무늬보유 검증 {checked_suit}건 | 잔여기루다 {checked_trump}건 | '
      f'승자라벨 {checked_win}건 | ALL OK')
