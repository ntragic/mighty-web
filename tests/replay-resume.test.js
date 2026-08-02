/**
 * 복기 후 게임 재개 회귀 테스트 (v1.2.3).
 * 정산 화면 → 복기 → 닫기 → 정산 화면 복원까지 확인하고,
 * 정산이 두 번 반영돼 총점이 부풀지 않는지 본다.
 */
const __path = require('path');
const __P = p => __path.join(__dirname, p);
'use strict';
const { JSDOM } = require('jsdom');
const fs = require('fs');

const html = fs.readFileSync(__P('../web/index.html'), 'utf8');
const dom = new JSDOM(html, {
  runScripts: 'dangerously', pretendToBeVisual: true,
  beforeParse(window) {
    window.matchMedia = q => ({ matches: true, media: q, addListener(){}, removeListener(){},
                                addEventListener(){}, removeEventListener(){} });
    Object.defineProperty(window.navigator, 'language', { value: 'ko-KR' });
  },
});
const w = dom.window, $ = sel => w.document.querySelector(sel);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const fail = (m) => { console.error('FAIL:', m); process.exit(1); };
const btnByText = (sel, txt) => [...w.document.querySelectorAll(sel)].find(b => b.textContent === txt);

(async () => {
  await sleep(100);
  const MUI = w.MUI;
  if (!MUI) fail('MUI handle missing');

  MUI.openSettings();
  MUI.settings.engine.minBid = 13;
  MUI.settings.engine.noGirudaBidDiscount = 1;
  MUI.settings.match.mode = 'rounds';
  MUI.settings.match.rounds = 3;          // 매치가 끝나지 않게 (정산 → 다음 판 경로 확인)
  MUI.settings.ui.speed = 'fast';
  $('#set-done').click();
  $('#start-btn').click();

  // --- 한 라운드를 끝까지 진행
  const t0 = Date.now();
  let guard = 0;
  while (Date.now() - t0 < 120000) {
    await sleep(120);
    const g = MUI.game;
    if (!g || g.phase === 'redeal') continue;
    if (g.phase === 'done') break;
    const md = $('#modal');
    if (md && md.classList.contains('show')) {
      const box = $('#modal-box').textContent;
      if (box.includes('세팅')) { const b = btnByText('#modal-box .btn','자동 진행'); if (b){ b.click(); await sleep(150); continue; } }
      if (box.includes('딜미스 선언 가능')) { const b = btnByText('#modal-box .btn','이 패로 진행'); if (b){ b.click(); await sleep(150); continue; } }
    }
    if (MUI.busy || g.currentPlayer !== 0) continue;
    if (g.phase === 'bidding') MUI.humanAct({ type:'pass' });
    else if (g.phase === 'floor') MUI.humanAct({ type:'exchange', discard: g.hands[0].slice(0,3) });
    else if (g.phase === 'friend') MUI.humanAct({ type:'friend', mode:'card', card: g.mightyCard });
    else if (g.phase === 'play') {
      const legal = g._legalPlays(0);
      await MUI.playWithAnimation(0, { type:'play', ...(legal.find(m=>!m.jokerSuit&&!m.jokerCall) || legal[0]) });
    }
    if (++guard > 300) fail('guard tripped');
  }
  if (MUI.game.phase !== 'done') fail('round did not finish');

  // --- 정산 화면 표시 대기
  const modal = $('#modal');
  for (let i = 0; i < 60 && !modal.classList.contains('show'); i++) await sleep(120);
  if (!modal.classList.contains('show')) fail('settlement modal not shown');
  const totalsBefore = MUI.totals, logBefore = MUI.matchLog.length;
  console.log('정산 표시. 총점:', JSON.stringify(totalsBefore), '기록:', logBefore);

  // --- 정산 화면의 '복기'로 진입
  const rv = $('#rv-btn'); if (!rv) fail('replay button missing in settlement');
  rv.click(); await sleep(300);
  if (!MUI.replay) fail('replay did not start');
  if (modal.classList.contains('show')) fail('settlement modal should be hidden during replay');
  console.log('복기 진입 확인');

  // --- 복기 바의 '게임으로'로 재개 (이전에는 돌아갈 화면이 없었다)
  const back = btnByText('#replay-bar button', '게임으로');
  if (!back) fail("'게임으로' button missing in replay bar");
  back.click(); await sleep(400);
  if (MUI.replay) fail('replay did not close');
  if (!modal.classList.contains('show')) fail('settlement modal was not restored after replay');
  console.log('복기 종료 후 정산 화면 복원 확인');

  // --- 정산이 두 번 반영되지 않았는지
  const totalsAfter = MUI.totals;
  if (JSON.stringify(totalsAfter) !== JSON.stringify(totalsBefore))
    fail(`totals changed after replay: ${JSON.stringify(totalsBefore)} → ${JSON.stringify(totalsAfter)}`);
  if (MUI.matchLog.length !== logBefore) fail('matchLog double-pushed');
  console.log('총점 중복 반영 없음:', JSON.stringify(totalsAfter));

  // --- 다음 판으로 이어지는지
  const round0 = MUI.roundNo;
  $('#next-btn').click(); await sleep(600);
  if (MUI.roundNo !== round0 + 1) fail(`next round did not start (${round0} → ${MUI.roundNo})`);
  console.log('다음 판 진행 확인:', round0, '→', MUI.roundNo);

  console.log('REPLAY RESUME TEST PASS');
  process.exit(0);
})().catch(e => fail(e && e.stack || e));
