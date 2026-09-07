const __path = require('path');
const __P = p => __path.join(__dirname, p);
'use strict';
/* 연습판 회귀 — 고정 시드가 실제로 '가르칠 수 있는 패'를 내는지가 핵심이다.
 * 권장 공약대로 부르면 사람이 주공이 되어야 바닥패 묻기와 프렌드 지정을 배운다.
 * 그리고 연습 성적은 생애 통계·총점 어디에도 남으면 안 된다. */
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
async function waitFor(pred, ms = 40000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { if (pred()) return true; await sleep(60); }
  return false;
}
const barText = () => ($('#practice').classList.contains('show')
  ? $('#practice-txt').textContent.trim() : '');

// tools/find-practice-seed.js 가 고른 시드의 손패. 이게 달라지면 안내 문구도, 주공이
// 된다는 보장도 함께 무너진다 — 시드나 엔진 딜링이 바뀌면 여기서 먼저 걸린다.
const EXPECTED_HAND = ['C13', 'S12', 'D11', 'S11', 'C14', 'D5', 'D13', 'D14', 'JOKER', 'C12'];

(async () => {
  await sleep(200);
  const MUI = w.MUI, E = w.MightyEngine;
  if (!MUI) { console.error('MUI handle missing'); process.exit(1); }
  MUI.settings.ui.speed = 'fast';

  // ---------- 1. 튜토리얼이 연습판으로 이어진다 ----------
  ok(MUI.settings.ui.beginner === true, '첫 실행이라 초보자 모드');
  MUI.openTutorial();
  for (let i = 0; i < 7; i++) $('#tut-next').click();
  ok($('#tut-next').textContent.trim() === '연습 한 판 해보기',
     '초보자에게는 마지막 장이 연습판으로 이어짐', $('#tut-next').textContent.trim());

  // ---------- 2. 고정 시드 ----------
  $('#tut-next').click();
  const dealt = await waitFor(() => MUI.game && MUI.game.phase === 'bidding');
  ok(dealt, '연습판 딜 완료');
  ok(MUI.practiceOn === true, '연습판 모드 진입');
  const ids = MUI.game.hands[0].map(c => E.cardId(c));
  ok(JSON.stringify(ids) === JSON.stringify(EXPECTED_HAND),
     '고정 시드가 늘 같은 손패를 낸다', JSON.stringify(ids));
  ok(ids.includes('JOKER'), '튜토리얼에서 배운 조커를 실제로 쥐어 준다');

  // ---------- 3. 안내 띠 ----------
  await waitFor(() => MUI.game.currentPlayer === 0 && !MUI.busy);
  ok(/무늬를 고르고/.test(barText()), '비딩 국면 안내 문구', JSON.stringify(barText()));
  ok(/연습판/.test($('#hud-round').textContent), 'HUD가 연습판임을 밝힌다',
     $('#hud-round').textContent.trim());

  // ---------- 4. 권장 공약대로 부르면 주공이 된다 (시드를 고정한 이유) ----------
  MUI.humanAct({ type: 'bid', count: 14, giruda: 'D' }, '');
  const gotFloor = await waitFor(() => MUI.game.phase === 'floor' && MUI.game.currentPlayer === 0 && !MUI.busy);
  ok(gotFloor, '권장 공약 14♦로 주공이 되어 바닥패 국면 도달',
     'phase=' + MUI.game.phase + ' declarer=' + MUI.game.declarer);
  ok(MUI.game.declarer === 0, '사람이 주공');
  ok(/묻을 3장/.test(barText()), '바닥패 국면 안내 문구', JSON.stringify(barText()));

  MUI.humanAct({ type: 'exchange', discard: MUI.game.hands[0].slice(0, 3) }, '');
  const gotFriend = await waitFor(() => MUI.game.phase === 'friend' && MUI.game.currentPlayer === 0 && !MUI.busy);
  ok(gotFriend, '프렌드 국면 도달');
  ok(/프렌드를 부르세요/.test(barText()), '프렌드 국면 안내 문구', JSON.stringify(barText()));
  MUI.humanAct({ type: 'friend', mode: 'card', card: MUI.game.mightyCard }, '');

  // ---------- 5. 네 트릭까지 두면 졸업 안내 ----------
  const inPlay = await waitFor(() => MUI.game && MUI.game.phase === 'play' && MUI.game.play);
  ok(inPlay, '플레이 국면 진입', 'phase=' + (MUI.game && MUI.game.phase));
  let guard = 0;
  while (MUI.game.phase === 'play' && MUI.game.play.history.length < MUI.PRACTICE_TRICKS && guard++ < 60) {
    await waitFor(() => MUI.game.phase !== 'play' || (MUI.game.currentPlayer === 0 && !MUI.busy), 20000);
    if (MUI.game.phase !== 'play') break;
    const legal = MUI.game._legalPlays(0);
    const mv = legal.find(m => !m.jokerSuit && !m.jokerCall) || legal[0];
    await MUI.playWithAnimation(0, { type: 'play', ...mv });
  }
  const tricks = MUI.game.play ? MUI.game.play.history.length : 0;
  ok(tricks >= MUI.PRACTICE_TRICKS || MUI.game.phase === 'done', '네 트릭까지 진행', '트릭=' + tricks);
  if (MUI.game.phase === 'play') {
    await waitFor(() => /규칙은 여기까지/.test(barText()), 10000);
    ok(/규칙은 여기까지/.test(barText()), '네 트릭 뒤 졸업 안내로 바뀜', JSON.stringify(barText()));
  }

  // ---------- 6. 기록에 남지 않는다 ----------
  ok(MUI.lifeStats.rounds === 0, '연습은 생애 통계에 안 남는다', 'rounds=' + MUI.lifeStats.rounds);
  ok(MUI.totals.every(v => v === 0), '연습은 총점에 안 남는다', JSON.stringify(MUI.totals));
  ok(MUI.matchLog.length === 0, '연습은 매치 기록에 안 남는다', 'log=' + MUI.matchLog.length);

  // ---------- 7. 진짜 판으로 넘어간다 ----------
  $('#practice-end').click();
  const started = await waitFor(() => MUI.practiceOn === false && MUI.game && MUI.roundNo === 1);
  ok(started, '연습 끝내기로 진짜 매치 시작', 'practice=' + MUI.practiceOn + ' round=' + MUI.roundNo);
  ok(!$('#practice').classList.contains('show'), '연습 안내 띠가 사라짐');

  console.log(failed ? `PRACTICE TEST FAIL (${failed})` : 'PRACTICE TEST PASS');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
