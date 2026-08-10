/**
 * 주공 승률 분해 — accept-v4의 '주공 승률'이 왜 움직였는지 원인을 가른다.
 *
 * accept-v4 하네스는 NN 한 좌석 + 고급 휴리스틱 네 좌석이다. 야당도 프렌드도
 * 고정된 규칙 기반 에이전트라, 모델을 바꿔 승률이 변했다면 원인은 NN 자신의
 * 결정뿐이다 — 공약 수·기루다·바닥패 교환·프렌드 선정·플레이.
 *
 * 그래서 이렇게 가른다:
 *   공약 수별 승률   — 같은 난이도에서의 수행. 여기서 갈리면 '플레이'가 원인
 *   평균 공약 수     — 올라갔으면 '더 어려운 계약을 잡은 것'이라 승률 하락이 정상
 *   프렌드 모드 분포 — 노프렌드·초구 프렌드가 늘면 승률 기대가 달라진다
 *
 * 표본 크기와 신뢰구간도 함께 찍는다. 주공 판수가 200 안팎이면 승률 SE가 3%p라
 * 70% 같은 하드 기준선은 노이즈 아래다.
 *
 * 사용: node tools/research/decl_breakdown.js [판수] [상대티어]   env MODEL
 */
'use strict';
const path = require('path');
const P = p => path.join(__dirname, p);
const ort = require('onnxruntime-node');
const E = require(P('../../src/mighty-engine.js'));
const AI = require(P('../../src/mighty-ai.js'));
const MODEL = process.env.MODEL || P('../../web/model/mighty_master_v9.onnx');
const PER = ['gambler', 'balanced', 'careful'];

(async () => {
  const N = parseInt(process.argv[2] || '3000', 10);
  const oppTier = process.argv[3] || 'advanced';
  const sess = await AI.loadMaster(ort, MODEL);
  let seat = 0, rounds = 0, prizeSum = 0;
  const decl = [];                       // NN이 주공인 판만
  for (let i = 0; i < N; i++) {
    const rng = E.makeRng(101e6 + i);    // accept-v4와 같은 시드 계열
    const g = new E.MightyGame({ seed: 101e6 + i });
    const ag = [];
    for (let s = 0; s < 5; s++) ag.push(s === seat
      ? await AI.createAgent({ tier: 'master', session: sess, ort })
      : await AI.createAgent({ tier: oppTier, persona: PER[s % 3], rng }));
    g.start(Math.floor(rng() * 5));
    if (g.phase === 'redeal') continue;
    let guard = 0;
    while (g.phase !== 'done' && g.phase !== 'redeal' && guard++ < 900)
      g.act(await ag[g.currentPlayer].act(g, g.currentPlayer));
    if (g.phase !== 'done') continue;
    rounds++; prizeSum += g.result.prizes[seat];
    if (g.result.declarer === seat) {
      const fd = g.friendDecl || {};
      decl.push({
        count: g.contract.count, giruda: g.contract.giruda,
        mode: fd.mode || '?', win: !!g.result.win,
        prize: g.result.prizes[seat],
        got: g.result.yeodang,             // 여당 획득 점수
      });
    }
    seat = (seat + 1) % 5;
  }
  const wr = a => a.length ? a.filter(x => x.win).length / a.length : 0;
  const ci = (p, n) => n ? 1.96 * Math.sqrt(p * (1 - p) / n) : 0;
  const w = wr(decl), c = ci(w, decl.length);
  console.log(`${path.basename(MODEL)} · 유효 ${rounds}판 · NN 주공 ${decl.length}판 (${(100 * decl.length / rounds).toFixed(1)}%)`);
  console.log(`판당 상금 ${prizeSum / rounds >= 0 ? '+' : ''}${(prizeSum / rounds).toFixed(0)}`);
  console.log(`주공 승률 ${(100 * w).toFixed(1)}% ± ${(100 * c).toFixed(1)}%p  (95% 신뢰구간 ${(100 * (w - c)).toFixed(1)}~${(100 * (w + c)).toFixed(1)})`);
  const avgC = decl.reduce((a, b) => a + b.count, 0) / Math.max(1, decl.length);
  const avgG = decl.reduce((a, b) => a + b.got, 0) / Math.max(1, decl.length);
  console.log(`평균 공약 ${avgC.toFixed(2)} · 평균 여당 획득 ${avgG.toFixed(2)}점 (공약 대비 ${(avgG - avgC).toFixed(2)})`);
  console.log('공약 수별:');
  for (const k of [13, 14, 15, 16, 17]) {
    const a = decl.filter(x => (k === 17 ? x.count >= 17 : x.count === k));
    if (!a.length) continue;
    const p = wr(a);
    console.log(`  ${k === 17 ? '17+' : k}  n=${String(a.length).padStart(4)}  승률 ${(100 * p).toFixed(1)}% ± ${(100 * ci(p, a.length)).toFixed(1)}  평균획득 ${(a.reduce((x, y) => x + y.got, 0) / a.length).toFixed(1)}`);
  }
  console.log('프렌드 모드:');
  for (const m of ['card', 'first', 'none']) {
    const a = decl.filter(x => x.mode === m);
    if (!a.length) continue;
    console.log(`  ${m.padEnd(5)} n=${String(a.length).padStart(4)} (${(100 * a.length / decl.length).toFixed(1)}%) 승률 ${(100 * wr(a)).toFixed(1)}%`);
  }
  const ng = decl.filter(x => x.giruda === 'N');
  if (ng.length) console.log(`  노기루다 n=${ng.length} 승률 ${(100 * wr(ng)).toFixed(1)}%`);
})();
