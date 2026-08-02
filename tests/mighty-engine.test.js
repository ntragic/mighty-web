/**
 * mighty-engine.test.js
 * 1) 엑셀 실데이터 기반 스코어링 단위 테스트
 * 2) 상금 배분(제로섬) 테스트
 * 3) 대량 랜덤 시뮬레이션 불변식 검증 (카드 보존, 점수 총합 20, 제로섬)
 */
const __path = require('path');
const __P = p => __path.join(__dirname, p);
'use strict';
const E = require(__P('../src/mighty-engine.js'));

let passCnt = 0, failCnt = 0;
function assert(cond, msg) {
  if (cond) { passCnt++; }
  else { failCnt++; console.error('  FAIL:', msg); }
}
function eq(a, b, msg) { assert(a === b, `${msg} (got ${a}, want ${b})`); }

// -----------------------------------------------------------------
// 1. 스코어링 단위 테스트 — 엑셀 '게임 기록' 시트 실제 행 대조
//    [목표, 획득, 노기루다, 기대점수V, 기대상금W]
// -----------------------------------------------------------------
console.log('== 1. 엑셀 수식 대조 테스트 ==');
const cases = [
  [14, 13, false,  -500,  -500],
  [15,  7, false, -2200, -2000],  // 캡 하한
  [15, 12, false, -1200, -1200],
  [15, 14, false,  -800,  -800],
  [14, 14, false,   500,   500],
  [15, 17, false,  1200,  1200],
  [15, 20, false,  1800,  2000],  // 런 → 2000 고정
  [14, 20, false,  1700,  2000],  // 런
  [16, 12, false, -1700, -1700],
  [17,  8, false, -3000, -2000],  // 캡 하한
  [17, 20, true,   4000,  3000],  // 노기루다 런 → 3000
  [16, 16, true,   2200,  2200],  // 노기루다 캡 이내
  [18, 20, true,   4200,  3000],  // 노기루다 런
  [16, 13, true,  -3000, -3000],  // 노기루다 캡 하한
  [17, 15, true,  -3200, -3000],  // 노기루다 캡 하한
  [15, 15, false,   800,   800],
  [14, 16, false,   900,   900],
];
for (const [bid, won, ng, v, w] of cases) {
  const r = E.computeRoundScore(bid, won, ng, E.DEFAULT_CONFIG.scoring);
  eq(r.score, v, `점수 V (${bid}${ng ? '노' : ''}, 획득${won})`);
  eq(r.prize, w, `상금 W (${bid}${ng ? '노' : ''}, 획득${won})`);
}

// -----------------------------------------------------------------
// 2. 상금 배분 테스트 (엑셀 '개인별 상금' 수식 대조)
// -----------------------------------------------------------------
console.log('== 2. 상금 배분 테스트 ==');
{
  // 일반: 주공0 프렌드2, 상금 800 → [1600, -800, 800, -800, -800]
  const d = E.distributePrize(800, 0, 2, 5, E.DEFAULT_CONFIG.scoring);
  eq(d[0], 1600, '주공 ×2');
  eq(d[2], 800, '프렌드 ×1');
  eq(d[1], -800, '야당 −1');
  eq(d.reduce((a, b) => a + b, 0), 0, '제로섬');

  // 셀프(노프렌드): 주공3, 상금 2200 → 주공 8800, 나머지 각 -2200
  const s = E.distributePrize(2200, 3, null, 5, E.DEFAULT_CONFIG.scoring);
  eq(s[3], 8800, '셀프 주공 ×4');
  eq(s[0], -2200, '셀프 야당 −1');
  eq(s.reduce((a, b) => a + b, 0), 0, '셀프 제로섬');
}

