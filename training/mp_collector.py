"""멀티프로세스 수집기.

병목은 GPU가 아니라 단일 코어 CPU(관측 인코딩이 env.step의 72%)였다.
워커가 엔진·인코딩만 맡고 추론은 메인이 GPU에서 일괄 처리한다.
관측/마스크/행동은 공유메모리로 주고받아 라운드당 IPC를 인덱스 몇 개로 줄였다.
"""
from __future__ import annotations
import multiprocessing as mp
import numpy as np
import torch

from mighty_encode import OBS_DIM, ACTION_DIM
from mixed_collector import MixedCollector, derive_rates


def _worker(wid, n_envs, seed, budget_q, out_q, req_c, shm_names, sync_every, feed_coef, conv):
    from multiprocessing import shared_memory
    bufs, keep = {}, []
    for key, name, shape, dt in shm_names:
        sm = shared_memory.SharedMemory(name=name)
        keep.append(sm)
        bufs[key] = np.ndarray(shape, dtype=dt, buffer=sm.buf)
    obs_b, mask_b = bufs['obs'], bufs['mask']
    act_b, logp_b, val_b = bufs['act'], bufs['logp'], bufs['val']

    state = {'stop': False}

    def infer_fn(kind, k, obs, mask):
        n = len(obs)
        obs_b[:n] = obs
        mask_b[:n] = mask
        req_c.send((kind, k, n))
        if req_c.recv():                   # 메인이 전역 예산 도달을 알리면 종료
            state['stop'] = True
        return (act_b[:n].copy(), logp_b[:n].copy(), val_b[:n].copy())

    col = MixedCollector(n_envs, seed, 'cpu', sync_every=sync_every,
                         feed_coef=feed_coef, infer_fn=infer_fn, conv=conv)
    while True:
        job = budget_q.get()
        if job is None:
            break
        steps, n_snaps, force_bid = job
        col.n_snaps = n_snaps
        state['stop'] = False
        # 고정 예산 대신 메인의 종료 신호까지 계속 수집한다 (straggler 대기 제거)
        traj, prizes, redeal = col.collect(None, steps, snapshots=[None] * n_snaps,
                                           stop_fn=lambda: state['stop'],
                                           force_bid=force_bid)
        req_c.send(('done', None, 0))
        out_q.put((wid, traj, prizes, redeal))
    col.close()


class MPCollector:
    def __init__(self, n_envs, seed, device, n_workers=6, sync_every=200, feed_coef=0.0, conv=0.0):
        from multiprocessing import shared_memory
        ctx = mp.get_context('fork')
        self.device = device
        self.n_workers = n_workers
        self.per = max(1, n_envs // n_workers)
        self.shms, self.views, self.procs, self.conns = [], [], [], []
        self.budget_qs, self.out_q = [], ctx.Queue()
        cap = self.per
        specs = [('obs', (cap, OBS_DIM), np.float32), ('mask', (cap, ACTION_DIM), np.bool_),
                 ('act', (cap,), np.int64), ('logp', (cap,), np.float32),
                 ('val', (cap,), np.float32)]
        for w in range(n_workers):
            names, views = [], {}
            for nm, shape, dt in specs:
                sm = shared_memory.SharedMemory(
                    create=True, size=int(np.prod(shape)) * np.dtype(dt).itemsize)
                self.shms.append(sm)
                names.append((nm, sm.name, shape, dt))
                views[nm] = np.ndarray(shape, dtype=dt, buffer=sm.buf)
            self.views.append(views)
            parent_c, child_c = ctx.Pipe()
            bq = ctx.Queue()
            p = ctx.Process(target=_worker,
                            args=(w, self.per, seed + w * 7919, bq, self.out_q, child_c,
                                  names,
                                  sync_every, feed_coef, conv),
                            daemon=True)
            p.start()
            self.procs.append(p)
            self.conns.append(parent_c)
            self.budget_qs.append(bq)

    @torch.no_grad()
    def collect(self, net, n_steps, snapshots=None, force_bid=False):
        snapshots = snapshots or []
        # 워커별 상한은 넉넉히 두고, 전역 표본 예산에 도달하면 일제히 멈춘다.
        for bq in self.budget_qs:
            bq.put((n_steps, len(snapshots), float(force_bid)))
        active = set(range(self.n_workers))
        served, stop = 0, False
        while active:
            pend = []
            for w in list(active):
                kind, k, n = self.conns[w].recv()
                if kind == 'done':
                    active.discard(w)
                    continue
                if kind == 'net':
                    served += n
                pend.append((w, kind, k, n))
            if not stop and served >= n_steps:
                stop = True
            if not pend:
                continue
            # 같은 모델끼리 묶어 한 번에 추론
            groups = {}
            for w, kind, k, n in pend:
                groups.setdefault((kind, k), []).append((w, n))
            for (kind, k), items in groups.items():
                model = net if kind == 'net' else snapshots[k]
                obs = np.concatenate([self.views[w]['obs'][:n] for w, n in items])
                mask = np.concatenate([self.views[w]['mask'][:n] for w, n in items])
                o = torch.as_tensor(obs, device=self.device)
                m = torch.as_tensor(mask, device=self.device)
                logits, vals = model(o, m)
                dist = torch.distributions.Categorical(logits=logits)
                a = dist.sample()
                a_np = a.cpu().numpy()
                lp_np = dist.log_prob(a).float().cpu().numpy()
                v_np = vals.float().cpu().numpy()
                off = 0
                for w, n in items:
                    self.views[w]['act'][:n] = a_np[off:off + n]
                    self.views[w]['logp'][:n] = lp_np[off:off + n]
                    self.views[w]['val'][:n] = v_np[off:off + n]
                    off += n
            for w, kind, k, n in pend:
                self.conns[w].send(1 if stop else 0)
        traj, prizes = [], []
        keys = ('ep_n', 'redeal_n', 'decl_n', 'decl_win_n', 'kw_n', 'kc_n', 'seat_n')
        total = {k: 0 for k in keys}
        for _ in range(self.n_workers):
            wid, tj, pz, st = self.out_q.get()
            traj += tj
            prizes += pz
            for k in keys:                      # 비율이 아니라 카운터를 합산한다
                total[k] += st.get(k, 0)
        return traj, prizes, derive_rates(total)

    def close(self):
        for bq in self.budget_qs:
            bq.put(None)
        for p in self.procs:
            p.join(timeout=5)
            if p.is_alive():
                p.terminate()
        for sm in self.shms:
            try:
                sm.close(); sm.unlink()
            except Exception:
                pass
