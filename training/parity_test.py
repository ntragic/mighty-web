"""JS 트레이스를 Python 엔진에서 재생하여 결과 완전 일치 검증."""
import json, sys
sys.path.insert(0, '.')
from mighty_engine import MightyGame, parse_card

def de_action(a):
    out = {'type': a['type']}
    if a['type'] == 'bid':
        out.update(count=a['count'], giruda=a['giruda'])
    elif a['type'] == 'exchange':
        out['discard'] = [parse_card(c) for c in a['discard']]
        if 'revise' in a: out['revise'] = a['revise']
    elif a['type'] == 'friend':
        out['mode'] = a['mode']
        if 'card' in a: out['card'] = parse_card(a['card'])
    elif a['type'] in ('dealMiss', 'proceed'):
        pass
    elif a['type'] == 'play':
        out['card'] = parse_card(a['card'])
        if 'jokerSuit' in a: out['jokerSuit'] = a['jokerSuit']
        if 'jokerCall' in a: out['jokerCall'] = True
    return out

ok = fail = 0
for line in open('../tools/../training/traces.jsonl'):
    t = json.loads(line)
    g = MightyGame({'seed': t['seed']})
    _ = g.rng()  # JS에서 dealer 선택에 rng 1회 소모
    g.start(t['dealer'])
    assert g.phase == 'bidding', f"seed {t['seed']}: unexpected {g.phase}"
    try:
        for a in t['actions']:
            g.act(de_action(a))
        r, jr = g.result, t['result']
        checks = [
            r['declarer'] == jr['declarer'], r['friend'] == jr['friend'],
            r['contract'] == jr['contract'], r['yeodangPoints'] == jr['yeodangPoints'],
            r['win'] == jr['win'], r['score'] == jr['score'], r['prize'] == jr['prize'],
            r['prizes'] == jr['prizes'], r['tricksWon'] == jr['tricksWon'],
            r['capturedPoints'] == jr['capturedPoints'],
        ]
        if all(checks): ok += 1
        else:
            fail += 1
            if fail <= 3: print('MISMATCH seed', t['seed'], checks, r, jr)
    except Exception as e:
        fail += 1
        if fail <= 3: print('ERROR seed', t['seed'], e)

print(f'parity: {ok} ok / {fail} fail')
sys.exit(1 if fail else 0)
