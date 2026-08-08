/**
 * 자가 스크리닝 — 자가대전 N판을 전 좌석 관전 복기(analyzeRound)로 훑어
 * NN 스스로 놓친 이득(lineGain>0 하이라이트)을 JSONL로 축적한다.
 * 증류 후보 발굴용: 국면 특징(역할·리드/팔로·트릭 구간·카드 종류)별 클러스터 요약.
 *
 * 사용: node tools/research/self_review.js [판수] [출력.jsonl]
 *   env MODEL·SEED_BASE
 */
'use strict';
const fs = require('fs');
const path = require('path');
const P = p => path.join(__dirname, p);
const ort = require('onnxruntime-node');
const E = require(P('../../src/mighty-engine.js'));
const AI = require(P('../../src/mighty-ai.js'));
const A = require(P('../../src/mighty-analysis.js'));
const MODEL = process.env.MODEL || P('../../web/model/mighty_master_v6b.onnx');
const SEED0 = parseInt(process.env.SEED_BASE || '1400000', 10);
const PER = ['gambler', 'balanced', 'careful'];

async function playRound(seed, sess) {
  const rng = E.makeRng(seed);
  const g = new E.MightyGame({ seed });
  const ag = [];
  for (let s = 0; s < E.NUM_PLAYERS; s++)
    ag.push(await AI.createAgent({ tier: 'master', persona: PER[s % 3], rng, session: sess, ort, keyGuard: true }));
  g.start(Math.floor(rng() * E.NUM_PLAYERS));
  const rec = { seed, dealer: g.dealer, cfg: { seed }, actions: [], result: null };
  let guard = 0;
  while (g.phase !== 'done' && g.phase !== 'redeal' && guard++ < 900) {
    const p = g.currentPlayer;
    const a = await ag[p].act(g, p);
    rec.actions.push({ p, ph: g.phase, a: JSON.parse(JSON.stringify(a)) });
    g.act(a);
  }
  rec.result = g.phase === 'done' ? g.result : null;
  return rec;
}

// 국면 특징 추출 — 클러스터 키
function features(rec, seat, h) {
  const g = new E.MightyGame(rec.cfg); g.start(rec.dealer);
  for (let i = 0; i < h.idx; i++) g.act(rec.actions[i].a);
  const pl = g.play;
  const role = seat === g.declarer ? 'decl'
    : (g.friendRevealed && g.friend === seat) ? 'friend'
    : g.friendRevealed ? 'def' : 'pre';
  const pos = pl.table.length === 0 ? 'lead' : 'follow';
  const band = pl.trickNo <= 3 ? 'T1-3' : pl.trickNo <= 6 ? 'T4-6' : 'T7-10';
  const act = rec.actions[h.idx].a;
  const gi = g.contract.giruda;
  const kind = E.isJoker(act.card) ? 'joker'
    : E.sameCard(act.card, g.mightyCard) ? 'mighty'
    : (gi !== 'N' && act.card.suit === gi) ? (E.isPointCard(act.card) ? 'trumpPt' : 'trump')
    : E.isPointCard(act.card) ? 'point' : 'plain';
  return { role, pos, band, kind, trick: pl.trickNo };
}

(async () => {
  const N = parseInt(process.argv[2] || '100', 10);
  const out = process.argv[3] || P('../../docs/self-review.jsonl');
  const sess = await ort.InferenceSession.create(MODEL);
  const rows = [];
  let rounds = 0;
  for (let i = 0; i < N; i++) {
    const seed = SEED0 + i;
    const rec = await playRound(seed, sess);
    if (!rec.result) continue;
    rounds++;
    for (let seat = 0; seat < E.NUM_PLAYERS; seat++) {
      const res = await A.analyzeRound(sess, ort, rec, seat, { topK: 5, n: 24, seed: seed >>> 0 });
      for (const h of res.highlights) {
        const f = features(rec, seat, h);
        rows.push({ seed, seat, ...f, grade: h.grade, lineGain: h.lineGain, dPrize: h.dPrize,
                    actual: h.actual, alt: h.alt,
                    win: `${h.flip.act.win}/${h.flip.act.n}>${h.flip.alt.win}/${h.flip.alt.n}` });
      }
    }
    if (rounds % 10 === 0) process.stderr.write(`${rounds}판...\n`);
  }
  fs.writeFileSync(out, rows.map(r => JSON.stringify(r)).join('\n') + '\n');
  // 클러스터 요약
  const key = r => `${r.role}·${r.pos}·${r.kind}`;
  const cl = {};
  for (const r of rows) { (cl[key(r)] = cl[key(r)] || []).push(r); }
  console.log(`\n자가 스크리닝: ${rounds}판 × 5좌석 · 하이라이트 ${rows.length}건 → ${path.basename(out)}`);
  console.log('클러스터 (역할·위치·카드종류 | 건수 | lineGain 합/평균):');
  Object.entries(cl).sort((a, b) => b[1].reduce((x, r) => x + r.lineGain, 0) - a[1].reduce((x, r) => x + r.lineGain, 0))
    .forEach(([k, v]) => {
      const sum = v.reduce((x, r) => x + r.lineGain, 0);
      console.log(`  ${k.padEnd(24)} ${String(v.length).padStart(4)}건  합 ${String(sum).padStart(7)}  평균 ${(sum / v.length).toFixed(0)}`);
    });
})();
