/**
 * tfeed 인증 (전좌석 마스터) — 공개 후 야당이, 여당이 현재 최강인 기루다 리드
 * 트릭에서 점수 기루다를 태우는 결정을 최저 비점수 기루다로 교체.
 * 개입은 모든 야당 좌석. 지표는 주공 상금(감소 = 야당 이득).
 * 사용: node tools/research/tfeed_cert.js [판수]   env MODEL·SEED_BASE
 */
'use strict';
const path = require('path');
const P = p => path.join(__dirname, p);
const ort = require('onnxruntime-node');
const E = require(P('../../src/mighty-engine.js'));
const AI = require(P('../../src/mighty-ai.js'));
const MODEL = process.env.MODEL || P('../../web/model/mighty_master_v6b.onnx');
const SEED0 = parseInt(process.env.SEED_BASE || '1250000', 10);
const PER = ['gambler', 'balanced', 'careful'];
const strength = (g, e, pl) => g._cardStrength(e, pl);
const stronger = (a, b) => a[0] > b[0] || (a[0] === b[0] && a[1] > b[1]);

function override(g, seat, act) {
  if (!g.friendRevealed) return null;
  if (seat === g.declarer || seat === g.friend) return null;
  const pl = g.play;
  if (!pl.table.length || act.jokerCall) return null;
  const gi = g.contract ? g.contract.giruda : 'N';
  if (gi === 'N' || pl.ledSuit !== gi) return null;
  let bk = [-2, -1], bp = -1;
  for (const e of pl.table) {
    const k = strength(g, e, pl);
    if (stronger(k, bk)) { bk = k; bp = e.player; }
  }
  if (!(bp === g.declarer || (g.friend !== null && bp === g.friend))) return null;
  const c = act.card;
  const isKey = x => E.isJoker(x) || E.sameCard(x, g.mightyCard);
  if (isKey(c) || E.isJoker(c) || c.suit !== gi || !E.isPointCard(c)) return null;
  if (stronger(strength(g, { player: seat, card: c }, pl), bk)) return null;
  const alt = g._legalPlays(seat).filter(m => !m.jokerCall && !E.isJoker(m.card)
    && !isKey(m.card) && m.card.suit === gi && !E.isPointCard(m.card)
    && !stronger(strength(g, { player: seat, card: m.card }, pl), bk));
  if (!alt.length) return null;
  alt.sort((a, b) => a.card.rank - b.card.rank);
  return { type: 'play', card: alt[0].card };
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
    let guard = 0, fired = 0;
    while (g.phase !== 'done' && g.phase !== 'redeal' && guard++ < 900) {
      const p = g.currentPlayer;
      let act = await ag[p].act(g, p);
      if (iv && g.phase === 'play' && act.type === 'play') {
        const o = override(g, p, act);
        if (o) { act = o; hits++; fired++; }
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
  const sess = await ort.InferenceSession.create(MODEL);
  const base = await run(N, false, sess);
  const iv = await run(N, true, sess);
  const bm = new Map(base.per.filter(Boolean).map(r => [r.seed, r]));
  const diffs = [], fdiffs = []; let dWin = 0, fr = 0;
  for (const r of iv.per.filter(Boolean)) {
    const b = bm.get(r.seed);
    if (!b || b.decl !== r.decl) continue;
    const d = r.prize - b.prize;                     // 주공 상금 변화 (음수 = 야당 이득)
    diffs.push(d);
    if (r.fired > 0) { fdiffs.push(d); fr++; dWin += (r.win ? 1 : 0) - (b.win ? 1 : 0); }
  }
  const st = a => { const n = a.length, m = a.reduce((x, y) => x + y, 0) / n;
    const sd = Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / (n - 1));
    return { n, m, ci: 1.96 * sd / Math.sqrt(n) }; };
  const all = st(diffs), fo = fdiffs.length > 1 ? st(fdiffs) : { n: fdiffs.length, m: fdiffs[0] || 0, ci: 0 };
  console.log(`${path.basename(MODEL)} 전좌석 마스터 · 짝지은 ${all.n}판 · 발화 ${iv.hits}회/${fr}판`);
  console.log(`주공 상금 변화(음수=야당 이득) 전체 ${all.m >= 0 ? '+' : ''}${all.m.toFixed(1)} ± ${all.ci.toFixed(1)}`);
  console.log(`발화 판 한정 ${fo.m >= 0 ? '+' : ''}${fo.m.toFixed(1)} ± ${fo.ci.toFixed(1)} (n=${fo.n}) · 여당 승수 변화 ${dWin >= 0 ? '+' : ''}${dWin}`);
  console.log(fo.m + fo.ci < 0 ? '→ 야당 유의 이득 — 가드 승격 근거'
    : fo.m - fo.ci > 0 ? '→ 야당 유의 손해 — 현재 정책이 옳다' : '→ 유의차 없음');
})();
