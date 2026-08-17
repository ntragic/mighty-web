/**
 * 최적수가 공약에 따라 달라지는가 — 정책이 아니라 **탐색**에 묻는다.
 *
 * bidsens_probe는 정책의 공약 반응이 거의 0임을 보였다. 그런데 그게 결함인지는
 * 옳은 답이 공약에 따라 달라질 때만 성립한다. 교사 라벨 실사(2,461건)에서 PIMC는
 * v13의 개입 빈도에 동의했다(교사 46.1% vs 정책 46.6%) — 즉 "더 개입하라"는
 * 진단 자체가 근거가 없었다. 여기서는 같은 국면을 공약만 바꿔 PIMC로 풀어
 * **최적수가 실제로 바뀌는지** 본다. 안 바뀌면 정책의 무반응이 옳은 것이다.
 *
 * 사용: node tools/research/bidsens_pimc.js [국면수] [결정화수]
 *   env MODEL · SEED_BASE · BIDS(기본 '14,20')
 */
'use strict';
const path = require('path');
const P = p => path.join(__dirname, p);
const ort = require('onnxruntime-node');
const E = require(P('../../src/mighty-engine.js'));
const AI = require(P('../../src/mighty-ai.js'));
const M = require(P('../../src/mighty-master.js'));

const WANT = parseInt(process.argv[2] || '120', 10);
const K = parseInt(process.argv[3] || '48', 10);
const MODEL = process.env.MODEL || P('../../web/model/mighty_master_v13.onnx');
const SEED0 = parseInt(process.env.SEED_BASE || '55000000', 10);
const BIDS = (process.env.BIDS || '14,20').split(',').map(Number);
const TOPM = 5, A_PLAY0 = 149, A_JS0 = 201, A_JOKER = 205;
const SUITS = ['S', 'D', 'H', 'C'];

