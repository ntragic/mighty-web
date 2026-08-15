/* 이른 마이티 리드 억제 회귀 테스트.
 *
 * 제보(2026-08-15, v2.11.1 복기 1·2판): 프렌드가 협력 대신 뜬금없이 마이티를
 * 리드해 주공과의 공조가 끊겼다. 좌석 배정 결함으로 마스터 판에도 규칙기반이
 * 앉아 있었고, 규칙기반 _scoreLead의 마이티 가지가 원인이었다 — 마이티는
 * winProb이 항상 1이라 점수가 상수 2.75로 고정되는 반면, 다른 리드는 기루다에
 * 잘릴 위험으로 감점돼 마이티가 언제나 1위였다.
 *
 * 여기서는 두 가지를 지킨다.
 *   1) 프렌드는 중반(트릭 2~5)에 마이티를 리드하지 않는다.
 *   2) 조커프렌드 확인용 초반 마이티 리드(관례)는 살아 있다.
 */
'use strict';
const path = require('path');
const E = require(path.join(__dirname, '../src/mighty-engine.js'));

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.error('FAIL:', m); } };

const PER = ['gambler', 'balanced', 'careful'];
const N = 1200;
const SEED0 = 7700000;

let friendMidLead = 0, friendLateLead = 0, declProbeT1 = 0, deals = 0;
for (let i = 0; i < N; i++) {
  const seed = SEED0 + i;
  const rng = E.makeRng(seed);
  const g = new E.MightyGame({ seed });
  const agents = [];
  for (let p = 0; p < 5; p++) {
    agents.push(new E.HeuristicAgent(E.PERSONAS[PER[Math.floor(rng() * 3)]], rng,
                                     { tier: 'advanced' }));
  }
  g.start(i % 5);
  let steps = 0;
  while (g.phase !== 'done' && g.phase !== 'redeal' && steps++ < 400) {
    const p = g.currentPlayer;
    const lead = g.phase === 'play' && g.play.table.length === 0;
    const trickNo = lead ? g.play.trickNo : 0;
    const a = agents[p].act(g);
    if (lead && a.type === 'play' && a.card && !E.isJoker(a.card)
        && E.sameCard(a.card, g.mightyCard)) {
      const isDecl = p === g.declarer;
      const isFriend = !isDecl && g.friendDecl && g.friendDecl.mode === 'card'
        && g.hands[p].some(c => E.sameCard(c, g.friendDecl.card));
      if (isFriend && trickNo >= 2 && trickNo <= 5) friendMidLead++;
      if (isFriend && trickNo >= 8) friendLateLead++;
      if (isDecl && trickNo === 1) declProbeT1++;
    }
    g.act(a);
  }
  if (g.phase === 'done') deals++;
}

// 1) 중반 프렌드 마이티 리드 — 수정 전 1,615딜에서 다수 발생, 수정 후 0
ok(friendMidLead === 0,
   `프렌드가 트릭 2~5에 마이티를 리드했다: ${friendMidLead}회 (${deals}딜)`);

// 2) 관례 보존 — 주공의 초반 마이티 리드(조커프렌드 확인)가 사라지면 안 된다
ok(declProbeT1 > 0, '주공의 트릭1 마이티 리드가 전부 사라졌다 — 관례까지 막았다');

// 3) 종반 캐싱은 막지 않는다 — 게이트는 남은 트릭에 비례하므로 후반엔 풀린다
ok(friendLateLead > 0, `프렌드의 종반(트릭 8+) 마이티 리드가 0이다 — 과도 억제`);

// 4) 가중치가 0으로 되돌아가는 회귀 방지
ok(E.HEURISTIC_WEIGHTS.mightyLeadGate > 0,
   `mightyLeadGate가 꺼져 있다: ${E.HEURISTIC_WEIGHTS.mightyLeadGate}`);

console.log(`마이티 리드 회귀: ${deals}딜 · 프렌드 중반 ${friendMidLead} · ` +
            `프렌드 종반 ${friendLateLead} · 주공 T1 관례 ${declProbeT1}`);
console.log(pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
