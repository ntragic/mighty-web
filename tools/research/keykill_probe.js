/**
 * 특수카드 무력화 탐침 — 조커콜(조커 무력화)과 마이티 무늬 리드(마이티 무력화)의
 * 가치가 **평가 깊이**에 따라 어떻게 달라지는지 잰다.
 *
 * 문제의식: v13에서 조커콜 라벨을 과표집·가중했더니 야당의 이득형 조커콜 사용률이
 * 85.9% → 55.8%로 더 떨어졌다. 조커콜의 이득(아군 조커를 헐값에 뽑아 무력화)은
 * 조커가 사라진 **뒤 여러 트릭에 걸쳐** 실현되는데, 라벨을 깊이 3에서 잘라 가치
 * 헤드로 평가하면 즉각 손실(내 리드를 최저 카드로 버림)만 보인다. 그 잘못된
 * 라벨을 20배 가중하면 오히려 악화된다 — 이 가설을 직접 검정한다.
 *
 * 같은 국면·같은 결정화 벌에서 깊이만 바꿔 후보 가치를 재고, 무력화 수의 순위가
 * 어떻게 이동하는지 본다. 함께 찍는 국면 특징(사용자 지적):
 *   - 마이티 무늬 미출현 장수 (뽑을 여지가 얼마나 남았나)
 *   - 마이티 출현 여부 (이미 나갔으면 무력화 대상이 없다)
 *   - 조커 출현 여부
 *
 * 사용: node tools/research/keykill_probe.js [판수] [결정화수]
 *   env MODEL · SEED_BASE · KIND(jcall|mighty|both, 기본 both)
 */
'use strict';
const path = require('path');
const P = p => path.join(__dirname, p);
const ort = require('onnxruntime-node');
const E = require(P('../../src/mighty-engine.js'));
const AI = require(P('../../src/mighty-ai.js'));
const M = require(P('../../src/mighty-master.js'));
const MODEL = process.env.MODEL || P('../../web/model/mighty_master_v9.onnx');
const SEED0 = parseInt(process.env.SEED_BASE || '41000000', 10);
const KIND = process.env.KIND || 'both';
const DEPTHS = [3, 0];                       // 0 = 끝까지

const SUITS = ['S', 'D', 'H', 'C'];
const allCards = () => {
  const out = [E.JOKER];
  for (const s of SUITS) for (let r = 2; r <= 14; r++) out.push({ suit: s, rank: r });
  return out;
};
const knownTo = (g, seat) => {
  const seen = new Set();
  for (const t of g.play.history) for (const e of t.plays) seen.add(E.cardId(e.card));
  for (const e of g.play.table) seen.add(E.cardId(e.card));
  for (const c of g.hands[seat]) seen.add(E.cardId(c));
  if (seat === g.declarer && g.discard) for (const c of g.discard) seen.add(E.cardId(c));
  return seen;
};
function voidsOf(g) {
  const v = [];
  for (let p = 0; p < E.NUM_PLAYERS; p++) v.push(new Set());
  const scan = (plays, led) => {
    if (!led) return;
    for (const e of plays) {
      if (E.isJoker(e.card)) continue;
      if (e.card.suit !== led) v[e.player].add(led);
    }
  };
  for (const t of g.play.history)
    scan(t.plays, t.ledSuit || (t.plays[0] && !E.isJoker(t.plays[0].card) ? t.plays[0].card.suit : null));
  scan(g.play.table, g.play.ledSuit);
  return v;
}
function cloneGame(g) {
  const c = Object.create(Object.getPrototypeOf(g));
  for (const k of Object.keys(g)) {
    const v = g[k];
    c[k] = (typeof v === 'object' && v !== null) ? structuredClone(v) : v;
  }
  return c;
}
function determinize(g, seat, rnd) {
  const known = knownTo(g, seat);
  const pool = allCards().filter(c => !known.has(E.cardId(c)));
  const need = [];
  for (let p = 0; p < E.NUM_PLAYERS; p++) if (p !== seat) need.push({ seat: p, n: g.hands[p].length });
  const kittyN = (seat === g.declarer || !g.discard) ? 0 : g.discard.length;
  if (need.reduce((a, b) => a + b.n, 0) + kittyN !== pool.length) return null;
  const vd = voidsOf(g);
  const order = need.slice().sort((a, b) => vd[b.seat].size - vd[a.seat].size);
  for (let attempt = 0; attempt < 40; attempt++) {
    const bag = pool.slice();
    for (let i = bag.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [bag[i], bag[j]] = [bag[j], bag[i]];
    }
    const assign = new Map(); let ok = true;
    for (const { seat: p, n } of order) {
      const take = [];
      for (let i = 0; i < bag.length && take.length < n; i++) {
        const c = bag[i];
        if (!E.isJoker(c) && vd[p].has(c.suit)) continue;
        take.push(c); bag[i] = null;
      }
      if (take.length < n) { ok = false; break; }
      for (let i = bag.length - 1; i >= 0; i--) if (bag[i] === null) bag.splice(i, 1);
      assign.set(p, take);
    }
    if (!ok || bag.length !== kittyN) continue;
    const clone = cloneGame(g);
    for (const [p, cards] of assign) clone.hands[p] = cards;
    if (kittyN) clone.discard = bag;
    return clone;
  }
  return null;
}
async function valueOf(sess, g, seat) {
  let obs = M.encodeObs(g, seat, []);
  const mask = M.legalMask(g, []);
  const want = M.modelObsDim(sess);
  if (want !== M.OBS_DIM) obs = obs.subarray(0, want);
  const out = await sess.run({
    obs: new ort.Tensor('float32', obs, [1, want]),
    mask: new ort.Tensor('bool', mask, [1, M.ACTION_DIM]),
  });
  return out.value ? out.value.data[0] : 0;
}