// --- 결정화 (pimc_label.js와 같은 제약: 좌석 가시 정보만) ---
const allCards = () => {
  const out = [E.JOKER];
  for (const s of SUITS) for (let r = 2; r <= 14; r++) out.push({ suit: s, rank: r });
  return out;
};
function knownTo(g, seat) {
  const seen = new Set();
  for (const t of g.play.history) for (const e of t.plays) seen.add(E.cardId(e.card));
  for (const e of g.play.table) seen.add(E.cardId(e.card));
  for (const c of g.hands[seat]) seen.add(E.cardId(c));
  if (seat === g.declarer && g.discard) for (const c of g.discard) seen.add(E.cardId(c));
  return seen;
}
function voidsOf(g) {
  const v = []; for (let p = 0; p < E.NUM_PLAYERS; p++) v.push(new Set());
  const scan = (plays, led) => {
    if (!led) return;
    for (const e of plays) { if (E.isJoker(e.card)) continue;
      if (e.card.suit !== led) v[e.player].add(led); }
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
      const j = Math.floor(rnd() * (i + 1)); [bag[i], bag[j]] = [bag[j], bag[i]];
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

function interveneClass(g, p) {
  if (g.phase !== 'play' || g.play.table.length === 0 || p === g.declarer) return null;
  const fd = g.friendDecl;
  if (!(fd && fd.mode === 'card' && fd.card && g.hands[p].some(c => E.sameCard(c, fd.card)))) return null;
  let best = null, bk = [-2, -1];
  for (const e of g.play.table) {
    const k = g._cardStrength(e, g.play);
    if (k[0] > bk[0] || (k[0] === bk[0] && k[1] > bk[1])) { bk = k; best = e; }
  }
  if (!best) return null;
  if (g._legalPlays(p).length < 2) return null;
  const ally = best.player === g.declarer || (g.friendRevealed && g.friend === best.player && best.player !== p);
  const behind = E.NUM_PLAYERS - 1 - g.play.table.length;
  return !ally ? 'oppwin' : (behind >= 2 ? 'weaklead' : null);
}
function winsTrick(g, mv, me) {
  const mine = g._cardStrength({ card: mv.card, jokerSuit: mv.jokerSuit, player: me,
                                 jokerCall: mv.jokerCall }, g.play);
  for (const e of g.play.table) {
    const k = g._cardStrength(e, g.play);
    if (k[0] > mine[0] || (k[0] === mine[0] && k[1] > mine[1])) return false;
  }
  return true;
}

(async () => {
  const sess = await ort.InferenceSession.create(MODEL);
  const ag = [];
  for (let s = 0; s < E.NUM_PLAYERS; s++) ag.push(await AI.createAgent({ tier: 'master', session: sess, ort }));
  let sc = 12345;
  const rnd = () => { sc = (sc * 1103515245 + 12345) & 0x7fffffff; return sc / 0x7fffffff; };

  let states = 0, diff = 0, winLo = 0, winHi = 0, deals = 0;
  for (let i = 0; states < WANT && i < 4000; i++) {
    const seed = SEED0 + i;
    const rng = E.makeRng(seed);
    const g = new E.MightyGame({ seed });
    g.start(Math.floor(rng() * E.NUM_PLAYERS));
    let guard = 0;
    while (g.phase !== 'done' && g.phase !== 'redeal' && guard++ < 900 && states < WANT) {
      const p = g.currentPlayer;
      if (interveneClass(g, p)) {
        const dets = [];
        for (let k = 0; k < K; k++) { const d = determinize(g, p, rnd); if (d) dets.push(d); }
        if (dets.length >= 8) {
          // 후보는 공약과 무관하게 정책 상위 TOPM으로 고정한다
          let obs = M.encodeObs(g, p, []);
          const mask = M.legalMask(g, []);
          const want = M.modelObsDim(sess);
          if (want !== M.OBS_DIM) obs = obs.subarray(0, want);
          const out = await sess.run({ obs: new ort.Tensor('float32', obs, [1, want]),
                                       mask: new ort.Tensor('bool', mask, [1, M.ACTION_DIM]) });
          const lg = out.logits.data;
          const idx = []; for (let a = 0; a < M.ACTION_DIM; a++) if (mask[a]) idx.push(a);
          idx.sort((a, b) => lg[b] - lg[a]);
          const cands = idx.slice(0, TOPM);
          if (cands.length > 1) {
            const bestAt = [];
            for (const bid of BIDS) {
              let bi = -1, bv = -Infinity;
              for (const ci of cands) {
                let sum = 0, n = 0;
                for (const d of dets) {
                  const sim = cloneGame(d);
                  sim.contract = { ...sim.contract, count: bid };   // 공약만 교체
                  const a0 = M.actionToEngine(ci, sim, []);
                  if (!a0) continue;
                  try { sim.act(a0); } catch (e) { continue; }
                  let gd = 0;
                  while (sim.phase !== 'done' && sim.phase !== 'redeal' && gd++ < 200) {
                    const q = sim.currentPlayer;
                    sim.act(await ag[q].act(sim, q));
                  }
                  if (sim.phase === 'done') { sum += sim.result.prizes[p] / M.PRIZE_SCALE; n++; }
                }
                if (n && sum / n > bv) { bv = sum / n; bi = ci; }
              }
              bestAt.push(bi);
            }
            if (bestAt.every(x => x >= 0)) {
              states++;
              if (bestAt[0] !== bestAt[bestAt.length - 1]) diff++;
              const legal = g._legalPlays(p);
              const winOf = ci => {
                const mv = legal.find(m => (E.isJoker(m.card)
                  ? (m.jokerSuit ? A_JS0 + ['S','D','H','C'].indexOf(m.jokerSuit) : A_JOKER)
                  : A_PLAY0 + M.cidx(m.card)) === ci);
                return mv ? winsTrick(g, mv, p) : false;
              };
              if (winOf(bestAt[0])) winLo++;
              if (winOf(bestAt[bestAt.length - 1])) winHi++;
            }
          }
        }
      }
      g.act(await ag[p].act(g, p));
    }
    if (g.phase === 'done') deals++;
  }
  const lo = BIDS[0], hi = BIDS[BIDS.length - 1];
  console.log(`${path.basename(MODEL)} · 국면 ${states}개 · 결정화 ${K}벌 · ${deals}딜`);
  console.log(`공약 ${lo} 최선수 ≠ 공약 ${hi} 최선수 : ${diff}건 (${(100 * diff / states).toFixed(1)}%)`);
  console.log(`트릭을 가져오는 수가 최선인 비율 — 공약 ${lo}: ${(100 * winLo / states).toFixed(1)}% ` +
              `· 공약 ${hi}: ${(100 * winHi / states).toFixed(1)}%`);
  console.log('\n공약이 최적수를 바꾸지 않으면, 정책이 공약에 반응하지 않는 것은 결함이 아니다.');
  process.exit(0);
})().catch(e => { console.error('ERR', e && e.stack); process.exit(1); });
