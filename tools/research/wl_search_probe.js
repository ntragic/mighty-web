/**
 * 국면 한정 배포 탐색 타당성 — weaklead 국면에서만 초소형 PIMC를 돌리면
 * 대형 실수가 실제로 사라지는가, 그리고 한 수에 몇 ms 드는가.
 *
 * docs/LOOKAHEAD-PLAN.md의 '갈래 B'다. 증류(갈래 A)는 라벨 품질을 고친 뒤에도
 * 대형 실수율을 6.9% → 6.5%밖에 못 낮췄다(2026-08-18). 이 클래스는 딜당 1.23회만
 * 발화하므로 **그 결정에만** 계산을 쓰는 편이 싸고 확실하다.
 *
 * 탐색 설정(배포 후보): 결정화 K_S벌 · DEPTH_S 트릭까지만 굴리고 가치 헤드로 평가.
 * 판정은 라벨·후회와 같은 A/B 프로토콜을 쓴다 — 교사(큰 PIMC)를 A에서 고르고
 * B에서 값을 읽어 승자의 저주를 없앤다.
 *
 * 사용: node tools/research/wl_search_probe.js [딜수]
 *   env MODEL(기본 v16e) · K_S(탐색 결정화, 기본 16) · DEPTH_S(트릭, 기본 2)
 *       K(교사 결정화, 기본 64) · PIMC_N(교사 평가 국면 수, 기본 300)
 *       BLUNDER(대형 실수 판정선, 기본 200) · SEED_BASE
 */
'use strict';
const path = require('path');
const P = p => path.join(__dirname, p);
const ort = require('onnxruntime-node');
const E = require(P('../../src/mighty-engine.js'));
const AI = require(P('../../src/mighty-ai.js'));
const M = require(P('../../src/mighty-master.js'));

const N = parseInt(process.argv[2] || '400', 10);
const MODEL = process.env.MODEL || 'v16e';
const K_S = parseInt(process.env.K_S || '16', 10);
const DEPTH_S = parseInt(process.env.DEPTH_S || '2', 10);
const K = parseInt(process.env.K || '64', 10);
const PIMC_N = parseInt(process.env.PIMC_N || '300', 10);
const BLUNDER = parseFloat(process.env.BLUNDER || '200');
const SEED0 = parseInt(process.env.SEED_BASE || '91000000', 10);
const TOPM = parseInt(process.env.TOPM || '5', 10);
// CLASS: weaklead(기본) | friendlead | oppwin(야당이 이기는 트릭에 개입할지)
// | declarer(주공 좌석 전체) — 아래는 weaklead·friendlead 설명이다.
// weaklead = 아군이 이기는 트릭에 개입할지 | friendlead = 프렌드가
// 선을 잡았을 때 무엇을 리드할지. 사용자 체감(기루다 정리·마이티 유도)은 리드
// 쪽이고, weaklead 술어는 리드를 아예 제외한다.
const CLASS = process.env.CLASS || 'weaklead';
// BAN=1: 배포 규칙(마이티 무늬 리드 억제)을 정책·탐색 양쪽에 건다. 사람 정석이며
// 교사는 반대로 권하므로(미출현 국면 32.8%) 교사 대비 지표는 나빠질 수 있다 —
// 그 비용을 숫자로 남기려고 넣었다.
const BAN = process.env.BAN === '1';
// ROLL: 탐색 롤아웃을 둘 티어. master는 매 수마다 신경망을 호출해 비싸다
// (한 수 826ms). 규칙 기반 advanced로 굴리면 호출이 사라진다 — PIMC는 롤아웃
// 정책보다 결정화 수에 더 민감하므로 바꿔볼 값이 있다.
const ROLL = process.env.ROLL || 'master';
// GATE: 정책 로짓 1-2위 차가 이 값 이상이면 탐색을 켜지 않는다(정책을 그대로 쓴다).
// 900국면 실측 — 차 1.30 이상 구간은 정책 대형실수 0.5%로 이미 정확하고 탐색이
// 오히려 1.9%로 나빴다. 차 0.57 이하 절반에서 6.9~9.7% → 1.8~3.2%로 줄어든다.
// 켜는 국면을 반으로 줄이면 비용도 반이다.
const GATE = parseFloat(process.env.GATE || '99');

