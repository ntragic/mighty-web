/* 야당 기루다 리드 가드 테스트 — 실모델로 발화 조건·교체 검증 (npm 체인 밖, 수동/릴리스용) */
'use strict';
const path = require('path');
const P = p => path.join(__dirname, p);
const ort = require('onnxruntime-node');
const E = require(P('../src/mighty-engine.js'));
const AI = require(P('../src/mighty-ai.js'));
const M = require(P('../src/mighty-master.js'));

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.error('FAIL:', m); } };

(async () => {
  const sess = await ort.InferenceSession.create(P('../web/model/mighty_master_v6b.onnx'));
  let fired = 0, held = 0;
  for (let seed = 0; seed < 40; seed++) {
    const rng = E.makeRng(770000 + seed);
    const g = new E.MightyGame({ seed: 770000 + seed });
    const ag = [];
    for (let s = 0; s < 5; s++)
      ag.push(await AI.createAgent({ tier: 'master', persona: 'balanced', rng, session: sess, ort, keyGuard: true, dleadGuard: false }));
    g.start(seed % 5);
    let guard = 0;
    while (g.phase !== 'done' && g.phase !== 'redeal' && guard++ < 900) {
      const p = g.currentPlayer;
      const a = await ag[p].act(g, p);   // dleadGuard 꺼진 원시+기존가드 경로
      if (g.phase === 'play' && a.type === 'play') {
        const res = await AI.dleadGuard(sess, ort, g, p, a);
        const gi = g.contract.giruda;
        const isTrumpLead = g.play.table.length === 0 && gi !== 'N' && !E.isJoker(a.card)
          && !E.sameCard(a.card, g.mightyCard) && a.card.suit === gi;
        const fd = g.friendDecl;
        const defSure = p !== g.declarer && fd && fd.mode === 'card' && fd.card
          && !g.hands[p].some(x => E.sameCard(x, fd.card))
          && !(g.friendRevealed && g.friend === p);
        if (isTrumpLead && defSure) {
          // 교체됐다면 비기루다여야 하고, 합법이어야 한다
          if (!E.sameCard(res.card, a.card)) {
            fired++;
            ok(E.isJoker(res.card) || res.card.suit !== gi, `교체가 기루다 seed=${seed}`);
            ok(g._legalPlays(p).some(m => E.sameCard(m.card, res.card)
              && !!m.jokerCall === !!res.jokerCall), `교체 수 불법 seed=${seed}`);
          } else held++;   // 정책 차선도 기루다뿐인 극단 케이스 등
        } else {
          ok(E.sameCard(res.card, a.card) && !!res.jokerCall === !!a.jokerCall,
             `조건 밖 개입 seed=${seed} t${g.play.trickNo}`);
        }
      }
      g.act(a);
    }
  }
  ok(fired > 0, '교체 케이스 없음');
  console.log(`dleadguard: ${pass} passed, ${fail} failed (교체 ${fired} · 기루다 유지 ${held})`);
  process.exit(fail ? 1 : 0);
})();
