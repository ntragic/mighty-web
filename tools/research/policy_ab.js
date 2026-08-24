/**
 * 정책 A/B 심판 — 같은 국면에서 두 모델의 선택을 **같은 깊은 탐색**으로 평가해
 * 어느 쪽이 나은지 직접 비교한다.
 *
 * 왜 필요한가: 강제 페어드 인증은 '같은 카드를 콜 있이/없이'처럼 **한 축만**
 * 바꿔 비교한다. 그래서 "그 카드를 리드한다면 콜을 하라"는 말은 되지만 "그 카드를
 * 리드하라"는 말은 못 한다. 정책이 아예 다른 리드를 고르면 그 인증으로는 우열을
 * 못 가린다. 이 도구는 두 정책의 **실제 선택**을 같은 저울에 올린다.
 *
 * 지표: 탐색 평가값(그 좌석의 평균 상금). 양수면 A가 낫다.
 *
 * 사용: node tools/research/policy_ab.js <A.onnx> <B.onnx> [판수] [결정화수]
 *   env SEED_BASE · CLASS(jcall|all, 기본 jcall) · TRUNK(롤아웃 정책 모델, 기본 A)
 */
'use strict';
const path = require('path');
const P = p => path.join(__dirname, p);
const ort = require('onnxruntime-node');
const E = require(P('../../src/mighty-engine.js'));
const AI = require(P('../../src/mighty-ai.js'));
const M = require(P('../../src/mighty-master.js'));
const SEED0 = parseInt(process.env.SEED_BASE || '61000000', 10);
const CLASS = process.env.CLASS || 'jcall';

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
      // 마이티·조커는 팔로우 면제 — 오프수트로 나와도 '무늬 없음'의 근거가 아니다
      if (E.isJoker(e.card) || (g.mightyCard && E.sameCard(e.card, g.mightyCard))) continue;
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
const surelyOpp = (g, seat) => {
  const fd = g.friendDecl;
  const holds = fd && fd.mode === 'card' && fd.card &&
    g.hands[seat].some(c => E.sameCard(c, fd.card));
  return seat !== g.declarer && !holds && !(g.friendRevealed && seat === g.friend);
};

(async () => {
  const A = process.argv[2], B = process.argv[3];
  const N = parseInt(process.argv[4] || '400', 10);
  const K = parseInt(process.argv[5] || '200', 10);
  const sa = await ort.InferenceSession.create(A);
  const sb = await ort.InferenceSession.create(B);
  let sc = 7; const rnd = () => { sc = (sc * 1103515245 + 12345) & 0x7fffffff; return sc / 0x7fffffff; };
  // 롤아웃(심판) 정책은 A로 고정 — 양쪽 선택을 같은 저울로 잰다
  const judge = [];
  for (let s = 0; s < E.NUM_PLAYERS; s++)
    judge.push(await AI.createAgent({ tier: 'master', session: sa, ort }));
  const agA = [], agB = [];
  for (let s = 0; s < E.NUM_PLAYERS; s++) {
    agA.push(await AI.createAgent({ tier: 'master', session: sa, ort }));
    agB.push(await AI.createAgent({ tier: 'master', session: sb, ort }));
  }

  const diffs = []; let states = 0, same = 0;
  for (let i = 0; i < N && diffs.length < 120; i++) {
    const seed = SEED0 + i;
    const rng = E.makeRng(seed);
    const g = new E.MightyGame({ seed });
    g.start(Math.floor(rng() * E.NUM_PLAYERS));
    let guard = 0;
    while (g.phase !== 'done' && g.phase !== 'redeal' && guard++ < 900) {
      const p = g.currentPlayer;
      const act = await agA[p].act(g, p);
      const isOpen = g.phase === 'play' && g.play.table.length === 0;
      const hit = CLASS === 'all' ? isOpen
        : (isOpen && surelyOpp(g, p) && !g.hands[p].some(c => E.isJoker(c))
           && g._legalPlays(p).some(m => m.jokerCall));
      if (hit) {
        const bAct = await agB[p].act(g, p);
        states++;
        const sameCard = act.card && bAct.card && E.sameCard(act.card, bAct.card)
          && !!act.jokerCall === !!bAct.jokerCall;
        if (sameCard) { same++; }
        else {
          const dets = [];
          for (let k = 0; k < K; k++) { const d = determinize(g, p, rnd); if (d) dets.push(d); }
          if (dets.length >= 32) {
            const evalAct = async (a) => {
              let sum = 0, n = 0;
              for (const d of dets) {
                const sim = cloneGame(d);
                try { sim.act(JSON.parse(JSON.stringify(a))); } catch (e) { continue; }
                let gd = 0;
                while (sim.phase !== 'done' && sim.phase !== 'redeal' && gd++ < 200)
                  sim.act(await judge[sim.currentPlayer].act(sim, sim.currentPlayer));
                if (sim.phase !== 'done') continue;
                sum += sim.result.prizes[p]; n++;
              }
              return n ? sum / n : null;
            };
            const va = await evalAct(act), vb = await evalAct(bAct);
            if (va !== null && vb !== null) diffs.push(va - vb);
          }
        }
      }
      g.act(act);
    }
  }
  const n = diffs.length;
  const m = n ? diffs.reduce((a, b) => a + b, 0) / n : 0;
  const sd = n > 1 ? Math.sqrt(diffs.reduce((a, b) => a + (b - m) ** 2, 0) / (n - 1)) : 0;
  const ci = n ? 1.96 * sd / Math.sqrt(n) : 0;
  console.log(`${path.basename(A)} vs ${path.basename(B)} · 클래스 ${CLASS} · 결정화 ${K}벌`);
  console.log(`국면 ${states}건 · 선택 동일 ${same}건 · 갈린 ${n}건`);
  console.log(`갈린 국면에서 A − B 가치차 ${m >= 0 ? '+' : ''}${m.toFixed(0)} ± ${ci.toFixed(0)}`);
  console.log(m - ci > 0 ? '→ A가 유의하게 낫다' : m + ci < 0 ? '→ B가 유의하게 낫다' : '→ 유의차 없음');
})();