// -----------------------------------------------------------------
// 3. 대량 랜덤 시뮬레이션 불변식
// -----------------------------------------------------------------
console.log('== 3. 랜덤 시뮬레이션 10,000판 불변식 검증 ==');
{
  const N = 10000;
  let done = 0, redeal = 0, declWin = 0, runs = 0, backRuns = 0;
  let sumYeodang = 0, selfGames = 0, ngGames = 0;
  const t0 = Date.now();
  let invariantFail = 0;

  for (let i = 0; i < N; i++) {
    const { game: g, result: r } = E.playRandomGame({ seed: 1000 + i });
    if (!r) { redeal++; continue; }
    done++;

    // 불변식 1: 트릭 10개 × 5장 + 버림 3장 = 53장, 손패 소진
    const playedCards = g.play.history.reduce((a, t) => a + t.plays.length, 0);
    const handsLeft = g.hands.reduce((a, h) => a + h.length, 0);
    const ok1 = playedCards === 50 && g.discard.length === 3 && handsLeft === 0;

    // 불변식 2: 점수카드 총합 = 20 (획득 + 버림)
    const capSum = r.capturedPoints.reduce((a, b) => a + b, 0);
    const ok2 = capSum + r.discardPoints === 20;

    // 불변식 3: 여당+야당 점수 = 20, 상금 제로섬
    const ok3 = r.yeodangPoints + r.yadangPoints === 20 &&
                r.prizes.reduce((a, b) => a + b, 0) === 0;

    // 불변식 4: 점수/상금 재계산 일치
    const rc = E.computeRoundScore(r.contract.count, r.yeodangPoints, r.noGiruda, E.DEFAULT_CONFIG.scoring);
    const ok4 = rc.prize === r.prize && rc.score === r.score;

    if (!(ok1 && ok2 && ok3 && ok4)) {
      invariantFail++;
      if (invariantFail <= 3) console.error('  invariant fail @seed', 1000 + i, { ok1, ok2, ok3, ok4, r });
    }

    if (r.win) declWin++;
    if (r.run) runs++;
    if (r.backRun) backRuns++;
    if (r.friend === null) selfGames++;
    if (r.noGiruda) ngGames++;
    sumYeodang += r.yeodangPoints;
  }
  const ms = Date.now() - t0;
  eq(invariantFail, 0, '전 게임 불변식 통과');
  assert(done > 0, 'games completed');

  console.log(`  완료 ${done}판 / 재딜 ${redeal}판 / 소요 ${ms}ms (${(done / (ms / 1000)).toFixed(0)}판/초)`);
  console.log(`  [랜덤봇 통계] 주공(여당) 승률 ${(declWin / done * 100).toFixed(1)}%, 평균 여당점수 ${(sumYeodang / done).toFixed(1)}`);
  console.log(`  런 ${runs}, 백런 ${backRuns}, 셀프 ${selfGames}, 노기루다 ${ngGames}`);
}

// -----------------------------------------------------------------
// 4. 룰 세부 동작 스팟 테스트
// -----------------------------------------------------------------
console.log('== 4. 룰 세부 동작 테스트 ==');
{
  // 마이티 카드: 기루다 스페이드면 ◆A
  const g = new E.MightyGame({ seed: 7, dealMissEnabled: false });
  g.start(0);
  // 강제로 비딩 진행: P1이 14스 콜, 나머지 패스
  while (g.phase === 'bidding') {
    const p = g.currentPlayer;
    if (p === 1 && !g.bidding.best) g.act({ type: 'bid', count: 14, giruda: 'S' });
    else g.act({ type: 'pass' });
  }
  eq(g.declarer, 1, '주공 확정');
  eq(g.mightyCard.suit, 'D', '스페이드 기루다 → 마이티 ◆A');
  eq(g.jokerCallCard.suit, 'C', '조커콜 ♣3');

  // 클로버 기루다 → 조커콜 ♠3
  const g2 = new E.MightyGame({ seed: 8, dealMissEnabled: false });
  g2.start(0);
  while (g2.phase === 'bidding') {
    const p = g2.currentPlayer;
    if (p === 2 && !g2.bidding.best) g2.act({ type: 'bid', count: 14, giruda: 'C' });
    else g2.act({ type: 'pass' });
  }
  eq(g2.mightyCard.suit, 'S', '일반 기루다 → 마이티 ♠A');
  eq(g2.jokerCallCard.suit, 'H', '클로버 기루다 → 조커콜 ♥3');

  // 공약 수정 비용: 무늬 변경 +2 검증
  const hand = g2.hands[g2.declarer].slice();
  let threw = false;
  try {
    g2.act({ type: 'exchange', discard: hand.slice(0, 3), revise: { count: 15, giruda: 'H' } });
  } catch (e) { threw = true; }
  assert(threw, '무늬 변경 시 +2 미만 공약 거부');
  g2.act({ type: 'exchange', discard: hand.slice(0, 3), revise: { count: 16, giruda: 'H' } });
  eq(g2.contract.giruda, 'H', '공약 수정 반영 (14크→16하)');
}

