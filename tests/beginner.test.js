const __path = require('path');
const __P = p => __path.join(__dirname, p);
'use strict';
/* 초보자 모드 회귀 — 처음 온 사람에게 기본으로 켜지고, 켜면 안내 묶음이 한 번에
 * 걸리며, 플레이 국면 버블 맨 앞에 규칙 한 줄이 붙는다. 끄면 그 줄만 사라지고
 * 나머지 조언은 남는다(코칭과 초보자 모드는 다른 스위치다). */
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
const RULE = /(내가 리드|반드시 따라야|리드 무늬가 없습니다)/;
const tipLines = () => {
  const tip = $('#coach-tip');
  return tip ? [...tip.children].map(d => d.textContent.trim()) : [];
};
function setSegRow(labelRe, optionText) {
  const rows = [...doc.querySelectorAll('#set-body .set-row')];
  const row = rows.find(r => labelRe.test(r.querySelector('.lbl').textContent));
  if (!row) return false;
  const btn = [...row.querySelectorAll('.seg button')].find(b => b.textContent.trim() === optionText);
  if (!btn) return false;
  btn.click();
  return true;
}

(async () => {
  await sleep(200);
  const MUI = w.MUI;
  if (!MUI) { console.error('MUI handle missing'); process.exit(1); }

  // ---------- 1. 첫 실행 기본값 ----------
  const S = MUI.settings;
  ok(S.ui.beginner === true, '기록이 없는 첫 실행에서 초보자 모드 기본 켬', 'beginner=' + S.ui.beginner);
  ok(S.ui.coach === true, '초보자 묶음 — 코칭 켬');
  ok(S.ui.undo === true, '초보자 묶음 — 되돌리기 켬');
  ok(S.ui.speed === 'slow', '초보자 묶음 — 느린 진행', 'speed=' + S.ui.speed);
  ok(S.ui.difficulty === 'intermediate', '초보자 묶음 — 중급 난이도', 'tier=' + S.ui.difficulty);

  // ---------- 2. 랜딩 진입점 ----------
  const landRows = [...doc.querySelectorAll('#landing-opts .land-row')];
  const landBeginner = landRows.find(r => /초보자 모드/.test(r.querySelector('.land-lbl').textContent));
  ok(!!landBeginner, '랜딩에 초보자 모드 선택 노출');
  ok(!!$('#landing-opts .land-note'), '랜딩에 초보자 모드 설명 한 줄');

  // ---------- 3. 플레이 국면 규칙 줄 ----------
  MUI.openSettings();
  MUI.settings.match.mode = 'rounds';
  MUI.settings.match.rounds = 1;
  MUI.settings.ui.speed = 'fast';        // 검사 시간 단축 — 묶음 확인은 이미 끝났다
  $('#set-done').click();
  $('#start-btn').click();

  await waitFor(() => MUI.game && MUI.game.phase === 'bidding'
    && MUI.game.currentPlayer === 0 && !MUI.busy);
  MUI.humanAct({ type: 'bid', count: 20, giruda: 'S' }, '');
  await waitFor(() => MUI.game && MUI.game.phase === 'floor' && MUI.game.currentPlayer === 0 && !MUI.busy);
  MUI.humanAct({ type: 'exchange', discard: MUI.game.hands[0].slice(0, 3) }, '');
  await waitFor(() => MUI.game && MUI.game.phase === 'friend' && MUI.game.currentPlayer === 0 && !MUI.busy);
  MUI.humanAct({ type: 'friend', mode: 'first' }, '');

  // 모델 로드가 걸려 있으면 봇 진행이 늦다 — 부하가 걸린 기계에서 30초로는 모자랐다.
  const gotPlay = await waitFor(() => MUI.game && MUI.game.phase === 'play'
    && MUI.game.currentPlayer === 0 && !MUI.busy && tipLines().length > 0, 90000);
  ok(gotPlay, '플레이 국면 근거 버블 도달');
  const lines = tipLines();
  ok(RULE.test(lines[0] || ''), '초보자 모드에서 규칙 한 줄이 맨 앞',
     JSON.stringify(lines.slice(0, 2)));
  ok(lines.length > 1, '규칙 줄 뒤에 원래 근거도 남음', 'lines=' + lines.length);

  // ---------- 4. 끄면 규칙 줄만 사라진다 ----------
  MUI.openSettings();
  ok(setSegRow(/초보자 모드/, '끔'), '설정에 초보자 모드 항목 존재');
  $('#set-done').click();
  await waitFor(() => tipLines().length > 0 && !RULE.test(tipLines()[0] || ''), 30000);
  const off = tipLines();
  ok(MUI.settings.ui.beginner === false, '초보자 모드 꺼짐');
  ok(off.length > 0 && !RULE.test(off[0]), '끄면 규칙 줄 사라짐', JSON.stringify(off.slice(0, 2)));
  ok(MUI.settings.ui.coach === true, '초보자 모드를 꺼도 코칭은 남는다 — 다른 스위치다');

  console.log(failed ? `BEGINNER TEST FAIL (${failed})` : 'BEGINNER TEST PASS');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
