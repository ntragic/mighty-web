const __path = require('path');
const __P = p => __path.join(__dirname, p);
'use strict';
/* 국면별 조언 회귀 — 코칭을 켜면 비딩·바닥패·프렌드·플레이 네 국면 모두에서
 * 추천과 근거가 보여야 한다. 마스터 모델이 없는 환경(jsdom)에서 도는 것이
 * 이 테스트의 핵심이다 — 규칙기반 폴백이 죽으면 초보자는 아무 안내도 못 받는다. */
const { JSDOM } = require('jsdom');
const fs = require('fs');

const html = fs.readFileSync(__P('../web/index.html'), 'utf8');
const dom = new JSDOM(html, {
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  beforeParse(window) {
    window.matchMedia = q => ({ matches: true, media: q, addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){} });
    Object.defineProperty(window.navigator, 'language', { value: 'ko-KR' });
  },
});
const w = dom.window;
const doc = w.document;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const $ = s => doc.querySelector(s);

let failed = 0;
function ok(cond, label, extra) {
  if (cond) console.log('  PASS ' + label);
  else { console.error('  FAIL ' + label + (extra ? ' — ' + extra : '')); failed++; }
}
async function waitFor(pred, ms = 30000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { if (pred()) return true; await sleep(60); }
  return false;
}
// 시트가 감춰져 있으면 조언도 보이지 않는 것으로 친다
const noteText = () => {
  const sh = $('#sheet');
  if (!sh.classList.contains('show')) return '';
  const n = sh.querySelector('.coach-note');
  return n ? n.textContent.trim() : '';
};
const coachCards = () => doc.querySelectorAll('#hand .hcard.coach').length;
const recChips = () => doc.querySelectorAll('#sheet .chip.rec, #sheet .btn.rec').length;

(async () => {
  await sleep(150);
  const MUI = w.MUI;
  if (!MUI) { console.error('MUI handle missing'); process.exit(1); }

  MUI.openSettings();
  MUI.settings.match.mode = 'rounds';
  MUI.settings.match.rounds = 1;
  MUI.settings.ui.speed = 'fast';
  MUI.settings.ui.coach = true;          // 조언이 이 테스트의 대상이다
  $('#set-done').click();
  $('#start-btn').click();

  // ---------- 1. 비딩 ----------
  const gotBid = await waitFor(() => MUI.game && MUI.game.phase === 'bidding'
    && MUI.game.currentPlayer === 0 && !MUI.busy && $('#sheet').classList.contains('show'));
  ok(gotBid, '비딩 국면에서 내 차례 도달');
  const bidNote = noteText();
  ok(/추천/.test(bidNote), '비딩 조언 상자 표시', JSON.stringify(bidNote.slice(0, 60)));
  ok(/공약은 우리 편이 가져올 점수카드 수/.test(bidNote), '비딩 규칙 설명 포함');
  ok(recChips() > 0, '비딩 추천 항목 강조', 'rec=' + recChips());

  // 주공이 되어야 바닥패·프렌드 국면을 볼 수 있다 — 최대 공약으로 확정한다
  MUI.humanAct({ type: 'bid', count: 20, giruda: 'S' }, '');

  // ---------- 2. 바닥패 ----------
  const gotFloor = await waitFor(() => MUI.game && MUI.game.phase === 'floor'
    && MUI.game.currentPlayer === 0 && !MUI.busy && $('#sheet').classList.contains('show'));
  ok(gotFloor, '바닥패 국면 도달');
  const floorNote = noteText();
  ok(/묻기/.test(floorNote), '바닥패 조언 상자 표시', JSON.stringify(floorNote.slice(0, 60)));
  ok(coachCards() === 3, '묻을 3장이 손패에 표시', '표시=' + coachCards());

  MUI.humanAct({ type: 'exchange', discard: MUI.game.hands[0].slice(0, 3) }, '');

  // ---------- 3. 프렌드 ----------
  const gotFriend = await waitFor(() => MUI.game && MUI.game.phase === 'friend'
    && MUI.game.currentPlayer === 0 && !MUI.busy && $('#sheet').classList.contains('show'));
  ok(gotFriend, '프렌드 국면 도달');
  const frNote = noteText();
  ok(/추천/.test(frNote), '프렌드 조언 상자 표시', JSON.stringify(frNote.slice(0, 60)));
  ok(recChips() > 0, '프렌드 추천 항목 강조', 'rec=' + recChips());

  MUI.humanAct({ type: 'friend', mode: 'first' }, '');

  // ---------- 4. 플레이 (모델 없는 규칙기반 폴백) ----------
  const gotPlay = await waitFor(() => MUI.game && MUI.game.phase === 'play'
    && MUI.game.currentPlayer === 0 && !MUI.busy && coachCards() > 0);
  ok(gotPlay, '플레이 국면에서 모델 없이도 추천 카드 표시',
     'masterState=' + MUI.masterState + ' coach=' + coachCards());
  ok(!!$('#coach-tip'), '플레이 근거 버블 표시');

  // ---------- 5. 코칭을 끄면 즉시 사라진다 ----------
  // 설정 화면의 실제 토글을 눌러야 한다 — 필드만 바꾸면 다시 그려지지 않는다.
  MUI.openSettings();
  const rows = [...doc.querySelectorAll('#set-body .set-row')];
  const coachRow = rows.find(r => /코칭/.test(r.querySelector('.lbl').textContent));
  ok(!!coachRow, '설정에 코칭 항목 존재');
  const offBtn = coachRow && [...coachRow.querySelectorAll('.seg button')]
    .find(b => b.textContent.trim() === '끔');
  if (offBtn) offBtn.click();
  $('#set-done').click();
  await sleep(300);
  ok(MUI.settings.ui.coach === false, '코칭 설정 꺼짐');
  ok(coachCards() === 0, '코칭 끄면 손패 표식 사라짐', 'coach=' + coachCards());

  console.log(failed ? `ADVICE TEST FAIL (${failed})` : 'ADVICE TEST PASS');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
