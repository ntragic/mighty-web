/**
 * C5 인증 (전좌석 마스터) — '가시 확정승 컷 방치' 교정.
 * 공개 후, 리드 무늬 보이드인 좌석이 상대팀 최강 트릭(점수 ≥1)을 두고
 * 비기루다 버림을 선택했는데, 최저 기루다 컷이 가시 확정승이면 컷으로 교체.
 * (2026-08-08 제보 seed 746746024 트릭7: ♠6 버림 vs ♦6 컷 — +1,150/판, 24/24.
 *  keyCardGuard의 역방향: '아끼기'만 있고 '먹어야 할 때 먹기'가 없다)
 * 교사 결정론(최저 확정승 기루다) — 증류 가능 클래스. 지표: 발화 좌석 본인 상금.
 * 사용: node tools/research/c5_cert.js [판수]   env MODEL·SEED_BASE
 */
'use strict';
const path = require('path');
const P = p => path.join(__dirname, p);
const ort = require('onnxruntime-node');
const E = require(P('../../src/mighty-engine.js'));
const AI = require(P('../../src/mighty-ai.js'));
const MODEL = process.env.MODEL || P('../../web/model/mighty_master_v7.onnx');
const SEED0 = parseInt(process.env.SEED_BASE || '2200000', 10);
const PER = ['gambler', 'balanced', 'careful'];
const gt = (a, b) => a[0] > b[0] || (a[0] === b[0] && a[1] > b[1]);

function override(g, seat, act) {
  if (!g.friendRevealed || act.jokerCall) return null;
  const pl = g.play;
  if (!pl.table.length) return null;
  const gi = g.contract.giruda;
  if (gi === 'N') return null;
  const c = act.card;
  if (E.isJoker(c) || E.sameCard(c, g.mightyCard)) return null;
  if (c.suit === gi) return null;                                  // 이미 기루다(컷) 선택
  if (pl.ledSuit === gi) return null;                              // 기루다 리드면 팔로우 강제
  if (g.hands[seat].some(x => !E.isJoker(x) && x.suit === pl.ledSuit)) return null; // 보이드 아님
  const pts = pl.table.filter(e => E.isPointCard(e.card)).length;
  if (pts < 1) return null;
  // 현재 최강이 상대팀인가 (공개 후 — 팀 가시)
  let bk = [-2, -1], bp = -1;
  for (const e of pl.table) {
    const k = g._cardStrength(e, pl);
    if (gt(k, bk)) { bk = k; bp = e.player; }
  }
  const iAmRuling = seat === g.declarer || seat === g.friend;
  const bestRuling = bp === g.declarer || (g.friend !== null && bp === g.friend);
  if (iAmRuling === bestRuling) return null;                       // 아군 최강이면 방치 정당
  // 최저 '가시 확정승' 기루다 컷 탐색 — keyCardGuard와 같은 위협 논리
  const seen = new Set();
  for (const t of pl.history) for (const e of t.plays) seen.add(E.cardId(e.card));
  for (const e of pl.table) seen.add(E.cardId(e.card));
  for (const x of g.hands[seat]) seen.add(E.cardId(x));
  if (seat === g.declarer && g.discard) for (const x of g.discard) seen.add(E.cardId(x));
  const acted = new Set(pl.table.map(e => e.player)); acted.add(seat);
  let remaining = 0;
  for (let p = 0; p < E.NUM_PLAYERS; p++) if (!acted.has(p)) remaining++;
  const cfg = g.config || {};
  const lastTrick = pl.trickNo >= 10;
  const jokerCanWin = !pl.jokerCallActive &&
    !(pl.trickNo === 1 && cfg.firstTrickJokerWeak !== false) &&
    !(lastTrick && cfg.lastTrickJokerWeak !== false);
  const threats = [];
  if (remaining > 0) {
    if (!seen.has(E.cardId(g.mightyCard))) threats.push([4, 0]);
    if (jokerCanWin && !seen.has(E.JOKER)) threats.push([3, 0]);
    for (let r = 2; r <= 14; r++) if (!seen.has(gi + r)) threats.push([2, r]);
  }
  const myTr = g.hands[seat].filter(x => !E.isJoker(x) && x.suit === gi
      && !E.sameCard(x, g.mightyCard))
    .sort((a, b) => a.rank - b.rank);
  for (const tcard of myTr) {
    const k = g._cardStrength({ player: seat, card: tcard }, pl);
    if (!gt(k, bk)) continue;
    if (threats.some(t => gt(t, k))) continue;                     // 뒤 위협에 잡힘
    if (!g._legalPlays(seat).some(m => !m.jokerCall && E.sameCard(m.card, tcard))) continue;
    return { type: 'play', card: tcard };                          // 최저 확정승 컷
  }
  return null;
}

async function run(N, iv, sess) {
  const per = []; let hits = 0;
  for (let i = 0; i < N; i++) {
    const seed = SEED0 + i;
    const rng = E.makeRng(seed);
    const g = new E.MightyGame({ seed });
    const ag = [];
    for (let s = 0; s < E.NUM_PLAYERS; s++)
      ag.push(await AI.createAgent({ tier: 'master', persona: PER[s % 3], rng, session: sess, ort, keyGuard: true }));
    g.start(Math.floor(rng() * E.NUM_PLAYERS));
    let guard = 0; const fseats = new Set();
    while (g.phase !== 'done' && g.phase !== 'redeal' && guard++ < 900) {
      const p = g.currentPlayer;
      let act = await ag[p].act(g, p);
      if (iv && g.phase === 'play' && act.type === 'play') {
        const o = override(g, p, act);
        if (o) { act = o; hits++; fseats.add(p); }
      }
      g.act(act);
    }
    per.push(g.phase === 'done'
      ? { seed, decl: g.declarer, prizes: g.result.prizes.slice(), fseats: [...fseats] }
      : null);
  }
  return { per, hits };
}

(async () => {
  const N = parseInt(process.argv[2] || '800', 10);
  const sess = await ort.InferenceSession.create(MODEL);
  const base = await run(N, false, sess);
  const iv = await run(N, true, sess);
  const bm = new Map(base.per.filter(Boolean).map(r => [r.seed, r]));
  const fdiffs = []; let fr = 0;
  for (const r of iv.per.filter(Boolean)) {
    const b = bm.get(r.seed);
    if (!b || b.decl !== r.decl || !r.fseats.length) continue;
    fr++;
    let d = 0;
    for (const s of r.fseats) d += r.prizes[s] - b.prizes[s];
    fdiffs.push(d / r.fseats.length);
  }
  const st = a => { const n = a.length, m = a.reduce((x, y) => x + y, 0) / n;
    const sd = Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / (n - 1));
    return { n, m, ci: 1.96 * sd / Math.sqrt(n) }; };
  const fo = fdiffs.length > 1 ? st(fdiffs) : { n: fdiffs.length, m: fdiffs[0] || 0, ci: 0 };
  console.log(`${path.basename(MODEL)} 전좌석 마스터 · 발화 ${iv.hits}회/${fr}판`);
  console.log(`발화 좌석 본인 상금 변화 ${fo.m >= 0 ? '+' : ''}${fo.m.toFixed(1)} ± ${fo.ci.toFixed(1)} (n=${fo.n})`);
  console.log(fo.m - fo.ci > 0 ? '→ 유의 이득 — 승격 근거'
    : fo.m + fo.ci < 0 ? '→ 유의 손해 — 현재 정책이 옳다' : '→ 유의차 없음');
})();
