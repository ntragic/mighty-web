/**
 * mighty-evolve.js — 4단계 트랙 A: CPU 자체 대전 파라미터 진화 학습
 *
 * 유전자 = 성향 3축(risk/friendCoop/defCoop) + 전략 가중치 21개
 * 보상   = 판당 평균 상금 (제로섬 → 상대적 실력)
 * 방식   = (μ+λ) 진화전략: 엘리트 보존 + 블렌드 교배 + 가우시안 변이(감쇠)
 *
 * 사용: node mighty-evolve.js [generations] [gamesPerGen] [popSize] [seed]
 * 출력: mighty-trained.json (세대별 로그 + 최종 랭킹 풀 + 베스트 유전자)
 */
const __path = require('path');
const __P = p => __path.join(__dirname, p);
'use strict';
const fs = require('fs');
const E = require(__P('../src/mighty-engine.js'));

const GENS = parseInt(process.argv[2] || '120', 10);
const GAMES_PER_GEN = parseInt(process.argv[3] || '900', 10);
const POP = parseInt(process.argv[4] || '24', 10);
const SEED = parseInt(process.argv[5] || '777', 10);
const ELITES = Math.max(2, Math.floor(POP / 3));
const BENCH_EVERY = 15, BENCH_GAMES = 1200;

const rng = E.makeRng(SEED);

/* ---------------- 유전자 정의 ---------------- */
const RANGES = {
  risk: [0.05, 0.95], friendCoop: [0.05, 0.95], defCoop: [0.05, 0.95],
  bidMargin: [0.2, 2.6], bidRiskScale: [0, 3], competeBase: [0.2, 0.9], competeRisk: [0, 0.8],
  selfThresh: [16, 24], selfRisk: [0, 4],
  trumpLead: [0, 8], jokerLeadMid: [0, 10], costLead: [0, 0.8],
  ptsValue: [0.8, 4], trickBase: [0, 3], overtakeAvoid: [0, 5], defendPts: [0, 2],
  costWin: [0.1, 1], riskPenalty: [0, 3], feed: [0, 7], feedSafe: [0.2, 1],
  dumpPtsPenalty: [0, 8], costDump: [0, 1.2], runProtect: [0, 4], runBlock: [0, 4],
  beatRisk: [0.05, 0.7], friendGuard: [0, 5], mightyGate: [0, 5],
};
const KEYS = Object.keys(RANGES);
const clamp = (k, v) => Math.max(RANGES[k][0], Math.min(RANGES[k][1], v));
const span = k => RANGES[k][1] - RANGES[k][0];

function defaultGenome() {
  return { risk: 0.5, friendCoop: 0.6, defCoop: 0.6, ...E.HEURISTIC_WEIGHTS };
}
function genomeToPersonality(g) {
  const { risk, friendCoop, defCoop, ...weights } = g;
  return { risk, friendCoop, defCoop, weights };
}
function mutate(g, sigma) {
  const out = { ...g };
  for (const k of KEYS) {
    if (rng() < 0.7) out[k] = clamp(k, out[k] + (rng() * 2 - 1) * sigma * span(k));
  }
  return out;
}
function crossover(a, b) {
  const out = {};
  for (const k of KEYS) { const t = rng(); out[k] = clamp(k, a[k] * t + b[k] * (1 - t)); }
  return out;
}

/* ---------------- 초기 개체군: 기본값 + 페르소나 + 변이 ---------------- */
let population = [];
population.push(defaultGenome());
for (const key of ['gambler', 'careful', 'team', 'loner']) {
  const p = E.PERSONAS[key];
  population.push({ ...defaultGenome(), risk: p.risk, friendCoop: p.friendCoop, defCoop: p.defCoop });
}
while (population.length < POP) population.push(mutate(defaultGenome(), 0.3));

/* ---------------- 적합도 평가 ---------------- */
let gameSeed = SEED * 1000;
function evaluate(pop, games) {
  const prize = new Array(pop.length).fill(0);
  const played = new Array(pop.length).fill(0);
  const agents = pop.map(g => new E.HeuristicAgent(genomeToPersonality(g), rng));
  let declWin = 0, done = 0;
  for (let i = 0; i < games; i++) {
    // 5명 무작위 발탁 (중복 없음)
    const idx = [];
    while (idx.length < 5) {
      const x = Math.floor(rng() * pop.length);
      if (!idx.includes(x)) idx.push(x);
    }
    const table = idx.map(x => agents[x]);
    const out = E.playGame({ seed: gameSeed++ }, table);
    if (!out.result) continue;
    done++;
    if (out.result.win) declWin++;
    for (let s = 0; s < 5; s++) { prize[idx[s]] += out.result.prizes[s]; played[idx[s]]++; }
  }
  const fitness = prize.map((p, i) => played[i] ? p / played[i] : -1e9);
  return { fitness, declWinRate: done ? declWin / done : 0, done };
}