const A_PLAY0 = 149, A_JS0 = 201, A_JOKER = 205;
const SUITS4 = ['S', 'D', 'H', 'C'];
const idxOf = mv => E.isJoker(mv.card)
  ? (mv.jokerSuit ? A_JS0 + SUITS4.indexOf(mv.jokerSuit) : A_JOKER)
  : A_PLAY0 + M.cidx(mv.card);

function cloneGame(g) {
  const c = Object.create(Object.getPrototypeOf(g));
  for (const k of Object.keys(g)) {
    const v = g[k];
    c[k] = (typeof v === 'object' && v !== null) ? structuredClone(v) : v;
  }
  return c;
}
const allCards = () => {
  const out = [E.JOKER];
  for (const s of SUITS4) for (let r = 2; r <= 14; r++) out.push({ suit: s, rank: r });
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
  const scan = (plays, led) => { if (!led) return;
    for (const e of plays) { if (E.isJoker(e.card)) continue;
      if (e.card.suit !== led) v[e.player].add(led); } };
  for (const t of g.play.history)
    scan(t.plays, t.ledSuit || (t.plays[0] && !E.isJoker(t.plays[0].card) ? t.plays[0].card.suit : null));
  scan(g.play.table, g.play.ledSuit);
  return v;
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
    for (let i = bag.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1));
      [bag[i], bag[j]] = [bag[j], bag[i]]; }
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

/** 야당이 이기고 있는 트릭에서 프렌드가 따라가는 국면 — 개입의 나머지 절반이다.
 *  weaklead(아군이 이기는 중)와 짝을 이룬다. 한 번도 측정한 적이 없다. */
function oppwinOf(g, p) {
  if (g.phase !== 'play' || p === g.declarer || !g.play || g.play.table.length === 0) return null;
  const fd = g.friendDecl;
  if (!(fd && fd.mode === 'card' && fd.card &&
        g.hands[p].some(c => E.sameCard(c, fd.card)))) return null;
  let best = null, bk = [-2, -1];
  for (const e of g.play.table) {
    const k = g._cardStrength(e, g.play);
    if (k[0] > bk[0] || (k[0] === bk[0] && k[1] > bk[1])) { bk = k; best = e; }
  }
  if (!best) return null;
  const ally = best.player === g.declarer ||
    (g.friendRevealed && g.friend === best.player && best.player !== p);
  if (ally) return null;                                   // 야당이 이기는 중만
  const legal = g._legalPlays(p);
  if (legal.length < 2) return null;
  const canWin = legal.some(mv => {
    const k = g._cardStrength({ card: mv.card, jokerSuit: mv.jokerSuit, player: p,
                               jokerCall: mv.jokerCall }, g.play);
    return k[0] > bk[0] || (k[0] === bk[0] && k[1] > bk[1]);
  });
  return canWin ? { legal } : null;
}

/** 주공 좌석의 플레이 결정 전부 — 리드·따라가기를 가리지 않는다.
 *  가장 많이 나오는 자리인데(딜당 10회쯤) 탐색 이득을 잰 적이 없다. */
function declarerOf(g, p) {
  if (g.phase !== 'play' || p !== g.declarer) return null;
  const legal = g._legalPlays(p);
  return legal.length >= 2 ? { legal } : null;
}

/** 프렌드가 선을 잡은 국면 — 리드 선택 전부가 표적이다. */
function friendLeadOf(g, p) {
  if (g.phase !== 'play' || p === g.declarer) return null;
  if (!g.play || g.play.table.length !== 0) return null;          // 리드만
  const fd = g.friendDecl;
  if (!(fd && fd.mode === 'card' && fd.card &&
        g.hands[p].some(c => E.sameCard(c, fd.card)))) return null;
  const legal = g._legalPlays(p);
  return legal.length >= 2 ? { legal } : null;
}

