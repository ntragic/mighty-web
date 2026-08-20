/**
 * 프렌드의 기루다 플레이 — 정책·탐색·교사를 같은 국면에서 대조한다.
 *
 * 사람 정석(2026-08-18 사용자 정리):
 *   - 프렌드가 **마이티·조커가 아닌 카드로** 선을 잡으면 남은 기루다 개수를 감안해
 *     기루다를 정리한다.
 *   - 주공과 프렌드는 마이티를 낭비시키지 않도록 마이티 무늬를 돌리지 않는다.
 *   - 주공이 기루다 정리를 시작하면, 선 카드의 강함에 따라 마이티로 먹고 이어서
 *     기루다를 돌릴지, 한 번 흘리고 높은 기루다가 나오길 기다릴지 판단한다.
 *
 * 그래서 두 갈래로 나눠 잰다.
 *   CLASS=trumplead   프렌드가 선을 잡았고 기루다를 들고 있다 — 정리를 시작할까
 *   CLASS=trumpfollow 기루다가 리드된 트릭에서 프렌드가 무엇으로 받을까
 *
 * 판정은 다른 프로브와 같은 A/B 프로토콜이다 — 교사(큰 PIMC)를 결정화 절반에서
 * 고르고 나머지 절반에서 값을 읽어 승자의 저주를 뺀다. 후회·대everything 실수율에
 * 더해 **행동 분류 비율**을 함께 찍는다(정석과 맞는지 보려면 비율이 필요하다).
 *
 * 사용: node tools/research/trump_probe.js [딜수]
 *   env CLASS · MODEL(기본 v16e) · K_S(탐색 결정화, 0이면 탐색 생략)
 *       K(교사 결정화, 기본 64) · PIMC_N(교사 평가 국면 수) · BLUNDER(기본 200)
 */
'use strict';
const path = require('path');
const P = p => path.join(__dirname, p);
const ort = require('onnxruntime-node');
const E = require(P('../../src/mighty-engine.js'));
const AI = require(P('../../src/mighty-ai.js'));
const M = require(P('../../src/mighty-master.js'));

