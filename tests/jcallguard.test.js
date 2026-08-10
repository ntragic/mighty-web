/* 조커콜 자해 가드 단위 테스트 — 조커 프렌드 판에서 여당의 조커콜만 떼는가 */
'use strict';
const path = require('path');
const P = p => path.join(__dirname, p);
const E = require(P('../src/mighty-engine.js'));
const AI = require(P('../src/mighty-ai.js'));

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.error('FAIL:', m); } };

let firedRuling = 0, heldOpp = 0, heldOther = 0;

for (let seed = 0; seed < 1200; seed++) {
  const g = new E.MightyGame({ seed: 930000 + seed });
  const ag = new E.HeuristicAgent(E.PERSONAS.balanced, g.rng);
  g.start(seed % 5);
  let guard = 0;
  while (g.phase !== 'done' && g.phase !== 'redeal' && guard++ < 900) {
    const p = g.currentPlayer;
    const a = ag.act(g);
    if (g.phase === 'play') {
      // 이 좌석이 조커콜을 낼 수 있는 국면이면, 조커콜 액션을 만들어 가드에 넣어 본다
      const call = g._legalPlays(p).find(m => m.jokerCall);
      if (call) {
        const act = { type: 'play', card: call.card, jokerCall: true };
        const res = AI.jokerCallGuard(g, p, act);
        const fd = g.friendDecl;
        const jokerFriend = fd && fd.mode === 'card' && fd.card && E.isJoker(fd.card);
        const holdsJoker = g.hands[p].some(c => E.isJoker(c));
        const ruling = p === g.declarer ||
          (g.friendRevealed && g.friend !== null && p === g.friend);
        const shouldFire = jokerFriend && ruling && !holdsJoker;

        if (shouldFire) {
          firedRuling++;
          ok(!res.jokerCall, `여당인데 조커콜이 남았다 seed=${seed}`);
          ok(E.sameCard(res.card, act.card), `카드가 바뀌었다 — 콜만 떼야 한다 seed=${seed}`);
          ok(g._legalPlays(p).some(m => !m.jokerCall && E.sameCard(m.card, res.card)),
             `교체 결과가 불법 seed=${seed}`);
        } else {
          if (jokerFriend && !ruling) heldOpp++; else heldOther++;
          ok(res === act, `건드리면 안 되는 국면에서 개입했다 seed=${seed} ` +
             `(조커프렌드=${!!jokerFriend} 여당=${ruling} 조커보유=${holdsJoker})`);
        }
      }
      // 조커콜이 아닌 일반 액션은 절대 건드리지 않는다
      if (a.type === 'play' && !a.jokerCall) {
        ok(AI.jokerCallGuard(g, p, a) === a, `일반 액션에 개입 seed=${seed}`);
      }
    }
    g.act(a);
  }
}

console.log(`jcallguard: ${pass} passed, ${fail} failed ` +
  `(여당 교체 ${firedRuling} · 야당 유지 ${heldOpp} · 기타 유지 ${heldOther})`);
if (fail) process.exit(1);
