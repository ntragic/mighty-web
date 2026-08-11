/**
 * C5 인증 (전좌석 마스터) — '가시 확정승 컷 방치' 교정.
 * 공개 후, 리드 무늬 보이드인 좌석이 상대팀 최강 트릭(점수 ≥1)을 두고
 * 비기루다 버림을 선택했는데, 최저 기루다 컷이 가시 확정승이면 컷으로 교체.
 * (2026-08-08 제보 seed 746746024 트릭7: ♠6 버림 vs ♦6 컷 — +1,150/판, 24/24.
 *  keyCardGuard의 역방향: '아끼기'만 있고 '먹어야 할 때 먹기'가 없다)
 * 교사 결정론(최저 확정승 기루다) — 증류 가능 클래스. 지표: 발화 좌석 본인 상금.
 * C5p 변형 env C5_PREREVEAL=1 — **프렌드 공개 전** 구간으로 클래스를 확장한다.
 * 공개 전에는 팀을 모르지만, '확정 야당'(비주공·카드 프렌드 미보유)은 주공이
 * 최강인 트릭이 상대팀 트릭임을 알 수 있다. 좌석 가시 정보만으로 성립한다.
 * (2026-08-10 제보: 트릭1에서 야당이 스페이드 보이드인데 기루다 컷 대신 클럽을
 *  버려 주공에게 트릭을 주고, 리드를 못 잡아 조커콜 기회까지 날렸다)
 *
 * 사용: node tools/research/c5_cert.js [판수]   env MODEL·SEED_BASE·C5_PREREVEAL
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

const PREREVEAL = process.env.C5_PREREVEAL === '1';

/**
 * 기회 판정 — '확정승 컷이 존재하는 국면'인가. 정책이 무엇을 골랐는지는 보지
 * 않는다. 기회 정규화(미스율 = 미스/기회)의 분모를 세기 위한 함수다.
 * 반환: 최저 확정승 컷 카드 또는 null.
 */
function cutChance(g, seat) {
  if (!g.friendRevealed && !PREREVEAL) return null;
  const pl = g.play;
  if (!pl.table.length) return null;
  const gi = g.contract.giruda;
  if (gi === 'N') return null;
  if (pl.ledSuit === gi) return null;                              // 기루다 리드면 팔로우 강제
  if (g.hands[seat].some(x => !E.isJoker(x) && x.suit === pl.ledSuit)) return null;  // 보이드 아님
  if (pl.table.filter(e => E.isPointCard(e.card)).length < 1) return null;
  let bk = [-2, -1], bp = -1;
  for (const e of pl.table) {
    const k = g._cardStrength(e, pl);
    if (gt(k, bk)) { bk = k; bp = e.player; }
  }
  if (g.friendRevealed) {
    const iAmRuling = seat === g.declarer || seat === g.friend;
    const bestRuling = bp === g.declarer || (g.friend !== null && bp === g.friend);
    if (iAmRuling === bestRuling) return null;
  } else {
    const fd = g.friendDecl;
    const holdsFriendCard = fd && fd.mode === 'card' && fd.card &&
      g.hands[seat].some(x => E.sameCard(x, fd.card));
    if (seat === g.declarer || holdsFriendCard) return null;
    if (bp !== g.declarer) return null;
  }
  const seen = new Set();
  for (const t of pl.history) for (const e of t.plays) seen.add(E.cardId(e.card));
  for (const e of pl.table) seen.add(E.cardId(e.card));
  for (const x of g.hands[seat]) seen.add(E.cardId(x));
  if (seat === g.declarer && g.discard) for (const x of g.discard) seen.add(E.cardId(x));
  const acted = new Set(pl.table.map(e => e.player)); acted.add(seat);
  let remaining = 0;
  for (let q = 0; q < E.NUM_PLAYERS; q++) if (!acted.has(q)) remaining++;
  const cfg = g.config || {};
  const jokerCanWin = !pl.jokerCallActive &&
    !(pl.trickNo === 1 && cfg.firstTrickJokerWeak !== false) &&
    !(pl.trickNo >= 10 && cfg.lastTrickJokerWeak !== false);
  const threats = [];
  if (remaining > 0) {
    if (!seen.has(E.cardId(g.mightyCard))) threats.push([4, 0]);
    if (jokerCanWin && !seen.has(E.JOKER)) threats.push([3, 0]);
    for (let r = 2; r <= 14; r++) if (!seen.has(gi + r)) threats.push([2, r]);
  }
  const myTr = g.hands[seat].filter(x => !E.isJoker(x) && x.suit === gi
      && !E.sameCard(x, g.mightyCard)).sort((a, b) => a.rank - b.rank);
  for (const tcard of myTr) {
    const k = g._cardStrength({ player: seat, card: tcard }, pl);
    if (!gt(k, bk)) continue;
    if (threats.some(t => gt(t, k))) continue;
    if (!g._legalPlays(seat).some(m => !m.jokerCall && E.sameCard(m.card, tcard))) continue;
    return tcard;
  }
  return null;
}

