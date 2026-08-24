/* 카드 탭 스루 회귀 테스트.
 *
 * 제보(2026-08-23): 로딩 후 **첫 트릭**에 사람 패가 저절로 나갔고, 그 뒤에
 * 'AI 준비 완료' 팝업이 떴으며 이후 트릭은 정상이었다.
 *
 * 원인 경로: 시트(바닥패·프렌드)나 모달이 닫히는 순간 그 자리에 손패가 들어온다.
 * click만 보고 착수하면 직전 탭이 만든 '유령 클릭'을 카드가 그대로 받는다.
 * 주공은 프렌드 지정 직후가 곧 첫 리드라 그 한 탭이 첫 트릭 착수가 된다.
 *
 * 불변식: **그 카드 위에서 시작한 포인터**만 착수가 된다.
 *   1) pointerdown 없는 click(유령 클릭)은 무시된다
 *   2) 다른 요소에서 시작한 포인터의 click도 무시된다
 *   3) 정상 탭(pointerdown → click)은 즉시 착수된다 — 시간 지연이 없어야 한다
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
    // jsdom에는 PointerEvent가 없다 — 실제 브라우저와 같은 순서로 흉내낸다.
    if (!window.PointerEvent) window.PointerEvent = window.MouseEvent;
  },
});
const w = dom.window;
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  await sleep(200);
  const MUI = w.MUI;
  if (!MUI) { console.error('FAIL: MUI handle missing'); process.exit(1); }
  MUI.settings.ui.difficulty = 'intermediate';
  MUI.settings.match.mode = 'rounds';
  MUI.settings.match.rounds = 12;
  MUI.settings.ui.speed = 'fast';
  MUI.newMatch();
  await sleep(150);

  // 사람 차례의 플레이 단계까지 간다
  for (let i = 0; i < 2000; i++) {
    await sleep(30);
    const g = MUI.game; if (!g) continue;
    if (g.phase === 'play' && g.currentPlayer === 0 && !MUI.busy) break;
    if (g.phase === 'redeal') continue;
    if (g.phase === 'done') { const nb = w.document.querySelector('#next-btn'); if (nb) nb.click(); continue; }
    if (MUI.busy || g.currentPlayer !== 0) continue;
    if (g.phase === 'bidding') { const b = g.legalActions().filter(a => a.type === 'bid');
      MUI.humanAct(b.length ? b[b.length - 1] : { type: 'pass' }); }
    else if (g.phase === 'floor') MUI.humanAct({ type: 'exchange', discard: g.hands[0].slice(0, 3) });
    else if (g.phase === 'friend') MUI.humanAct({ type: 'friend', mode: 'first' });
    else if (g.phase === 'dealMissWindow') MUI.humanAct({ type: 'proceed' });
  }
  const g = MUI.game;
  if (!g || g.phase !== 'play' || g.currentPlayer !== 0) {
    console.error('FAIL: 사람 착수 차례에 도달하지 못했다 — phase ' + (g && g.phase)); process.exit(1);
  }
  const card = () => w.document.querySelector('#hand .hcard.legal');
  if (!card()) { console.error('FAIL: 낼 수 있는 카드가 렌더되지 않았다'); process.exit(1); }
  const hand = () => MUI.game.hands[0].length;

  // 1) 유령 클릭 — pointerdown 없이 click만
  {
    const before = hand();
    card().dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
    await sleep(250);
    console.log(`유령 클릭(pointerdown 없음): 손패 ${before} → ${hand()}`);
    ok(hand() === before, `pointerdown 없는 click에 카드가 나갔다 (${before} → ${hand()})`);
  }

  // 2) 다른 요소에서 시작한 포인터
  {
    const before = hand();
    const other = w.document.querySelector('#log') || w.document.body;
    other.dispatchEvent(new w.PointerEvent('pointerdown', { bubbles: true }));
    card().dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
    await sleep(250);
    console.log(`다른 곳에서 시작한 탭: 손패 ${before} → ${hand()}`);
    ok(hand() === before, `다른 요소에서 시작한 포인터의 click에 카드가 나갔다 (${before} → ${hand()})`);
  }

  // 3) 정상 탭 — 지연 없이 바로 나가야 한다
  {
    const before = hand();
    const c = card();
    c.dispatchEvent(new w.PointerEvent('pointerdown', { bubbles: true }));
    c.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
    await sleep(400);
    console.log(`정상 탭(pointerdown → click): 손패 ${before} → ${hand()}`);
    ok(hand() === before - 1, `정상 탭인데 카드가 안 나갔다 (${before} → ${hand()}) — 유예가 과하다`);
  }

  console.log(pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('FAIL:', e && e.stack); process.exit(1); });
