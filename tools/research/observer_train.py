"""은닉도 관전자 — 공개 특징으로 프렌드 좌석을 맞히는 소형 로지스틱.

후보 4좌석 공유 가중치: score = w·f(cand), softmax over 후보.
휴리스틱 프렌드 판으로 학습하고(인간 관례의 대리), 양쪽 소스에서
트릭별 top-1 식별 정확도를 잰다. 낮을수록 은닉이 좋은 것이다. 무작위 25%.

사용: python3 observer_train.py dump1.jsonl dump2.jsonl ...
"""
import json, sys
import numpy as np

rows = []
for fp in sys.argv[1:]:
    with open(fp) as f:
        for line in f:
            rows.append(json.loads(line))

def xy(rs):
    X = np.array([r['x'] for r in rs], dtype=np.float64)   # (n,4,8)
    y = np.array([r['y'] for r in rs])
    t = np.array([r['t'] for r in rs])
    return X, y, t

heur = [r for r in rows if r['src'] != 'master']
mast = [r for r in rows if r['src'] == 'master']
rng = np.random.default_rng(7)
idx = rng.permutation(len(heur))
cut = int(len(heur) * 0.8)
tr = [heur[i] for i in idx[:cut]]
te = [heur[i] for i in idx[cut:]]

Xtr, ytr, _ = xy(tr)
mu, sd = Xtr.reshape(-1, 8).mean(0), Xtr.reshape(-1, 8).std(0) + 1e-9
norm = lambda X: (X - mu) / sd

w = np.zeros(8)
b_ = 0.0
Xn = norm(Xtr)
for it in range(400):
    s = Xn @ w + b_                       # (n,4)
    s -= s.max(1, keepdims=True)
    p = np.exp(s); p /= p.sum(1, keepdims=True)
    g = p.copy()
    g[np.arange(len(ytr)), ytr] -= 1      # dL/ds
    gw = np.einsum('nc,ncf->f', g, Xn) / len(ytr)
    gb = g.mean()
    w -= 0.5 * gw
    b_ -= 0.5 * gb

def acc_by_trick(rs, label):
    X, y, t = xy(rs)
    s = norm(X) @ w + b_
    pred = s.argmax(1)
    print(f'\n{label}  (전체 {np.mean(pred == y) * 100:.1f}%, n={len(y)})')
    for tk in sorted(set(t)):
        m = t == tk
        print(f'  트릭 {tk:2d}  {np.mean(pred[m] == y[m]) * 100:5.1f}%  (n={m.sum()})')

print('관전자 학습: 휴리스틱 프렌드', len(tr), '행 · 무작위 기준 25%')
acc_by_trick(te, '휴리스틱 프렌드 (홀드아웃)')
if mast:
    acc_by_trick(mast, 'NN 프렌드 (master)')
