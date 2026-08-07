/**
 * 점수카드 규율 개입 실험 — 지표 차이가 실제 승률로 이어지는지 본다.
 *
 * 조건부 지표는 정책이 그 부분집합을 스스로 만들기 때문에 단독으로는 결함 근거가
 * 못 된다. 같은 시드·같은 상대(공통 난수)로 개입/무개입을 짝지어 상금 차이를 잰다.
 *
 *   add  : 아군이 잠근 트릭에서 탑 아닌 점수카드 중 가장 낮은 것을 강제로 낸다
 *   feed : 야당이 잠근 트릭에서 점수 아닌 카드를 강제로 낸다
 *   both : 둘 다
 *
 * 사용: node tools/research/point_intervene.js [판수] [add|feed|both]
 *   env MODEL=경로 · KEY_GUARD=off
 */
'use strict';
const path = require('path');
const P = p => path.join(__dirname, p);
const ort = require('onnxruntime-node');
const E = require(P('../../src/mighty-engine.js'));
const AI = require(P('../../src/mighty-ai.js'));
const MODEL = process.env.MODEL || P('../../web/model/mighty_master_v4.onnx');
const GUARD = process.env.KEY_GUARD !== 'off';
const PER = ['gambler', 'balanced', 'careful'];

const strength = (g, e, pl) => g._cardStrength(e, pl);
const stronger = (a, b) => a[0] > b[0] || (a[0] === b[0] && a[1] > b[1]);

function lockedTrick(g, seat) {
  const pl = g.play;
  if (!pl || pl.table.length === 0) return null;
  const decl = g.declarer, fr = g.friend;
  if (decl == null) return null;
  const team = p => (p === decl || (fr !== null && p === fr)) ? 'R' : 'O';
  let best = null, bk = [-2, -1];
  for (const e of pl.table) { const k = strength(g, e, pl); if (stronger(k, bk)) { bk = k; best = e; } }
  if (!best || best.player === seat) return null;
  const acted = new Set(pl.table.map(e => e.player)); acted.add(seat);
  for (let p = 0; p < E.NUM_PLAYERS; p++) {
    if (acted.has(p)) continue;
    for (const m of g._legalPlays(p)) {
      const k = strength(g, { player: p, card: m.card, jokerSuit: m.jokerSuit, jokerCall: m.jokerCall }, pl);
      if (stronger(k, bk)) return null;
    }
  }
  return { allyWins: team(best.player) === team(seat) };
}

function isTopOfSuit(g, seat, card) {
  if (E.isJoker(card)) return true;
  for (let p = 0; p < E.NUM_PLAYERS; p++) {
    for (const x of g.hands[p]) {
      if (p === seat && E.sameCard(x, card)) continue;
      if (E.isJoker(x) || x.suit !== card.suit) continue;
      if (x.rank > card.rank) return false;
    }
  }
  return true;
}

/**
 * 개입 액션을 돌려준다. 개입할 상황이 아니면 null.
 * 정책이 실제로 낸 카드(actual)를 받아, 지표가 '실패'로 센 결정에만 개입한다.
 * 잘한 결정까지 덮어쓰면 개입이 다른 것을 바꿔버려 인과가 흐려진다.
 * 대체 카드에서 기루다는 제외한다 — 기루다를 버려 생기는 손실이 결과에 섞이면
 * 원래 행동이 옳았다는 증거로 오독된다.
 */
