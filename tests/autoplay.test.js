/* 자동 착수 회귀 테스트 — 같은 세대 안에서 봇 루프가 겹치는 경우.
 *
 * 제보(2026-08-23): 로딩 후 **첫 트릭**에 사람 패가 저절로 나갔고, 그 뒤에
 * 'AI 준비 완료' 팝업이 떴으며, 이후 트릭은 정상이었다.
 *
 * 재현 조건: 봇 한 턴이 감시 타이머(WATCHDOG_MS)보다 길면 워치독이 stateGen을
 * 올리고 봇 루프를 새로 깐다. 모델 16MB 로드 + 첫 추론이 그 구간이다.
 * 옛 루프는 다음 가드에서 끝나지만 **끝나면서 busy를 내린다** — 그 busy는 이미
 * 새 루프의 것이다. 뮤텍스가 풀리면 pump가 하나 더 예약되고, 두 루프가 같은
 * 세대 안에 공존한다. 한쪽이 봇 카드를 내 차례를 사람에게 넘긴 직후 다른 쪽이
 * 깨어나면 `game.currentPlayer`가 사람이라 **사람 카드를 낸다**.
 *
 * 불변식: 사람이 humanAct를 부르지 않았는데 사람 손패가 줄어들면 안 된다.
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
  },
});
const w = dom.window;
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  await sleep(200);
  const MUI = w.MUI;
  if (!MUI) { console.error('FAIL: MUI handle missing'); process.exit(1); }

  // 봇 한 좌석의 act를 감시 타이머보다 느리게 만든다 — 모델 로드가 낀 첫 턴을
  // 흉내낸다. createTable을 감싸면 UI 코드를 건드리지 않고 주입할 수 있다.
  const WD = w.eval('typeof WATCHDOG_MS === "function" ? WATCHDOG_MS() : 3500');
  const stallMs = WD + 800;
  w.eval(`(() => {
    const orig = MightyAI.createTable;
    window.__stallOnce = true;
    MightyAI.createTable = async function(opts){
      const tbl = await orig.call(this, opts);
      for (const a of tbl.agents){
        const act = a.act.bind(a);
        a.act = async (g, s) => {
          // 플레이 단계의 첫 봇 턴 한 번만 늘어지게 한다
          if (window.__stallOnce && g.phase === 'play'){
            window.__stallOnce = false;
            await new Promise(r => setTimeout(r, ${stallMs}));
          }
          return act(g, s);
        };
      }
      return tbl;
    };
  })()`);

  MUI.settings.ui.difficulty = 'intermediate';   // 로드 지연은 위에서 흉내낸다
  MUI.settings.match.mode = 'rounds';
  MUI.settings.match.rounds = 12;   // 딜미스 재딜이 섞이므로 판수를 넉넉히 둔다
  MUI.settings.ui.speed = 'normal';
  MUI.newMatch();
  await sleep(150);

  // 사람이 낙찰받아 플레이까지 간다
  // 재딜(딜미스·전원패스)은 UI가 알아서 다음 판을 깐다 — 기다렸다 계속한다.
  for (let i = 0; i < 1200; i++) {
    await sleep(40);
    const g = MUI.game; if (!g) continue;
    if (g.phase === 'play') break;
    if (g.phase === 'redeal') continue;
    if (g.phase === 'done'){ const nb = w.document.querySelector('#next-btn'); if (nb) nb.click(); continue; }
    if (MUI.busy || g.currentPlayer !== 0) continue;
    if (g.phase === 'bidding') {
      const bids = g.legalActions().filter(a => a.type === 'bid');
      MUI.humanAct(bids.length ? bids[bids.length - 1] : { type: 'pass' });
    } else if (g.phase === 'floor') MUI.humanAct({ type: 'exchange', discard: g.hands[0].slice(0, 3) });
    else if (g.phase === 'friend') MUI.humanAct({ type: 'friend', mode: 'first' });
    else if (g.phase === 'dealMissWindow') MUI.humanAct({ type: 'proceed' });
  }
  const g0 = MUI.game;
  if (!g0 || g0.phase !== 'play') { console.error('FAIL: 플레이 단계 진입 실패 — phase ' + (g0 && g0.phase)); process.exit(1); }
  console.log(`플레이 진입 · 감시 타이머 ${WD}ms · 봇 지연 ${stallMs}ms`);

  // 여기서부터 사람은 **아무것도 하지 않는다**. 봇 지연 → 워치독 발동 구간을
  // 통과시키며 사람 손패가 줄어드는지만 본다.
  const handAt = () => (MUI.game && MUI.game.hands ? MUI.game.hands[0].length : -1);
  const before = handAt();
  let autoPlayed = false, sawHumanTurn = false;
  const deadline = Date.now() + stallMs + 12000;
  while (Date.now() < deadline) {
    await sleep(50);
    const g = MUI.game;
    if (!g || g.phase !== 'play') break;
    if (g.currentPlayer === 0) sawHumanTurn = true;
    if (handAt() < before) { autoPlayed = true; break; }
  }
  console.log(`사람 손패 ${before} → ${handAt()} · 내 차례 도달 ${sawHumanTurn}` +
              ` · 무효 루프 착수 ${MUI.staleActs} · 봇 루프 최대 ${MUI.botChainsMax}`);
  ok(!autoPlayed, `사람이 내지 않았는데 손패가 ${before} → ${handAt()}로 줄었다 — 자동 착수`);
  ok(sawHumanTurn, '내 차례에 도달하지 못했다 — 이 테스트가 아무것도 검사하지 못했다');

  console.log(pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('FAIL:', e && e.stack); process.exit(1); });
