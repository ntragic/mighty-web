/**
 * 가드 발화 횟수 실측 — 전좌석 마스터 자가대전에서 가드별로 몇 번 교체가
 * 일어나는지 센다. 발화 0인 가드는 모델에 내재화됐다는 뜻이라 제거 후보다.
 * 사용: node tools/research/guard_fire.js [판수]   env MODEL·SEED_BASE
 */
'use strict';
const path = require('path');
const P = p => path.join(__dirname, p);
const ort = require('onnxruntime-node');
const E = require(P('../../src/mighty-engine.js'));
const AI = require(P('../../src/mighty-ai.js'));
const MODEL = process.env.MODEL || P('../../web/model/mighty_master_v9.onnx');
const SEED0 = parseInt(process.env.SEED_BASE || '4100000', 10);

(async () => {
  const N = parseInt(process.argv[2] || '300', 10);
  const sess = await ort.InferenceSession.create(MODEL);
  const cnt = {};
  let plays = 0, done = 0;
  for (let i = 0; i < N; i++) {
    const seed = SEED0 + i;
    const rng = E.makeRng(seed);
    const g = new E.MightyGame({ seed });
    const ag = [];
    for (let s = 0; s < E.NUM_PLAYERS; s++)
      ag.push(await AI.createAgent({ tier: 'master', rng, session: sess, ort, guardCount: cnt }));
    g.start(Math.floor(rng() * E.NUM_PLAYERS));
    let guard = 0;
    while (g.phase !== 'done' && g.phase !== 'redeal' && guard++ < 900) {
      const p = g.currentPlayer;
      const act = await ag[p].act(g, p);
      if (g.phase === 'play' && act.type === 'play') plays++;
      g.act(act);
    }
    if (g.phase === 'done') done++;
  }
  console.log(`${path.basename(MODEL)} 전좌석 마스터 · ${done}/${N}판 완주 · 플레이 액션 ${plays}회`);
  for (const k of ['jcall', 'key', 'top', 'tfeed', 'cut', 'tsave', 'dlead', 'c1']) {
    const c = cnt[k] || 0;
    console.log(`  ${k.padEnd(6)} ${String(c).padStart(5)}회  (${(100 * c / plays).toFixed(2)}%)`);
  }
})();
