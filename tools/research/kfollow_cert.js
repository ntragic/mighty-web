/**
 * keyCardGuard 'no-cheap-alt' 폴백 인증 — 기루다 팔로우 낭비 클래스.
 *
 * 제보(2026-09-12, seed 2135136798 6트릭): 주공 유나가 야당 ♠A로 이미 잠긴 트릭에
 * ♠5를 두고 ♠K를 버려 점수 1장을 헌납했고, 공약 15에 1장 모자라 졌다.
 *
 * keyCardGuard는 이 수를 낭비로 옳게 판정한다(lockedForOthers·winnerIsOpp 모두 참).
 * 그런데 대체 카드를 고를 때 기루다를 통째로 낭비 취급해 제외하므로, 기루다가
 * 리드된 트릭에서는 합법수가 전부 기루다라 후보가 0개가 되고 'no-cheap-alt'로
 * 원래 수를 통과시킨다. 야당 방향은 같은 함정을 dfeed→tfeed 재정의로 이미 고쳤는데
 * (docs/GUARDS.md 인증 탈락표), 여당 방향에는 그 수정이 없다.
 *
 * 여기서 재는 것: 그 자리에서 '합법수 중 키카드가 아니고 이기지도 못하는 카드 가운데
 * 최저 비용'으로 바꾸면 여당에 이득인가. 지표는 주공 상금(양수=여당 이득).
 *
 * 사용: node tools/research/kfollow_cert.js [판수]   env MODEL·SEED_BASE
 */
'use strict';
const path = require('path');
const P = p => path.join(__dirname, p);
const ort = require('onnxruntime-node');
const E = require(P('../../src/mighty-engine.js'));
const AI = require(P('../../src/mighty-ai.js'));
const MODEL = process.env.MODEL || P('../../web/model/mighty_master_v16e.onnx');
const SEED0 = parseInt(process.env.SEED_BASE || '2100000', 10);
const PER = ['gambler', 'balanced', 'careful'];

const isKeyOf = (g, x) => E.isJoker(x) || E.sameCard(x, g.mightyCard);
const cost = (g, c) => (c.rank || 0) + (E.isPointCard(c) ? 30 : 0);

/** 좌석의 팀 (가시 정보만) — 공개 전이면 모른다. */
function sideOf(g, seat) {
  if (seat === g.declarer) return 'att';
  if (g.friendRevealed) return (g.friend !== null && seat === g.friend) ? 'att' : 'def';
  const fd = g.friendDecl;
  if (fd && fd.mode === 'card' && fd.card && g.hands[seat].some(x => E.sameCard(x, fd.card))) return 'att';
  return null;
}

/** 가드가 포기한 자리인가 — 낭비로 판정했는데 대체재를 못 찾은 경우만. */
function fireCond(g, seat, act, side) {
  if (!act || act.type !== 'play' || g.phase !== 'play' || act.jokerCall) return false;
  if (side !== 'all' && sideOf(g, seat) !== side) return false;
  const tr = {};
  AI.keyCardGuard(g, seat, act, tr);
  return tr.why === 'no-cheap-alt' && tr.lockedForOthers === true &&
         tr.winnerIsOpp === true && tr.iWin === false;
}

/** 제안 폴백: 이기지 못하는 카드 중 최저 비용(점수카드는 강한 벌점), 키카드 제외. */
function fallbackPick(g, seat, act) {
  const pl = g.play;
  let bk = [-2, -1];
  for (const e of pl.table) {
    const k = g._cardStrength(e, pl);
    if (k[0] > bk[0] || (k[0] === bk[0] && k[1] > bk[1])) bk = k;
  }
  const beats = m => {
    const k = g._cardStrength({ player: seat, card: m.card, jokerSuit: m.jokerSuit }, pl);
    return k[0] > bk[0] || (k[0] === bk[0] && k[1] > bk[1]);
  };
  const cand = g._legalPlays(seat)
    .filter(m => !m.jokerCall && !isKeyOf(g, m.card) && !beats(m));
  if (!cand.length) return null;
  cand.sort((a, b) => cost(g, a.card) - cost(g, b.card));
  const pick = cand[0];
  return cost(g, pick.card) < cost(g, act.card) ? { type: 'play', card: pick.card } : null;
}

