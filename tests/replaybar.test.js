/* 복기 바가 정산 모달에 가려지던 회귀.
 *
 * 제보(2026-08-24): 복기모드에는 들어가는데 아래 재생·이동 버튼 인터페이스가 안 뜬다.
 *
 * 원인: 복기할 판이 하나면 openReplayPicker가 라운드 선택을 건너뛰고 곧장
 * startReplay로 간다. 모달을 닫는 코드는 **선택 모달 경로에만** 있었기 때문에,
 * 정산 모달(z=40)이 복기 바(z=28) 위에 그대로 남는다. 실브라우저 계측에서
 * 복기 바 중앙의 최상단 요소가 '#modal.show'로 찍혔다.
 * 판이 끝난 직후에는 뒤늦게 예약된 pump가 showSettlement()를 다시 불러 덮기도 했다.
 *
 * jsdom에는 레이아웃이 없어 z축을 직접 못 본다. 대신 **덮는 원인 자체**를 본다:
 *   복기가 켜져 있는 동안 정산 모달은 열려 있으면 안 된다.
 * 그리고 복기를 나가면 정산이 되돌아와야 한다(정산이 사라지면 그것도 버그다).
 */
'use strict';
const __path = require('path');
const fs = require('fs');
const { JSDOM } = require('jsdom');

const html = fs.readFileSync(__path.join(__dirname, '../web/index.html'), 'utf8');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.error('FAIL:', m); } };

const dom = new JSDOM(html, {
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  beforeParse(window) {
    window.matchMedia = q => ({ matches: !/prefers-reduced-motion/.test(q), media: q,
                               addListener(){}, removeListener(){},
                               addEventListener(){}, removeEventListener(){} });
    Object.defineProperty(window.navigator, 'language', { value: 'ko-KR' });
    if (!window.PointerEvent) window.PointerEvent = window.MouseEvent;
  },
});
const w = dom.window;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const shown = sel => !!w.document.querySelector(sel)?.classList.contains('show');

(async () => {
  await sleep(200);
  const MUI = w.MUI;
  if (!MUI) { console.error('FAIL: MUI handle missing'); process.exit(1); }
  MUI.settings.ui.difficulty = 'intermediate';
  MUI.settings.match.mode = 'rounds';
  MUI.settings.match.rounds = 4;
  MUI.settings.ui.speed = 'fast';
  MUI.newMatch();
  await sleep(150);

  // 한 판 완주 — 복기 대상이 딱 하나가 되게 한다(모달 건너뛰기 경로)
  for (let i = 0; i < 5000; i++) {
    await sleep(20);
    const g = MUI.game; if (!g) continue;
    if (g.phase === 'done') break;
    if (g.phase === 'redeal') continue;
    if (MUI.busy || g.currentPlayer !== 0) continue;
    if (g.phase === 'bidding') { const b = g.legalActions().filter(a => a.type === 'bid');
      MUI.humanAct(b.length ? b[0] : { type: 'pass' }); }
    else if (g.phase === 'floor') MUI.humanAct({ type: 'exchange', discard: g.hands[0].slice(0, 3) });
    else if (g.phase === 'friend') MUI.humanAct({ type: 'friend', mode: 'first' });
    else if (g.phase === 'dealMissWindow') MUI.humanAct({ type: 'proceed' });
    else if (g.phase === 'play') {
      const l = g._legalPlays(0).filter(m => !m.jokerCall);
      if (!l.length) continue;
      const E = w.MightyEngine;
      const plain = l.find(m => !E.isJoker(m.card));
      const mv = plain || l[0];
      const act = { type: 'play', card: mv.card };
      if (E.isJoker(mv.card)) act.jokerSuit = 'S';
      MUI.humanAct(act);
    }
  }
  if (!MUI.game || MUI.game.phase !== 'done') {
    console.error('FAIL: 한 판을 못 끝냈다 — phase ' + (MUI.game && MUI.game.phase)); process.exit(1);
  }
  await sleep(900);
  console.log(`판 종료 · 정산 모달 show=${shown('#modal')}`);

  // 복기 진입
  const rb = w.document.querySelector('#replay-btn');
  ok(rb && !rb.disabled, '복기 버튼을 누를 수 없다');
  rb.click();
  await sleep(900);
  // 라운드가 여럿이면 선택 모달이 뜬다 — 그 경우 첫 라운드를 고른다
  const chips = [...w.document.querySelectorAll('#modal-box .chip')];
  if (shown('#modal') && chips.length) { chips[0].click(); await sleep(700); }

  console.log(`복기 진입 replay=${!!MUI.replay} · 복기 바 show=${shown('#replay-bar')}` +
              ` · 정산 모달 show=${shown('#modal')}`);
  ok(!!MUI.replay, '복기에 들어가지 못했다');
  ok(shown('#replay-bar'), '복기 바에 show가 붙지 않았다');
  ok(!shown('#modal'), '복기 중인데 정산 모달이 열려 있다 — 복기 바가 가려진다');

  // 판이 끝난 직후 예약돼 있던 pump가 정산을 다시 띄우지 않는지 본다
  await sleep(1200);
  console.log(`1.2초 뒤 정산 모달 show=${shown('#modal')} · replay=${!!MUI.replay}`);
  ok(!shown('#modal'), '복기 중에 정산 모달이 뒤늦게 다시 떴다');

  // 나가면 정산이 되돌아와야 한다
  const back = [...w.document.querySelectorAll('#replay-bar button')]
    .find(b => /게임으로|Back to game/i.test(b.textContent));
  ok(!!back, "'게임으로' 버튼을 찾지 못했다");
  if (back) {
    back.click();
    await sleep(1000);
    console.log(`복기 종료 replay=${!!MUI.replay} · 정산 모달 show=${shown('#modal')}`);
    ok(!MUI.replay, '복기를 못 빠져나왔다');
    ok(shown('#modal'), '복기를 나갔는데 정산 화면이 돌아오지 않았다');
  }

  console.log(pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('FAIL:', e && e.stack); process.exit(1); });
