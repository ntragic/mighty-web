/**
 * 기루다 보존 인증 — 못 이기는 트릭에 기루다를 버리는 결정을 비기루다로 바꾸면
 * 이득인가.
 *
 * 제보 (2026-08-11 seed 343735975 트릭9): 야당 좌석이 마이티가 이미 나와 승패가
 * 결정된 트릭에 기루다 점수카드(♣10)를 버리고 ♠10을 남겼다. 기루다를 남겼으면
 * 마지막 트릭을 **확정으로** 컷해 먹는다. PIMC 400벌 실측: ♠10 버리기 +439±41,
 * ♣10 버리기 −220±70 — 차이 659점.
 *
 * 앞선 tfeedX 인증은 클래스를 잘못 잡았다. '점수카드가 아닌 대체재'를 요구해
 * 이번처럼 **둘 다 점수카드**인 국면을 클래스 밖으로 분류했다. 진짜 축은 점수
 * 여부가 아니라 기루다냐 아니냐다.
 *
 * 클래스 (좌석 가시 정보만):
 *   테이블 비어 있지 않음(리드 아님) · 내 카드로 현재 최강을 못 이김
 *   · 낸 카드가 기루다(마이티·조커 제외) · **비기루다 합법수가 존재**
 *   · 그 트릭의 현재 최강이 상대팀
 *       공개 후: 팀 가시로 판정
 *       공개 전: 확정 야당(비주공·카드프렌드 미보유)이 주공 최강 트릭에서만
 *   개입: 비기루다 중 최저(점수 아닌 것 우선)로 교체
 *
 * env STRICT=1 이면 비기루다 대체재가 **점수카드가 아닐 때만** 발화한다(변형 B).
 * 지표는 발화 좌석 본인 상금 — 양수면 이득이다.
 *
 * 사용: node tools/research/trumpsave_cert.js [판수]   env MODEL·SEED_BASE·RAWPOL·STRICT
 */
'use strict';
const path = require('path');
const P = p => path.join(__dirname, p);
const ort = require('onnxruntime-node');
const E = require(P('../../src/mighty-engine.js'));
const AI = require(P('../../src/mighty-ai.js'));
const MODEL = process.env.MODEL || P('../../web/model/mighty_master_v13.onnx');
const SEED0 = parseInt(process.env.SEED_BASE || '91000000', 10);
const STRICT = process.env.STRICT === '1';
// LATE=n 이면 '내 남은 패가 n장 이하'일 때만 발화한다. 기루다를 남기는 이득은
// 후반일수록 확실하다 — 남은 카드가 적으면 그 기루다가 컷으로 트릭을 확정
// 회수한다. 반대로 중반에는 더 높은 기루다에 잡히거나 쓸 기회가 안 온다.
// 전체 구간(LATE=0) 인증은 발화 354판 +23±82로 중립이었다(docs/trumpsave-cert.txt).
// 제보 국면(트릭9·남은 2장)은 LATE=3에 포함된다.
const LATE = parseInt(process.env.LATE || '0', 10);
const PER = ['gambler', 'balanced', 'careful'];
const gt = (a, b) => a[0] > b[0] || (a[0] === b[0] && a[1] > b[1]);

/** 그 트릭의 현재 최강이 상대팀인가 (좌석 가시 정보만) */
function losingToOpp(g, seat) {
  const pl = g.play;
  let bk = [-2, -1], bp = -1;
  for (const e of pl.table) {
    const k = g._cardStrength(e, pl);
    if (gt(k, bk)) { bk = k; bp = e.player; }
  }
  if (bp < 0) return null;
  if (g.friendRevealed) {
    const mine = seat === g.declarer || (g.friend !== null && seat === g.friend);
    const best = bp === g.declarer || (g.friend !== null && bp === g.friend);
    return mine === best ? null : bk;                  // 아군이 최강이면 대상 아님
  }
  // 공개 전 — 확정 야당만, 그리고 주공이 최강일 때만
  const fd = g.friendDecl;
  const holds = fd && fd.mode === 'card' && fd.card &&
    g.hands[seat].some(c => E.sameCard(c, fd.card));
  if (seat === g.declarer || holds) return null;
  return bp === g.declarer ? bk : null;
}