/* 발화를 한 팀으로 제한한다. 양 팀이 같은 판에서 발화하면 상금 변화가 서로
   상쇄돼 지표가 죽는다 — 1차 측정(SIDE 없음)에서 실제로 그렇게 나왔다.
   같은 팀만 발화하면 전 좌석을 살려도 부호가 일정하다. 지표는 주공 상금:
   SIDE=att면 양수가 이득, SIDE=def면 음수가 이득. */
async function run(N, intervene, sess, side) {
  const per = [];
  let hits = 0;
  for (let i = 0; i < N; i++) {
    const seed = SEED0 + i;
    const rng = E.makeRng(seed);
    const g = new E.MightyGame({ seed });
    const ag = [];
    for (let s = 0; s < E.NUM_PLAYERS; s++)
      ag.push(await AI.createAgent({ tier: 'master', persona: PER[s % 3], rng, session: sess, ort }));
    g.start(Math.floor(rng() * E.NUM_PLAYERS));
    let guard = 0, fired = 0;
    while (g.phase !== 'done' && g.phase !== 'redeal' && guard++ < 900) {
      const p = g.currentPlayer;
      let act = await ag[p].act(g, p);
      if (g.phase === 'play' && act.type === 'play' && fireCond(g, p, act, side)) {
        const alt = fallbackPick(g, p, act);
        if (alt) {
          hits++; fired++;
          if (intervene) act = alt;
        }
      }
      g.act(act);
    }
    per.push(g.phase === 'done'
      ? { seed, decl: g.declarer, prize: g.result.prizes[g.declarer], win: g.result.win, fired }
      : null);
  }
  return { per, hits };
}

(async () => {
  const N = parseInt(process.argv[2] || '800', 10);
  const side = process.env.SIDE || 'att';          // att=여당 발화만 · def=야당 · all
  const sess = await ort.InferenceSession.create(MODEL);
  const base = await run(N, false, sess, side);
  const iv = await run(N, true, sess, side);
  const bm = new Map(base.per.filter(Boolean).map(r => [r.seed, r]));
  const diffs = [], fdiffs = [];
  let dWin = 0, fr = 0;
  for (const r of iv.per.filter(Boolean)) {
    const b = bm.get(r.seed);
    if (!b || b.decl !== r.decl) continue;
    const d = r.prize - b.prize;
    diffs.push(d);
    if (r.fired > 0) { fdiffs.push(d); fr++; dWin += (r.win ? 1 : 0) - (b.win ? 1 : 0); }
  }
  const dir = side === 'def' ? -1 : 1;      // def는 주공 상금이 내려가야 이득
  console.log(`측정 방향 SIDE=${side} · 지표=주공 상금(${side === 'def' ? '음수' : '양수'}=발화 팀 이득)`);
  const st = a => {
    const n = a.length, m = a.reduce((x, y) => x + y, 0) / n;
    const sd = Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / (n - 1));
    return { n, m, ci: 1.96 * sd / Math.sqrt(n) };
  };
  const all = st(diffs);
  const fo = fdiffs.length > 1 ? st(fdiffs) : { n: fdiffs.length, m: fdiffs[0] || 0, ci: 0 };
  console.log(`${path.basename(MODEL)} 전좌석 마스터 · 짝지은 ${all.n}판 · 발화 ${base.hits}회/${fr}판 ` +
              `(판당 ${(base.hits / Math.max(1, all.n)).toFixed(3)}회)`);
  console.log(`주공 상금 변화 전체 ${all.m >= 0 ? '+' : ''}${all.m.toFixed(1)} ± ${all.ci.toFixed(1)}`);
  console.log(`발화 판 한정 ${fo.m >= 0 ? '+' : ''}${fo.m.toFixed(1)} ± ${fo.ci.toFixed(1)} (n=${fo.n}) · 여당 승수 변화 ${dWin >= 0 ? '+' : ''}${dWin}`);
  const eff = dir * fo.m, lo = eff - fo.ci;
  console.log(lo > 0 ? '→ 발화 팀 유의 이득 — 폴백 채택 근거'
    : eff + fo.ci < 0 ? '→ 발화 팀 유의 손해 — 현재 동작이 옳다'
    : '→ 유의차 없음 (무해하면 낭비 가독성 근거로 채택 가능)');
})();
