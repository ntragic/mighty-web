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
    // 실제 브라우저와 맞춘다 — 여기서 reduced-motion을 참으로 주면 연출이 생략돼
    // 봇 턴이 짧아지고, 정작 검사하려는 감시 타이머 경합이 열리지 않는다.
    window.matchMedia = q => ({ matches: !/prefers-reduced-motion/.test(q), media: q,
                               addListener(){}, removeListener(){},
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
  // TIER=master로 돌리면 실제 탐색이 걸려 봇 턴이 길어진다 — 감시 타이머 경합이
  // 재현되는 조건이다. 기본은 규칙기반(빠름).
  MUI.settings.ui.difficulty = process.env.TIER || 'intermediate';
  MUI.settings.match.mode = 'rounds';
  MUI.settings.match.rounds = 8;   // 되돌리기는 라운드·그룹당 1회라 판수를 늘려야 창이 열린다
  MUI.settings.ui.speed = 'slow';   // 봇 턴을 길게 만들어 경합 창을 넓힌다
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
  let dup = 0, over = 0, tricks = 0, guard = 0, undos = 0, busyUndos = 0;
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
  while (Date.now() - t0 < 90000 && guard++ < 4000) {
    await sleep(50);
    const g = MUI.game;
    if (!g || MUI.matchOver) break;
    // 판이 끝나면 다음 판으로 넘겨 판수를 확보한다(되돌리기가 라운드·그룹당 1회라
    // 한 판에서는 경합 창이 한두 번뿐이다). jsdom은 레이아웃이 없어 offsetParent로
    // 가시성을 못 보므로 단계로 판정한다.
    if (g.phase === 'done' || g.phase === 'redeal') {
      const nb = w.document.querySelector('#next-btn');
      if (nb) { nb.click(); await sleep(200); }
      continue;
    }
    // 되돌리기는 **플레이 중에만**, 그리고 **봇 턴 한가운데(busy=true)** 를 노려
    // 누른다 — 경합은 그 창에서만 열린다. 비딩에서 누르면 판이 계속 되감겨
    // 정작 검사하려는 착수 구간에 못 간다.
    if (g.phase === 'play') {
      const ub = w.document.querySelector('#undo-btn');
      if (ub && !ub.disabled && (MUI.busy || Math.random() < 0.2)) {
        if (MUI.busy) busyUndos++;            // 봇 턴 한가운데 = 진짜 경합 창
        ub.click(); undos++; continue;
      }
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
  const chains = MUI.botChainsMax, stale = MUI.staleActs;
  console.log(`완료 트릭 ${tricks} · 되돌리기 ${undos}회(봇 턴 중 ${busyUndos}회) · ` +
              `트릭 내 중복 착수 ${dup}회 · 5장 초과 트릭 ${over}회 · ` +
              `봇 루프 최대 ${chains}개 · 무효 루프 착수 ${stale}회`);
  // 겹침 자체는 정상이다 — 되돌리기가 새 루프를 깔면 옛 루프가 다음 가드까지 살아 있다.
  // 불변식은 **무효화된 루프가 착수까지 가지 않는 것**이다.
  ok(stale === 0, `무효화된 봇 루프가 ${stale}회 착수했다 — 가드가 뚫렸다`);
  // 되돌리기는 라운드·그룹당 1회라 한 번만 열려도 충분히 의미가 있다.
  ok(busyUndos >= 1, `봇 턴 중 되돌리기 ${busyUndos}회 — 경합 창을 못 열었다`);
  ok(dup === 0 && over === 0,
     `봇 루프가 겹쳤다 — 트릭 내 중복 ${dup}회 · 5장 초과 ${over}회`);

  // 3) 되돌리기를 눌러도 게임이 살아 있다(멈추지 않는다)
  const g = MUI.game;
  ok(!!g && ['bidding','floor','friend','play','done','redeal','dealMissWindow'].includes(g.phase),
     `되돌리기 반복 뒤 phase가 이상하다: ${g && g.phase}`);

  console.log(pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('FAIL:', e && e.stack); process.exit(1); });
