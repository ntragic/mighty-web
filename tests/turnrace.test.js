/* 턴 경합 회귀 테스트.
 *
 * 제보(2026-08-22): 플레이어 패가 저절로 나가고, 되돌리기가 안 먹고, 복기가 안 된다.
 * 원인 세 가지를 잡는다.
 *
 *  1) 감시 타이머가 정상 진행 중에 발동 — 탐색 도입 후 봇 한 턴이 4.4초까지 늘었는데
 *     한도가 3,500ms 고정이었다. 발동하면 stateGen을 올리고 봇 루프를 새로 깔아
 *     진행 중이던 턴과 겹친다.
 *  2) 세팅 모달 콜백에 stateGen 가드가 없어, 되돌리기로 취소된 뒤에도 busy를 내리고
 *     pump를 불러 봇 루프가 둘이 된다.
 *  3) playWithAnimation의 수거 연출 뒤 pump에도 같은 구멍이 있었다.
 *
 * 이 테스트는 **봇 루프가 둘 이상 겹치지 않는가**를 직접 본다 — pump가 예약한
 * botStep이 동시에 두 개 돌면 같은 좌석이 연속으로 두 번 두거나 남의 차례에 둔다.
 */
'use strict';
const __path = require('path');
const { JSDOM } = require('jsdom');
const fs = require('fs');

const html = fs.readFileSync(__path.join(__dirname, '../web/index.html'), 'utf8');
const dom = new JSDOM(html, {
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  beforeParse(window) {
    window.matchMedia = q => ({ matches: true, media: q, addListener(){}, removeListener(){},
                               addEventListener(){}, removeEventListener(){} });
    Object.defineProperty(window.navigator, 'language', { value: 'ko-KR' });
  },
});
const w = dom.window;
const sleep = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.error('FAIL:', m); } };

(async () => {
  await sleep(200);
  const MUI = w.MUI;
  if (!MUI) { console.error('MUI handle missing'); process.exit(1); }
  MUI.settings.ui.difficulty = 'intermediate';   // 모델 없이 규칙기반으로 빠르게
  MUI.settings.match.mode = 'rounds';
  MUI.settings.match.rounds = 2;
  MUI.settings.ui.speed = 'fast';
  MUI.newMatch();
  await sleep(150);

  // 1) 감시 타이머 한도가 탐색 예산을 반영하는가 — 고정 3,500ms면 정상 턴을 자른다
  const wd = w.eval('typeof WATCHDOG_MS === "function" ? WATCHDOG_MS() : 3500');
  console.log(`감시 타이머 한도 ${wd}ms`);
  ok(wd >= 7000, `감시 타이머가 ${wd}ms — 탐색 예산(2,000ms)을 감안하면 봇 한 턴을 자른다`);

  // 2) 진행 중 되돌리기를 반복해도 같은 좌석이 연속으로 두 번 두지 않는다.
  //    봇 루프가 겹치면 여기서 잡힌다.
  // 트릭 승자가 다음 트릭을 리드하므로 '연속 착수'는 정상이다. 봇 루프가 겹치면
  // **한 트릭 안에 같은 좌석이 두 번** 나오거나 트릭이 5장을 넘는다 — 그걸 본다.
  let dup = 0, over = 0, tricks = 0, guard = 0;
  const watch = setInterval(() => {
    const g = MUI.game;
    if (!g || !g.play) return;
    const all = g.play.history.concat(g.play.table.length ? [{ plays: g.play.table }] : []);
    for (const t of all) {
      const seats = t.plays.map(e => e.player);
      if (seats.length > 5) over++;
      if (new Set(seats).size !== seats.length) dup++;
    }
    tricks = g.play.history.length;
  }, 20);

  const t0 = Date.now();
  while (Date.now() - t0 < 30000 && guard++ < 1500) {
    await sleep(50);
    const g = MUI.game;
    if (!g || MUI.matchOver) break;
    // 되돌리기는 **플레이 중에만** 누른다 — 비딩에서 누르면 판이 계속 되감겨
    // 정작 검사하려는 착수 구간에 못 간다.
    if (g.phase === 'play') {
      const ub = w.document.querySelector('#undo-btn');
      if (ub && !ub.disabled && Math.random() < 0.35) { ub.click(); continue; }
    }
    if (MUI.busy || g.currentPlayer !== 0) continue;
    if (g.phase === 'bidding') {
      // 사람이 낙찰받아야 플레이까지 간다 — 가능한 최고 공약을 부른다
      const bids = g.legalActions().filter(a => a.type === 'bid');
      MUI.humanAct(bids.length ? bids[bids.length - 1] : { type: 'pass' });
    } else if (g.phase === 'floor') MUI.humanAct({ type: 'exchange', discard: g.hands[0].slice(0, 3) });
    else if (g.phase === 'friend') MUI.humanAct({ type: 'friend', mode: 'first' });
    else if (g.phase === 'dealMissWindow') MUI.humanAct({ type: 'proceed' });
    else if (g.phase === 'play') {
      const legal = g._legalPlays(0).filter(m => !m.jokerCall);
      if (legal.length) MUI.humanAct({ type: 'play', card: legal[0].card });
    }
  }
  clearInterval(watch);
  console.log(`완료 트릭 ${tricks} · 트릭 내 중복 착수 ${dup}회 · 5장 초과 트릭 ${over}회`);
  ok(dup === 0 && over === 0,
     `봇 루프가 겹쳤다 — 트릭 내 중복 ${dup}회 · 5장 초과 ${over}회`);

  // 3) 되돌리기를 눌러도 게임이 살아 있다(멈추지 않는다)
  const g = MUI.game;
  ok(!!g && ['bidding','floor','friend','play','done','redeal','dealMissWindow'].includes(g.phase),
     `되돌리기 반복 뒤 phase가 이상하다: ${g && g.phase}`);

  console.log(pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('FAIL:', e && e.stack); process.exit(1); });
