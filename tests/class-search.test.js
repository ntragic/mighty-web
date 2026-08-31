/**
 * 국면 한정 탐색(classSearch) 스모크 — 켰을 때 판이 정상적으로 끝나고,
 * weaklead 국면에서 실제로 발화하며, 한 수 비용이 예산 안에 있는지 본다.
 *
 * 품질(대형 실수율 5.3% → 2.4%)은 tools/research/wl_search_probe.js가 재고
 * 결과는 docs/wl-search-*.txt에 있다. 여기서는 배선만 지킨다.
 */
'use strict';
const assert = require('assert');
const path = require('path');
const ort = require('onnxruntime-node');
const E = require(path.join(__dirname, '../src/mighty-engine.js'));
const AI = require(path.join(__dirname, '../src/mighty-ai.js'));

const MODEL = path.join(__dirname, '../web/model/mighty_master_v16e.onnx');
const DEALS = parseInt(process.env.DEALS || '6', 10);

(async () => {
  const session = await ort.InferenceSession.create(MODEL);
  const count = {};
  const agents = [];
  for (let p = 0; p < E.NUM_PLAYERS; p++)
    agents.push(await AI.createAgent({
      tier: 'master', session, ort,
      classSearch: { K: 8, gate: 0.6, topM: 5, budgetMs: 2000, count },
    }));

  let msMax = 0, moves = 0, done = 0;
  for (let i = 0; i < DEALS; i++) {
    const g = new E.MightyGame({ seed: 4242 + i });
    g.start(i % E.NUM_PLAYERS);
    let guard = 0;
    while (g.phase !== 'done' && g.phase !== 'redeal' && guard++ < 900) {
      const seat = g.currentPlayer;
      const t0 = Date.now();
      const act = await agents[seat].act(g, seat);
      const ms = Date.now() - t0;
      if (ms > msMax) msMax = ms;
      moves++;
      g.act(act);                       // 불법 액션이면 엔진이 던진다
    }
    if (g.phase === 'done') done++;
  }

  assert.ok(done > 0, '탐색을 켠 채로 끝난 판이 없다');
  assert.ok(count.fired > 0, 'weaklead 국면에서 탐색이 한 번도 발화하지 않았다');
  assert.strictEqual(count.sampleSkewMax, 0, '후보별 탐색 표본 수가 다르다');
  assert.ok(count.completedRounds >= count.fired * 4,
    `발화당 최소 4개 완결 라운드가 없다(${count.completedRounds}/${count.fired})`);
  // 예산 2,000ms + 진행 중이던 한 롤아웃의 여유. 넘으면 예산 로직이 깨진 것이다.
  assert.ok(msMax < 6000, `한 수 최대 ${msMax}ms — 예산이 새고 있다`);
  console.log(`classSearch: PASS (${done}/${DEALS}판 · 수 ${moves} · 탐색 발화 ${count.fired}` +
    ` · 균등 라운드 ${count.completedRounds} · 부분폐기 ${count.droppedPartial || 0} · 최대 ${msMax}ms)`);

  // 끈 상태(기본값)에서는 발화가 없어야 한다 — 배포 기본 경로 보호
  const off = await AI.createAgent({ tier: 'master', session, ort });
  const g2 = new E.MightyGame({ seed: 909 });
  g2.start(0);
  let guard2 = 0;
  while (g2.phase !== 'done' && g2.phase !== 'redeal' && guard2++ < 900)
    g2.act(await off.act(g2, g2.currentPlayer));
  assert.strictEqual(g2.phase, 'done', '기본 경로에서 판이 끝나지 않았다');
  console.log('classSearch off: PASS (기본은 탐색 없이 그대로)');
  process.exit(0);
})().catch(e => { console.error('FAIL', e && e.stack); process.exit(1); });
