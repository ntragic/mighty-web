/**
 * 티어 전체 대결: 같은 딜에서 전원 중급 vs 전원 고급 (팀 협력은 집단 속성이라
 * 좌석 하나만 바꾸면 효과가 상쇄된다). 야당 협력이 개선되면 여당 승률이 내려간다.
 * 사용: node bench_tier.js [딜수] [성향...]
 */
'use strict';
const E = require('../../src/mighty-engine.js');
const NUM = 5;
const isPoint = c => !E.isJoker(c) && c.rank >= 10;

function play(seed, persona, tier) {
  const g = new E.MightyGame({ seed });
  const agents = Array.from({ length: NUM },
    () => new E.HeuristicAgent(E.PERSONAS[persona], g.rng, { tier }));
  g.start(Math.floor(g.rng() * NUM));
  if (g.phase === 'redeal') return null;
  let guard = 0;
  while (g.phase !== 'done') {
    if (g.phase === 'redeal' || ++guard > 500) return null;
    g.act(agents[g.currentPlayer].act(g));
  }
  const r = g.result;
  // 야당 협력 지표: 공개 전 비주공 승리 트릭에서 야당끼리 넘긴 점수 / 그 트릭 총점
  let preRevealPts = 0, preRevealDefPts = 0;
  const decl = r.declarer, fr = r.friend;
  let revealed = false;
  for (const t of g.play.history) {
    const winnerIsDef = t.winner !== decl && t.winner !== fr;
    if (!revealed && t.winner !== decl && t.points > 0) {
      preRevealPts += t.points;
      if (winnerIsDef) preRevealDefPts += t.points;
    }
    if (t.plays.some(e => g.friendDecl && g.friendDecl.mode === 'card' &&
                          E.sameCard(e.card, g.friendDecl.card))) revealed = true;
    if (g.friendDecl && g.friendDecl.mode === 'first') revealed = true;
  }
  return { win: !!r.win, yeodang: r.yeodangPoints, preRevealPts, preRevealDefPts };
}

const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
const se = a => Math.sqrt(a.reduce((s, x) => s + (x - mean(a)) ** 2, 0) / (a.length - 1) / a.length);

const N = parseInt(process.argv[2] || '1000', 10);
const list = process.argv.slice(3).length ? process.argv.slice(3) : ['gambler', 'balanced', 'careful'];
for (const persona of list) {
  let seed = 700000, n = 0;
  let winA = 0, winB = 0, ptsA = [], ptsB = [], defA = [0, 0], defB = [0, 0];
  while (n < N) {
    const s = ++seed;
    const A = play(s, persona, 'intermediate');
    if (!A) continue;
    const B = play(s, persona, 'advanced');
    if (!B) continue;
    n++;
    winA += A.win; winB += B.win;
    ptsA.push(A.yeodang); ptsB.push(B.yeodang);
    defA[0] += A.preRevealDefPts; defA[1] += A.preRevealPts;
    defB[0] += B.preRevealDefPts; defB[1] += B.preRevealPts;
  }
  const d = (winB - winA) / n * 100;
  console.log(`\n### ${persona} (${n}딜, 전 좌석 동일 티어)`);
  console.log(`  여당 승률   고급테이블 ${(winB/n*100).toFixed(1)}% vs 중급 ${(winA/n*100).toFixed(1)}%  Δ${d>=0?'+':''}${d.toFixed(1)}pt`);
  console.log(`  여당 평균점 고급 ${mean(ptsB).toFixed(2)} vs 중급 ${mean(ptsA).toFixed(2)} (±${se(ptsB).toFixed(2)})`);
  console.log(`  공개전 비주공 트릭 점수 중 야당 확보분  고급 ${(defB[0]/defB[1]*100).toFixed(1)}% vs 중급 ${(defA[0]/defA[1]*100).toFixed(1)}%`);
}
