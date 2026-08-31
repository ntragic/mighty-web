'use strict';
const path = require('path');
const fs = require('fs');
const { JSDOM } = require('jsdom');

const html = fs.readFileSync(path.join(__dirname, '../web/index.html'), 'utf8');
const dom = new JSDOM(html, {
  runScripts: 'dangerously', pretendToBeVisual: true, url:'https://mighty.test/',
  beforeParse(window) {
    window.matchMedia = q => ({ matches:false, media:q, addListener(){}, removeListener(){},
                               addEventListener(){}, removeEventListener(){} });
    Object.defineProperty(window.navigator, 'language', { value:'ko-KR' });
  },
});
const w = dom.window;
const sleep = ms => new Promise(r => setTimeout(r, ms));
let pass=0, fail=0;
const ok=(condition, message)=>{ if(condition) pass++; else { fail++; console.error('FAIL:', message); } };

(async()=>{
  await sleep(150);
  w.MUI.settings.ui.difficulty='master';
  w.localStorage.setItem('mighty_ab_next_v300','A');
  const armA=w.eval('assignAbArm()');
  ok(armA==='A', '첫 배정이 A가 아니다');
  ok(!!w.eval('activeClassSearch()'), 'A 그룹에서 국면 한정 탐색이 꺼졌다');
  const armB=w.eval('assignAbArm()');
  ok(armB==='B', 'A 다음 배정이 B로 교대되지 않았다');
  ok(w.eval('activeClassSearch()')===null, 'B 그룹에서 국면 한정 탐색이 켜졌다');

  w.MUI.openAbSurvey();
  ok(w.document.querySelectorAll('.ab-question').length===4, '설문 문항이 4개가 아니다');
  for(const name of ['friendTiming','keyDiscipline','predictability','playAgain'])
    w.document.querySelector(`input[name="${name}"][value="4"]`).click();
  w.document.querySelector('#ab-form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
  const payload=w.MUI.matchFeedback;
  ok(payload && payload.arm==='B', '저장 응답에 숨은 B 그룹이 기록되지 않았다');
  ok(payload && Object.values(payload.ratings).every(v=>v===4), '1–5 응답이 숫자로 저장되지 않았다');
  const stored=JSON.parse(w.localStorage.getItem('mighty_ab_feedback_v300')||'[]');
  ok(stored.length===1 && stored[0].testId==='master-round-robin-v300', '로컬 A/B 응답 저장 실패');
  ok(w.MUI.abFeedbacks.length===1, '누적 A/B 응답을 다시 읽을 수 없다');
  ok(!!w.document.querySelector('#ab-copy'), '저장 후 누적 결과 복사 버튼이 없다');

  console.log(`${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
})().catch(e=>{ console.error(e.stack||e); process.exit(1); });
