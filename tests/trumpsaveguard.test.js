/* 기루다 보존 가드 단위 테스트 — 발동 조건과 교체 카드를 검증한다.
 *
 * 인증(v13, 60,000시드): 발화 좌석 상금 +131.6±71.5(n=322).
 * 클래스: 못 이기는 트릭(현재 최강이 상대팀) · 남은 패 3장 이하 · 낸 카드가
 * 기루다 · 비기루다 합법수 존재 → 비기루다 최저(점수 아닌 것 우선)로 교체.
 */
'use strict';
const path = require('path');
const P = p => path.join(__dirname, p);
const E = require(P('../src/mighty-engine.js'));
const AI = require(P('../src/mighty-ai.js'));

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.error('FAIL:', m); } };
const gt = (a, b) => a[0] > b[0] || (a[0] === b[0] && a[1] > b[1]);

let fired = 0, heldEarly = 0, heldWin = 0, heldAlly = 0;

for (let seed = 0; seed < 1500; seed++) {
  const g = new E.MightyGame({ seed: 970000 + seed });
  const ag = new E.HeuristicAgent(E.PERSONAS.balanced, g.rng);
  g.start(seed % 5);
  let guard = 0;
  while (g.phase !== 'done' && g.phase !== 'redeal' && guard++ < 900) {
    const p = g.currentPlayer;
    const a = ag.act(g);
    const pl = g.play;
    if (g.phase === 'play' && pl.table.length > 0 && g.contract.giruda !== 'N') {
      const gi = g.contract.giruda;
      // 기루다 버림 후보를 만들어 가드에 물어본다
      const tr = g._legalPlays(p).find(m => !m.jokerCall && !E.isJoker(m.card)
        && m.card.suit === gi && !E.sameCard(m.card, g.mightyCard));
      if (tr) {
        const act = { type: 'play', card: tr.card };
        const res = AI.trumpSaveGuard(g, p, act);
        let bk = [-2, -1], bp = -1;
        for (const e of pl.table) { const k = g._cardStrength(e, pl); if (gt(k, bk)) { bk = k; bp = e.player; } }
        const iWin = gt(g._cardStrength({ player: p, card: tr.card }, pl), bk);
        const late = g.hands[p].length <= 3;
        const allyBest = g.friendRevealed
          ? ((p === g.declarer || g.friend === p) === (bp === g.declarer || (g.friend !== null && bp === g.friend)))
          : null;

        if (res !== act) {
          fired++;
          // 교체 카드는 비기루다·합법·역시 못 이김이어야 한다
          ok(res.card.suit !== gi, `교체가 기루다다 seed=${seed}`);
          ok(!E.isJoker(res.card) && !E.sameCard(res.card, g.mightyCard),
             `교체가 마이티·조커다 seed=${seed}`);
          ok(g._legalPlays(p).some(m => !m.jokerCall && E.sameCard(m.card, res.card)),
             `교체가 불법 seed=${seed}`);
          ok(!gt(g._cardStrength({ player: p, card: res.card }, pl), bk),
             `교체가 트릭을 이긴다 — 그럼 그 수를 두는 게 맞다 seed=${seed}`);
          // 발동 조건
          ok(late, `남은 패 4장 이상인데 발동했다 seed=${seed}`);
          ok(!iWin, `이기는 수인데 발동했다 seed=${seed}`);
          if (g.friendRevealed) ok(allyBest === false, `아군 최강 트릭에 발동했다 seed=${seed}`);
        } else {
          if (!late) heldEarly++;
          else if (iWin) heldWin++;
          else if (allyBest) heldAlly++;
        }
      }
      // 기루다가 아닌 액션은 절대 건드리지 않는다
      if (a.type === 'play' && !a.jokerCall && !E.isJoker(a.card) && a.card.suit !== gi) {
        ok(AI.trumpSaveGuard(g, p, a) === a, `비기루다 액션에 개입 seed=${seed}`);
      }
    }
    g.act(a);
  }
}

console.log(`trumpsaveguard: ${pass} passed, ${fail} failed ` +
  `(교체 ${fired} · 유지 — 중반 ${heldEarly} · 이기는수 ${heldWin} · 아군최강 ${heldAlly})`);
if (fail) process.exit(1);
