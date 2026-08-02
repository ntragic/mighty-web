/**
 * 수용 기준 측정기 (핸드오프 §6).
 * 순수 NN 1석 vs 고급 휴리스틱 4석. 절대 상금·주공 승률·주공 비율·키카드 낭비를 잰다.
 * 사용: MODEL=mighty_master_v4.onnx node bench_accept.js [게임수] [성향...]
 */
'use strict';
const E = require('../../src/mighty-engine.js');
const M = require('../../src/mighty-master.js');
const { Metrics } = require('./metrics.js');
const ort = require(process.env.ORT_PATH || 'onnxruntime-node');
const MODEL = process.env.MODEL || require('path').join(__dirname, '../../web/model/mighty_master_v4.onnx');
const TIER = process.env.OPP_TIER || 'advanced';
const NUM = 5;

async function play(seed, persona, nnSeat, sess) {
  const g = new E.MightyGame({ seed });
  const agent = new E.HeuristicAgent(E.PERSONAS[persona], g.rng, { tier: TIER });
  g.start(Math.floor(g.rng() * NUM));
  if (g.phase === 'redeal') return null;
  const ob = new Metrics();
  const pick = [];
  let guard = 0;
  while (g.phase !== 'done') {
    if (g.phase === 'redeal' || ++guard > 500) return null;
    let act;
    if (g.currentPlayer === nnSeat) {
      const a = await M.chooseAction(sess, ort, g, nnSeat, pick);
      act = M.actionToEngine(a, g, pick);
      if (!act) continue;
    } else act = agent.act(g);
    ob.record(g, act);
    g.act(act);
  }
  const r = g.result;
  const fr = (r.friend != null && r.friend !== r.declarer) ? r.friend : null;
  const role = r.declarer === nnSeat ? 'declarer' : (fr === nnSeat ? 'friend' : 'defender');
  return { g, m: ob.finish(g)[nnSeat], prize: r.prizes[nnSeat],
           isDecl: r.declarer === nnSeat, win: !!r.win, role };
}

const pct = (w, n) => n ? (w / n * 100).toFixed(1) + '%' : '—';
const ok = (c) => c ? '통과' : '미달';

(async () => {
  const sess = await ort.InferenceSession.create(MODEL);
  const N = parseInt(process.argv[2] || '1600', 10);
  const list = process.argv.slice(3).length ? process.argv.slice(3) : ['gambler','balanced','careful'];
  console.log(`수용 기준 측정 — ${MODEL} (순수 NN 1석 vs ${TIER} 휴리스틱 4석)`);
  let allP = [], allD = 0, allDW = 0, allN = 0, kw = 0, kc = 0;
  const AR = { declarer: [0,0], friend: [0,0], defender: [0,0] };
  for (const persona of list) {
    let seed = 950000, n = 0, P = [], d = 0, dw = 0, w = 0, pkw = 0, pkc = 0;
    const R = { declarer: [0,0], friend: [0,0], defender: [0,0] };   // [여당승, 판수]
    while (n < N) {
      const r = await play(++seed, persona, n % NUM, sess);
      if (!r) continue;
      n++; P.push(r.prize);
      R[r.role][0] += r.win ? 1 : 0; R[r.role][1]++;
      AR[r.role][0] += r.win ? 1 : 0; AR[r.role][1]++;
      if (r.isDecl) { d++; dw += r.win ? 1 : 0; }
      pkw += r.m.keyWaste; pkc += r.m.keyChance;
    }
    const mean = P.reduce((a,b)=>a+b,0)/P.length;
    const se = Math.sqrt(P.reduce((s,x)=>s+(x-mean)**2,0)/(P.length-1)/P.length);
    console.log(`  ${persona.padEnd(9)} 판당 상금 ${mean>=0?'+':''}${mean.toFixed(1)} ± ${se.toFixed(1)} | ` +
      `주공비율 ${(d/n*100).toFixed(1)}% | 주공승률 ${d?(dw/d*100).toFixed(1):'—'}% | ` +
      `키카드낭비 ${pkc?(pkw/pkc*100).toFixed(2):'—'}% (${pkw}/${pkc})`);
    console.log(`            역할별 여당승률 — 주공 ${pct(R.declarer[0],R.declarer[1])} (n=${R.declarer[1]}) · ` +
      `프렌드 ${pct(R.friend[0],R.friend[1])} (n=${R.friend[1]}) · ` +
      `야당 ${pct(R.defender[0],R.defender[1])} (n=${R.defender[1]})`);
    allP = allP.concat(P); allD += d; allDW += dw; allN += n; kw += pkw; kc += pkc;
  }
  const mean = allP.reduce((a,b)=>a+b,0)/allP.length;
  const se = Math.sqrt(allP.reduce((s,x)=>s+(x-mean)**2,0)/(allP.length-1)/allP.length);
    console.log(`\n[종합] ${allN}판`);
  console.log(`  5. 판당 상금 ≥ +150   : ${mean>=0?'+':''}${mean.toFixed(1)} ± ${se.toFixed(1)}  → ${ok(mean>=150)}`);
  console.log(`  6. 주공 승률  ≥ 70%   : ${(allDW/allD*100).toFixed(1)}%  → ${ok(allDW/allD>=0.70)}`);
  console.log(`  7. 주공 비율  20~35%  : ${(allD/allN*100).toFixed(1)}%  → ${ok(allD/allN>=0.20 && allD/allN<=0.35)}`);
  console.log(`  8. 키카드 낭비 < 1%   : ${(kw/kc*100).toFixed(2)}%  → ${ok(kw/kc<0.01)}`);
  console.log(`\n[역할별 여당승률 · 선택편향 없는 절대 측정]`);
  for (const k of ['declarer','friend','defender'])
    console.log(`  ${k.padEnd(9)} ${pct(AR[k][0], AR[k][1])}  (n=${AR[k][1]})`);
})();
