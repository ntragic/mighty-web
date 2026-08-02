"""학습 정책 벤치마크: NN 1좌석 vs 상대 4좌석(random), 좌석 로테이션.
사용: python eval_policy.py --ckpt ckpt/latest_slim.pt --games 2000
"""
import argparse, numpy as np, torch
from mighty_encode import MightyEnv, OBS_DIM, ACTION_DIM
from train_ppo import PolicyValueNet

def act_nn(net, obs, mask):
    with torch.no_grad():
        logits, _ = net(torch.as_tensor(obs)[None], torch.as_tensor(mask)[None])
    return int(logits[0].argmax())

def run(net, games, seed, rng):
    # NN이 앉는 좌석을 게임마다 로테이션, 나머지는 랜덤 정책
    prizes_nn, prizes_opp = [], []
    decl_cnt = decl_win = nn_decl_cnt = nn_decl_win = 0
    env = MightyEnv(seed=seed)
    for gi in range(games):
        nn_seat = gi % 5
        obs, mask, p = env.reset()
        while True:
            a = act_nn(net, obs, mask) if p == nn_seat else int(rng.choice(np.flatnonzero(mask)))
            obs, mask, p, rew, done = env.step(a)
            if done:
                prizes_nn.append(rew[nn_seat] * MightyEnv.PRIZE_SCALE)
                prizes_opp.append(np.delete(rew, nn_seat).mean() * MightyEnv.PRIZE_SCALE)
                g = env.game
                if getattr(g, 'result', None) and g.result.get('prizes'):
                    d = g.declarer
                    won = g.result['prizes'][d] > 0
                    decl_cnt += 1; decl_win += won
                    if d == nn_seat:
                        nn_decl_cnt += 1; nn_decl_win += won
                break
    return (np.array(prizes_nn), np.array(prizes_opp),
            decl_cnt, decl_win, nn_decl_cnt, nn_decl_win)

if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--ckpt', default='ckpt/latest_slim.pt')
    ap.add_argument('--games', type=int, default=2000)
    ap.add_argument('--hidden', type=int, default=1024)
    ap.add_argument('--depth', type=int, default=4)
    ap.add_argument('--seed', type=int, default=777)
    args = ap.parse_args()

    ck = torch.load(args.ckpt, map_location='cpu', weights_only=False)
    net = PolicyValueNet(args.hidden, args.depth)
    net.load_state_dict(ck['net']); net.eval()
    print(f"ckpt update {ck.get('update')} | games {args.games}")
    rng = np.random.default_rng(args.seed)

    pn, po, dc, dw, nc, nw = run(net, args.games, args.seed, rng)
    print(f"NN 좌석 평균상금  {pn.mean():+8.1f} (±{pn.std()/len(pn)**.5:.1f})")
    print(f"상대 좌석 평균상금 {po.mean():+8.1f}")
    print(f"주공 승률(전체)   {dw}/{dc} = {dw/max(dc,1):.1%}")
    print(f"주공 승률(NN주공) {nw}/{nc} = {nw/max(nc,1):.1%} (NN 주공빈도 {nc/max(dc,1):.1%}, 기대 20%)")