/** 확정 야당인가 (좌석 가시 정보만) */
function surelyOpp(g, seat) {
  const fd = g.friendDecl;
  const holdsFriendCard = fd && fd.mode === 'card' && fd.card &&
    g.hands[seat].some(c => E.sameCard(c, fd.card));
  return seat !== g.declarer && !holdsFriendCard &&
    !(g.friendRevealed && seat === g.friend);
}

/** 국면 특징 — 사용자 지적 항목 */
function features(g, seat) {
  const seen = knownTo(g, seat);
  const ms = g.mightyCard.suit;
  let msLeft = 0;
  for (let r = 2; r <= 14; r++) if (!seen.has(ms + r)) msLeft++;
  return {
    mightyOut: seen.has(E.cardId(g.mightyCard)) && !g.hands[seat].some(c => E.sameCard(c, g.mightyCard)),
    jokerOut: seen.has(E.JOKER) && !g.hands[seat].some(c => E.isJoker(c)),
    msLeft,                                   // 마이티 무늬 미출현 장수(내 손 제외)
    trick: g.play.trickNo,
  };
}

(async () => {
  const N = parseInt(process.argv[2] || '400', 10);
  const K = parseInt(process.argv[3] || '64', 10);
  const sess = await ort.InferenceSession.create(MODEL);
  let sc = 1; const rnd = () => { sc = (sc * 1103515245 + 12345) & 0x7fffffff; return sc / 0x7fffffff; };
  const ag = [];
  for (let s = 0; s < E.NUM_PLAYERS; s++)
    ag.push(await AI.createAgent({ tier: 'master', session: sess, ort }));

  const rows = [];
  for (let i = 0; i < N && rows.length < 60; i++) {
    const seed = SEED0 + i;
    const rng = E.makeRng(seed);
    const g = new E.MightyGame({ seed });
    g.start(Math.floor(rng() * E.NUM_PLAYERS));
    let guard = 0;
    while (g.phase !== 'done' && g.phase !== 'redeal' && guard++ < 900) {
      const p = g.currentPlayer;
      const act = await ag[p].act(g, p);
      if (g.phase === 'play' && g.play.table.length === 0 && surelyOpp(g, p)
          && !g.hands[p].some(c => E.isJoker(c))) {
        const legal = g._legalPlays(p);
        const call = legal.find(m => m.jokerCall);
        const f = features(g, p);
        // 무력화 후보: 조커콜 / 마이티 무늬 리드(마이티 미출현·미보유 시)
        const ms = g.mightyCard.suit;
        const mLead = legal.find(m => !m.jokerCall && !E.isJoker(m.card)
          && m.card.suit === ms && !E.sameCard(m.card, g.mightyCard));
        const wantJC = call && !f.jokerOut && (KIND === 'jcall' || KIND === 'both');
        const wantMT = mLead && !f.mightyOut && (KIND === 'mighty' || KIND === 'both');
        if (wantJC || wantMT) {
          const dets = [];
          for (let k = 0; k < K; k++) { const d = determinize(g, p, rnd); if (d) dets.push(d); }
          if (dets.length >= 16) {
            // 후보 집합: 무력화 수 + 정책 상위 3
            let obs = M.encodeObs(g, p, []);
            const mask = M.legalMask(g, []);
            const want = M.modelObsDim(sess);
            if (want !== M.OBS_DIM) obs = obs.subarray(0, want);
            const out = await sess.run({
              obs: new ort.Tensor('float32', obs, [1, want]),
              mask: new ort.Tensor('bool', mask, [1, M.ACTION_DIM]),
            });
            const lg = out.logits.data;
            const idxs = [];
            for (let a = 0; a < M.ACTION_DIM; a++) if (mask[a]) idxs.push(a);
            idxs.sort((a, b) => lg[b] - lg[a]);
            const cands = new Set(idxs.slice(0, 3));
            const jcIdx = wantJC ? 206 : -1;
            const mtIdx = wantMT ? 149 + M.cidx(mLead.card) : -1;
            if (wantJC) cands.add(206);
            if (wantMT) cands.add(mtIdx);
            const res = {};
            for (const depth of DEPTHS) {
              const sc2 = [];
              for (const ci of cands) {
                let sum = 0, n = 0;
                for (const d of dets) {
                  const sim = cloneGame(d);
                  const a0 = M.actionToEngine(ci, sim, []);
                  if (!a0) continue;
                  try { sim.act(a0); } catch (e) { continue; }
                  const stop = sim.play ? sim.play.trickNo + depth : 99;
                  let gd = 0;
                  while (sim.phase !== 'done' && sim.phase !== 'redeal' && gd++ < 200) {
                    if (depth > 0 && sim.play && sim.play.trickNo >= stop
                        && sim.play.table.length === 0) break;
                    const q = sim.currentPlayer;
                    sim.act(await ag[q].act(sim, q));
                  }
                  const v = sim.phase === 'done' ? sim.result.prizes[p] / 1000
                    : await valueOf(sess, sim, p);
                  sum += v; n++;
                }
                if (n) sc2.push({ i: ci, v: sum / n });
              }
              sc2.sort((a, b) => b.v - a.v);
              res[depth] = sc2;
            }
            const rank = (arr, ii) => { const k = arr.findIndex(x => x.i === ii); return k < 0 ? 99 : k + 1; };
            rows.push({
              seed, trick: f.trick, msLeft: f.msLeft, mightyOut: f.mightyOut, jokerOut: f.jokerOut,
              jcR3: wantJC ? rank(res[3], 206) : null, jcR0: wantJC ? rank(res[0], 206) : null,
              mtR3: wantMT ? rank(res[3], mtIdx) : null, mtR0: wantMT ? rank(res[0], mtIdx) : null,
              jcV3: wantJC ? (res[3].find(x => x.i === 206) || {}).v : null,
              jcV0: wantJC ? (res[0].find(x => x.i === 206) || {}).v : null,
            });
          }
        }
      }
      g.act(act);
    }
  }

  const jc = rows.filter(r => r.jcR3 !== null);
  const mt = rows.filter(r => r.mtR3 !== null);
  const top1 = (a, k) => a.filter(r => r[k] === 1).length;
  console.log(`${path.basename(MODEL)} · 국면 ${rows.length}건 (조커콜 ${jc.length} · 마이티 리드 ${mt.length}) · 결정화 ${K}벌`);
  if (jc.length) {
    console.log(`조커콜이 1순위인 비율 — 깊이3 ${(100 * top1(jc, 'jcR3') / jc.length).toFixed(0)}% ` +
      `→ 끝까지 ${(100 * top1(jc, 'jcR0') / jc.length).toFixed(0)}%`);
    const dv = jc.filter(r => r.jcV3 != null && r.jcV0 != null)
      .map(r => (r.jcV0 - r.jcV3) * 1000);
    if (dv.length) {
      const m = dv.reduce((a, b) => a + b, 0) / dv.length;
      console.log(`조커콜 가치 변화(끝까지 − 깊이3) 평균 ${m >= 0 ? '+' : ''}${m.toFixed(0)} (n=${dv.length})`);
    }
    const near = jc.filter(r => r.msLeft >= 6), far = jc.filter(r => r.msLeft < 6);
    if (near.length && far.length)
      console.log(`  마이티 무늬 잔여 6장 이상: 1순위 ${(100 * top1(near, 'jcR0') / near.length).toFixed(0)}% · ` +
        `6장 미만: ${(100 * top1(far, 'jcR0') / far.length).toFixed(0)}%`);
  }
  if (mt.length) {
    console.log(`마이티 무늬 리드가 1순위인 비율 — 깊이3 ${(100 * top1(mt, 'mtR3') / mt.length).toFixed(0)}% ` +
      `→ 끝까지 ${(100 * top1(mt, 'mtR0') / mt.length).toFixed(0)}%`);
  }
})();
