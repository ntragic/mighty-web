/**
 * 신호 실험 A: 프렌드의 "주공에게 점수 공급"이 여당 승률에 기여하는가,
 * 그리고 그 기여가 주공(수신자)의 신호 해독 능력에 의존하는가.
 * 같은 딜에서 프렌드 공급만 켜고/끄고 비교. 티어별로 반복.
 * 사용: node exp_signal.js [딜수]
 */
'use strict';
const E = require('../../src/mighty-engine.js');
const NUM = 5;

function play(seed, persona, tier, feedScale) {
  const g = new E.MightyGame({ seed });
  const p = { ...E.PERSONAS[persona], weights: { friendFeedScale: feedScale } };
  const agents = Array.from({ length: NUM },
    () => new E.HeuristicAgent(p, g.rng, { tier }));
  g.start(Math.floor(g.rng() * NUM));
  if (g.phase === 'redeal') return null;
  let guard = 0;
  while (g.phase !== 'done') {
    if (g.phase === 'redeal' || ++guard > 500) return null;
    g.act(agents[g.currentPlayer].act(g));
  }
  const r = g.result;
  // 실제 공급량 확인용
  let fed = 0, pts = 0;
  if (r.friend != null && r.friend !== r.declarer) {
    for (const t of g.play.history)
      for (const e of t.plays)
        if (e.player === r.friend && !E.isJoker(e.card) && e.card.rank >= 10) {
          pts++; if (t.winner === r.declarer) fed++;
        }
  }
  return { win: !!r.win, hasFriend: r.friend != null && r.friend !== r.declarer, fed, pts };
}

const N = parseInt(process.argv[2] || '1500', 10);
const pct = (w, n) => n ? (w / n * 100).toFixed(1) + '%' : '—';
console.log('실험 A — 프렌드 점수공급 차단이 여당 승률에 미치는 영향 (전 좌석 휴리스틱, 같은 딜)');
for (const tier of ['intermediate', 'advanced']) {
  for (const persona of ['gambler', 'balanced', 'careful']) {
    let seed = 810000, n = 0, onW = 0, offW = 0, fedOn = [0, 0], fedOff = [0, 0], fn = 0;
    while (n < N) {
      const s = ++seed;
      const A = play(s, persona, tier, 1);
      if (!A) continue;
      const B = play(s, persona, tier, 0);
      if (!B) continue;
      n++;
      if (!A.hasFriend || !B.hasFriend) continue;
      fn++;
      onW += A.win; offW += B.win;
      fedOn[0] += A.fed; fedOn[1] += A.pts;
      fedOff[0] += B.fed; fedOff[1] += B.pts;
    }
    const d = (offW - onW) / fn * 100;
    console.log(`  ${tier.padEnd(12)} ${persona.padEnd(9)} 여당승률 공급ON ${pct(onW, fn)} → 차단 ${pct(offW, fn)} ` +
                `(Δ${d >= 0 ? '+' : ''}${d.toFixed(1)}pt, n=${fn})  공급률 ${pct(fedOn[0], fedOn[1])}→${pct(fedOff[0], fedOff[1])}`);
  }
}
