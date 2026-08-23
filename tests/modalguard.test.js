/* 모달 탭 스루 회귀 테스트.
 *
 * 제보(2026-08-23): 플레이어가 내기도 전에 AI 추천 패가 자동으로 나간다.
 * 원인은 세팅(자동 진행) 모달의 탭 스루였다 — 카드를 내려고 누르는 순간 모달이
 * 튀어나오면 그 탭이 그대로 주 버튼에 꽂히고, 한 번 켜지면 그 판 내내 AI가
 * 사람 카드를 낸다. 모바일에서 특히 잘 난다.
 *
 * 이 테스트가 지키는 것 셋:
 *   1) 모든 모달 버튼이 탭 유예를 거친다(정적 검사 — 새 모달을 추가할 때 빠뜨리기 쉽다)
 *   2) 유예 시간 안의 클릭은 무시된다
 *   3) 유예가 지난 클릭은 정상 동작한다
 */
'use strict';
const __path = require('path');
const fs = require('fs');
const { JSDOM } = require('jsdom');

const htmlPath = __path.join(__dirname, '../web/index.html');
const html = fs.readFileSync(htmlPath, 'utf8');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.error('FAIL:', m); } };

// 1) 정적 검사 — 모달 헬퍼 본문에 유예가 걸려 있는가.
// 새 모달을 추가할 때 빠뜨리기 쉬운 자리라 본문 단위로 본다.
{
  const bodyOf = (name) => {
    const i = html.indexOf('function ' + name);
    return i < 0 ? '' : html.slice(i, i + 1400);
  };
  for (const fn of ['pickSuit', 'confirmModal']) {
    const b = bodyOf(fn);
    const handlers = (b.match(/onclick\s*=/g) || []).length;
    const guards = (b.match(/modalTapTooSoon/g) || []).length;
    console.log(`${fn}: onclick ${handlers}개 · 유예 ${guards}개`);
    ok(handlers > 0 && guards >= handlers,
       `${fn}의 버튼 ${handlers}개 중 ${handlers - guards}개에 탭 유예가 없다`);
    ok(/modalShownAt\s*=\s*Date\.now\(\)/.test(b), `${fn}이 모달 표시 시각을 기록하지 않는다`);
  }
}

// 2·3) 실제 동작 — 유예 안/밖 클릭
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
  // confirmModal은 외부에 노출돼 있지 않으므로 페이지 스코프에서 직접 부른다.
  const early = w.eval(`(async () => {
    const p = confirmModal('테스트', '탭 스루 검사', '예', '아니오');
    const btn = document.querySelector('#modal-box .btn.primary');
    btn.click();                       // 뜨자마자 누른다 → 무시돼야 한다
    const settled = await Promise.race([p, new Promise(r => setTimeout(() => r('열린채'), 250))]);
    return String(settled);
  })()`);
  const earlyResult = await early;
  console.log(`유예 안(0ms) 클릭 결과: ${earlyResult}`);
  ok(earlyResult === '열린채', `모달이 뜨자마자 눌렀는데 닫혔다(${earlyResult}) — 탭 스루가 살아 있다`);

  const late = w.eval(`(async () => {
    const btn = document.querySelector('#modal-box .btn.primary');
    await new Promise(r => setTimeout(r, 600));   // 유예를 넘긴다
    btn.click();
    return 'clicked';
  })()`);
  await late;
  await sleep(150);
  const closed = !w.document.querySelector('#modal').classList.contains('show');
  console.log(`유예 밖(600ms) 클릭 후 모달 닫힘: ${closed}`);
  ok(closed, '유예가 지난 뒤에도 모달이 안 닫힌다 — 유예가 과하게 걸렸다');

  console.log(pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('FAIL:', e && e.stack); process.exit(1); });
