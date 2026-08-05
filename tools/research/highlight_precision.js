/* 하이라이트 정밀도 벤치 — 릴리스 게이트 (docs/V2-PLAN.md §6)
 *
 * 인간 좌석을 중급 휴리스틱이 대행(실제 실수를 만들어냄) → analyzeRound가 뽑은
 * 하이라이트를 독립 시드·큰 표본 롤아웃으로 재검증한다.
 *   결정적: 검증 롤아웃에서도 승률이 1/3p 이상 갈리는가
 *   손해:   검증 상금차가 임계(100)의 절반 이상을 유지하는가
 *
 * 사용: node tools/research/highlight_precision.js [판수]
 */
'use strict';
const path = require('path');
const P = p => path.join(__dirname, p);
const ort = require('onnxruntime-node');
const E = require(P('../../src/mighty-engine.js'));
const AI = require(P('../../src/mighty-ai.js'));
const A = require(P('../../src/mighty-analysis.js'));
const MODEL = process.env.MODEL || P('../../web/model/mighty_master_v6b.onnx');
const PER = ['gambler', 'balanced', 'careful'];

(async () => {
  const N = parseInt(process.argv[2] || '40', 10);
  const sess = await ort.InferenceSession.create(MODEL);
  let games = 0, hl = { '결정적': [0, 0], '손해': [0, 0], '부정확': [0, 0] };
  let seat = 0;

  for (let i = 0; i < N; i++) {
    const seed = 770000 + i;
    const rng = E.makeRng(seed);
    const g = new E.MightyGame({ seed });
    const ag = [];
    for (let s = 0; s < 5; s++) ag.push(await AI.createAgent({
      tier: s === seat ? 'intermediate' : 'advanced', persona: PER[s % 3], rng }));
    g.start(Math.floor(rng() * 5));
    const rec = { seed, dealer: g.dealer, cfg: { seed }, actions: [], result: null };
    let guard = 0;
    while (g.phase !== 'done' && g.phase !== 'redeal' && guard++ < 900) {
      const p = g.currentPlayer;
      const a = await ag[p].act(g, p);
      rec.actions.push({ p, ph: g.phase, a: JSON.parse(JSON.stringify(a)) });
      g.act(a);
    }
    if (g.phase !== 'done') continue;
    rec.result = g.result;
    games++;

    const res = await A.analyzeRound(sess, ort, rec, seat, { topK: 5, n: 24, seed: 7 });
    for (const h of res.highlights) {
      // 독립 재검증: 다른 시드, 두 배 표본
      const v = await A.rolloutPair(sess, ort, rec, seat, h.idx, h.altIdx, { n: 48, seed: 991 });
      const dWin = v.alt.win / v.alt.n - v.act.win / v.act.n;
      const d = v.alt.mean - v.act.mean;
      let okv = false;
      if (h.grade === '결정적') okv = dWin >= 1 / 3;
      else if (h.grade === '손해') okv = d >= 50;
      else okv = d >= 30;
      hl[h.grade][1]++;
      if (okv) hl[h.grade][0]++;
    }
    seat = (seat + 1) % 5;
  }

  console.log(`\n${games}판 분석 (인간 대행: intermediate)`);
  for (const [k, [a, b]] of Object.entries(hl))
    console.log(`  ${k}  ${a}/${b}  ${b ? (100 * a / b).toFixed(0) + '%' : '—'}`);
  const [ca, cb] = hl['결정적'];
  console.log(cb ? `\n결정적 정밀도 ${(100 * ca / cb).toFixed(0)}% (게이트 80%)` : '\n결정적 표본 없음');
})();
