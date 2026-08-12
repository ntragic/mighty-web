/**
 * tfeedX 인증 — tfeedGuard의 클래스를 **리드 무늬 무관**으로 넓혔을 때 이득인가.
 *
 * 현행 tfeedGuard는 '여당 최강 **기루다 리드** 트릭'에 한정한다. 제보
 * (2026-08-11 seed 343735975 트릭9)는 하트 리드에 야당이 기루다 점수카드(♣10)를
 * 버린 경우라 클래스 밖이었다. 그 판은 남은 패가 전부 점수카드라 실측상 손해가
 * 아니었지만(what_if: 상금 차이 0), 리드 무늬로 클래스를 가르는 근거가 약하다는
 * 지적은 별개 문제다 — 그래서 넓힌 클래스를 인증한다.
 *
 * 클래스 (좌석 가시 정보만):
 *   공개 후 · 내가 확정 야당 · 테이블 비어 있지 않음(리드 아님)
 *   · 현재 최강이 여당 · 내 카드로는 그 최강을 못 이김
 *   · 내 카드가 기루다이면서 점수카드
 *   · **점수카드가 아니면서 역시 못 이기는 대체재가 존재** ← 이번 제보의 교훈.
 *     남은 패가 전부 점수카드면 교체할 게 없다. 그런 국면까지 잡으면 무해한
 *     경우를 흔들어 다른 손해를 만든다(dfeed가 넓어서 기각된 이력과 같은 계열).
 * 개입: 그 대체재 중 최저로 교체.
 *
 * 지표는 주공 상금 — **음수가 야당 이득**이다.
 * 기회 정규화도 함께 낸다(분모=클래스 성립 국면, 분자=실제로 태운 경우).
 *
 * 사용: node tools/research/tfeedx_cert.js [판수]   env MODEL·SEED_BASE·RAWPOL
 */
'use strict';
const path = require('path');
const P = p => path.join(__dirname, p);
const ort = require('onnxruntime-node');
const E = require(P('../../src/mighty-engine.js'));
const AI = require(P('../../src/mighty-ai.js'));
const MODEL = process.env.MODEL || P('../../web/model/mighty_master_v13.onnx');
const SEED0 = parseInt(process.env.SEED_BASE || '81000000', 10);
const PER = ['gambler', 'balanced', 'careful'];
const gt = (a, b) => a[0] > b[0] || (a[0] === b[0] && a[1] > b[1]);
const NOALT = { n: 0 };

/** 클래스 성립 여부와 교체 카드 — 정책 선택과 무관한 '기회' 판정은 chance() */
function chance(g, seat) {
  if (g.phase !== 'play' || !g.friendRevealed) return null;
  const pl = g.play;
  if (!pl.table.length) return null;                       // 리드는 대상 아님
  const gi = g.contract ? g.contract.giruda : 'N';
  if (gi === 'N') return null;
  if (seat === g.declarer || seat === g.friend) return null;   // 야당만
  let bk = [-2, -1], bp = -1;
  for (const e of pl.table) {
    const k = g._cardStrength(e, pl);
    if (gt(k, bk)) { bk = k; bp = e.player; }
  }
  const bestRuling = bp === g.declarer || (g.friend !== null && bp === g.friend);
  if (!bestRuling) return null;                            // 여당이 최강일 때만
  const legal = g._legalPlays(seat).filter(m => !m.jokerCall);
  const beats = c => gt(g._cardStrength({ player: seat, card: c }, pl), bk);
  // 점수 기루다를 태울 수 있는 국면인가 (그런 합법수가 있어야 클래스가 성립)
  const burn = legal.filter(m => !E.isJoker(m.card) && m.card.suit === gi
    && !E.sameCard(m.card, g.mightyCard) && E.isPointCard(m.card) && !beats(m.card));
  if (!burn.length) return null;
  // 대체재 — 점수카드가 아니고 역시 못 이기는 것
  const alts = legal.filter(m => !E.isJoker(m.card) && !E.sameCard(m.card, g.mightyCard)
    && !E.isPointCard(m.card) && !beats(m.card));
  if (!alts.length) {
    // 교체할 게 없다 → 클래스 밖. 제보(2026-08-11 트릭9)가 이 경우였고 실측상
    // 무해했다. TFX_COUNT_NOALT=1이면 이런 국면 수만 따로 세어 검증에 쓴다.
    if (process.env.TFX_COUNT_NOALT === '1') NOALT.n++;
    return null;
  }
  alts.sort((a, b) => (a.card.suit === gi ? 1 : 0) - (b.card.suit === gi ? 1 : 0)
    || a.card.rank - b.card.rank);                         // 비기루다 우선, 그중 최저
  return alts[0].card;
}

