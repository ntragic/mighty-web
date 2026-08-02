/** 프렌드 콜 후처리 자체검증: 마이티 보유 시 무개입, 미보유 시 교정, off면 원본. */
'use strict';
const assert = require('assert');
const E = require('../../src/mighty-engine.js');
const M = require('../../src/mighty-master.js');

// 프렌드 선언 직전 상태의 게임을 만든다 (휴리스틱으로 입찰·바닥패까지 진행)
function gameAtFriend(seed) {
  const g = new E.MightyGame({ seed });
  const ag = new E.HeuristicAgent(E.PERSONAS.balanced, g.rng, { tier: 'advanced' });
  g.start(Math.floor(g.rng() * 5));
  let guard = 0;
  while (g.phase !== 'friend' && g.phase !== 'done' && g.phase !== 'redeal') {
    if (++guard > 200) return null;
    g.act(ag.act(g));
  }
  return g.phase === 'friend' ? g : null;
}

let held = 0, notHeld = 0, seed = 500000;
while ((held < 3 || notHeld < 3) && seed < 500400) {
  const g = gameAtFriend(++seed);
  if (!g) continue;
  const mc = g.mightyCard;
  const declHas = g.hands[g.declarer].some(c => E.sameCard(c, mc));
  // 조커를 프렌드로 부르는 행동 인덱스를 찾아 후처리 결과를 본다
  const jokerIdx = 94 + M.cidx(E.JOKER);
  M.setFriendCallFix('all');
  const fixed = M.actionToEngine(jokerIdx, g, []);
  M.setFriendCallFix('off');
  const raw = M.actionToEngine(jokerIdx, g, []);
  assert.strictEqual(raw.mode, 'card');
  assert.ok(E.isJoker(raw.card), 'off일 땐 원본 조커 콜이어야 한다');
  if (declHas) {
    held++;
    assert.ok(E.isJoker(fixed.card), '주공이 마이티 보유 시 교정하면 안 된다(셀프가 됨)');
  } else {
    notHeld++;
    assert.ok(E.sameCard(fixed.card, mc), '주공이 마이티 미보유면 마이티 콜로 교정돼야 한다');
    // 교정 결과가 실제로 프렌드를 성립시키는지 엔진으로 확인
    const holder = [0, 1, 2, 3, 4].find(p => g.hands[p].some(c => E.sameCard(c, mc)));
    assert.ok(holder === undefined || holder !== g.declarer, '주공이 보유자면 안 된다');
  }
  // 마이티 콜은 어떤 모드에서도 그대로 통과
  M.setFriendCallFix('all');
  const mIdx = 94 + M.cidx(mc);
  assert.ok(E.sameCard(M.actionToEngine(mIdx, g, []).card, mc), '마이티 콜은 불변');
}
M.setFriendCallFix('all');
assert.ok(held >= 3 && notHeld >= 3, `표본 부족 held=${held} notHeld=${notHeld}`);
console.log(`test_friendfix OK (마이티보유 ${held}건, 미보유 ${notHeld}건 검증)`);