/** 미스 판정 — 기회인데 비기루다로 버렸는가 */
function missedCut(g, seat, act) {
  if (!act || act.type !== 'play' || act.jokerCall) return null;
  const c = act.card;
  const gi = g.contract ? g.contract.giruda : 'N';
  if (E.isJoker(c) || E.sameCard(c, g.mightyCard)) return null;
  if (c.suit === gi) return null;                                  // 이미 컷했다
  return cutChance(g, seat);
}

function override(g, seat, act) {
  if (act.jokerCall) return null;
  if (!g.friendRevealed && !PREREVEAL) return null;
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
  if (g.friendRevealed) {
    const iAmRuling = seat === g.declarer || seat === g.friend;
    const bestRuling = bp === g.declarer || (g.friend !== null && bp === g.friend);
    if (iAmRuling === bestRuling) return null;                     // 아군 최강이면 방치 정당
  } else {
    // 공개 전 — 팀은 모르지만 '확정 야당'은 주공이 최강인 트릭이 상대 트릭임을 안다.
    // 카드 프렌드를 자기가 들고 있으면 자기가 프렌드이므로 제외한다(좌석 가시 정보).
    const fd = g.friendDecl;
    const holdsFriendCard = fd && fd.mode === 'card' && fd.card &&
      g.hands[seat].some(x => E.sameCard(x, fd.card));
    if (seat === g.declarer || holdsFriendCard) return null;
    if (bp !== g.declarer) return null;                            // 주공이 최강일 때만
  }
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
  const per = []; let hits = 0, chances = 0, misses = 0;
  for (let i = 0; i < N; i++) {
    const seed = SEED0 + i;
    const rng = E.makeRng(seed);
    const g = new E.MightyGame({ seed });
    const ag = [];
    for (let s = 0; s < E.NUM_PLAYERS; s++)
      ag.push(await AI.createAgent({ tier: 'master', persona: PER[s % 3], rng, session: sess, ort,
        keyGuard: true,
        // RAWPOL=1 — cutGuard를 꺼서 모델 단독 판단을 잰다(가드가 이미 교정한
        // 출력을 검사하면 동어반복이 된다)
        cutGuard: process.env.RAWPOL === '1' ? false : undefined }));
    g.start(Math.floor(rng() * E.NUM_PLAYERS));
    let guard = 0; const fseats = new Set();
    while (g.phase !== 'done' && g.phase !== 'redeal' && guard++ < 900) {
      const p = g.currentPlayer;
      let act = await ag[p].act(g, p);
      if (!iv && g.phase === 'play' && act.type === 'play') {
        // 기회 정규화 — 분모는 '확정승 컷이 존재하는 국면', 분자는 그중 버린 경우
        if (cutChance(g, p)) chances++;
        if (missedCut(g, p, act)) misses++;
      }
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
  return { per, hits, chances, misses };
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
  const mr = base.chances ? base.misses / base.chances : 0;
  const mci = base.chances ? 1.96 * Math.sqrt(mr * (1 - mr) / base.chances) : 0;
  console.log(`${path.basename(MODEL)} 전좌석 마스터 · 발화 ${iv.hits}회/${fr}판`);
  console.log(`기회 정규화 — 확정승 컷 기회 ${base.chances}회 중 버림 ${base.misses}회 = `
    + `미스율 ${(100 * mr).toFixed(1)}% ± ${(100 * mci).toFixed(1)}%p`);
  console.log(`발화 좌석 본인 상금 변화 ${fo.m >= 0 ? '+' : ''}${fo.m.toFixed(1)} ± ${fo.ci.toFixed(1)} (n=${fo.n})`);
  console.log(fo.m - fo.ci > 0 ? '→ 유의 이득 — 승격 근거'
    : fo.m + fo.ci < 0 ? '→ 유의 손해 — 현재 정책이 옳다' : '→ 유의차 없음');
})();
