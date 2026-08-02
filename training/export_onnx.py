"""ckpt → ONNX (브라우저 onnxruntime-web용).
입력 obs[B,606] f32, mask[B,209] bool → 출력 logits[B,209] (illegal=-1e9).
사용: python export_onnx.py [--ckpt ckpt/latest_slim.pt] [--out mighty_master.onnx]
"""
import argparse, numpy as np, torch
from mighty_encode import MightyEnv, OBS_DIM, ACTION_DIM
from train_ppo import PolicyValueNet

class PolicyOnly(torch.nn.Module):
    def __init__(self, net):
        super().__init__()
        self.net = net
    def forward(self, obs, mask):
        logits, _ = self.net(obs, mask)
        return logits

def real_states(n, seed=31337):
    """실게임 랜덤 롤아웃에서 관측/마스크 샘플 수집 (검증용)"""
    rng = np.random.default_rng(seed)
    env = MightyEnv(seed=seed)
    obs, mask, p = env.reset()
    out = []
    while len(out) < n:
        out.append((obs.copy(), mask.copy()))
        a = int(rng.choice(np.flatnonzero(mask)))
        obs, mask, p, rew, done = env.step(a)
        if done:
            obs, mask, p = env.reset()
    return out

if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--ckpt', default='ckpt/latest_slim.pt')
    ap.add_argument('--out', default='mighty_master.onnx')
    ap.add_argument('--hidden', type=int, default=1024)
    ap.add_argument('--depth', type=int, default=4)
    args = ap.parse_args()

    ck = torch.load(args.ckpt, map_location='cpu', weights_only=False)
    assert ck['obs_dim'] == OBS_DIM and ck['action_dim'] == ACTION_DIM
    hidden = ck.get('hidden', args.hidden)
    depth = ck.get('depth', args.depth)
    net = PolicyValueNet(hidden, depth, aux_head=ck.get('aux_head', False))
    net.load_state_dict(ck['net']); net.eval()
    print(f'hidden {hidden} depth {depth} aux_head {ck.get("aux_head", False)}')
    model = PolicyOnly(net).eval()

    d_obs = torch.zeros(1, OBS_DIM)
    d_mask = torch.ones(1, ACTION_DIM, dtype=torch.bool)
    torch.onnx.export(model, (d_obs, d_mask), args.out,
                      input_names=['obs', 'mask'], output_names=['logits'],
                      dynamic_axes={'obs': {0: 'B'}, 'mask': {0: 'B'}, 'logits': {0: 'B'}},
                      opset_version=17)

    # 수치 검증: torch vs onnxruntime, 실게임 상태 200개
    import onnxruntime as ort
    sess = ort.InferenceSession(args.out, providers=['CPUExecutionProvider'])
    states = real_states(200)
    maxdiff = 0.0; agree = 0
    for obs, mask in states:
        with torch.no_grad():
            t = model(torch.as_tensor(obs)[None], torch.as_tensor(mask)[None])[0].numpy()
        r = sess.run(None, {'obs': obs[None], 'mask': mask[None]})[0][0]
        legal = np.flatnonzero(mask)
        maxdiff = max(maxdiff, float(np.abs(t[legal] - r[legal]).max()))
        agree += int(legal[t[legal].argmax()] == legal[r[legal].argmax()])
    print(f'update {ck.get("update")} | maxdiff(legal logits) {maxdiff:.2e} | argmax 일치 {agree}/200')
    import os
    print(f'saved {args.out} ({os.path.getsize(args.out)/1e6:.1f} MB)')