/** 실제로 태웠는가 (정책 선택 기준) */
function burned(g, seat, act) {
  if (!act || act.type !== 'play' || act.jokerCall) return null;
  const gi = g.contract ? g.contract.giruda : 'N';
  const c = act.card;
  if (E.isJoker(c) || gi === 'N' || c.suit !== gi) return null;
  if (E.sameCard(c, g.mightyCard) || !E.isPointCard(c)) return null;
  const pl = g.play;
  let bk = [-2, -1];
  for (const e of pl.table) { const k = g._cardStrength(e, pl); if (gt(k, bk)) bk = k; }
  if (gt(g._cardStrength({ player: seat, card: c }, pl), bk)) return null;  // 이기면 정당
  return chance(g, seat);
}

async function run(N, iv, sess) {
  const per = []; let hits = 0, chances = 0, burns = 0;
  for (let i = 0; i < N; i++) {
    const seed = SEED0 + i;
    const rng = E.makeRng(seed);
    const g = new E.MightyGame({ seed });
    const ag = [];
    for (let s = 0; s < E.NUM_PLAYERS; s++)
      ag.push(await AI.createAgent({ tier: 'master', persona: PER[s % 3], rng, session: sess, ort,
        // 현행 tfeedGuard를 끄고 모델 단독 판단을 잰다(동어반복 방지)
        feedGuard: process.env.RAWPOL === '1' ? false : undefined }));
    g.start(Math.floor(rng() * E.NUM_PLAYERS));
    let guard = 0, fired = 0;
    while (g.phase !== 'done' && g.phase !== 'redeal' && guard++ < 900) {
      const p = g.currentPlayer;
      let act = await ag[p].act(g, p);
      if (g.phase === 'play' && act.type === 'play') {
        if (!iv && chance(g, p)) chances++;
        const alt = burned(g, p, act);
        if (alt) {
          if (!iv) burns++;
          hits++;
          if (iv) { act = { type: 'play', card: alt }; fired++; }
        }
      }
      g.act(act);
    }
    per.push(g.phase === 'done'
      ? { seed, decl: g.declarer, prize: g.result.prizes[g.declarer], win: g.result.win, fired }
      : null);
  }
  return { per, hits, chances, burns };
}

(async () => {
  const N = parseInt(process.argv[2] || '3000', 10);
  const sess = await ort.InferenceSession.create(MODEL);
  const base = await run(N, false, sess);
  const iv = await run(N, true, sess);
  const bm = new Map(base.per.filter(Boolean).map(r => [r.seed, r]));
  const diffs = [], fdiffs = []; let dWin = 0, fr = 0;
  for (const r of iv.per.filter(Boolean)) {
    const b = bm.get(r.seed);
    if (!b || b.decl !== r.decl) continue;
    const d = r.prize - b.prize;
    diffs.push(d);
    if (r.fired > 0) { fdiffs.push(d); fr++; dWin += (r.win ? 1 : 0) - (b.win ? 1 : 0); }
  }
  const st = a => { const n = a.length, m = a.reduce((x, y) => x + y, 0) / n;
    const sd = Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / (n - 1));
    return { n, m, ci: 1.96 * sd / Math.sqrt(n) }; };
  const all = st(diffs), fo = fdiffs.length > 1 ? st(fdiffs) : { n: fdiffs.length, m: fdiffs[0] || 0, ci: 0 };
  const br = base.chances ? base.burns / base.chances : 0;
  console.log(`${path.basename(MODEL)} 전좌석 마스터 · 짝지은 ${all.n}판 · 발화 ${base.hits}회/${fr}판`);
  console.log(`기회 정규화 — 클래스 성립 ${base.chances}회 중 실제로 태움 ${base.burns}회 = `
    + `${(100 * br).toFixed(1)}%`);
  if (process.env.TFX_COUNT_NOALT === '1')
    console.log(`참고 — 대체재가 없어 클래스 밖인 국면 ${NOALT.n}회 (제보 유형: 남은 패가 전부 점수카드)`);
  console.log(`주공 상금 변화(음수=야당 이득) 전체 ${all.m >= 0 ? '+' : ''}${all.m.toFixed(1)} ± ${all.ci.toFixed(1)}`);
  console.log(`발화 판 한정 ${fo.m >= 0 ? '+' : ''}${fo.m.toFixed(1)} ± ${fo.ci.toFixed(1)} (n=${fo.n}) · 여당 승수 변화 ${dWin >= 0 ? '+' : ''}${dWin}`);
  console.log(fo.m + fo.ci < 0 ? '→ 야당 유의 이득 — 클래스 확장 승격 근거'
    : fo.m - fo.ci > 0 ? '→ 유의 손해 — 확장하면 안 된다' : '→ 유의차 없음');
})();
