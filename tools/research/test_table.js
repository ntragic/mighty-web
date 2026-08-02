/** 좌석 배정표 자체검증: 성향 은닉·좌석 고정·매치별 재배정·라운드 완주. */
'use strict';
const assert = require('assert');
const E = require('../../src/mighty-engine.js');
const AI = require('../../src/mighty-ai.js');

// 시드 rng (재현용)
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

(async () => {
  // 1) 성향은 에이전트 객체에 노출되지 않는다
  const t = await AI.createTable({ tiers: 'advanced', rng: mulberry32(1) });
  assert.strictEqual(t.agents.length, E.NUM_PLAYERS);
  for (const a of t.agents)
    assert.ok(!('persona' in a), '에이전트가 성향을 노출하면 안 된다');
  assert.ok(t.personas.every(p => AI.PERSONA_KEYS.includes(p)), '배정은 3종 중 하나');

  // 2) revealPersona를 켜야만 보인다 (디버그용)
  const t2 = await AI.createTable({ tiers: 'advanced', rng: mulberry32(1), revealPersona: true });
  assert.ok(t2.agents.every(a => AI.PERSONA_KEYS.includes(a.persona)));
  assert.deepStrictEqual(t2.personas, t.personas, '같은 rng면 같은 배정');

  // 3) 매치가 바뀌면(새 table) 배정이 달라질 수 있다 — 20회 중 최소 1회는 달라야 한다
  let differs = 0;
  for (let i = 0; i < 20; i++) {
    const tx = await AI.createTable({ tiers: 'advanced', rng: mulberry32(100 + i) });
    if (tx.personas.join() !== t.personas.join()) differs++;
  }
  assert.ok(differs > 0, '새 매치에서 재배정이 일어나야 한다');

  // 4) 좌석 고정: 같은 table로 여러 라운드를 돌려도 배정이 유지되고 게임이 완주된다
  const snapshot = t.personas.join();
  for (let round = 0; round < 3; round++) {
    t.reset();
    const g = new E.MightyGame({ seed: 4242 + round });
    g.start(Math.floor(g.rng() * E.NUM_PLAYERS));
    if (g.phase === 'redeal') continue;
    let guard = 0;
    while (g.phase !== 'done') {
      if (g.phase === 'redeal' || ++guard > 500) break;
      const s = g.currentPlayer;
      g.act(await t.agents[s].act(g, s));
    }
    assert.ok(g.phase === 'done' || g.phase === 'redeal', `라운드 ${round} 완주 실패`);
    assert.strictEqual(t.personas.join(), snapshot, '라운드 중 배정이 바뀌면 안 된다');
  }

  // 5) 마스터 좌석은 성향이 없다
  const t3 = await AI.createTable({ tiers: ['master', 'advanced', 'advanced', 'advanced', 'advanced'],
                                    rng: mulberry32(7), session: {}, ort: {} });
  assert.strictEqual(t3.personas[0], null, '마스터 좌석은 성향 없음');
  assert.ok(t3.personas.slice(1).every(p => AI.PERSONA_KEYS.includes(p)));

  console.log(`test_table OK (배정 ${t.personas.join('/')}, 3라운드 고정 유지, 재배정 ${differs}/20)`);
})();
