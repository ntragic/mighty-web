/* 탑 리드 가드 단위 테스트 — 휴리스틱 자가플레이 상태에서 조건별 동작 검증 */
'use strict';
const path = require('path');
const P = p => path.join(__dirname, p);
const E = require(P('../src/mighty-engine.js'));
const AI = require(P('../src/mighty-ai.js'));

let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) pass++; else { fail++; console.error('FAIL:', msg); } };

function seenSet(g, seat) {
  const s = new Set();
  for (const tr of g.play.history) for (const e of tr.plays) s.add(E.cardId(e.card));
  for (const c of g.hands[seat]) s.add(E.cardId(c));
  if (g.discard) for (const c of g.discard) s.add(E.cardId(c));
  return s;
}

let fired = 0, held = 0, checked = 0;
for (let seed = 0; seed < 400; seed++) {
  const g = new E.MightyGame({ seed: 550000 + seed });
  const ag = new E.HeuristicAgent(E.PERSONAS.balanced, g.rng);
  g.start(seed % 5);
  let guard = 0;
  while (g.phase !== 'done' && g.phase !== 'redeal' && guard++ < 900) {
    const p = g.currentPlayer;
    const a = ag.act(g);
    if (g.phase === 'play' && p === g.declarer && g.play.table.length === 0) {
      const gi = g.contract.giruda;
      const myTr = gi === 'N' ? [] : g.hands[p]
        .filter(x => !E.isJoker(x) && x.suit === gi).sort((x, y) => y.rank - x.rank);
      if (myTr.length >= 2) {
        checked++;
        // 최저 기루다 리드를 시도했다고 가정하고 가드 판정
        const low = myTr[myTr.length - 1];
        const legalLow = g._legalPlays(p).some(m =>
          !m.jokerCall && !m.jokerSuit && E.sameCard(m.card, low));
        if (legalLow) {
          const out = seenSet(g, p);
          let outTop = 0, outAny = 0;
          for (let r = 2; r <= 14; r++)
            if (!out.has(gi + r)) { outAny++; if (r > myTr[0].rank) outTop++; }
          const res = AI.topLeadGuard(g, p, { type: 'play', card: low });
          const legalTop = g._legalPlays(p).some(m =>
            !m.jokerCall && !m.jokerSuit && E.sameCard(m.card, myTr[0]));
          if (outTop === 0 && outAny > 0 && legalTop) {
            ok(E.sameCard(res.card, myTr[0]), `조건 성립인데 미교체 seed=${seed}`);
            fired++;
          } else {
            ok(E.sameCard(res.card, low), `조건 불성립인데 교체 seed=${seed}`);
            held++;
          }
        }
      }
      // 비주공·팔로우·이미 탑 케이스: 항상 무개입
      const top = myTr[0];
      if (top) {
        const r2 = AI.topLeadGuard(g, (p + 1) % 5, { type: 'play', card: top });
        ok(r2.card === top, '비주공에 개입');
      }
    }
    g.act(a);
  }
}
ok(fired > 0, '교체 케이스가 한 번도 안 나옴');
ok(held > 0, '유지 케이스가 한 번도 안 나옴');
console.log(`topguard: ${pass} passed, ${fail} failed (검사 ${checked} · 교체 ${fired} · 유지 ${held})`);
process.exit(fail ? 1 : 0);
