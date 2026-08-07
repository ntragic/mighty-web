const __path = require('path');
const __P = p => __path.join(__dirname, p);
'use strict';
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
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  await sleep(100);
  const MUI = w.MUI;
  if (!MUI) { console.error('MUI handle missing'); process.exit(1); }

  // 설정 변경: 표준 룰(최소 13) + 1판 매치 + 빠른 속도
  MUI.openSettings();
  MUI.settings.engine.minBid = 13;
  MUI.settings.engine.noGirudaBidDiscount = 1;
  MUI.settings.match.mode = 'rounds';
  MUI.settings.match.rounds = 1;
  MUI.settings.ui.speed = 'fast';
  w.document.querySelector('#set-done').click();
  // 게임 시작
  w.document.querySelector('#start-btn').click();
  console.log('started, phase =', MUI.game.phase, '/ minBid =', MUI.game.config.minBid);
  if (MUI.game.config.minBid !== 13) { console.error('settings not applied'); process.exit(1); }

  const t0 = Date.now();
  let humanActs = 0, guard = 0;
  while (Date.now() - t0 < 120000) {
    await sleep(120);
    const g = MUI.game;
    if (!g) continue;
    if (g.phase === 'done') break;
    // 세팅(전승 확정) 팝업 처리
    const md = w.document.querySelector('#modal');
    if (md && md.classList.contains('show')) {
      const box = w.document.querySelector('#modal-box').textContent;
      const btns = [...w.document.querySelectorAll('#modal-box .btn')];
      if (box.includes('세팅') || box.includes('Claim')) {
        const b = btns.find(x => x.textContent === '자동 진행' || x.textContent === 'Auto-play');
        if (b) { b.click(); await sleep(150); continue; }
      }
      if (box.includes('딜미스 선언 가능') || box.includes('Misdeal available')) {
        const b = btns.find(x => x.textContent === '이 패로 진행' || x.textContent === 'Play this hand');
        if (b) { b.click(); await sleep(150); continue; }
      }
    }
    if (g.phase === 'redeal') continue; // 자동 재딜 대기
    if (MUI.busy) continue;
    if (g.currentPlayer !== 0) continue;

    // 사람 차례 자동 대행
    if (g.phase === 'bidding') {
      MUI.humanAct({ type: 'pass' }); humanActs++;
    } else if (g.phase === 'floor') {
      const hand = g.hands[0].slice(0, 3);
      MUI.humanAct({ type: 'exchange', discard: hand }); humanActs++;
    } else if (g.phase === 'friend') {
      MUI.humanAct({ type: 'friend', mode: 'card', card: g.mightyCard }); humanActs++;
    } else if (g.phase === 'play') {
      const legal = g._legalPlays(0);
      let mv = legal.find(m => !m.jokerSuit && !m.jokerCall) || legal[0];
      // v2.2: 코칭 근거 생성기 — 합법 수에 대해 1~3줄의 문자열을 내야 한다
      for (const gf of [false, true]) {
        const rs = MUI.coachReasons(g, { type: 'play', ...mv }, gf);
        if (!Array.isArray(rs) || rs.length < 1 || rs.length > 3 || rs.some(s => typeof s !== 'string' || !s)) {
          console.error('coachReasons invalid:', JSON.stringify(rs)); process.exit(1);
        }
      }
      await MUI.playWithAnimation(0, { type: 'play', ...mv }); humanActs++;
    }
    if (++guard > 300) { console.error('guard tripped'); process.exit(1); }
  }

  const g = MUI.game;
  if (g.phase !== 'done') { console.error('round did not finish, phase =', g.phase); process.exit(1); }
  console.log('round finished. result:', JSON.stringify({
    declarer: g.result.declarer, friend: g.result.friend,
    contract: g.result.contract, yeodang: g.result.yeodangPoints,
    win: g.result.win, prize: g.result.prize, prizes: g.result.prizes,
  }));

  // 정산 모달 표시 확인 (트릭 연출 종료 대기) + 다음 판
  const modal = w.document.querySelector('#modal');
  for (let i = 0; i < 50 && !modal.classList.contains('show'); i++) await sleep(120);
  if (!modal.classList.contains('show')) { console.error('settlement modal not shown'); process.exit(1); }
  const rows = w.document.querySelectorAll('#modal-box table tr').length;
  console.log('settlement table rows:', rows, '(expect 6)');
  const btnLabel = w.document.querySelector('#next-btn').textContent;
  console.log('settlement button:', btnLabel, '(expect 최종 결과 보기)');
  if (!MUI.matchOver) { console.error('match should be over after 1 round'); process.exit(1); }
  // v2: AI 복기 버튼·분석 모듈·코칭 토글 존재 확인
  if (!w.document.querySelector('#ai-rv-btn')) { console.error('AI review button missing'); process.exit(1); }
  if (!w.MightyAnalysis || typeof w.MightyAnalysis.analyzeRound !== 'function') {
    console.error('MightyAnalysis missing'); process.exit(1);
  }
  console.log('AI review button + analysis module present');
  // v2: 코칭 토글이 설정에 있고 기본 OFF, 손패에 코칭 마킹용 data-cid 존재
  if (MUI.settings.ui.coach !== false) { console.error('coach should default off'); process.exit(1); }
  MUI.openSettings();
  await sleep(80);
  if (!w.document.body.textContent.includes('코칭')) { console.error('coach toggle missing in settings'); process.exit(1); }
  console.log('coach toggle present, default off');
  w.document.querySelector('#next-btn').click();
  await sleep(200);
  const ranks = w.document.querySelectorAll('.rank-row').length;
  console.log('final ranking rows:', ranks, '(expect 5)');
  if (ranks !== 5) { console.error('final modal missing'); process.exit(1); }
  // v2 P4: 매치 AI 요약 버튼 + 누적 통계 반영
  if (!w.document.querySelector('#final-ai')) { console.error('match summary button missing'); process.exit(1); }
  if (!MUI.lifeStats || MUI.lifeStats.rounds < 1) { console.error('life stats not updated'); process.exit(1); }
  if (!w.document.body.textContent.includes('누적')) { console.error('stats line missing in final'); process.exit(1); }
  console.log('match summary button + life stats present (rounds=' + MUI.lifeStats.rounds + ')');
  w.document.querySelector('#rematch-btn').click();
  await sleep(300);
  console.log('rematch: phase =', MUI.game.phase, '/ human acts =', humanActs);

  // DOM 상태 점검
  const backs1 = w.document.querySelectorAll('#backs-1 .mini').length;
  console.log('seat1 card backs rendered:', backs1);
  console.log('log entries:', w.document.querySelectorAll('#log-list li').length);
  console.log('SMOKE TEST PASS');
  process.exit(0);
})().catch(e => { console.error('SMOKE TEST FAIL:', e); process.exit(1); });