/** weaklead 국면 — lastseat_probe.js CLASS=weaklead와 같은 술어 */
function weakleadOf(g, p) {
  if (g.phase !== 'play' || p === g.declarer || g.play.table.length === 0) return null;
  const fd = g.friendDecl;
  if (!(fd && fd.mode === 'card' && fd.card &&
        g.hands[p].some(c => E.sameCard(c, fd.card)))) return null;
  let best = null, bk = [-2, -1];
  for (const e of g.play.table) {
    const k = g._cardStrength(e, g.play);
    if (k[0] > bk[0] || (k[0] === bk[0] && k[1] > bk[1])) { bk = k; best = e; }
  }
  if (!best) return null;
  const ally = best.player === g.declarer ||
    (g.friendRevealed && g.friend === best.player && best.player !== p);
  if (!ally || E.NUM_PLAYERS - 1 - g.play.table.length < 2) return null;
  const legal = g._legalPlays(p);
  if (legal.length < 2) return null;
  const canWin = legal.some(mv => {
    const k = g._cardStrength({ card: mv.card, jokerSuit: mv.jokerSuit, player: p,
                               jokerCall: mv.jokerCall }, g.play);
    return k[0] > bk[0] || (k[0] === bk[0] && k[1] > bk[1]);
  });
  return canWin ? { legal } : null;
}

/** 리드 카드의 성격 — 기루다인가, 마이티 무늬인가(마이티 자체는 뺀다).
 *  '기루다 정리'와 '마이티 유도'가 실제로 나오는지 세려고 쓴다. */
function leadKind(g, mv) {
  if (!mv || E.isJoker(mv.card)) return { trump: false, mightySuit: false };
  const gir = g.contract ? g.contract.giruda : null;    // 엔진 필드는 giruda다
  const trump = !!gir && gir !== 'N' && mv.card.suit === gir;
  const ms = g.mightyCard ? g.mightyCard.suit : null;
  const mightySuit = !!ms && mv.card.suit === ms && !E.sameCard(mv.card, g.mightyCard);
  return { trump, mightySuit };
}

/** 마이티가 아직 안 나왔고 내 손에도 없다 = 끌어낼 대상이 남아 있다 */
function mightyOutstanding(g, seat) {
  if (!g.mightyCard) return false;
  const id = E.cardId(g.mightyCard);
  for (const t of g.play.history) for (const e of t.plays) if (E.cardId(e.card) === id) return false;
  for (const e of g.play.table) if (E.cardId(e.card) === id) return false;
  return !g.hands[seat].some(c => E.cardId(c) === id);
}

async function policyLogits(sess, g, seat) {
  let obs = M.encodeObs(g, seat, []);
  const mask = M.legalMask(g, []);
  const want = M.modelObsDim(sess);
  if (want !== obs.length) obs = obs.subarray(0, want);
  const out = await sess.run({
    obs: new ort.Tensor('float32', obs, [1, want]),
    mask: new ort.Tensor('bool', mask, [1, M.ACTION_DIM]),
  });
  return { lg: out.logits.data, mask, value: out.value ? out.value.data[0] : 0 };
}
/** 여당 좌석의 마이티 무늬 리드 금지 인덱스 — src/mighty-ai.js와 같은 규칙 */
function bannedLeads(g, seat) {
  if (!BAN || !g.play || g.play.table.length !== 0) return null;
  const fd = g.friendDecl;
  const attacker = seat === g.declarer ||
    (fd && fd.mode === 'card' && fd.card && g.hands[seat].some(c => E.sameCard(c, fd.card))) ||
    (g.friendRevealed && g.friend === seat);
  if (!attacker || !g.mightyCard) return null;
  const id = E.cardId(g.mightyCard);
  for (const t of g.play.history) for (const e of t.plays) if (E.cardId(e.card) === id) return null;
  if (g.hands[seat].some(c => E.cardId(c) === id)) return null;
  const legal = g._legalPlays(seat);
  const bad = legal.filter(mv => !E.isJoker(mv.card) && mv.card.suit === g.mightyCard.suit);
  if (!bad.length || bad.length === legal.length) return null;
  return new Set(bad.map(idxOf));
}

async function topAction(sess, g, seat, banned) {
  const { lg, mask } = await policyLogits(sess, g, seat);
  const v = [];
  for (let i = 0; i < M.ACTION_DIM; i++) if (mask[i]) v.push([lg[i], i]);
  v.sort((a, b) => b[0] - a[0]);
  if (banned && banned.size) {
    const keep = v.filter(x => !banned.has(x[1]));
    if (keep.length) { v.length = 0; v.push(...keep); }
  }
  // margin = 1위와 2위 로짓 차이. 작을수록 정책이 헷갈린다는 뜻이고, 탐색을
  // 그런 국면에만 켜면 비용을 발화율로 줄일 수 있다.
  return { act: v[0][1], margin: v.length > 1 ? v[0][0] - v[1][0] : 99 };
}
async function valueOf(sess, g, seat) {
  if (g.phase === 'done') return g.result.prizes[seat] / M.PRIZE_SCALE;
  const { value } = await policyLogits(sess, g, seat);
  return value;
}