const N = parseInt(process.argv[2] || '900', 10);
const CLASS = process.env.CLASS || 'trumpfollow';
const MODEL = process.env.MODEL || 'v16e';
const K_S = parseInt(process.env.K_S || '16', 10);
const K = parseInt(process.env.K || '64', 10);
const PIMC_N = parseInt(process.env.PIMC_N || '600', 10);
const BLUNDER = parseFloat(process.env.BLUNDER || '200');
const SEED0 = parseInt(process.env.SEED_BASE || '55000000', 10);
const TOPM = parseInt(process.env.TOPM || '5', 10);
// BAN=1: 배포 규칙(마이티 무늬 리드 억제)을 정책·탐색 양쪽에 건다. v2.15.0부터
// 실제 게임이 이 상태이므로, '지금 무엇을 고르는가'를 보려면 켜야 한다.
const BAN = process.env.BAN === '1';

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
    for (const e of plays) {
      // 마이티·조커는 팔로우 면제 — 오프수트로 나와도 '무늬 없음'의 근거가 아니다
      if (E.isJoker(e.card) || (g.mightyCard && E.sameCard(e.card, g.mightyCard))) continue;
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

const isFriendSeat = (g, p) => {
  if (p === g.declarer) return false;
  const fd = g.friendDecl;
  return !!(fd && fd.mode === 'card' && fd.card && g.hands[p].some(c => E.sameCard(c, fd.card)));
};
const giruda = g => (g.contract && g.contract.giruda !== 'N' ? g.contract.giruda : null);
const isTrump = (g, c) => { const t = giruda(g); return !!t && !E.isJoker(c) && c.suit === t; };

/** 상대(야당)에게 남아 있을 기루다 수 — 좌석 가시 정보로만 센다.
 *  전체 13장 − 지나간 것 − 내 손 − 아군(주공) 공개분은 모르므로 상한 추정이다. */
function trumpsOutstanding(g, seat) {
  const t = giruda(g);
  if (!t) return 0;
  let seen = 0;
  for (const tr of g.play.history) for (const e of tr.plays) if (isTrump(g, e.card)) seen++;
  for (const e of g.play.table) if (isTrump(g, e.card)) seen++;
  const mine = g.hands[seat].filter(c => isTrump(g, c)).length;
  return Math.max(0, 13 - seen - mine);
}

/** 국면 판정 */
function classOf(g, p) {
  if (g.phase !== 'play' || !giruda(g) || !isFriendSeat(g, p)) return null;
  const legal = g._legalPlays(p);
  if (legal.length < 2) return null;
  if (CLASS === 'trumplead') {
    if (g.play.table.length !== 0) return null;                    // 선을 잡았을 때만
    if (!g.hands[p].some(c => isTrump(g, c))) return null;          // 기루다가 있어야 정리한다
    return { legal };
  }
  // trumpfollow — 기루다가 리드된 트릭
  if (g.play.table.length === 0) return null;
  const first = g.play.table[0];
  if (!isTrump(g, first.card)) return null;
  return { legal, ledRank: E.isJoker(first.card) ? 0 : first.card.rank,
           byDeclarer: first.player === g.declarer };
}

/** 행동 분류 — 정석 용어에 맞춘다 */
function kindOf(g, seat, mv) {
  if (!mv) return 'none';
  if (E.isJoker(mv.card)) return '조커';
  if (E.sameCard(mv.card, g.mightyCard)) return '마이티';
  if (isTrump(g, mv.card)) {
    const mine = g.hands[seat].filter(c => isTrump(g, c) && !E.sameCard(c, g.mightyCard));
    const lowest = mine.reduce((a, b) => (a === null || b.rank < a.rank ? b : a), null);
    if (lowest && mv.card.rank === lowest.rank) return '기루다 최저';
    return mv.card.rank >= 12 ? '기루다 상급' : '기루다 중급';
  }
  const ms = g.mightyCard ? g.mightyCard.suit : null;
  if (ms && mv.card.suit === ms) return '마이티무늬';
  return '기타무늬';
}

/** 마이티 무늬 리드 금지 인덱스 — src/mighty-ai.js와 같은 규칙 */
function bannedLeads(g, seat) {
  if (!BAN || !g.play || g.play.table.length !== 0 || !g.mightyCard) return null;
  const fd = g.friendDecl;
  const attacker = seat === g.declarer ||
    (fd && fd.mode === 'card' && fd.card && g.hands[seat].some(c => E.sameCard(c, fd.card))) ||
    (g.friendRevealed && g.friend === seat);
  if (!attacker) return null;
  const id = E.cardId(g.mightyCard);
  for (const t of g.play.history) for (const e of t.plays) if (E.cardId(e.card) === id) return null;
  if (g.hands[seat].some(c => E.cardId(c) === id)) return null;
  const legal = g._legalPlays(seat);
  const bad = legal.filter(mv => !E.isJoker(mv.card) && mv.card.suit === g.mightyCard.suit);
  if (!bad.length || bad.length === legal.length) return null;
  return new Set(bad.map(idxOf));
}

async function policyTop(sess, g, seat, banned) {
  let obs = M.encodeObs(g, seat, []);
  const mask = M.legalMask(g, []);
  const want = M.modelObsDim(sess);
  if (want !== obs.length) obs = obs.subarray(0, want);
  const out = await sess.run({
    obs: new ort.Tensor('float32', obs, [1, want]),
    mask: new ort.Tensor('bool', mask, [1, M.ACTION_DIM]),
  });
  const lg = out.logits.data;
  let v = [];
  for (let i = 0; i < M.ACTION_DIM; i++) if (mask[i]) v.push([lg[i], i]);
  v.sort((a, b) => b[0] - a[0]);
  if (banned && banned.size) {
    const keep = v.filter(x => !banned.has(x[1]));
    if (keep.length) v = keep;
  }
  return { cands: v.slice(0, TOPM).map(x => x[1]), act: v[0][1],
           margin: v.length > 1 ? v[0][0] - v[1][0] : Infinity };
}

/** 배포 후보와 같은 탐색 — 끝까지 굴리고 신경망 롤아웃 */
async function searchMove(sess, ag, g, seat, rnd, cands) {
  const dets = [];
  for (let k = 0; k < K_S; k++) { const d = determinize(g, seat, rnd); if (d) dets.push(d); }
  if (dets.length < 4 || cands.length < 2) return cands[0];
  let bi = cands[0], bv = -Infinity;
  for (const ci of cands) {
    let sum = 0, n = 0;
    for (const d of dets) {
      const sim = cloneGame(d);
      const a0 = M.actionToEngine(ci, sim, []);
      if (!a0) continue;
      try { sim.act(a0); } catch (e) { continue; }
      let guard = 0;
      while (sim.phase !== 'done' && sim.phase !== 'redeal' && guard++ < 200)
        sim.act(await ag[sim.currentPlayer].act(sim, sim.currentPlayer));
      if (sim.phase !== 'done') continue;
      sum += sim.result.prizes[seat]; n++;
    }
    if (n >= 4 && sum / n > bv) { bv = sum / n; bi = ci; }
  }
  return bi;
}

(async () => {
  const sess = await ort.InferenceSession.create(P(`../../web/model/mighty_master_${MODEL}.onnx`));
  const ag = [];
  for (let p = 0; p < 5; p++) ag.push(await AI.createAgent({ tier: 'master', session: sess, ort }));
  let sc = 8642; const rnd = () => { sc = (sc * 1103515245 + 12345) & 0x7fffffff; return sc / 0x7fffffff; };

  const R = { policy: [], search: [], teacher: [] }, B = { policy: [], search: [] };
  const KIND = { policy: {}, search: {}, teacher: {} };
  const BUCKET = {};          // 조건별 행동 — 기루다 남은 수 / 리드 카드 강함
  let states = 0, deals = 0, pimcDone = 0, diff = 0;

  const bump = (o, k) => { o[k] = (o[k] || 0) + 1; };
  const bucketOf = (g, p, cls) => {
    if (CLASS === 'trumplead') {
      const out = trumpsOutstanding(g, p);
      return out === 0 ? '남은기루다 0' : out <= 2 ? '남은기루다 1~2' : '남은기루다 3+';
    }
    return (cls.ledRank >= 12 ? '리드 상급(Q+)' : cls.ledRank >= 9 ? '리드 중급(9~J)' : '리드 하급(~8)')
      + (cls.byDeclarer ? ' · 주공 리드' : ' · 야당 리드');
  };

  for (let i = 0; i < N && pimcDone < PIMC_N; i++) {
    const g = new E.MightyGame({ seed: SEED0 + i });
    g.start(i % 5);
    let guard = 0;
    while (g.phase !== 'done' && g.phase !== 'redeal' && guard++ < 900) {
      const p = g.currentPlayer;
      const cls = pimcDone < PIMC_N ? classOf(g, p) : null;
      if (cls) {
        states++;
        const banned = bannedLeads(g, p);
        const { cands, act: aPol } = await policyTop(sess, g, p, banned);
        const aSea = K_S > 0 ? await searchMove(sess, ag, g, p, rnd, cands) : aPol;
        if (aPol !== aSea) diff++;

        const dets = [];
        for (let k = 0; k < K; k++) { const d = determinize(g, p, rnd); if (d) dets.push(d); }
        if (dets.length >= 8) {
          const byIdxMv = new Map();
          for (const mv of cls.legal) if (!byIdxMv.has(idxOf(mv))) byIdxMv.set(idxOf(mv), mv);
          const wanted = [];
          for (const ix of [aPol, aSea]) if (byIdxMv.has(ix)) wanted.push(byIdxMv.get(ix));
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
            const bkey = bucketOf(g, p, cls);
            if (!BUCKET[bkey]) BUCKET[bkey] = { n: 0, policy: {}, teacher: {}, search: {} };
            BUCKET[bkey].n++;
            const pick = { policy: byIdxMv.get(aPol), search: byIdxMv.get(aSea), teacher: bestA.mv };
            for (const key of ['policy', 'search', 'teacher']) {
              const k = kindOf(g, p, pick[key]);
              bump(KIND[key], k); bump(BUCKET[bkey][key], k);
            }
          }
        }
      }
      g.act(await ag[p].act(g, p));
    }
    if (g.phase === 'done') deals++;
    if ((i + 1) % 50 === 0)
      process.stderr.write(`  ${i + 1}딜 · 국면 ${states} · 교사 ${pimcDone}\n`);
  }

  const stat = a => {
    const m = a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
    const v = a.length > 1 ? a.reduce((x, y) => x + (y - m) ** 2, 0) / (a.length - 1) : 0;
    return { m, ci: a.length ? 1.96 * Math.sqrt(v / a.length) : 0, n: a.length };
  };
  console.log(`\n클래스 ${CLASS} · 모델 ${MODEL} · 탐색 ${K_S ? `K_S=${K_S}` : '없음'}` +
    ` · 딜 ${deals} · 국면 ${states} (딜당 ${(states / Math.max(1, deals)).toFixed(2)}) · 교사 평가 ${pimcDone}`);
  console.log(`정책과 탐색이 다른 수 ${(100 * diff / Math.max(1, states)).toFixed(1)}%`);
  for (const key of ['policy', 'search']) {
    const r = stat(R[key]), b = stat(B[key]);
    console.log(`  ${key.padEnd(7)} 후회 ${r.m >= 0 ? '−' : '+'}${Math.abs(r.m).toFixed(0)} ± ${r.ci.toFixed(0)}` +
      ` · 대형실수율 ${(100 * b.m).toFixed(1)}% ± ${(100 * b.ci).toFixed(1)} (n=${r.n})`);
  }
  const kinds = [...new Set([...Object.keys(KIND.policy), ...Object.keys(KIND.teacher), ...Object.keys(KIND.search)])];
  const line = (label, o, d) => `    ${label.padEnd(8)} ` +
    kinds.map(k => `${k} ${(100 * (o[k] || 0) / Math.max(1, d)).toFixed(0)}%`).join(' · ');
  console.log('\n  행동 분포 (전체)');
  const tot = Object.values(KIND.policy).reduce((a, b) => a + b, 0);
  console.log(line('정책', KIND.policy, tot));
  console.log(line('탐색', KIND.search, tot));
  console.log(line('교사', KIND.teacher, tot));
  console.log('\n  조건별 (정책 → 교사)');
  for (const [k, v] of Object.entries(BUCKET).sort()) {
    console.log(`    ${k} (n=${v.n})`);
    console.log(line('  정책', v.policy, v.n));
    console.log(line('  교사', v.teacher, v.n));
  }
  process.exit(0);
})().catch(e => { console.error('ERR', e && e.stack); process.exit(1); });
