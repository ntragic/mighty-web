/**
 * 티어 난이도 실측 — 사람 자리를 고정 기준 좌석으로 두고, 나머지 네 좌석을
 * 대상 구성으로 채워 **기준 좌석의 판당 상금**을 잰다. 낮을수록 어렵다.
 *
 * 왜 h2h로는 안 되는가: model_h2h는 "새 모델 1좌석 vs 구모델 4좌석"이라
 * 침입 이득을 잰다. 관례를 안 따르는 구세대가 관례 테이블에 홀로 앉으면
 * 무임승차로 이득을 보는 일이 있어(version-matrix v4 vs v6b +223) 난이도
 * 서열과 어긋난다. 난이도는 "네 좌석이 협력해서 사람을 얼마나 이기나"다.
 *
 * 사용: node table_difficulty.js <구성> [판수]
 *   구성: intermediate | advanced | NN이름(v13 등) | 'v13,v8' (혼합 — 좌석 순환)
 *   env REF(기준 좌석 티어, 기본 advanced) · SEED_BASE
 *       REF_WOVR(기준 좌석 가중치 고정, 예: '{"mightyLeadGate":0}')
 */
'use strict';
const path = require('path');
const P = p => path.join(__dirname, p);
const ort = require('onnxruntime-node');
const E = require(P('../../src/mighty-engine.js'));
const AI = require(P('../../src/mighty-ai.js'));
const SEED0 = parseInt(process.env.SEED_BASE || '73000000', 10);
const REF = process.env.REF || 'advanced';
const REF_WOVR = process.env.REF_WOVR ? JSON.parse(process.env.REF_WOVR) : null;
const PER = ['gambler', 'balanced', 'careful'];

(async () => {
  const spec = (process.argv[2] || 'advanced').split(',').map(s => s.trim());
  const N = parseInt(process.argv[3] || '3000', 10);

  // 필요한 NN 세션만 로드
  const sess = {};
  for (const s of spec) {
    if (s === 'intermediate' || s === 'advanced') continue;
    sess[s] = await ort.InferenceSession.create(P(`../../web/model/mighty_master_${s}.onnx`));
  }

  let sum = 0, n = 0, refWin = 0;
  const vals = [];
  for (let i = 0; i < N; i++) {
    const seed = SEED0 + i;
    const rng = E.makeRng(seed);
    const g = new E.MightyGame({ seed });
    const ag = [];
    for (let s = 0; s < E.NUM_PLAYERS; s++) {
      if (s === 0) {                                  // 사람 대역 — 전 구성에서 동일
        // REF_WOVR로 기준 좌석 가중치를 고정할 수 있다. 규칙기반 자체를 고칠 때
        // 기준 좌석까지 같이 세지면 상대 실력이 함께 올라 난이도 비교가 무의미해진다.
        ag.push(await AI.createAgent({ tier: REF, persona: PER[s % 3], rng, weights: REF_WOVR }));
        continue;
      }
      const pick = spec[(s - 1) % spec.length];       // 혼합이면 좌석 순환
      ag.push(pick === 'intermediate' || pick === 'advanced'
        ? await AI.createAgent({ tier: pick, persona: PER[s % 3], rng })
        : await AI.createAgent({ tier: 'master', session: sess[pick], ort }));
    }
    g.start(Math.floor(rng() * E.NUM_PLAYERS));
    let guard = 0;
    while (g.phase !== 'done' && g.phase !== 'redeal' && guard++ < 900)
      g.act(await ag[g.currentPlayer].act(g, g.currentPlayer));
    if (g.phase !== 'done') continue;
    const pz = g.result.prizes[0];
    sum += pz; vals.push(pz); n++;
    if (pz > 0) refWin++;
  }
  const m = sum / n;
  const sd = Math.sqrt(vals.reduce((a, b) => a + (b - m) ** 2, 0) / (n - 1));
  console.log(`구성 [${spec.join(' ')}] · 기준좌석 ${REF} · ${n}판`);
  console.log(`  기준 좌석 판당 상금 ${m >= 0 ? '+' : ''}${m.toFixed(1)} ± ${(1.96 * sd / Math.sqrt(n)).toFixed(1)}` +
    `  (양수 판 ${(100 * refWin / n).toFixed(1)}%)  ← 낮을수록 어렵다`);
})();