// -----------------------------------------------------------------
// 5. 딜미스 v2 (선택제) 테스트
// -----------------------------------------------------------------
console.log('== 5. 딜미스 선택제 테스트 ==');
{
  const J = E.JOKER;
  const mk = (...ids) => ids.map(s => s === 'J' ? J : ({suit: s[0], rank: +s.slice(1)}));
  eq(E.dealMissValue(mk('S2','S3','S4','S5','S6','S7','S8','S9','D2','D3')), 0, '점수합 0');
  eq(E.dealMissValue(mk('S10','S2','S3','S4','S5','S6','S7','S8','D2','D3')), 0.5, '10 한 장 = 0.5');
  eq(E.dealMissValue(mk('J','S13','S2','S3','S4','S5','S6','S7','S8','D2')), 0, '조커-1 + K+1 = 0');
  eq(E.dealMissValue(mk('S14','S13','S2','S3','S4','S5','S6','S7','S8','D2')), 2, '페이스 2장 = 2');

  // 창구 흐름: 자격자 강제 주입 → 창구 진입 → proceed로 플레이 시작 / dealMiss로 재딜
  const g = new E.MightyGame({ seed: 5, dealMissEnabled: true });
  g.start(0);
  while (g.phase === 'bidding') {
    const p = g.currentPlayer;
    if (p === 1 && !g.bidding.best) g.act({type:'bid', count:14, giruda:'S'});
    else g.act({type:'pass'});
  }
  const hand = g.hands[g.declarer].slice();
  g.act({type:'exchange', discard: hand.slice(0,3)});
  // 좌석 3에 쓰레기 패 주입 (자격 확보)
  g.hands[3] = [{suit:'S',rank:2},{suit:'S',rank:3},{suit:'S',rank:4},{suit:'S',rank:5},
                {suit:'D',rank:2},{suit:'D',rank:3},{suit:'D',rank:4},
                {suit:'H',rank:2},{suit:'H',rank:3},{suit:'C',rank:2}].slice(0, g.hands[3].length);
  g.act({type:'friend', mode:'card', card: g.mightyCard});
  assert(g.phase === 'dealMissWindow' || g.phase === 'play', '프렌드 후 창구/플레이 진입');
  if (g.phase === 'dealMissWindow'){
    assert(g.dmQueue.includes(3), '자격자 3 큐 포함');
    // 전원 proceed → play
    while (g.phase === 'dealMissWindow') g.act({type:'proceed'});
    eq(g.phase, 'play', '전원 진행 → 플레이 시작');
  }
  // 선언 → 재딜
  const g2 = new E.MightyGame({ seed: 5, dealMissEnabled: true });
  g2.start(0);
  while (g2.phase === 'bidding') {
    const p = g2.currentPlayer;
    if (p === 1 && !g2.bidding.best) g2.act({type:'bid', count:14, giruda:'S'});
    else g2.act({type:'pass'});
  }
  g2.act({type:'exchange', discard: g2.hands[g2.declarer].slice(0,3)});
  g2.hands[3] = g.hands[3].map(c=>({...c}));
  g2.act({type:'friend', mode:'card', card: g2.mightyCard});
  if (g2.phase === 'dealMissWindow'){
    // 3 차례까지 진행 후 선언
    while (g2.currentPlayer !== 3 && g2.phase==='dealMissWindow') g2.act({type:'proceed'});
    if (g2.phase==='dealMissWindow'){
      g2.act({type:'dealMiss'});
      eq(g2.phase, 'redeal', '창구 선언 → 재딜');
      eq(g2.redealReason.player, 3, '재딜 사유 플레이어');
    }
  }
}

// -----------------------------------------------------------------
console.log(`\n결과: ${passCnt} passed, ${failCnt} failed`);
process.exit(failCnt ? 1 : 0);
