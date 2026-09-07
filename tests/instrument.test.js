/* 기록 계측(instrument)이 복제본에 딸려가지 않는가.
 *
 * 제보(2026-08-24): 복기 진입 시 rebuildGame이 `illegal play`로 죽고, 플레이 중에는
 * 패가 저절로 나간다.
 *
 * 뿌리는 하나였다. instrument()가 `g.act`를 **원본에 바인딩된 화살표 함수**로,
 * 그것도 열거 가능한 자기 속성으로 덮어썼다. 탐색(PIMC)과 AI 복기는
 * `Object.keys(g)`를 훑어 시뮬레이션 판을 만드는데 함수는 그대로 복사되므로,
 * 시뮬레이션의 `sim.act()`가 **원본 판을 움직이고 기록에 가짜 액션을 쌓았다**.
 * 그 기록으로 복기를 열면 되먹이다 불법 착수에서 터진다.
 *
 * 불변식 셋:
 *   1) 계측 속성은 열거되지 않는다 — 복제본이 가져가지 않는다
 *   2) 복제본에 착수해도 기록이 늘지 않는다
 *   3) 복제본에 착수해도 원본 판이 움직이지 않는다
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

(async () => {
  await sleep(200);
  const MUI = w.MUI;
  if (!MUI) { console.error('FAIL: MUI handle missing'); process.exit(1); }
  MUI.settings.ui.difficulty = 'intermediate';
  MUI.settings.match.mode = 'rounds';
  MUI.settings.match.rounds = 6;
  MUI.settings.ui.speed = 'fast';
  MUI.newMatch();
  await sleep(150);

  // 플레이 단계까지 진행 — 계측된 game이 필요하다
  for (let i = 0; i < 2500; i++) {
    await sleep(20);
    const g = MUI.game; if (!g) continue;
    if (g.phase === 'play') break;
    if (g.phase === 'redeal') continue;
    if (MUI.busy || g.currentPlayer !== 0) continue;
    if (g.phase === 'bidding') { const b = g.legalActions().filter(a => a.type === 'bid');
      MUI.humanAct(b.length ? b[b.length - 1] : { type: 'pass' }); }
    else if (g.phase === 'floor') MUI.humanAct({ type: 'exchange', discard: g.hands[0].slice(0, 3) });
    else if (g.phase === 'friend') MUI.humanAct({ type: 'friend', mode: 'card', card: g.mightyCard });
    else if (g.phase === 'dealMissWindow') MUI.humanAct({ type: 'proceed' });
  }
  const g = MUI.game;
  if (!g || g.phase !== 'play') { console.error('FAIL: 플레이 단계 진입 실패 — phase ' + (g && g.phase)); process.exit(1); }

  // 1) 계측 속성이 열거되지 않는다
  const keys = Object.keys(g);
  console.log(`Object.keys에 act 포함: ${keys.includes('act')} · __inst 포함: ${keys.includes('__inst')}`);
  ok(!keys.includes('act'), 'act가 열거 가능한 자기 속성이다 — 복제본이 그대로 가져간다');
  ok(!keys.includes('__inst'), '__inst가 열거 가능하다 — 복제본이 계측된 것으로 오인된다');

  // 2·3) mighty-ai.js의 cloneGameState와 같은 방식으로 복제해 착수해 본다
  const clone = src => {
    const c = Object.create(Object.getPrototypeOf(src));
    for (const k of Object.keys(src)) {
      const v = src[k];
      // jsdom에는 structuredClone이 없다 — 깊은 복사만 같으면 되므로 JSON으로 대체한다
      c[k] = (typeof v === 'object' && v !== null) ? JSON.parse(JSON.stringify(v)) : v;
    }
    return c;
  };
  const sim = clone(g);
  const recBefore = MUI.roundRec.actions.length;
  const turnBefore = g.play.turn, tableBefore = g.play.table.length;
  const mv = sim._legalPlays(sim.play.turn).filter(m => !m.jokerCall)[0];
  sim.act({ type: 'play', card: mv.card, jokerSuit: mv.jokerSuit });
  const recAfter = MUI.roundRec.actions.length;

  console.log(`시뮬 착수 후 — 기록 ${recBefore} → ${recAfter} · ` +
              `원본 turn ${turnBefore} → ${g.play.turn} · 테이블 ${tableBefore} → ${g.play.table.length}`);
  ok(recAfter === recBefore,
     `시뮬레이션 착수가 기록에 남았다 (${recBefore} → ${recAfter}) — 복기가 불법 착수로 죽는다`);
  ok(g.play.turn === turnBefore && g.play.table.length === tableBefore,
     `시뮬레이션 착수가 원본 판을 움직였다 (turn ${turnBefore}→${g.play.turn}, ` +
     `테이블 ${tableBefore}→${g.play.table.length}) — 패가 저절로 나간다`);

  // 4) 시뮬레이션은 자기 자신에게는 정상 작용해야 한다(탐색이 못 굴러가면 안 된다)
  ok(sim.play.table.length === tableBefore + 1,
     '복제본 자신에게 착수가 반영되지 않았다 — 탐색이 굴러가지 않는다');

  // 5) 엔진이 거부한 수는 기록에 남지 않아야 한다. 남으면 되돌리기가 그 기록을
  //    재생하다 같은 자리에서 다시 던지고, 재생은 try로 감싸이지 않아 판이 멈춘다.
  //    (turnrace 스트레스에서 'illegal play: 조커' 로 재현됐다)
  const recBeforeBad = MUI.roundRec.actions.length;
  try { g.act({ type: 'play', card: { suit: 'S', rank: 99 } }); } catch (e) { /* 거부가 정상 */ }
  ok(MUI.roundRec.actions.length === recBeforeBad,
     `거부당한 수가 기록에 남았다 (${recBeforeBad} → ${MUI.roundRec.actions.length}) — ` +
     '되돌리기가 그 기록을 재생하다 죽는다');

  console.log(pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('FAIL:', e && e.stack); process.exit(1); });