/** 배포 후보 탐색 — 상위 TOPM 후보를 K_S벌 × DEPTH_S트릭만 굴리고 가치 헤드로 평가 */
async function searchMove(sess, ag, g, seat, rnd, banned) {
  const { lg, mask } = await policyLogits(sess, g, seat);
  let idx = [];
  for (let a = 0; a < M.ACTION_DIM; a++) if (mask[a]) idx.push(a);
  idx.sort((a, b) => lg[b] - lg[a]);
  if (banned && banned.size) {
    const keep = idx.filter(i => !banned.has(i));
    if (keep.length) idx = keep;
  }
  const cands = idx.slice(0, TOPM);
  if (cands.length < 2) return cands[0];
  const dets = [];
  for (let k = 0; k < K_S; k++) { const d = determinize(g, seat, rnd); if (d) dets.push(d); }
  if (dets.length < 4) return cands[0];
  let bestI = cands[0], bestV = -Infinity;
  for (const ci of cands) {
    let sum = 0, n = 0;
    for (const d of dets) {
      const sim = cloneGame(d);
      const a0 = M.actionToEngine(ci, sim, []);
      if (!a0) continue;
      try { sim.act(a0); } catch (e) { continue; }
      // DEPTH_S=0이면 끝까지 굴린다(pimc_label과 같은 뜻). 자르고 가치 헤드로
      // 때우면 값이 왜곡된다 — 잘린 탐색은 정책보다 나빴다(2026-08-18 실측).
      const stop = (DEPTH_S > 0 && sim.play) ? sim.play.trickNo + DEPTH_S : 99;
      let gd = 0;
      while (sim.phase !== 'done' && sim.phase !== 'redeal' && gd++ < 200) {
        if (sim.play && sim.play.trickNo >= stop && sim.play.table.length === 0) break;
        const q = sim.currentPlayer;
        sim.act(await ag[q].act(sim, q));
      }
      sum += await valueOf(sess, sim, seat); n++;
    }
    if (n && sum / n > bestV) { bestV = sum / n; bestI = ci; }
  }
  return bestI;
}

