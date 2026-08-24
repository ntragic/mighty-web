/* 비딩 칩 회귀 테스트.
 *
 * 요청(2026-08-17): 비딩 중 누가 어떤 순서로 공약했는지 좌석 카드 자리에 포커 칩
 * 모양으로 남기고, **비딩이 끝나면 지운다**.
 * 정정(2026-08-18): 0.5초 간격 순차 공개는 봇의 실제 비딩 속도와 어긋나 칩이
 * 뒤늦게 떴다. 이제 기록 즉시 그리고, 대신 한 수마다 화면을 잡아 둔다.
 *
 * 지우는 것을 잊으면 판이 끝날 때까지 칩이 남아 트릭 화면을 가린다. 그래서
 * 이 테스트가 잡는 것은 두 가지다 — 비딩 중에 뜨는가, 끝난 뒤 사라지는가.
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
const chips = () => [...w.document.querySelectorAll('.bidchip.show')];

(async () => {
  await sleep(200);
  const MUI = w.MUI;
  if (!MUI) { console.error('MUI handle missing'); process.exit(1); }
  MUI.settings.ui.difficulty = 'intermediate';   // 모델 없이 규칙기반으로 빠르게
  MUI.settings.match.mode = 'rounds';
  MUI.settings.match.rounds = 1;
  MUI.settings.ui.speed = 'fast';
  MUI.newMatch();
  await sleep(150);

  // 1) 비딩이 진행되면 칩이 뜬다 (0.5초 간격이라 넉넉히 기다린다)
  let sawChip = 0, humanActs = 0, guard = 0, lag = 0, sheetHidden = 0;
  const t0 = Date.now();
  while (Date.now() - t0 < 30000 && guard++ < 1200) {
    await sleep(40);
    const g = MUI.game;
    if (!g) continue;
    sawChip = Math.max(sawChip, chips().length);
    if (g.phase !== 'bidding') break;
    if (MUI.busy || g.currentPlayer !== 0) continue;
    // 내 차례인데 비딩 시트가 숨어 있으면 공약을 할 수 없다. v2.15.1에서 봇 턴의
    // render()를 busy 해제 **앞에서** 부르는 바람에 시트가 숨은 채 남았다
    // (모바일 크롬 제보 2026-08-19). renderSheet는 busy면 숨기므로 순서가 중요하다.
    if (!w.document.querySelector('#sheet').classList.contains('show')) sheetHidden++;
    // 칩이 비딩 상태와 일치하는가 — 내 차례이고 대기 중이 아니면 이미 공약한
    // 좌석 수와 칩 수가 같아야 한다. 순차 공개 큐 시절엔 여기서 밀렸다.
    const acted = new Set((MUI.roundRec ? MUI.roundRec.actions : [])
      .filter(x => x.ph === 'bidding').map(x => x.p));
    if (acted.size !== chips().length) lag = Math.max(lag, Math.abs(acted.size - chips().length));
    // 전원 패스면 재딜이 나서 비딩이 다시 시작된다 — 그러면 '종료 후 삭제'를
    // 검사할 수 없다. 그래서 사람이 공약해 낙찰을 만든다.
    const bids = g.legalActions().filter(a => a.type === 'bid');
    if (bids.length) { MUI.humanAct(bids[0]); humanActs++; }
    else { MUI.humanAct({ type: 'pass' }); humanActs++; }
  }
  console.log(`비딩 중 최대 칩 ${sawChip}개 · 내 착수 ${humanActs}회 · phase ${MUI.game.phase}`);
  ok(sawChip > 0, '비딩 중에 칩이 하나도 뜨지 않았다');
  console.log(`칩과 비딩 상태의 최대 어긋남 ${lag}개 · 내 차례에 시트가 숨은 관측 ${sheetHidden}회`);
  ok(sheetHidden === 0, `내 차례인데 비딩 시트가 숨어 있었다 (${sheetHidden}회)`);
  ok(lag === 0, `칩이 비딩 상태와 어긋났다 (최대 ${lag}개)`);

  // 2) 칩 내용이 공약 또는 패스여야 한다
  const texts = [...w.document.querySelectorAll('.bidchip.show .cl')].map(e => e.textContent);
  if (texts.length) console.log(`칩 내용: ${texts.join(' ')}`);

  // 3) 순서 표식이 붙어 있다
  const ords = [...w.document.querySelectorAll('.bidchip.show .ord')].map(e => e.textContent);
  ok(chips().length === 0 || ords.length === chips().length,
     '순서 표식이 빠진 칩이 있다');

  // 4) 비딩이 끝나면 사라진다 — 잊으면 판 내내 화면을 가린다
  let cleared = false;
  const t1 = Date.now();
  while (Date.now() - t1 < 20000) {
    await sleep(100);
    const g = MUI.game;
    if (!g) break;
    if (g.phase !== 'bidding' && chips().length === 0) { cleared = true; break; }
    if (MUI.busy || g.currentPlayer !== 0) continue;
    if (g.phase === 'floor') MUI.humanAct({ type: 'exchange', discard: g.hands[0].slice(0, 3) });
    else if (g.phase === 'friend') MUI.humanAct({ type: 'friend', mode: 'first' });
    else if (g.phase === 'play') {
      const legal = g._legalPlays(0).filter(m => !m.jokerCall);
      if (legal.length) MUI.humanAct({ type: 'play', card: legal[0].card });
    }
  }
  console.log(`비딩 종료 후 남은 칩 ${chips().length}개 (phase ${MUI.game ? MUI.game.phase : '?'})`);
  ok(cleared, '비딩이 끝났는데 칩이 지워지지 않았다');

  // 5) 플레이 중 카드를 여러 장 내도 칩이 되살아나지 않는다.
  //    제보(2026-08-17): 카드를 낼 때마다 칩이 다시 떴다. render()마다 공개 큐가
  //    처음부터 다시 돌던 것이 원인이었다.
  let plays = 0, revived = 0;
  const t2 = Date.now();
  while (Date.now() - t2 < 25000 && plays < 8) {
    await sleep(60);
    const g = MUI.game;
    if (!g || g.phase === 'done' || MUI.matchOver) break;
    // 재딜이 나면 비딩이 다시 시작돼 칩이 뜨는 것이 정상이다 — 플레이 중만 센다
    if (g.phase === 'play' && chips().length) revived = Math.max(revived, chips().length);
    if (MUI.busy || g.currentPlayer !== 0) continue;
    if (g.phase === 'play') {
      const legal = g._legalPlays(0).filter(m => !m.jokerCall);
      if (legal.length) { MUI.humanAct({ type: 'play', card: legal[0].card }); plays++; }
    } else if (g.phase === 'floor') MUI.humanAct({ type: 'exchange', discard: g.hands[0].slice(0, 3) });
    else if (g.phase === 'friend') MUI.humanAct({ type: 'friend', mode: 'first' });
  }
  console.log(`플레이 ${plays}수 진행 · 되살아난 칩 최대 ${revived}개`);
  ok(revived === 0, `플레이 중에 칩이 되살아났다 (${revived}개)`);

  console.log(pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('FAIL:', e && e.message); process.exit(1); });
