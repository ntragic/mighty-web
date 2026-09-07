const __path = require('path');
const __P = p => __path.join(__dirname, p);
'use strict';
/* 용어 툴팁·미니 사전 회귀 — 초보자 모드에서만 밑줄이 붙고, 눌러서 뜻이 뜨고,
 * 사전을 닫은 것이 튜토리얼을 본 것으로 기록되지 않아야 한다(패널을 함께 쓴다). */
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
const click = el => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));

(async () => {
  await sleep(200);
  const MUI = w.MUI;
  if (!MUI) { console.error('MUI handle missing'); process.exit(1); }

  // ---------- 1. 용어 자료 ----------
  const T = w.MightyTutorial;
  const ko = T.terms('ko'), en = T.terms('en');
  ok(ko.length >= 15 && en.length >= 15, '한·영 용어가 15개 이상', `ko=${ko.length} en=${en.length}`);
  ok(ko.every(x => x.k && x.d && Array.isArray(x.m) && x.m.includes(x.k)),
     '표제어·뜻풀이·매칭어가 모두 채워짐');
  ok(ko[0].k.length >= ko[ko.length - 1].k.length, '긴 표제어가 앞에 온다 (노기루다 > 기루다)');
  const noTrump = ko.findIndex(x => x.k === '노기루다'), trump = ko.findIndex(x => x.k === '기루다');
  ok(noTrump >= 0 && trump >= 0 && noTrump < trump, "'노기루다'가 '기루다'보다 먼저 매칭된다",
     `노기루다=${noTrump} 기루다=${trump}`);

  // ---------- 2. 밑줄은 초보자 모드에서만 ----------
  ok(MUI.settings.ui.beginner === true, '첫 실행이라 초보자 모드');
  const marked = MUI.withTerms('기루다는 판마다 정해진다');
  ok(/<button class="term" data-term="기루다">기루다<\/button>/.test(marked),
     '초보자 모드에서 용어에 밑줄', marked);
  const twice = MUI.withTerms('기루다와 기루다');
  ok((twice.match(/class="term"/g) || []).length === 1,
     '한 문단에 같은 용어는 한 번만 표시', twice);
  const longFirst = MUI.withTerms('노기루다 공약');
  ok(/data-term="노기루다"/.test(longFirst), "'노기루다'가 통째로 잡힌다", longFirst);
  const escaped = MUI.withTerms('<b>기루다</b>');
  ok(escaped.startsWith('&lt;b&gt;'), '평문의 꺾쇠는 이스케이프된다', escaped.slice(0, 20));

  MUI.settings.ui.beginner = false;
  ok(!/class="term"/.test(MUI.withTerms('기루다는 판마다 정해진다')),
     '초보자 모드가 아니면 밑줄이 없다');
  MUI.settings.ui.beginner = true;

  // ---------- 3. 실제 화면에서 눌러 뜻이 뜬다 ----------
  MUI.openSettings();
  MUI.settings.match.mode = 'rounds';
  MUI.settings.match.rounds = 1;
  MUI.settings.ui.speed = 'fast';
  MUI.settings.ui.coach = true;
  $('#set-done').click();
  $('#start-btn').click();
  await waitFor(() => MUI.game && MUI.game.phase === 'bidding'
    && MUI.game.currentPlayer === 0 && !MUI.busy && $('#sheet').classList.contains('show'));
  const termBtn = $('#sheet .coach-note .term');
  ok(!!termBtn, '조언 상자 안에 누를 수 있는 용어가 있다');
  if (termBtn) {
    click(termBtn);
    ok($('#termpop').classList.contains('show'), '용어를 누르면 뜻풀이가 뜬다');
    ok($('#termpop .td').textContent.length > 5, '뜻풀이 본문이 채워짐',
       $('#termpop .td').textContent.slice(0, 30));
    ok(MUI.game.phase === 'bidding' && !MUI.busy,
       '용어를 눌러도 그 아래 칩이 눌리지 않는다 (캡처 단계에서 가로챈다)');
  }

  // ---------- 4. 뜻풀이에서 전체 사전으로 ----------
  const all = $('#term-all');
  ok(!!all, '뜻풀이에 전체 용어 보기 링크');
  if (all) {
    click(all);
    ok($('#tut').classList.contains('show'), '전체 사전이 열림');
    ok(MUI.tutMode === 'terms', '사전 모드로 열림', MUI.tutMode);
    ok($('#tut-title').textContent.trim() === '용어 사전', '패널 제목이 용어 사전');
    ok(doc.querySelectorAll('#tut-body .gl-row').length === ko.length,
       '용어가 전부 나열됨', '' + doc.querySelectorAll('#tut-body .gl-row').length);
    ok($('#tut-dots').children.length === 0, '사전에는 슬라이드 진행 점이 없다');
    ok($('#tut-next').textContent.trim() === '닫기', '사전 버튼은 닫기');
  }

  ok(!$('#termpop').classList.contains('show'),
     '사전을 열면 뜻풀이 말풍선은 닫힌다 — 패널 위에 남으면 안 된다');

  // ---------- 5. 사전을 닫은 것은 튜토리얼을 본 것이 아니다 ----------
  MUI.settings.ui.tutorialDone = false;
  $('#tut-next').click();
  ok(!$('#tut').classList.contains('show'), '사전이 닫힘');
  ok(MUI.settings.ui.tutorialDone === false,
     '사전을 닫아도 튜토리얼 시청 기록은 그대로', 'done=' + MUI.settings.ui.tutorialDone);
  ok(MUI.tutMode === 'slides', '닫으면 슬라이드 모드로 돌아온다', MUI.tutMode);

  // ---------- 6. 설정 진입점 ----------
  MUI.openSettings();
  await sleep(80);
  ok(!!$('#set-gloss-btn'), '설정에 용어 사전 버튼');
  $('#set-gloss-btn').click();
  ok($('#tut').classList.contains('show') && MUI.tutMode === 'terms', '설정에서 사전 열림');
  ok(!$('#settings').classList.contains('show'), '설정 패널은 겹치지 않게 닫힘');
  $('#tut-close').click();

  console.log(failed ? `GLOSSARY TEST FAIL (${failed})` : 'GLOSSARY TEST PASS');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
