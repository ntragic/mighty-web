/* AI 복기 분석 엔진 테스트 — 실모델로 소형 라운드를 기록·분석한다. */
'use strict';
const path = require('path');
const P = p => path.join(__dirname, p);
const ort = require('onnxruntime-node');
const E = require(P('../src/mighty-engine.js'));
const AI = require(P('../src/mighty-ai.js'));
const A = require(P('../src/mighty-analysis.js'));
const MODEL = P('../web/model/mighty_master_v6.onnx');

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL:', m); } };

/** 완주 라운드 하나를 기록해 돌려준다 (ui.js recStart/instrument와 같은 형식) */
async function recordRound(seed, agents, g) {
  const rec = { seed, dealer: g.dealer, cfg: { seed }, actions: [], result: null };
  let guard = 0;
  while (g.phase !== 'done' && g.phase !== 'redeal' && guard++ < 900) {
    const p = g.currentPlayer;
    const a = await agents[p].act(g, p);
    rec.actions.push({ p, ph: g.phase, a: JSON.parse(JSON.stringify(a)) });
    g.act(a);
  }
  rec.result = g.phase === 'done' ? g.result : null;
  return rec;
}

(async () => {
  const sess = await ort.InferenceSession.create(MODEL);
  const PER = ['gambler', 'balanced', 'careful'];

  // 완주 + 인간 좌석(0)이 실제 플레이한 라운드를 찾는다
  let rec = null, seat = 0;
  for (let i = 0; i < 40 && !rec; i++) {
    const seed = 660000 + i;
    const rng = E.makeRng(seed);
    const g = new E.MightyGame({ seed });
    const ag = [];
    for (let s = 0; s < 5; s++)
      ag.push(await AI.createAgent({ tier: 'advanced', persona: PER[s % 3], rng }));
    g.start(Math.floor(rng() * 5));
    const r = await recordRound(seed, ag, g);
    r.cfg = { seed };
    if (r.result && A.playDecisions(r, seat).length >= 5) rec = r;
  }
  ok(!!rec, '분석 대상 라운드 확보');

  // 1) 재구성 일관성 — 전체 액션 적용 시 결과 재현
  const g2 = A.rebuild(rec);
  ok(g2.phase === 'done', 'rebuild 완주');
  ok(JSON.stringify(g2.result.prizes) === JSON.stringify(rec.result.prizes),
     'rebuild 상금 재현');

  // 2) 스크리닝 — 결정 수 만큼 EV 곡선
  const dec = await A.screenRound(sess, ort, rec, seat);
  const nDec = A.playDecisions(rec, seat).length;
  ok(dec.length === nDec, `스크리닝 결정 수 ${dec.length} == ${nDec}`);
  ok(dec.every(d => typeof d.v === 'number' && isFinite(d.v)), 'EV 유한값');
  ok(dec.every(d => isFinite(d.dEV)), 'dEV 유한값 (음수 = 실제 수가 대안보다 좋음)');

  // 3) 페어드 롤아웃 — 결정론(같은 시드 → 같은 결과) + 자기 대 자기 무차이
  const s0 = dec.find(d => d.altIdx !== null) || dec[0];
  const r1 = await A.rolloutPair(sess, ort, rec, seat, s0.idx, s0.altIdx ?? s0.actIdx, { n: 6, seed: 11 });
  const r2 = await A.rolloutPair(sess, ort, rec, seat, s0.idx, s0.altIdx ?? s0.actIdx, { n: 6, seed: 11 });
  ok(r1.act.mean === r2.act.mean && r1.alt.mean === r2.alt.mean, '롤아웃 시드 재현성');
  const same = await A.rolloutPair(sess, ort, rec, seat, s0.idx, s0.actIdx, { n: 6, seed: 11 });
  ok(same.act.mean === same.alt.mean, '동일 수 페어드 무차이');

  // 4) 고스트 라인 — 재구성 가능하고 끝까지 간다
  if (s0.altIdx !== null) {
    const gl = await A.ghostLine(sess, ort, rec, seat, s0.idx, s0.altIdx);
    ok(!!gl && gl.actions.length > s0.idx, '고스트 라인 생성');
    const g3 = A.rebuild({ ...rec, actions: gl.actions });
    ok(g3.phase === 'done' || g3.phase === 'redeal', '고스트 라인 전체 재생 가능');
    if (gl.result) ok(JSON.stringify(g3.result.prizes) === JSON.stringify(gl.result.prizes),
                      '고스트 결과 재현');
  }

  // 5) 파이프라인 — 형식·등급 값 검증 (하이라이트 유무는 판에 따라 다름)
  const res = await A.analyzeRound(sess, ort, rec, seat, { topK: 3, n: 8, seed: 5 });
  ok(res.evCurve.length === nDec, '파이프라인 EV 곡선 길이');
  ok(res.highlights.every(h => [A.GRADE.CRITICAL, A.GRADE.LOSS, A.GRADE.SLIP].includes(h.grade)),
     '하이라이트 등급 값');
  ok(res.highlights.every(h => h.ghost && h.ghost.actions.length > h.idx), '하이라이트마다 고스트 라인');

  console.log(`\n분석 테스트: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
