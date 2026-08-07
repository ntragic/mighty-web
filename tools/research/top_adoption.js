/** 탑 리드 관례 채택률 — 전좌석 동일 모델 자가플레이에서 주공의 기회 대비 채택.
 *  사용: node tools/research/top_adoption.js <model.onnx> [판수]  (env SEED_BASE) */
'use strict';
const path = require('path');
const P = p => path.join(__dirname, p);
const ort = require('onnxruntime-node');
const E = require(P('../../src/mighty-engine.js'));
const AI = require(P('../../src/mighty-ai.js'));
const SEED0 = parseInt(process.env.SEED_BASE || '970000', 10);
const PER = ['gambler', 'balanced', 'careful'];

function seenSet(g, seat) {
  const s = new Set(); const pl = g.play;
  for (const tr of pl.history) for (const e of tr.plays) s.add(E.cardId(e.card));
  for (const e of pl.table) s.add(E.cardId(e.card));
  for (const c of g.hands[seat]) s.add(E.cardId(c));
  if (seat === g.declarer && g.discard) for (const c of g.discard) s.add(E.cardId(c));
  return s;
}
// 기회: 주공 리드·기루다 리드 선택·내 최고 기루다 위 서열 미출현·상대 기루다 잔존
function topOpportunity(g, seat, act) {
  if (seat !== g.declarer || g.play.table.length !== 0) return null;
  const gi = g.contract.giruda;
  if (gi === 'N' || E.isJoker(act.card) || act.card.suit !== gi) return null;
  const myTr = g.hands[seat].filter(x => !E.isJoker(x) && x.suit === gi)
    .sort((a, b) => b.rank - a.rank);
  if (!myTr.length) return null;
  const seen = seenSet(g, seat);
  const outR = [];
  for (let r = 14; r >= 2; r--) if (!seen.has(gi + r)) outR.push(r);
  if (!outR.length || outR[0] > myTr[0].rank) return null;
  return { took: E.sameCard(act.card, myTr[0]) };
}

(async () => {
  const model = process.argv[2];
  const N = parseInt(process.argv[3] || '200', 10);
  const sess = await ort.InferenceSession.create(model);
  let opp = 0, took = 0, done = 0;
  for (let i = 0; i < N; i++) {
    const seed = SEED0 + i;
    const rng = E.makeRng(seed);
    const g = new E.MightyGame({ seed });
    const ag = [];
    for (let s = 0; s < E.NUM_PLAYERS; s++)
      ag.push(await AI.createAgent({ tier: 'master', persona: PER[s % 3], rng, session: sess, ort, keyGuard: true }));
    g.start(Math.floor(rng() * E.NUM_PLAYERS));
    let guard = 0;
    while (g.phase !== 'done' && g.phase !== 'redeal' && guard++ < 900) {
      const p = g.currentPlayer;
      const act = await ag[p].act(g, p);
      if (g.phase === 'play' && act.type === 'play') {
        const op = topOpportunity(g, p, act);
        if (op) { opp++; if (op.took) took++; }
      }
      g.act(act);
    }
    if (g.phase === 'done') done++;
  }
  const r = opp ? 100 * took / opp : 0;
  const se = opp ? 196 * Math.sqrt(r / 100 * (1 - r / 100) / opp) : 0;
  console.log(`${path.basename(model)} · ${done}판 · 채택 ${r.toFixed(1)}% ± ${se.toFixed(1)} [${took}/${opp}]`);
})();
