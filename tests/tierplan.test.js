/* 티어별 좌석 구성 검증 — 난이도 사다리가 코드와 어긋나지 않게 잠근다.
 *
 * 실측(tools/research/table_difficulty.js, 3,000판, 기준 좌석 판당 상금 — 낮을수록 어렵다):
 *   중급   v5 1좌석 + 규칙기반 3   −158.8 ± 75.6
 *   고급   v8·v6b 각 2좌석         −249.8 ± 64.4
 *   마스터 v13 + v11ctl 각 2좌석   −316.0 ± 59.6
 * 이 파일은 그 구성이 유지되는지, 참조 모델 파일이 실재하는지만 본다.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const P = p => path.join(__dirname, p);
const src = fs.readFileSync(P('../src/ui.js'), 'utf8');

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.error('FAIL:', m); } };

// TIER_PLAN 블록을 그대로 읽어 평가한다 (HEUR 표식만 주입)
const block = src.match(/const TIER_PLAN=\{[\s\S]*?\n\};/);
ok(!!block, 'TIER_PLAN 블록을 찾지 못했다');
const HEUR = 'H';
const TIER_PLAN = block ? eval('(' + block[0].replace(/^const TIER_PLAN=/, '') .replace(/;$/, '') + ')') : {};

for (const tier of ['intermediate', 'advanced', 'master']) {
  ok(Array.isArray(TIER_PLAN[tier]), `${tier} 구성이 없다`);
  ok(TIER_PLAN[tier] && TIER_PLAN[tier].length === 4, `${tier} 좌석이 4개가 아니다`);
}

const nn = t => TIER_PLAN[t].filter(x => x !== HEUR);
// 난이도 단조성 — 신경망 좌석 수가 뒤로 갈수록 줄지 않아야 한다
ok(nn('intermediate').length <= nn('advanced').length, '중급 NN 좌석이 고급보다 많다');
ok(nn('advanced').length <= nn('master').length, '고급 NN 좌석이 마스터보다 많다');
ok(nn('intermediate').length >= 1, '중급에 신경망 좌석이 없다 — v2.11 설계와 어긋난다');
ok(nn('master').length === 4, '마스터는 네 좌석 모두 신경망이어야 한다');

// 마스터는 최고 기력 두 세대를 각 2좌석 (docs/MODELS.md 기력 사다리)
const mset = [...new Set(nn('master'))];
ok(mset.length === 2, `마스터 풀이 2종이 아니다: ${mset.join(',')}`);
for (const id of mset)
  ok(nn('master').filter(x => x === id).length === 2, `마스터 ${id} 좌석이 2개가 아니다`);

// v9는 고공약 프렌드 결함으로 v2.10.6에서 하차 — 어느 티어에도 없어야 한다
for (const tier of ['intermediate', 'advanced', 'master'])
  ok(!nn(tier).includes('v9'), `${tier}에 v9가 남아 있다 (v2.10.6 하차 대상)`);

// 참조 모델 파일이 실제로 있어야 한다
const pool = src.match(/const NN_POOL=\{[\s\S]*?\n\};/);
ok(!!pool, 'NN_POOL 블록을 찾지 못했다');
const ids = new Set([].concat(...['intermediate', 'advanced', 'master'].map(nn)));
for (const id of ids) {
  const m = pool[0].match(new RegExp(`${id}\\s*:\\s*\\{[^}]*file:'([^']+)'`));
  ok(!!m, `NN_POOL에 ${id} 항목이 없다`);
  if (m) ok(fs.existsSync(P('../web/' + m[1].replace(/^\.\//, ''))),
            `${id} 모델 파일이 없다: ${m[1]}`);
}

// 닉네임은 좌석 공개용 — 풀의 모든 모델에 있어야 한다
for (const id of ids)
  ok(new RegExp(`${id}\\s*:\\s*\\{[^}]*nick:'[^']+'`).test(pool[0]), `${id} 닉네임이 없다`);

console.log(`tierplan: ${pass} passed, ${fail} failed ` +
  `(중급 NN ${nn('intermediate').length}좌석 · 고급 ${nn('advanced').length} · 마스터 ${nn('master').length})`);
if (fail) process.exit(1);