function override(g, seat, mode, actual) {
  // 좁힌 클래스 접미사: P=공개 후+여당 한정, L=P+종반(트릭 6+), M=P+중반(트릭 4~5)
  const narrow = mode.endsWith('P') || mode.endsWith('L') || mode.endsWith('M');
  const late = mode.endsWith('L');
  const mid = mode.endsWith('M');
  const base = narrow ? mode.slice(0, -1) : mode;
  if (narrow) {
    if (!g.friendRevealed) return null;
    const ruling = seat === g.declarer || seat === g.friend;
    if (!ruling) return null;
    if (late && g.play.trickNo < 6) return null;
    if (mid && (g.play.trickNo < 4 || g.play.trickNo > 5)) return null;
  }
  mode = base;

  // sig: 공개 후 프렌드가 주공의 기루다 리드에 점수카드로 응답하지 않은 결정을 교정
  // sigW: 같되 주공이 현재 그 트릭 최강일 때만 (지는 트릭에 점수 강제 제외)
  if (mode === 'sig' || mode === 'sigW') {
    if (mode === 'sigW') {
      const pl0 = g.play;
      let bk0 = [-2, -1], bp = -1;
      for (const e of pl0.table) {
        const k = strength(g, e, pl0);
        if (stronger(k, bk0)) { bk0 = k; bp = e.player; }
      }
      if (bp !== g.declarer) return null;
    }
    if (!g.friendRevealed || seat !== g.friend) return null;
    const pl = g.play;
    if (!pl.table.length) return null;
    const lead = pl.table[0], gi2 = g.contract ? g.contract.giruda : 'N';
    if (lead.player !== g.declarer || E.isJoker(lead.card) || gi2 === 'N'
        || lead.card.suit !== gi2) return null;
    const isKey2 = c => E.isJoker(c) || E.sameCard(c, g.mightyCard);
    const legal2 = g._legalPlays(seat).filter(m => !m.jokerCall);
    const pts = legal2.filter(m => E.isPointCard(m.card) && !isKey2(m.card));
    const non = legal2.filter(m => !E.isPointCard(m.card) && !isKey2(m.card));
    if (!pts.length || !non.length) return null;
    if (E.isPointCard(actual) && !isKey2(actual)) return null;   // 이미 응답
    pts.sort((a, b) => (a.card.rank || 0) - (b.card.rank || 0));
    return { type: 'play', card: pts[0].card };
  }

  // dfeed: 공개 후 야당이, 여당이 '현재 최강'인 트릭(잠금 불요)에 점수카드를
  // 태운 결정을 최저 비점수·비기루다 버림으로 교정 (2026-08-07 제보 클래스 —
  // keyCardGuard는 가시확정 잠금만 커버, 미잠금 헌납이 잔여 축)
  if (mode === 'dfeed') {
    if (!g.friendRevealed) return null;
    if (seat === g.declarer || seat === g.friend) return null;
    const pl = g.play;
    if (!pl.table.length) return null;
    let bk = [-2, -1], bp = -1;
    for (const e of pl.table) {
      const k = strength(g, e, pl);
      if (stronger(k, bk)) { bk = k; bp = e.player; }
    }
    if (!(bp === g.declarer || (g.friend !== null && bp === g.friend))) return null;
    const myK = strength(g, { player: seat, card: actual }, pl);
    if (stronger(myK, bk)) return null;               // 내가 이기는 수면 개입 안 함
    const isKey3 = c => E.isJoker(c) || E.sameCard(c, g.mightyCard);
    if (!(E.isPointCard(actual) && !isKey3(actual))) return null;   // 점수 태운 결정만
    const gi3 = g.contract ? g.contract.giruda : 'N';
    const isTrump3 = c => gi3 !== 'N' && !E.isJoker(c) && c.suit === gi3;
    const alt = g._legalPlays(seat).filter(m => !m.jokerCall
      && !E.isPointCard(m.card) && !isKey3(m.card) && !isTrump3(m.card)
      && !stronger(strength(g, { player: seat, card: m.card, jokerSuit: m.jokerSuit }, pl), bk));
    if (!alt.length) return null;
    alt.sort((a, b) => (a.card.rank || 0) - (b.card.rank || 0));
    return { type: 'play', card: alt[0].card };
  }

  const lock = lockedTrick(g, seat);
  if (!lock) return null;
  const isKey = c => E.isJoker(c) || E.sameCard(c, g.mightyCard);
  const gi = g.contract ? g.contract.giruda : 'N';
  const isTrump = c => gi !== 'N' && !E.isJoker(c) && c.suit === gi;
  const legal = g._legalPlays(seat).filter(m => !m.jokerCall);
  const playedPoint = E.isPointCard(actual) && !isKey(actual);

  if (lock.allyWins) {
    if (mode !== 'add' && mode !== 'both') return null;
    const safe = legal.filter(m => E.isPointCard(m.card) && !isKey(m.card) && !isTopOfSuit(g, seat, m.card));
    const nonPts = legal.filter(m => !E.isPointCard(m.card) && !isKey(m.card));
    if (!safe.length || !nonPts.length) return null;
    if (playedPoint) return null;                 // 이미 보탰다 — 개입 불필요
    safe.sort((a, b) => (a.card.rank || 0) - (b.card.rank || 0));
    return { type: 'play', card: safe[0].card };
  }

  if (mode !== 'feed' && mode !== 'both') return null;
  const pts = legal.filter(m => E.isPointCard(m.card) && !isKey(m.card));
  // 기루다·키카드를 건드리지 않는 대체재만 인정한다
  const safeAlt = legal.filter(m => !E.isPointCard(m.card) && !isKey(m.card) && !isTrump(m.card));
  if (!pts.length || !safeAlt.length) return null;
  if (!playedPoint) return null;                  // 이미 안 태웠다 — 개입 불필요
  safeAlt.sort((a, b) => (a.card.rank || 0) - (b.card.rank || 0));
  return { type: 'play', card: safeAlt[0].card };
}

