/**
 * 신호 실험 B: NN 주공이 프렌드의 점수공급 신호로 이득을 보는가.
 * 같은 딜에서 NN을 좌석 k에 두고, 나머지 휴리스틱의 프렌드 공급만 켜고/끈다.
 * NN이 주공이 된 딜만 골라 여당 승률을 비교(짝지은 비교).
 * 사용: MODEL=... node exp_signal_nn.js [딜수] [성향...]
 */
'use strict';
const E = require('../../src/mighty-engine.js');
const M = require('../../src/mighty-master.js');
const ort = require(process.env.ORT_PATH || 'onnxruntime-node');
const MODEL = process.env.MODEL || require('path').join(__dirname, '../../web/model/mighty_master_v4.onnx');
const NUM = 5;

async function play(seed, persona, tier, feedScale, nnSeat, sess) {
  const g = new E.MightyGame({ seed });
  const p = { ...E.PERSONAS[persona], weights: { friendFeedScale: feedScale } };
  const agent = new E.HeuristicAgent(p, g.rng, { tier });
  g.start(Math.floor(g.rng() * NUM));
  if (g.phase === 'redeal') return null;
  const pick = [];
  let guard = 0;
  while (g.phase !== 'done') {
    if (g.phase === 'redeal' || ++guard > 500) return null;
    if (g.currentPlayer === nnSeat) {
      const a = await M.chooseAction(sess, ort, g, nnSeat, pick);
      const act = M.actionToEngine(a, g, pick);
      if (act) g.act(act);
    } else g.act(agent.act(g));
  }
  const r = g.result;
  let fed = 0, pts = 0, revealTrick = 11;
  if (r.friend != null && r.friend !== r.declarer) {
    for (const t of g.play.history) {
      for (const e of t.plays) {
        if (e.player === r.friend && !E.isJoker(e.card) && e.card.rank >= 10) {
          pts++; if (t.winner === r.declarer) fed++;
        }
        if (g.friendDecl && g.friendDecl.mode === 'card' &&
            E.sameCard(e.card, g.friendDecl.card) && revealTrick === 11)
          revealTrick = t.trickNo;
      }
    }
  }
  return { win: !!r.win, declarer: r.declarer, friend: r.friend, fed, pts, revealTrick };
}

const pct = (w, n) => n ? (w / n * 100).toFixed(1) + '%' : '—';
(async () => {
  const sess = await ort.InferenceSession.create(MODEL);
  const N = parseInt(process.argv[2] || '1200', 10);
  const list = process.argv.slice(3).length ? process.argv.slice(3) : ['gambler', 'balanced', 'careful'];
  console.log(`실험 B — NN(${MODEL}) 주공이 프렌드 공급 신호로 이득을 보는가`);
  for (const persona of list) {
    let seed = 820000, n = 0, dn = 0, onW = 0, offW = 0;
    const early = [0, 0], late = [0, 0];   // NN 주공, 공급ON 조건에서 공개시점별 승률
    while (n < N) {
      const s = ++seed, k = n % NUM;
      const A = await play(s, persona, 'advanced', 1, k, sess);
      if (!A) continue;
      const B = await play(s, persona, 'advanced', 0, k, sess);
      if (!B) continue;
      n++;
      const bothDecl = A.declarer === k && B.declarer === k &&
                       A.friend != null && A.friend === B.friend && A.friend !== k;
      if (!bothDecl) continue;
      dn++;
      onW += A.win; offW += B.win;
      const bucket = A.revealTrick <= 3 ? early : late;
      bucket[0] += A.win; bucket[1]++;
    }
    const d = (offW - onW) / dn * 100;
    console.log(`  ${persona.padEnd(9)} NN주공 여당승률  공급ON ${pct(onW, dn)} → 차단 ${pct(offW, dn)} ` +
                `(Δ${d >= 0 ? '+' : ''}${d.toFixed(1)}pt, n=${dn})`);
    console.log(`            프렌드 조기공개(≤3트릭) ${pct(early[0], early[1])} vs 늦은공개 ${pct(late[0], late[1])}`);
  }
})();
