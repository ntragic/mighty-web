/* 마지막 트릭·세팅 자동 진행 타이밍 회귀 테스트.
 *
 * 제보(2026-08-11): 마지막 트릭에서 공개된 패가 너무 빨리 사라져 마무리 국면을
 * 못 보고 끝난다. 세팅 자동 진행 중에도 5장이 한꺼번에 보이는 시간이 없다.
 *
 * UI 전체를 띄우지 않고 타이밍 상수와 분기만 검증한다 — 값이 0으로 되돌아가거나
 * 마지막 트릭 분기가 사라지는 회귀를 잡는 게 목적이다.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '../src/ui.js'), 'utf8');

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.error('FAIL:', m); } };

const num = (name) => {
  const m = src.match(new RegExp(`const\\s+${name}\\s*=\\s*(\\d+)`));
  return m ? parseInt(m[1], 10) : null;
};

// 1) 마지막 트릭 상수 — 사람이 화면을 읽을 수 있는 하한
const hold = num('FINAL_TRICK_HOLD');
ok(hold !== null && hold >= 800, `FINAL_TRICK_HOLD가 없거나 너무 짧다: ${hold}`);

// 2) 마지막 트릭 분기가 '카드가 깔린 뒤 · 수거 전'에 있어야 한다
const iShow = src.indexOf('await sleep(claimSpeed().show);');
const iHold = src.indexOf('await sleep(FINAL_TRICK_HOLD);');
// 주석 문구가 파일 상단 설명과 겹치므로, 실제 수거 블록의 코드로 위치를 잡는다
const iCollect = src.indexOf("document.querySelectorAll('#trick .slot')");
ok(iShow > 0 && iHold > iShow, '마지막 트릭 홀드가 트릭 노출 이후에 있어야 한다');
ok(iCollect > 0 && iHold < iCollect, '마지막 트릭 홀드는 수거 애니메이션 전에 있어야 한다');

// 3) 세팅 자동 진행 — 5장 노출 구간(show)이 살아 있어야 한다
const cs = src.match(/const CLAIM_SPD=\{([^}]*)\}/);
ok(!!cs, 'CLAIM_SPD를 찾지 못했다');
if (cs) {
  const showV = parseInt((cs[1].match(/show:\s*(\d+)/) || [])[1], 10);
  ok(showV >= 300, `세팅 자동 진행의 show가 너무 짧다: ${showV}ms — 5장을 못 본다`);
}

// 4) 마지막 트릭은 수거 뒤 곧장 결과 화면으로 가야 한다.
//    엔진이 마지막 트릭에서 pl.table을 비우지 않으므로(_finishGame으로 바로 빠진다)
//    그냥 render()하면 방금 수거한 5장이 되살아난다. 빈 ghost로 고정하고 pump()로
//    넘기는 처리가 사라지면 그 버그가 재발한다.
const tail = src.slice(src.indexOf('SFX.collect();'), src.indexOf('SFX.collect();') + 900);
ok(/isFinalTrick[\s\S]{0,200}ghost=\{plays:\[\]/.test(tail),
   '마지막 트릭에서 빈 ghost로 고정하지 않는다 — 수거한 카드가 되살아난다');
ok(/isFinalTrick[\s\S]{0,300}pump\(\)/.test(tail),
   '마지막 트릭에서 곧장 결과 화면으로 넘기지 않는다');

// 5) 세대 카운터 무효화가 홀드 뒤에도 걸려 있어야 한다(되돌리기·새 라운드 경합)
const after = src.slice(iHold, iHold + 200);
ok(/myGen!==stateGen/.test(after), '홀드 후 stateGen 무효화 검사가 없다');

console.log(`timing: ${pass} passed, ${fail} failed ` +
  `(마지막 트릭 ${hold}ms · 세팅 show ${(cs && (cs[1].match(/show:\s*(\d+)/) || [])[1]) || '?'}ms)`);
if (fail) process.exit(1);
