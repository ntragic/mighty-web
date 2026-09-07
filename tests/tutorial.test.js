const __path = require('path');
const __P = p => __path.join(__dirname, p);
'use strict';
/* 규칙 튜토리얼 회귀 — 완주·중도 이탈·재진입, 그리고 '봤다'가 기억되는지.
 * 게임 모달(#modal)과 섞지 않는 것이 규율이라 별도 오버레이(#tut)를 쓴다. */
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
const shown = () => $('#tut').classList.contains('show');
const title = () => $('#tut-title').textContent.trim();

(async () => {
  await sleep(200);
  const MUI = w.MUI;
  if (!MUI) { console.error('MUI handle missing'); process.exit(1); }

  // ---------- 1. 슬라이드 자료 ----------
  const T = w.MightyTutorial;
  ok(!!T, '튜토리얼 모듈이 전역에 주입됨');
  const ko = T.slides('ko'), en = T.slides('en');
  ok(ko.length === 8 && en.length === 8, '한·영 슬라이드 8장씩', `ko=${ko.length} en=${en.length}`);
  ok(ko.every(s => s.title && Array.isArray(s.body) && s.body.length),
     '모든 슬라이드에 제목과 본문');
  ok(en.every(s => s.title && Array.isArray(s.body) && s.body.length),
     '영어판도 제목과 본문 완비');
  ok(ko[0].title !== en[0].title, '한국어와 영어가 실제로 다른 문구');
  ok(ko.some(s => s.cards && s.cards.length), '카드 그림이 있는 슬라이드 존재');

  // ---------- 2. 랜딩 진입점 ----------
  ok(MUI.settings.ui.tutorialDone === false, '처음에는 튜토리얼 미시청 상태');
  const tutBtn = $('#tut-btn'), startBtn = $('#start-btn');
  ok(!!tutBtn, '랜딩에 규칙 배우기 버튼');
  ok(tutBtn.className.includes('primary') && startBtn.className.includes('ghost'),
     '미시청 초보자에게는 규칙 배우기가 주 버튼',
     `tut=${tutBtn.className} start=${startBtn.className}`);

  // ---------- 3. 열고 넘기기 ----------
  tutBtn.click();
  ok(shown(), '규칙 배우기 버튼으로 열림');
  ok(title() === ko[0].title, '첫 슬라이드부터 시작', title());
  ok($('#tut-prev').disabled === true, '첫 장에서 이전 버튼 비활성');
  ok(doc.querySelectorAll('#tut-dots .tut-dot').length === 8, '진행 점 8개');
  ok($('#tut-next').textContent.trim() === '다음', '첫 장 버튼은 다음');

  // 카드가 있는 슬라이드로 이동해 실제로 그려지는지 본다
  $('#tut-next').click();
  ok(title() === ko[1].title, '다음 버튼으로 두 번째 슬라이드');
  ok(doc.querySelectorAll('#tut-body .tut-cards .cardface').length === ko[1].cards.length,
     '카드 그림이 실제로 렌더됨',
     '렌더=' + doc.querySelectorAll('#tut-body .tut-cards .cardface').length);
  ok(doc.querySelectorAll('#tut-body .tut-cards .cardface.win').length === 0,
     '점수카드 슬라이드에는 승자 강조가 없다');
  $('#tut-next').click();
  ok(doc.querySelectorAll('#tut-body .tut-cards .cardface.win').length === 1,
     '트릭 슬라이드는 이긴 카드 한 장을 강조',
     '강조=' + doc.querySelectorAll('#tut-body .tut-cards .cardface.win').length);
  $('#tut-prev').click(); $('#tut-prev').click();
  ok(title() === ko[0].title, '이전 버튼으로 되돌아감');

  // ---------- 4. 중도 이탈도 '봤다'로 친다 ----------
  $('#tut-close').click();
  ok(!shown(), '닫기 버튼으로 닫힘');
  ok(MUI.settings.ui.tutorialDone === true, '중도 이탈도 시청 기록에 남음');
  ok($('#tut-btn').className.includes('ghost') && $('#start-btn').className.includes('primary'),
     '본 뒤에는 매치 시작이 주 버튼으로 복귀',
     `tut=${$('#tut-btn').className} start=${$('#start-btn').className}`);

  // ---------- 5. 재진입과 완주 ----------
  MUI.openTutorial();
  ok(shown() && title() === ko[0].title, '다시 열면 첫 장부터');
  for (let i = 0; i < 7; i++) $('#tut-next').click();
  ok(title() === ko[7].title, '마지막 슬라이드 도달', title());
  ok($('#tut-next').textContent.trim() === '시작하기', '마지막 장 버튼은 시작하기');
  $('#tut-next').click();
  ok(!shown(), '완주하면 닫힘');

  // ---------- 6. 설정에서도 다시 볼 수 있다 ----------
  MUI.openSettings();
  await sleep(80);
  const setTut = $('#set-tut-btn');
  ok(!!setTut, '설정에 튜토리얼 다시 보기 버튼');
  setTut.click();
  ok(shown(), '설정에서 튜토리얼 열림');
  ok(!$('#settings').classList.contains('show'), '설정 패널은 겹치지 않게 닫힘');
  $('#tut-close').click();

  console.log(failed ? `TUTORIAL TEST FAIL (${failed})` : 'TUTORIAL TEST PASS');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
