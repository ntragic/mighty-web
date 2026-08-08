/* 야당 기루다 헌납 가드 단위 테스트 — 휴리스틱 자가플레이 상태에서 조건별 검증 */
'use strict';
const path = require('path');
const P = p => path.join(__dirname, p);
const E = require(P('../src/mighty-engine.js'));
const AI = require(P('../src/mighty-ai.js'));

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.error('FAIL:', m); } };
const gt = (a, b) => a[0] > b[0] || (a[0] === b[0] && a[1] > b[1]);

let fired = 0, held = 0;
for (let seed = 0; seed < 500; seed++) {
  const g = new E.MightyGame({ seed: 660000 + seed });
  const ag = new E.HeuristicAgent(E.PERSONAS.balanced, g.rng);
  g.start(seed % 5);
  let guard = 0;
  while (g.phase !== 'done' && g.phase !== 'redeal' && guard++ < 900) {
    const p = g.currentPlayer;
    const a = ag.act(g);
    if (g.phase === 'play' && g.play.table.length > 0 && g.friendRevealed
        && p !== g.declarer && p !== g.friend) {
      const gi = g.contract.giruda;
      if (gi !== 'N' && g.play.ledSuit === gi) {
        const pl = g.play;
        let bk = [-2, -1], bp = -1;
        for (const e of pl.table) { const k = g._cardStrength(e, pl); if (gt(k, bk)) { bk = k; bp = e.player; } }
        const oppBest = bp === g.declarer || (g.friend !== null && bp === g.friend);
        // 점수 기루다를 시도했다고 가정하고 가드 판정
        const isKey = x => E.isJoker(x) || E.sameCard(x, g.mightyCard);
        const legal = g._legalPlays(p).filter(m => !m.jokerCall && !E.isJoker(m.card));
        const ptTr = legal.filter(m => !isKey(m.card) && m.card.suit === gi && E.isPointCard(m.card)
          && !gt(g._cardStrength({ player: p, card: m.card }, pl), bk));
        const npTr = legal.filter(m => !isKey(m.card) && m.card.suit === gi && !E.isPointCard(m.card)
          && !gt(g._cardStrength({ player: p, card: m.card }, pl), bk));
        if (ptTr.length) {
          const res = AI.tfeedGuard(g, p, { type: 'play', card: ptTr[0].card });
          if (oppBest && npTr.length) {
            ok(!E.isPointCard(res.card) && res.card.suit === gi, `조건 성립인데 미교체 seed=${seed}`);
            ok(E.sameCard(res.card, npTr.sort((a, b) => a.card.rank - b.card.rank)[0].card), `최저 비점수 아님 seed=${seed}`);
            fired++;
          } else {
            ok(E.sameCard(res.card, ptTr[0].card), `조건 불성립인데 교체 seed=${seed}`);
            held++;
          }
          // 여당 좌석엔 무개입
          const r2 = AI.tfeedGuard(g, g.declarer, { type: 'play', card: ptTr[0].card });
          ok(E.sameCard(r2.card, ptTr[0].card), '주공에 개입');
        }
      }
    }
    g.act(a);
  }
}
ok(fired > 0, '교체 케이스 없음');
ok(held > 0, '유지 케이스 없음');
console.log(`tfeedguard: ${pass} passed, ${fail} failed (교체 ${fired} · 유지 ${held})`);
process.exit(fail ? 1 : 0);
