"""NN(1좌석, greedy) vs 휴리스틱 v2(4좌석) 혼성 테이블 벤치마크.
JS/Python 엔진 락스텝 동기(파리티 검증 전제), 매 게임 결과 일치 assert.
사용: python bench_vs_heuristic.py --games 500
"""
import argparse, json, subprocess, numpy as np, torch
from mighty_engine import MightyGame, parse_card
from mighty_encode import (MightyEnv, encode, A_PASS, A_DEALMISS, A_PROCEED, A_DISC0,
                           A_FRIEND0, A_FRIEND_FIRST, A_FRIEND_NONE, A_PLAY0,
                           A_PLAY_JOKER, A_PLAY_JOKER_SUIT0, A_PLAY_JOKERCALL,
                           idx_card, decode_bid, SUITS, is_joker)
from train_ppo import PolicyValueNet

ser_py = lambda c: 'JOKER' if is_joker(c) else c[0] + str(c[1])

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
    elif a['type'] == 'play':
        out['card'] = parse_card(a['card'])
        if 'jokerSuit' in a: out['jokerSuit'] = a['jokerSuit']
        if 'jokerCall' in a: out['jokerCall'] = True
    return out

def nn_rec(a, g, pick):
    """NN 행동 int → JS 직렬 rec. floor는 3장 모일 때까지 None."""
    if a == A_PASS: return {'type': 'pass'}
    if a == A_DEALMISS: return {'type': 'dealMiss'}
    if a == A_PROCEED: return {'type': 'proceed'}
    if A_DISC0 <= a < A_DISC0 + 53:
        pick.append(idx_card(a - A_DISC0))
        if len(pick) < 3: return None
        rec = {'type': 'exchange', 'discard': [ser_py(c) for c in pick]}
        pick.clear(); return rec
    if a == A_FRIEND_FIRST: return {'type': 'friend', 'mode': 'first'}
    if a == A_FRIEND_NONE: return {'type': 'friend', 'mode': 'none'}
    if A_FRIEND0 <= a < A_FRIEND0 + 53:
        return {'type': 'friend', 'mode': 'card', 'card': ser_py(idx_card(a - A_FRIEND0))}
    if a == A_PLAY_JOKER: return {'type': 'play', 'card': 'JOKER'}
    if A_PLAY_JOKER_SUIT0 <= a < A_PLAY_JOKER_SUIT0 + 4:
        return {'type': 'play', 'card': 'JOKER', 'jokerSuit': SUITS[a - A_PLAY_JOKER_SUIT0]}
    if a == A_PLAY_JOKERCALL:
        return {'type': 'play', 'card': ser_py(g.joker_call_card), 'jokerCall': True}
    if A_PLAY0 <= a < A_PLAY0 + 53:
        return {'type': 'play', 'card': ser_py(idx_card(a - A_PLAY0))}
    d = decode_bid(a)
    return {'type': 'bid', 'count': d['count'], 'giruda': d['giruda']}

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--ckpt', default='ckpt/latest_slim.pt')
    ap.add_argument('--games', type=int, default=500)
    ap.add_argument('--hidden', type=int, default=1024)
    ap.add_argument('--depth', type=int, default=4)
    ap.add_argument('--seed0', type=int, default=50000)
    ap.add_argument('--persona', default='balanced')
    args = ap.parse_args()

    ck = torch.load(args.ckpt, map_location='cpu', weights_only=False)
    net = PolicyValueNet(args.hidden, args.depth)
    net.load_state_dict(ck['net']); net.eval()

    br = subprocess.Popen(['node', 'bench-bridge.js'], stdin=subprocess.PIPE,
                          stdout=subprocess.PIPE, text=True, bufsize=1)
    def send(msg):
        br.stdin.write(json.dumps(msg) + '\n'); br.stdin.flush()
        r = json.loads(br.stdout.readline())
        assert 'error' not in r, r
        return r

    shim = MightyEnv.__new__(MightyEnv)
    prizes_nn, prizes_h = [], []
    decl_cnt = decl_win = nn_decl_cnt = nn_decl_win = redeals = 0
    roles = {'declarer': [0, 0], 'friend': [0, 0], 'defender': [0, 0]}  # [여당승, 판수]
    seed = args.seed0; done_games = 0
    while done_games < args.games:
        seed += 1
        js = send({'op': 'new', 'seed': seed, 'persona': args.persona})
        if js['phase'] == 'redeal': continue
        g = MightyGame({'seed': seed}); g.rng()
        g.start(js['dealer'])
        assert g.phase == js['phase'] == 'bidding', (g.phase, js['phase'])
        nn_seat = done_games % 5
        shim.game = g; shim.pick = []
        pick = []
        aborted = False
        while True:
            if js['phase'] == 'done':
                pj = js['prizes']
                pp = g.result['prizes']
                assert pp == pj, f'seed {seed}: prize mismatch {pp} vs {pj}'
                prizes_nn.append(pp[nn_seat])
                prizes_h.append(np.mean([pp[i] for i in range(5) if i != nn_seat]))
                d = js['declarer']; won = js['win']
                decl_cnt += 1; decl_win += bool(won)
                if d == nn_seat: nn_decl_cnt += 1; nn_decl_win += bool(won)
                fr = g.result.get('friend')
                role = ('declarer' if d == nn_seat else
                        'friend' if fr is not None and fr == nn_seat and fr != d else 'defender')
                roles[role][0] += bool(won); roles[role][1] += 1
                done_games += 1
                break
            if js['phase'] == 'redeal':
                redeals += 1; aborted = True; break
            p = g.current_player
            assert p == js['current'], f'seed {seed}: turn desync {p} vs {js["current"]}'
            if p == nn_seat:
                obs = encode(g, p, shim.pick)
                mask = shim.legal_mask()
                if g.phase == 'bidding': mask[A_PASS] = True   # 학습용 강제입찰 마스크 해제(실룰)
                with torch.no_grad():
                    logits, _ = net(torch.as_tensor(obs)[None], torch.as_tensor(mask)[None])
                a = int(logits[0].argmax())
                shim.pick = pick
                rec = nn_rec(a, g, pick)
                if rec is None:
                    continue
                g.act(de_action(rec))
                js = send({'op': 'apply', 'action': rec})
            else:
                js = send({'op': 'heur'})
                g.act(de_action(js['action']))
            assert g.phase == js['phase'], f'seed {seed}: phase desync {g.phase} vs {js["phase"]}'
    br.stdin.close(); br.terminate()

    pn, ph = np.array(prizes_nn, float), np.array(prizes_h, float)
    print(f'games {done_games} (redeal skip {redeals}) | persona {args.persona}')
    print(f'NN 좌석 평균상금      {pn.mean():+8.1f} (±{pn.std()/len(pn)**.5:.1f})')
    print(f'휴리스틱 좌석 평균상금 {ph.mean():+8.1f}')
    print(f'주공 승률(전체)       {decl_win}/{decl_cnt} = {decl_win/max(decl_cnt,1):.1%}')
    print(f'주공 승률(NN주공)     {nn_decl_win}/{nn_decl_cnt} = {nn_decl_win/max(nn_decl_cnt,1):.1%} (NN 주공빈도 {nn_decl_cnt/max(decl_cnt,1):.1%})')
    print('--- NN 역할별 여당(주공팀) 승률 ---')
    for k, lab in (('declarer', 'NN 주공   '), ('friend', 'NN 프렌드 '), ('defender', 'NN 야당   ')):
        w, n = roles[k]
        print(f'{lab} {w}/{n} = {w/max(n,1):.1%}')

if __name__ == '__main__':
    main()