/* ---------------- 벤치마크: 진화 베스트 1 vs 기본 에이전트 4 ---------------- */
function benchmark(genome, games) {
  const best = new E.HeuristicAgent(genomeToPersonality(genome), rng);
  const base = () => new E.HeuristicAgent(E.PERSONAS.balanced, rng);
  let sum = 0, n = 0, seat = 0;
  for (let i = 0; i < games; i++) {
    const table = [base(), base(), base(), base()];
    table.splice(seat, 0, best);          // 좌석 로테이션
    const out = E.playGame({ seed: 999000 + SEED + i }, table);
    if (!out.result) continue;
    sum += out.result.prizes[seat]; n++;
    seat = (seat + 1) % 5;
  }
  return { avgPrize: n ? sum / n : 0, games: n };
}

/* ---------------- 진화 루프 ---------------- */
console.log(`진화 시작: pop ${POP} · ${GENS}세대 · 세대당 ${GAMES_PER_GEN}판 · seed ${SEED}`);
const history = [];
const t0 = Date.now();
for (let gen = 1; gen <= GENS; gen++) {
  const sigma = 0.25 * Math.pow(0.03 / 0.25, gen / GENS); // 0.25 → 0.03 감쇠
  const { fitness, declWinRate, done } = evaluate(population, GAMES_PER_GEN);
  const order = fitness.map((f, i) => i).sort((a, b) => fitness[b] - fitness[a]);
  const elites = order.slice(0, ELITES).map(i => population[i]);
  const rec = {
    gen, sigma: +sigma.toFixed(3),
    best: +fitness[order[0]].toFixed(1),
    mean: +(fitness.reduce((a, b) => a + b, 0) / fitness.length).toFixed(1),
    declWinRate: +(declWinRate * 100).toFixed(1), games: done,
  };
  if (gen % BENCH_EVERY === 0 || gen === GENS || gen === 1) {
    rec.benchVsDefault = +benchmark(elites[0], BENCH_GAMES).avgPrize.toFixed(1);
  }
  history.push(rec);
  if (gen % 5 === 0 || gen === 1 || rec.benchVsDefault !== undefined) {
    console.log(`gen ${String(gen).padStart(3)} | best ${rec.best} | mean ${rec.mean} | 주공승률 ${rec.declWinRate}%` +
      (rec.benchVsDefault !== undefined ? ` | vs기본 ${rec.benchVsDefault > 0 ? '+' : ''}${rec.benchVsDefault}/판` : ''));
  }
  // 다음 세대
  const next = elites.slice();
  while (next.length < POP) {
    const a = elites[Math.floor(rng() * elites.length)];
    const b = elites[Math.floor(rng() * elites.length)];
    next.push(mutate(crossover(a, b), sigma));
  }
  population = next;
}

/* ---------------- 최종 랭킹 (5단계용) ---------------- */
console.log('\n최종 풀 정밀 평가 중...');
const finalEval = evaluate(population, 4000);
const ranked = finalEval.fitness.map((f, i) => ({ fitness: +f.toFixed(1), genome: population[i] }))
  .sort((a, b) => b.fitness - a.fitness);
const finalBench = benchmark(ranked[0].genome, 3000);

const out = {
  meta: { date: new Date().toISOString(), gens: GENS, gamesPerGen: GAMES_PER_GEN, pop: POP, seed: SEED,
          elapsedSec: +((Date.now() - t0) / 1000).toFixed(1) },
  history,
  finalBenchVsDefault: { avgPrizePerGame: +finalBench.avgPrize.toFixed(1), games: finalBench.games },
  best: ranked[0],
  rankedPool: ranked,
};
fs.writeFileSync(__P('./mighty-trained.json'), JSON.stringify(out, null, 2));
console.log(`\n완료 (${out.meta.elapsedSec}s) → mighty-trained.json`);
console.log(`베스트 vs 기본 4인: 판당 ${finalBench.avgPrize > 0 ? '+' : ''}${finalBench.avgPrize.toFixed(0)} 상금 (${finalBench.games}판)`);
console.log('베스트 유전자 성향:', JSON.stringify({
  risk: +ranked[0].genome.risk.toFixed(2),
  friendCoop: +ranked[0].genome.friendCoop.toFixed(2),
  defCoop: +ranked[0].genome.defCoop.toFixed(2) }));