(async () => {
  const sess = await ort.InferenceSession.create(P(`../../web/model/mighty_master_${MODEL}.onnx`));
  const ag = [];
  for (let p = 0; p < 5; p++) ag.push(await AI.createAgent({ tier: 'master', session: sess, ort }));
  // 교사 평가는 항상 master로 굴린다(라벨과 같은 조건). 탐색 롤아웃만 ROLL을 쓴다.
  const rag = ROLL === 'master' ? ag : [];
  if (ROLL !== 'master')
    for (let p = 0; p < 5; p++) rag.push(await AI.createAgent({ tier: ROLL }));
  let sc = 13579; const rnd = () => { sc = (sc * 1103515245 + 12345) & 0x7fffffff; return sc / 0x7fffffff; };

  const R = { policy: [], search: [] }, B = { policy: [], search: [] };
  const MG = [];   // [margin, 정책이 대형 실수했나, 탐색이 고쳤나]
  // 리드 성격 집계 — 정책·탐색·교사(A에서 고른 수)를 같은 국면에서 나란히 센다
  const LEAD = { policy: { trump: 0, mighty: 0 }, search: { trump: 0, mighty: 0 },
                 teacher: { trump: 0, mighty: 0 }, n: 0, nOut: 0,
                 outstanding: { policy: 0, search: 0, teacher: 0 } };
  let states = 0, deals = 0, pimcDone = 0, diff = 0, msSum = 0, msN = 0, msMax = 0, fired = 0;

  for (let i = 0; i < N && pimcDone < PIMC_N; i++) {
    const g = new E.MightyGame({ seed: SEED0 + i });
    g.start(i % 5);
    let guard = 0;
    while (g.phase !== 'done' && g.phase !== 'redeal' && guard++ < 900) {
      const p = g.currentPlayer;
      const clsOf = CLASS === 'friendlead' ? friendLeadOf
        : CLASS === 'oppwin' ? oppwinOf
        : CLASS === 'declarer' ? declarerOf : weakleadOf;
      const cls = pimcDone < PIMC_N ? clsOf(g, p) : null;
      if (cls) {
        states++;
        const banned = bannedLeads(g, p);
        const { act: aPol, margin } = await topAction(sess, g, p, banned);
        const t0 = Date.now();
        const gated = margin >= GATE;                    // 확신하면 탐색 생략
        const aSea = gated ? aPol : await searchMove(sess, rag, g, p, rnd, banned);
        const ms = Date.now() - t0;
        if (!gated) fired++;
        msSum += ms; msN++; if (ms > msMax) msMax = ms;
        if (aPol !== aSea) diff++;

        // 교사 — 큰 PIMC, A에서 고르고 B에서 평가
        const dets = [];
        for (let k = 0; k < K; k++) { const d = determinize(g, p, rnd); if (d) dets.push(d); }
        if (dets.length >= 8) {
          // 교사 후보는 **정책 수와 탐색 수를 반드시 포함**해야 한다. 리드 국면은
          // 합법수가 10장을 넘어서, 엔진 순서 앞 6장만 재면 비교 대상이 빠진다.
          const byIdxMv = new Map();
          for (const mv of cls.legal) if (!byIdxMv.has(idxOf(mv))) byIdxMv.set(idxOf(mv), mv);
          const wanted = [];
          for (const i of [aPol, aSea]) if (byIdxMv.has(i)) wanted.push(byIdxMv.get(i));
          for (const mv of cls.legal) {
            if (wanted.length >= 6) break;
            if (!wanted.some(x => idxOf(x) === idxOf(mv))) wanted.push(mv);
          }
          const scores = [];
          for (const mv of wanted) {
            let sA = 0, nA = 0, sB = 0, nB = 0;
            for (let di = 0; di < dets.length; di++) {
              const sim = cloneGame(dets[di]);
              try { sim.act({ type: 'play', card: mv.card, jokerSuit: mv.jokerSuit }); }
              catch (e) { continue; }
              let gd = 0;
              while (sim.phase !== 'done' && sim.phase !== 'redeal' && gd++ < 200)
                sim.act(await ag[sim.currentPlayer].act(sim, sim.currentPlayer));
              if (sim.phase !== 'done') continue;
              const pr = sim.result.prizes[p];
              if (di % 2) { sB += pr; nB++; } else { sA += pr; nA++; }
            }
            if (nA && nB) scores.push({ i: idxOf(mv), mv, a: sA / nA, b: sB / nB });
          }
          if (scores.length > 1) {
            pimcDone++;
            const bestA = scores.reduce((x, y) => (y.a > x.a ? y : x));
            const byB = new Map(scores.map(s => [s.i, s.b]));
            for (const [key, act] of [['policy', aPol], ['search', aSea]]) {
              const vb = byB.get(act);
              if (vb !== undefined) { R[key].push(bestA.b - vb); B[key].push(bestA.b - vb >= BLUNDER ? 1 : 0); }
            }
            const vp = byB.get(aPol), vs = byB.get(aSea);
            if (vp !== undefined && vs !== undefined)
              MG.push([margin, bestA.b - vp >= BLUNDER ? 1 : 0, bestA.b - vs >= BLUNDER ? 1 : 0]);
            if (CLASS === 'friendlead') {
              const out = mightyOutstanding(g, p);
              LEAD.n++; if (out) LEAD.nOut++;
              const pick = { policy: byIdxMv.get(aPol), search: byIdxMv.get(aSea), teacher: bestA.mv };
              for (const key of ['policy', 'search', 'teacher']) {
                const k = leadKind(g, pick[key]);
                if (k.trump) LEAD[key].trump++;
                if (k.mightySuit) { LEAD[key].mighty++; if (out) LEAD.outstanding[key]++; }
              }
            }
          }
        }
      }
      g.act(await ag[p].act(g, p));
    }
    if (g.phase === 'done') deals++;
    if ((i + 1) % 50 === 0)
      process.stderr.write(`  ${i + 1}딜 · 국면 ${states} · 교사 ${pimcDone} · 탐색 평균 ${(msSum / Math.max(1, msN)).toFixed(0)}ms\n`);
  }

  const stat = a => {
    const m = a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
    const v = a.length > 1 ? a.reduce((x, y) => x + (y - m) ** 2, 0) / (a.length - 1) : 0;
    return { m, ci: a.length ? 1.96 * Math.sqrt(v / a.length) : 0 };
  };
  // 페어드 — 같은 국면에서 정책과 탐색의 손실 차이
  const d = R.policy.map((x, i) => x - R.search[i]).filter(x => Number.isFinite(x));
  const ds = stat(d);
  console.log(`\n클래스 ${CLASS} · 모델 ${MODEL} · 탐색 K_S=${K_S} DEPTH_S=${DEPTH_S} ROLL=${ROLL} TOPM=${TOPM} · 딜 ${deals} · 클래스 국면 ${states} · 교사 평가 ${pimcDone}`);
  console.log(`한 수 비용 평균 ${(msSum / Math.max(1, msN)).toFixed(0)}ms · 최대 ${msMax}ms · 정책과 다른 수 ${(100 * diff / Math.max(1, states)).toFixed(1)}%`);
  console.log(`탐색 발화 ${fired}/${states}국면 (${(100 * fired / Math.max(1, states)).toFixed(0)}%)` +
    ` · 딜당 ${(fired / Math.max(1, deals)).toFixed(2)}회 · GATE=${GATE}`);
  for (const key of ['policy', 'search']) {
    const r = stat(R[key]), b = stat(B[key]);
    console.log(`  ${key.padEnd(7)} 후회 −${r.m.toFixed(0)} ± ${r.ci.toFixed(0)} · 대형실수율 ${(100 * b.m).toFixed(1)}% ± ${(100 * b.ci).toFixed(1)}`);
  }
  // 정책 확신도(로짓 1-2위 차)별 대형 실수율 — 탐색을 켤 문턱을 여기서 고른다
  if (MG.length > 8) {
    const sorted = MG.slice().sort((a, b) => a[0] - b[0]);
    const q = Math.ceil(sorted.length / 4);
    console.log('  정책 확신도(로짓차) 4분위별 — 낮을수록 헷갈리는 국면');
    for (let i = 0; i < 4; i++) {
      const part = sorted.slice(i * q, (i + 1) * q);
      if (!part.length) continue;
      const pb = 100 * part.reduce((x, y) => x + y[1], 0) / part.length;
      const sb = 100 * part.reduce((x, y) => x + y[2], 0) / part.length;
      console.log(`    Q${i + 1} 로짓차 ${part[0][0].toFixed(2)}~${part[part.length - 1][0].toFixed(2)}` +
        ` (n=${part.length}) · 정책 대형실수 ${pb.toFixed(1)}% → 탐색 ${sb.toFixed(1)}%`);
    }
  }
  if (LEAD.n) {
    const pct = (x, d) => `${(100 * x / Math.max(1, d)).toFixed(1)}%`;
    console.log(`  리드 성격 (n=${LEAD.n} · 마이티 미출현 ${LEAD.nOut})`);
    console.log(`    기루다 리드    정책 ${pct(LEAD.policy.trump, LEAD.n)} · 탐색 ${pct(LEAD.search.trump, LEAD.n)} · 교사 ${pct(LEAD.teacher.trump, LEAD.n)}`);
    console.log(`    마이티무늬 리드 정책 ${pct(LEAD.policy.mighty, LEAD.n)} · 탐색 ${pct(LEAD.search.mighty, LEAD.n)} · 교사 ${pct(LEAD.teacher.mighty, LEAD.n)}`);
    console.log(`    └ 마이티 미출현 한정  정책 ${pct(LEAD.outstanding.policy, LEAD.nOut)} · 탐색 ${pct(LEAD.outstanding.search, LEAD.nOut)} · 교사 ${pct(LEAD.outstanding.teacher, LEAD.nOut)}`);
  }
  console.log(`  페어드(정책 − 탐색) ${ds.m >= 0 ? '+' : ''}${ds.m.toFixed(1)} ± ${ds.ci.toFixed(1)}` +
    `${Math.abs(ds.m) > ds.ci ? (ds.m > 0 ? ' → 탐색이 유의 우세' : ' → 탐색이 유의 열세') : ' → 유의차 없음'}`);
  process.exit(0);
})().catch(e => { console.error('ERR', e && e.stack); process.exit(1); });
