"""mighty-master.js 인코더(관측/마스크) ↔ mighty_encode.py 파리티 검증.
휴리스틱 자가대전 N게임의 모든 결정 시점: 전좌석 obs + 현재좌석 mask 비교,
exchange 직전엔 floor 부분선택(pick 1·2장) 상태도 비교."""
import json, subprocess, sys, numpy as np
from mighty_engine import MightyGame, parse_card
from mighty_encode import MightyEnv, encode, is_joker
sys.path.insert(0, '.')
from bench_vs_heuristic import de_action, ser_py

N = int(sys.argv[1]) if len(sys.argv) > 1 else 40
br = subprocess.Popen(['node', 'parity-encode-bridge.js'], stdin=subprocess.PIPE,
                      stdout=subprocess.PIPE, text=True, bufsize=1)
def send(msg):
    br.stdin.write(json.dumps(msg) + '\n'); br.stdin.flush()
    r = json.loads(br.stdout.readline())
    assert 'error' not in r, r
    return r

shim = MightyEnv.__new__(MightyEnv)
games = decisions = comps = 0
maxdiff = 0.0
seed = 90000
while games < N:
    seed += 1
    js = send({'op': 'new', 'seed': seed})
    if js['phase'] == 'redeal':
        continue
    g = MightyGame({'seed': seed}); g.rng(); g.start(js['dealer'])
    shim.game = g
    while js['phase'] not in ('done', 'redeal'):
        p = g.current_player
        assert p == js['current'], f'seed {seed}: turn desync'
        rec = send({'op': 'decide'})['action']
        picks = [[]]
        if rec['type'] == 'exchange':
            cards = [parse_card(c) for c in rec['discard']]
            picks += [cards[:1], cards[:2]]
        for pick in picks:
            for seat in range(5):
                jso = send({'op': 'obs', 'seat': seat, 'pick': [ser_py(c) for c in pick]})
                shim.pick = list(pick)
                po = encode(g, seat, pick)
                jarr = np.array(jso['obs'], dtype=np.float32)
                d = float(np.abs(po - jarr).max())
                maxdiff = max(maxdiff, d)
                assert d < 1e-6, f'seed {seed} seat {seat} pick{len(pick)}: obs diff {d} @ {np.abs(po-jarr).argmax()}'
                if seat == p:
                    pm = shim.legal_mask().astype(np.uint8)
                    if g.phase == 'bidding': pm[0] = 1   # JS는 실룰(패스 허용)
                    jm = np.array(jso['mask'], dtype=np.uint8)
                    assert (pm == jm).all(), f'seed {seed}: mask diff @ {np.flatnonzero(pm!=jm)}'
                comps += 1
        st = send({'op': 'commit'})
        g.act(de_action(rec))
        js = {'phase': st['phase'], 'current': st['current']}
        decisions += 1
    games += 1
br.stdin.close(); br.terminate()
print(f'games {games} | decisions {decisions} | comparisons {comps} | obs maxdiff {maxdiff:.2e} | PARITY OK')