async function run(N, mode, sess) {
  const per = [];
  let seat = 0, hits = 0;
  for (let i = 0; i < N; i++) {
    const rng = E.makeRng(900000 + i);
    const g = new E.MightyGame({ seed: 900000 + i });
    const ag = [];
    for (let s = 0; s < E.NUM_PLAYERS; s++) ag.push(s === seat
      ? await AI.createAgent({ tier: 'master', session: sess, ort, keyGuard: GUARD })
      : await AI.createAgent({ tier: 'advanced', persona: PER[s % 3], rng }));
    g.start(Math.floor(rng() * E.NUM_PLAYERS));
    let guard = 0;
    while (g.phase !== 'done' && g.phase !== 'redeal') {
      const p = g.currentPlayer;
      let act = await ag[p].act(g, p);
      if (mode !== 'none' && g.phase === 'play' && p === seat && act.type === 'play') {
        const o = override(g, p, mode, act.card);
        if (o) { act = o; hits++; }
      }
      g.act(act);
      if (++guard > 900) break;
    }
    per.push(g.phase === 'done' ? { seed: 900000 + i, seat, prize: g.result.prizes[seat] } : null);
    if (g.phase === 'done') seat = (seat + 1) % E.NUM_PLAYERS;
  }
  return { per, hits };
}

(async () => {
  const N = parseInt(process.argv[2] || '600', 10);
  const modes = (process.argv[3] || 'add,feed,both').split(',');
  const sess = await ort.InferenceSession.create(MODEL);

  const base = await run(N, 'none', sess);
  const key = r => r && `${r.seed}:${r.seat}`;
  const bm = new Map(base.per.filter(Boolean).map(r => [key(r), r.prize]));
  const bMean = [...bm.values()].reduce((a, b) => a + b, 0) / bm.size;
  console.log(`\n${path.basename(MODEL)} 가드${GUARD ? 'ON' : 'OFF'} · 무개입 판당 상금 ${bMean.toFixed(0)} (${bm.size}판)`);

  for (const mode of modes) {
    const iv = await run(N, mode, sess);
    const diffs = [];
    for (const r of iv.per.filter(Boolean)) {
      const b = bm.get(key(r));
      if (b !== undefined) diffs.push(r.prize - b);
    }
    const n = diffs.length;
    const mean = diffs.reduce((a, b) => a + b, 0) / n;
    const sd = Math.sqrt(diffs.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1));
    const ci = 1.96 * sd / Math.sqrt(n);
    console.log(`\n개입 ${mode} · 짝지은 판 ${n} · 개입 ${iv.hits}회 (판당 ${(iv.hits / n).toFixed(2)})`);
    console.log(`  판당 상금 차이  ${mean >= 0 ? '+' : ''}${mean.toFixed(1)} ± ${ci.toFixed(1)}`);
    console.log(mean - ci > 0 ? '  → 유의하게 이득. 학습 대상으로 확정.'
      : mean + ci < 0 ? '  → 유의하게 손해. 현재 정책이 옳다.'
      : '  → 유의차 없음.');
  }
})();
