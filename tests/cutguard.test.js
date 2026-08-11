/* 확정승 컷 가드 단위 테스트 — 휴리스틱 자가플레이 상태에서 조건별 검증 */
'use strict';
const path = require('path');
const P = p => path.join(__dirname, p);
const E = require(P('../src/mighty-engine.js'));
const AI = require(P('../src/mighty-ai.js'));

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.error('FAIL:', m); } };
const gt = (a, b) => a[0] > b[0] || (a[0] === b[0] && a[1] > b[1]);

let fired = 0, held = 0, preFired = 0;
for (let seed = 0; seed < 600; seed++) {
  const g = new E.MightyGame({ seed: 880000 + seed });
  const ag = new E.HeuristicAgent(E.PERSONAS.balanced, g.rng);
  g.start(seed % 5);
  let guard = 0;
  while (g.phase !== 'done' && g.phase !== 'redeal' && guard++ < 900) {
    const p = g.currentPlayer;
    const a = ag.act(g);
    if (g.phase === 'play' && a.type === 'play'
        && g.play.table.length > 0 && g.contract.giruda !== 'N') {
      const gi = g.contract.giruda;
      const pl = g.play;
      // 비기루다 버림 후보를 시도했다고 가정
      const dump = g._legalPlays(p).find(m => !m.jokerCall && !E.isJoker(m.card)
        && !E.sameCard(m.card, g.mightyCard) && m.card.suit !== gi);
      if (dump && pl.ledSuit !== gi
          && !g.hands[p].some(x => !E.isJoker(x) && x.suit === pl.ledSuit)) {
        const res = AI.cutGuard(g, p, { type: 'play', card: dump.card });
        const swapped = !E.sameCard(res.card, dump.card);
        if (swapped) {
          fired++;
          if (!g.friendRevealed) {
            // 공개 전 확장은 확정 야당 + 주공 최강 트릭에서만 발동해야 한다
            const fd = g.friendDecl;
            const holds = fd && fd.mode === 'card' && fd.card
              && g.hands[p].some(x => E.sameCard(x, fd.card));
            ok(p !== g.declarer && !holds, `공개 전인데 여당 좌석에 발동 seed=${seed}`);
            let tb = [-2, -1], tp = -1;
            for (const e of pl.table) { const k = g._cardStrength(e, pl); if (gt(k, tb)) { tb = k; tp = e.player; } }
            ok(tp === g.declarer, `공개 전인데 주공 최강이 아닌 트릭에 발동 seed=${seed}`);
            preFired++;
          }
          // 교체 카드는 반드시 기루다·현재 최강을 이김·합법
          ok(res.card.suit === gi, `교체가 기루다 아님 seed=${seed}`);
          let bk = [-2, -1];
          for (const e of pl.table) { const k = g._cardStrength(e, pl); if (gt(k, bk)) bk = k; }
          ok(gt(g._cardStrength({ player: p, card: res.card }, pl), bk), `교체가 못 이김 seed=${seed}`);
          ok(g._legalPlays(p).some(m => E.sameCard(m.card, res.card)), `교체 불법 seed=${seed}`);
          // 전지 검증: 실제로 뒤 좌석 누구도 못 뒤집는가 (가시 판정이 보수적이므로 참이어야 함)
          const k2 = g._cardStrength({ player: p, card: res.card }, pl);
          const acted = new Set(pl.table.map(e => e.player)); acted.add(p);
          for (let q = 0; q < 5; q++) {
            if (acted.has(q)) continue;
            for (const m of g._legalPlays(q)) {
              const kq = g._cardStrength({ player: q, card: m.card, jokerSuit: m.jokerSuit }, pl);
              ok(!gt(kq, k2), `확정승 아님 — P${q} ${E.isJoker(m.card)?'JK':E.cardName(m.card)} seed=${seed}`);
            }
          }
        } else held++;
      }
    }
    g.act(a);
  }
}
ok(fired > 0, '교체 케이스 없음');
ok(held > 0, '유지 케이스 없음');
console.log(`cutguard: ${pass} passed, ${fail} failed (교체 ${fired} · 그중 공개전 ${preFired} · 유지 ${held})`);
process.exit(fail ? 1 : 0);
