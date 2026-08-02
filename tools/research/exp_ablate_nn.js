/** NN 주공이 '프렌드 공개' 정보를 실제로 쓰는가 — 같은 딜, 특징만 가리고 비교 */
'use strict';
const E = require('../../src/mighty-engine.js');
const M = require('../../src/mighty-master.js');
const ort = require(process.env.ORT_PATH || 'onnxruntime-node');
const MODEL = process.env.MODEL || require('path').join(__dirname, '../../web/model/mighty_master_v4.onnx');
const NUM = 5;

async function play(seed, persona, nnSeat, sess, ablate) {
  M.setAblateFrev(ablate);
  const g = new E.MightyGame({ seed });
  const agent = new E.HeuristicAgent(E.PERSONAS[persona], g.rng, { tier: 'advanced' });
  g.start(Math.floor(g.rng() * NUM));
  if (g.phase === 'redeal') return null;
  const pick = []; let guard = 0;
  while (g.phase !== 'done') {
    if (g.phase === 'redeal' || ++guard > 500) return null;
    if (g.currentPlayer === nnSeat) {
      const a = await M.chooseAction(sess, ort, g, nnSeat, pick);
      const act = M.actionToEngine(a, g, pick);
      if (act) g.act(act);
    } else g.act(agent.act(g));
  }
  const r = g.result;
  return { win: !!r.win, declarer: r.declarer, friend: r.friend };
}

const pct = (w, n) => n ? (w / n * 100).toFixed(1) + '%' : '—';
(async () => {
  const sess = await ort.InferenceSession.create(MODEL);
  const N = parseInt(process.argv[2] || '1200', 10);
  console.log(`프렌드 공개정보 차단 실험 — ${MODEL}`);
  for (const persona of ['gambler', 'balanced', 'careful']) {
    let seed = 830000, n = 0, dn = 0, onW = 0, offW = 0, fn = 0, fOnW = 0, fOffW = 0;
    while (n < N) {
      const s = ++seed, k = n % NUM;
      const A = await play(s, persona, k, sess, false);
      if (!A) continue;
      const B = await play(s, persona, k, sess, true);
      if (!B) continue;
      n++;
      if (A.declarer === k && B.declarer === k) { dn++; onW += A.win; offW += B.win; }
      else if (A.friend === k && B.friend === k && A.friend !== A.declarer &&
               A.declarer === B.declarer) { fn++; fOnW += A.win; fOffW += B.win; }
    }
    console.log(`  ${persona.padEnd(9)} NN주공 여당승률 정상 ${pct(onW, dn)} → 차단 ${pct(offW, dn)} ` +
                `(Δ${((offW-onW)/dn*100).toFixed(1)}pt, n=${dn})`);
    console.log(`            NN프렌드 여당승률 정상 ${pct(fOnW, fn)} → 차단 ${pct(fOffW, fn)} ` +
                `(Δ${((fOffW-fOnW)/fn*100).toFixed(1)}pt, n=${fn})`);
  }
})();
