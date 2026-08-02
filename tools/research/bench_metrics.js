/**
 * 0단계 지표 측정기: 역할별 전략 지표를 에이전트 구성별로 비교.
 * 사용: node bench_metrics.js [게임수] [구성...]
 *   구성: int | adv | nn      (int=중급 전원, adv=고급 전원, nn=좌석1개만 NN+나머지 고급)
 */
'use strict';
const E = require('../../src/mighty-engine.js');
const M = require('../../src/mighty-master.js');
const { Metrics } = require('./metrics.js');
const ort = require(process.env.ORT_PATH || 'onnxruntime-node');
const MODEL = process.env.MODEL || require('path').join(__dirname, '../../web/model/mighty_master_v4.onnx');
const NUM = 5;

async function play(seed, persona, mode, nnSeat, sess) {
  const g = new E.MightyGame({ seed });
  const tier = mode === 'int' ? 'intermediate' : 'advanced';
  const agent = new E.HeuristicAgent(E.PERSONAS[persona], g.rng, { tier });
  g.start(Math.floor(g.rng() * NUM));
  if (g.phase === 'redeal') return null;
  const ob = new Metrics();
  const pick = [];
  let guard = 0;
  while (g.phase !== 'done') {
    if (g.phase === 'redeal' || ++guard > 500) return null;
    let act;
    if (mode === 'nn' && g.currentPlayer === nnSeat) {
      const a = await M.chooseAction(sess, ort, g, nnSeat, pick);
      act = M.actionToEngine(a, g, pick);
      if (!act) continue;                 // floor 부분선택 누적 중
    } else {
      act = agent.act(g);
    }
    ob.record(g, act);
    g.act(act);
  }
  return { metrics: ob.finish(g), nnSeat, win: !!g.result.win };
}

const acc = () => ({ missWin: 0, missChance: 0, waste: 0, wasteChance: 0,
                     trumpPull: 0, leads: 0, teamLeadWin: 0,
                     jokerCall: 0, jokerCallChance: 0, n: 0 });
const pct = (a, b) => b ? (a / b * 100).toFixed(1) + '%' : '—';

(async () => {
  const N = parseInt(process.argv[2] || '600', 10);
  const modes = process.argv.slice(3).length ? process.argv.slice(3) : ['int', 'adv', 'nn'];
  const sess = modes.includes('nn') ? await ort.InferenceSession.create(MODEL) : null;
  console.log(`0단계 전략 지표 (성향 3종 혼합, 게임 ${N}판/구성, nn=${MODEL})`);
  for (const mode of modes) {
    const roles = { declarer: acc(), friend: acc(), defender: acc() };
    let seed = 900000, n = 0;
    while (n < N) {
      const s = ++seed;
      const persona = ['gambler', 'balanced', 'careful'][n % 3];
      const k = n % NUM;
      const r = await play(s, persona, mode, k, sess);
      if (!r) continue;
      n++;
      for (let p = 0; p < NUM; p++) {
        if (mode === 'nn' && p !== k) continue;      // NN 구성은 해당 좌석만 집계
        const m = r.metrics[p], a = roles[m.role];
        for (const key of Object.keys(a)) if (key !== 'n') a[key] += m[key];
        a.n++;
      }
    }
    console.log(`\n### ${mode}`);
    for (const role of ['declarer', 'friend', 'defender']) {
      const a = roles[role];
      if (!a.n) continue;
      console.log(`  ${role.padEnd(9)} (n=${a.n})  ` +
        `놓친트릭 ${pct(a.missWin, a.missChance)}  ` +
        `자원낭비 ${pct(a.waste, a.wasteChance)}  ` +
        `기루다뽑기 ${pct(a.trumpPull, a.leads)}  ` +
        `리드성공 ${pct(a.teamLeadWin, a.leads)}` +
        (role === 'defender' ? `  조커콜 ${pct(a.jokerCall, a.jokerCallChance)}` : ''));
    }
  }
})();