/** 기회 판정 — 정책 선택과 무관. 반환: 교체할 비기루다 카드 */
function chance(g, seat) {
  if (g.phase !== 'play') return null;
  const pl = g.play;
  if (!pl.table.length) return null;
  if (LATE && g.hands[seat].length > LATE) return null;   // 후반 한정
  const gi = g.contract ? g.contract.giruda : 'N';
  if (gi === 'N') return null;
  const bk = losingToOpp(g, seat);
  if (!bk) return null;
  const legal = g._legalPlays(seat).filter(m => !m.jokerCall);
  const beats = c => gt(g._cardStrength({ player: seat, card: c }, pl), bk);
  // 못 이기는 기루다를 낼 수 있는 국면이어야 클래스가 성립한다
  const burn = legal.filter(m => !E.isJoker(m.card) && m.card.suit === gi
    && !E.sameCard(m.card, g.mightyCard) && !beats(m.card));
  if (!burn.length) return null;
  let alts = legal.filter(m => !E.isJoker(m.card) && !E.sameCard(m.card, g.mightyCard)
    && m.card.suit !== gi && !beats(m.card));
  if (STRICT) alts = alts.filter(m => !E.isPointCard(m.card));
  if (!alts.length) return null;
  // 점수 아닌 것 우선, 그중 최저
  alts.sort((a, b) => (E.isPointCard(a.card) ? 1 : 0) - (E.isPointCard(b.card) ? 1 : 0)
    || a.card.rank - b.card.rank);
  return alts[0].card;
}

/** 실제로 기루다를 버렸는가 */
function wasted(g, seat, act) {
  if (!act || act.type !== 'play' || act.jokerCall) return null;
  const gi = g.contract ? g.contract.giruda : 'N';
  const c = act.card;
  if (E.isJoker(c) || gi === 'N' || c.suit !== gi || E.sameCard(c, g.mightyCard)) return null;
  const pl = g.play;
  let bk = [-2, -1];
  for (const e of pl.table) { const k = g._cardStrength(e, pl); if (gt(k, bk)) bk = k; }
  if (gt(g._cardStrength({ player: seat, card: c }, pl), bk)) return null;   // 이기면 정당
  return chance(g, seat);
}

async function run(N, iv, sess) {
  const per = []; let hits = 0, chances = 0, wastes = 0;
  for (let i = 0; i < N; i++) {
    const seed = SEED0 + i;
    const rng = E.makeRng(seed);
    const g = new E.MightyGame({ seed });
    const ag = [];
    for (let s = 0; s < E.NUM_PLAYERS; s++)
      ag.push(await AI.createAgent({ tier: 'master', persona: PER[s % 3], rng, session: sess, ort,
        feedGuard: process.env.RAWPOL === '1' ? false : undefined }));
    g.start(Math.floor(rng() * E.NUM_PLAYERS));
    let guard = 0; const fseats = new Set();
    while (g.phase !== 'done' && g.phase !== 'redeal' && guard++ < 900) {
      const p = g.currentPlayer;
      let act = await ag[p].act(g, p);
      if (g.phase === 'play' && act.type === 'play') {
        if (!iv && chance(g, p)) chances++;
        const alt = wasted(g, p, act);
        if (alt) {
          if (!iv) wastes++;
          hits++;
          if (iv) { act = { type: 'play', card: alt }; fseats.add(p); }
        }
      }
      g.act(act);
    }
    per.push(g.phase === 'done'
      ? { seed, prizes: g.result.prizes.slice(), fseats: [...fseats] } : null);
  }
  return { per, hits, chances, wastes };
}

(async () => {
  const N = parseInt(process.argv[2] || '3000', 10);
  const sess = await ort.InferenceSession.create(MODEL);
  const base = await run(N, false, sess);
  const iv = await run(N, true, sess);
  const bm = new Map(base.per.filter(Boolean).map(r => [r.seed, r]));
  const fdiffs = []; let fr = 0;
  for (const r of iv.per.filter(Boolean)) {
    const b = bm.get(r.seed);
    if (!b || !r.fseats.length) continue;
    fr++;
    for (const s of r.fseats) fdiffs.push(r.prizes[s] - b.prizes[s]);   // 발화 좌석 본인 상금
  }
  const st = a => { const n = a.length, m = a.reduce((x, y) => x + y, 0) / n;
    const sd = Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / (n - 1));
    return { n, m, ci: 1.96 * sd / Math.sqrt(n) }; };
  const fo = fdiffs.length > 1 ? st(fdiffs) : { n: fdiffs.length, m: fdiffs[0] || 0, ci: 0 };
  const wr = base.chances ? base.wastes / base.chances : 0;
  console.log(`${path.basename(MODEL)} 전좌석 마스터 · STRICT=${STRICT ? 1 : 0} · LATE=${LATE} · 발화 ${base.hits}회/${fr}판`);
  console.log(`기회 정규화 — 클래스 성립 ${base.chances}회 중 기루다 버림 ${base.wastes}회 = ${(100 * wr).toFixed(1)}%`);
  console.log(`발화 좌석 본인 상금 변화 ${fo.m >= 0 ? '+' : ''}${fo.m.toFixed(1)} ± ${fo.ci.toFixed(1)} (n=${fo.n})`);
  console.log(fo.m - fo.ci > 0 ? '→ 유의 이득 — 승격 근거'
    : fo.m + fo.ci < 0 ? '→ 유의 손해 — 현재 정책이 옳다' : '→ 유의차 없음');
})();
