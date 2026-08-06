/* 대안 라인 캘리브레이션 — "약속(시뮬 평균 +N)"이 라인·실제와 얼마나 정합한가.
 *
 * 하이라이트마다 세 값을 비교한다:
 *   promise  = alt.mean − act.mean  (카드에 표시되는 기대상금)
 *   lineDiff = 고스트(가드 argmax 반사실 라인) 상금 − 실제 라인 상금
 *   headroom = 실제 라인 상금 − act.mean  (실제 진행이 시뮬 평균보다 얼마나 잘 풀렸나
 *              — argmax 실전 대 T=1 샘플링 시뮬의 강도 차 + 운)
 *
 * 입력: export MD 파일들(실플레이) 또는 인자 없이 시뮬 게임 생성.
 * 사용: node tools/research/altline_calib.js [N판 | file1.md file2.md ...]
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
const PER = ['gambler', 'balanced', 'careful'];

async function simRound(seed, seat, sess) {
  const rng = E.makeRng(seed);
  const g = new E.MightyGame({ seed });
  const ag = [];
  for (let s = 0; s < 5; s++) ag.push(await AI.createAgent({
    tier: s === seat ? 'intermediate' : 'master',
    persona: PER[s % 3], rng, session: sess, ort, keyGuard: true }));
  g.start(Math.floor(rng() * 5));
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

(async () => {
  const args = process.argv.slice(2);
  const files = args.filter(a => a.endsWith('.md'));
  const sess = await ort.InferenceSession.create(MODEL);
  const recs = [];
  if (files.length) {
    for (const f of files) {
      const txt = fs.readFileSync(f, 'utf8');
      for (const b of txt.split('```json').slice(1)) {
        const rec = JSON.parse(b.split('```')[0]);
        if (rec.result || true) recs.push(rec);
      }
    }
  } else {
    const N = parseInt(args[0] || '30', 10);
    for (let i = 0; i < N; i++) {
      const rec = await simRound(880000 + i, i % 5, sess);
      if (rec.result) { rec._seat = i % 5; recs.push(rec); }
    }
  }

  const rows = [];
  for (const rec of recs) {
    const seat = rec._seat !== undefined ? rec._seat : 0;
    if (!rec.result) {
      const g = new E.MightyGame(rec.cfg); g.start(rec.dealer);
      for (const s of rec.actions) g.act(s.a);
      if (g.phase !== 'done') continue;
      rec.result = g.result;
    }
    const res = await A.analyzeRound(sess, ort, rec, seat, { topK: 5, n: 24, seed: (rec.seed >>> 0) || 7 });
    for (const h of res.highlights) {
      const actual = rec.result.prizes[seat];
      const line = h.ghost && h.ghost.result ? h.ghost.result.prizes[seat] : null;
      if (line === null) continue;
      rows.push({ grade: h.grade, promise: h.dPrize, lineDiff: line - actual,
                  headroom: actual - h.flip.act.mean });
    }
  }

  const n = rows.length;
  if (!n) { console.log('하이라이트 표본 없음'); return; }
  const mean = k => rows.reduce((a, r) => a + r[k], 0) / n;
  const posL = rows.filter(r => r.lineDiff > 0).length;
  const tieL = rows.filter(r => r.lineDiff === 0).length;
  console.log(`분석 라운드 ${recs.length} · 하이라이트 ${n}건`);
  console.log(`약속(시뮬 평균 우세)   평균 +${mean('promise').toFixed(0)}`);
  console.log(`라인差(고스트−실제)    평균 ${mean('lineDiff') >= 0 ? '+' : ''}${mean('lineDiff').toFixed(0)}` +
    ` · 라인이 나음 ${posL}/${n} (${(100 * posL / n).toFixed(0)}%) · 동률 ${tieL}`);
  console.log(`실제 라인 헤드룸       평균 ${mean('headroom') >= 0 ? '+' : ''}${mean('headroom').toFixed(0)}` +
    `  (양수 = argmax 실전이 T=1 시뮬 평균보다 잘 풂 — 약속-라인 괴리의 구조 원인)`);
  for (const g2 of ['결정적', '손해', '부정확']) {
    const s2 = rows.filter(r => r.grade === g2);
    if (!s2.length) continue;
    const m = k => s2.reduce((a, r) => a + r[k], 0) / s2.length;
    console.log(`  [${g2}] n=${s2.length} 약속 +${m('promise').toFixed(0)} · 라인差 ${m('lineDiff') >= 0 ? '+' : ''}${m('lineDiff').toFixed(0)} · 라인 우세 ${s2.filter(r => r.lineDiff > 0).length}/${s2.length}`);
  }
})();
