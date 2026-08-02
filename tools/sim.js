const __path = require('path');
const __P = p => __path.join(__dirname, p);
'use strict';
const E = require(__P('../src/mighty-engine.js'));

function simulate(label, mkAgents, N = 5000, seedBase = 50000) {
  let done = 0, redeal = 0, declWin = 0, runs = 0, backRuns = 0, self = 0, nt = 0;
  let sumY = 0, err = 0;
  const bidDist = {};
  const declCount = [0,0,0,0,0], winByRole = { decl: 0, friendW: 0 };
  const prizeSum = [0,0,0,0,0];
  const t0 = Date.now();
  for (let i = 0; i < N; i++) {
    const rng = E.makeRng(seedBase + i);
    let out;
    try { out = E.playGame({ seed: seedBase + i }, mkAgents(rng)); }
    catch (e) { err++; if (err <= 3) console.error('  ERR', seedBase + i, e.message); continue; }
    if (!out.result) { redeal++; continue; }
    const r = out.result;
    done++;
    if (r.win) declWin++;
    if (r.run) runs++;
    if (r.backRun) backRuns++;
    if (r.friend === null) self++;
    if (r.noGiruda) nt++;
    sumY += r.yeodangPoints;
    bidDist[r.contract.count] = (bidDist[r.contract.count] || 0) + 1;
    declCount[r.declarer]++;
    for (let p = 0; p < 5; p++) prizeSum[p] += r.prizes[p];
    // 불변식
    if (r.prizes.reduce((a,b)=>a+b,0) !== 0 || r.yeodangPoints + r.yadangPoints !== 20) {
      console.error('  INVARIANT FAIL @', seedBase + i); err++;
    }
  }
  const ms = Date.now() - t0;
  console.log(`\n[${label}] ${done}판 완료 / 재딜 ${redeal} / 오류 ${err} / ${(done/(ms/1000)).toFixed(0)}판/s`);
  console.log(`  주공 승률 ${(declWin/done*100).toFixed(1)}% · 평균 여당점수 ${(sumY/done).toFixed(1)} · 런 ${(runs/done*100).toFixed(1)}% · 백런 ${backRuns} · 셀프 ${(self/done*100).toFixed(1)}% · NT ${(nt/done*100).toFixed(1)}%`);
  console.log(`  공약 분포`, Object.entries(bidDist).sort().map(([k,v])=>`${k}:${(v/done*100).toFixed(0)}%`).join(' '));
  console.log(`  주공 빈도/좌석`, declCount.map(x=>(x/done*100).toFixed(0)+'%').join(' '));
  console.log(`  평균 상금/판`, prizeSum.map(x=>(x/done).toFixed(0)).join(' '));
  return { declWin: declWin/done, err };
}

// 1) 전원 휴리스틱(밸런스)
simulate('휴리스틱 5인 (밸런스)', rng => Array.from({length:5}, () => new E.HeuristicAgent(E.PERSONAS.balanced, rng)));

// 2) 페르소나 믹스
simulate('페르소나 믹스', rng => [
  new E.HeuristicAgent(E.PERSONAS.gambler, rng),
  new E.HeuristicAgent(E.PERSONAS.careful, rng),
  new E.HeuristicAgent(E.PERSONAS.team, rng),
  new E.HeuristicAgent(E.PERSONAS.loner, rng),
  new E.HeuristicAgent(E.PERSONAS.balanced, rng),
]);

// 3) 휴리스틱 1 vs 랜덤 4 — 좌석0 휴리스틱의 상금 우위 확인
const r3 = simulate('휴리스틱(좌석0) vs 랜덤 4', rng => [
  new E.HeuristicAgent(E.PERSONAS.balanced, rng),
  new E.RandomAgent(rng), new E.RandomAgent(rng), new E.RandomAgent(rng), new E.RandomAgent(rng),
], 3000);

// 4) 성향 편차 그룹 (randomPersonality)
simulate('랜덤 성향 그룹', rng => Array.from({length:5}, () => new E.HeuristicAgent(E.randomPersonality(rng), rng)), 3000);
