/**
 * NN 자체 대전 경향성 측정: 5석 전원 같은 모델(또는 전원 휴리스틱)으로 돌려
 * 역할별 전략 지표를 프렌드 공개 전/후로 나눠 본다.
 * 사용: node bench_selfplay.js [게임수] [구성...]
 *   구성: nnall | advall | intall
 *   env: MODEL=mighty_master_v4.onnx
 */
'use strict';
const E = require('../../src/mighty-engine.js');
const M = require('../../src/mighty-master.js');
const { Metrics, COUNTERS } = require('./metrics.js');
const ort = require(process.env.ORT_PATH || 'onnxruntime-node');
const MODEL = process.env.MODEL || require('path').join(__dirname, '../../web/model/mighty_master_v4.onnx');
const NUM = 5;

async function play(seed, persona, mode, sess) {
  const g = new E.MightyGame({ seed });
  const nn = mode === 'nnall';
  const tier = mode === 'intall' ? 'intermediate' : 'advanced';
  const agent = new E.HeuristicAgent(E.PERSONAS[persona], g.rng, { tier });
  g.start(Math.floor(g.rng() * NUM));
  if (g.phase === 'redeal') return null;
  const ob = new Metrics();
  const picks = [[], [], [], [], []];
  let guard = 0;
  while (g.phase !== 'done') {
    if (g.phase === 'redeal' || ++guard > 800) return null;
    const seat = g.currentPlayer;
    let act;
    if (nn) {
      const a = await M.chooseAction(sess, ort, g, seat, picks[seat]);
      act = M.actionToEngine(a, g, picks[seat]);
      if (!act) continue;                 // floor 부분선택 누적 중
    } else {
      act = agent.act(g);
    }
    ob.record(g, act);
    g.act(act);
  }
  const r = g.result;
  const rev = ob.decisions.find(d => d.revealed);
  return { metrics: ob.finish(g), win: !!r.win, decl: r.declarer,
           friend: r.friend, revealTrick: rev ? rev.trickNo : null,
           mode: g.friendDecl ? g.friendDecl.mode : '?' };
}

const acc = () => { const o = { n: 0 }; for (const k of COUNTERS) o[k] = 0; return o; };
const bump = (a, m) => { for (const k of COUNTERS) a[k] += m[k]; a.n++; };
const pct = (a, b) => b ? (a / b * 100).toFixed(1) + '%' : '—';
const avg = (a, b) => b ? (a / b).toFixed(1) : '—';

function show(label, a) {
  if (!a.n) { console.log(`  ${label.padEnd(22)} (n=0)`); return; }
  console.log(`  ${label.padEnd(22)} n=${String(a.n).padStart(5)}  ` +
    `기루다리드 ${pct(a.trumpLead, a.leads).padStart(6)}  ` +
    `기루다회피 ${pct(a.trumpLeadForgone, a.trumpLeadChance).padStart(6)}(${a.trumpLeadForgone}/${a.trumpLeadChance})  ` +
    `기루다뽑기 ${pct(a.trumpPull, a.leads).padStart(6)}  ` +
    `기루다장수 ${avg(a.trumpPlayed, a.n).padStart(4)}  ` +
    `팀내탈취 ${pct(a.steal, a.stealChance).padStart(6)}  ` +
    `점수공급 ${pct(a.feed, a.feedChance).padStart(6)}  ` +
    `키카드낭비 ${pct(a.keyWaste, a.keyChance).padStart(6)}  ` +
    `마이티시점 ${avg(a.mightyTrickSum, a.mightyPlay).padStart(4)}  ` +
    `조커시점 ${avg(a.jokerTrickSum, a.jokerPlay).padStart(4)}  ` +
    `놓친트릭 ${pct(a.missWin, a.missChance).padStart(6)}(${a.missWin}/${a.missChance})  ` +
    `자원낭비 ${pct(a.waste, a.wasteChance).padStart(6)}  ` +
    `리드성공 ${pct(a.teamLeadWin, a.leads).padStart(6)}`);
}

(async () => {
  const N = parseInt(process.argv[2] || '600', 10);
  const modes = process.argv.slice(3).length ? process.argv.slice(3) : ['nnall', 'advall'];
  const sess = modes.includes('nnall') ? await ort.InferenceSession.create(MODEL) : null;
  console.log(`자체 대전 경향성 (5석 동일 에이전트, ${N}판/구성, nn=${MODEL})`);
  for (const mode of modes) {
    const R = {};
    for (const role of ['declarer', 'friend', 'defender'])
      R[role] = { all: acc(), pre: acc(), post: acc() };
    let seed = 700000, n = 0, wins = 0, selfDecl = 0, revSum = 0, revN = 0;
    const fmode = {};
    while (n < N) {
      const s = ++seed;
      const persona = ['gambler', 'balanced', 'careful'][n % 3];
      const r = await play(s, persona, mode, sess);
      if (!r) continue;
      n++;
      if (r.win) wins++;
      if (r.friend === null || r.friend === r.decl) selfDecl++;
      fmode[r.mode] = (fmode[r.mode] || 0) + 1;
      if (r.revealTrick != null) { revSum += r.revealTrick; revN++; }
      for (let p = 0; p < NUM; p++) {
        const m = r.metrics[p], g = R[m.role];
        bump(g.all, m); bump(g.pre, m.pre); bump(g.post, m.post);
      }
      if (n % 100 === 0) process.stderr.write(`  ${mode} ${n}/${N}\r`);
    }
    console.log(`\n### ${mode}   여당승률 ${pct(wins, n)}  셀프프렌드 ${pct(selfDecl, n)}  ` +
      `프렌드공개 트릭 ${avg(revSum, revN)} (${pct(revN, n)}판)  ` +
      `프렌드선언 ${Object.entries(fmode).map(([k, v]) => `${k} ${pct(v, n)}`).join(' / ')}`);
    for (const role of ['declarer', 'friend', 'defender']) {
      show(`${role} 전체`, R[role].all);
      show(`${role} 공개전`, R[role].pre);
      show(`${role} 공개후`, R[role].post);
    }
  }
})();
