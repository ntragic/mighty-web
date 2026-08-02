"""
verify_rule.py — 주공 딜미스 차단 검증 (학습 시작 전 필수 실행)

사용: python verify_rule.py [게임수]
기대: '주공 창구 진입 0' + '강제 선언 거부 > 0'
"""
import sys, random
sys.path.insert(0, '.')
from mighty_engine import MightyGame

N = int(sys.argv[1]) if len(sys.argv) > 1 else 4000
bad = refused = done = windows = 0

for seed in range(N):
    g = MightyGame({'seed': seed})
    _ = g.rng()                      # JS와 동일하게 dealer 선택분 소모
    g.start(seed % 5)
    if g.phase != 'bidding':
        continue
    guard = 0
    while g.phase not in ('done', 'redeal'):
        ph = g.phase
        if ph == 'bidding':
            acts = [a for a in g.legal_bids() if a['type'] == 'bid']
            g.act(acts[0] if (acts and random.random() < 0.25) else {'type': 'pass'})
        elif ph == 'floor':
            # 최악의 경우를 만들기 위해 '높은 카드부터' 묻는다 (악용 시나리오 재현)
            hand = sorted(g.hands[g.declarer],
                          key=lambda c: -(0 if c == 'JOKER' else c[1]))
            g.act({'type': 'exchange', 'discard': hand[:3]})
        elif ph == 'friend':
            g.act({'type': 'friend', 'mode': 'card', 'card': g.mighty_card})
        elif ph == 'dealMissWindow':
            windows += 1
            if g.declarer in g.dm_queue:
                bad += 1
            # 주공의 강제 선언 시도가 거부되는지
            saved_q, saved_i = list(g.dm_queue), g.dm_idx
            g.dm_queue, g.dm_idx = [g.declarer], 0
            try:
                g.act({'type': 'dealMiss'})
                print('!! 주공 딜미스가 허용됨 seed', seed)
            except ValueError:
                refused += 1
            g.dm_queue, g.dm_idx = saved_q, saved_i
            g.act({'type': 'proceed'})
        elif ph == 'play':
            mv = g.legal_plays(g.current_player)[0]
            a = {'type': 'play', 'card': mv['card']}
            if 'jokerSuit' in mv:
                a['jokerSuit'] = mv['jokerSuit']
            g.act(a)
        guard += 1
        if guard > 800:
            break
    if g.phase == 'done':
        done += 1

print(f'완주 {done} / 딜미스 창구 {windows} / 주공 창구 진입 {bad} / 강제 선언 거부 {refused}')
assert bad == 0, '실패: 주공이 딜미스 창구에 들어간다'
assert refused > 0, '실패: 강제 선언이 거부되지 않았다(안전장치 미적용)'
print('PASS — 주공 딜미스 차단 확인')
