/**
 * 단계별 결정 확신도 진단: 합법 행동에 대한 softmax 최대확률·엔트로피를 페이즈별로 잰다.
 * 학습 부족(갈팡질팡)인지 무차별(둘 다 비슷해서 못 고름)인지 구분하기 위한 것.
 * 프렌드 선언은 "주공이 마이티 보유/미보유"로 나눠 본다.
 * 사용: node exp_confidence.js [게임수]   env: MODEL=
 */
'use strict';
const E = require('../../src/mighty-engine.js');
const M = require('../../src/mighty-master.js');
const ort = require(process.env.ORT_PATH || 'onnxruntime-node');
const MODEL = process.env.MODEL || require('path').join(__dirname, '../../web/model/mighty_master_v4.onnx');
const NUM = 5, ACT = 209;

/** 합법 행동만 softmax → {maxP, ent, nLegal, top2gap} */
function stats(logits, mask) {
  const idx = [];
  for (let i = 0; i < ACT; i++) if (mask[i]) idx.push(i);
  let mx = -Infinity;
  for (const i of idx) if (logits[i] > mx) mx = logits[i];
  let z = 0; const p = [];
  for (const i of idx) { const e = Math.exp(logits[i] - mx); p.push(e); z += e; }
  let maxP = 0, ent = 0;
  for (const q of p) { const pr = q / z; if (pr > maxP) maxP = pr; if (pr > 0) ent -= pr * Math.log(pr); }
  const sorted = p.map(q => q / z).sort((a, b) => b - a);
  return { maxP, ent, nLegal: idx.length, gap: sorted[0] - (sorted[1] || 0),
           entNorm: idx.length > 1 ? ent / Math.log(idx.length) : 0 };
}

async function run(sess, game, seat, pick) {
  let obs = M.encodeObs(game, seat, pick);
  const mask = M.legalMask(game, pick);
  const out = await sess.run({
    obs: new ort.Tensor('float32', obs, [1, obs.length]),
    mask: new ort.Tensor('bool', mask, [1, ACT]),
  });
  return { s: stats(out.logits.data, mask), logits: out.logits.data, mask };
}

const A = () => ({ n: 0, maxP: 0, ent: 0, entNorm: 0, gap: 0, nLegal: 0 });
const add = (a, s) => { a.n++; a.maxP += s.maxP; a.ent += s.ent; a.entNorm += s.entNorm; a.gap += s.gap; a.nLegal += s.nLegal; };
const show = (label, a) => console.log(`  ${label.padEnd(26)} n=${String(a.n).padStart(6)}  ` +
  `최대확률 ${(a.maxP / a.n).toFixed(3)}  엔트로피 ${(a.ent / a.n).toFixed(3)}  ` +
  `정규엔트로피 ${(a.entNorm / a.n).toFixed(3)}  1-2위격차 ${(a.gap / a.n).toFixed(3)}  ` +
  `합법수 ${(a.nLegal / a.n).toFixed(1)}`);

(async () => {
  const N = parseInt(process.argv[2] || '300', 10);
  const sess = await ort.InferenceSession.create(MODEL);
  const P = { bidding: A(), floor: A(), play: A(), dealMissWindow: A() };
  const F = { held: A(), notHeld: A() };
  let seed = 700000, n = 0;
  while (n < N) {
    const g = new E.MightyGame({ seed: ++seed });
    g.start(Math.floor(g.rng() * NUM));
    if (g.phase === 'redeal') continue;
    const picks = [[], [], [], [], []];
    let guard = 0, ok = true;
    while (g.phase !== 'done') {
      if (g.phase === 'redeal' || ++guard > 800) { ok = false; break; }
      const seat = g.currentPlayer, ph = g.phase;
      const r = await run(sess, g, seat, picks[seat]);
      if (ph === 'friend') {
        const held = g.hands[g.declarer].some(c => E.sameCard(c, g.mightyCard));
        add(held ? F.held : F.notHeld, r.s);
      } else if (P[ph]) add(P[ph], r.s);
      let best = -1, bv = -Infinity;
      for (let i = 0; i < ACT; i++) if (r.mask[i] && r.logits[i] > bv) { bv = r.logits[i]; best = i; }
      const act = M.actionToEngine(best, g, picks[seat]);
      if (!act) continue;
      g.act(act);
    }
    if (ok) n++;
  }
  console.log(`\n단계별 결정 확신도 (${MODEL}, ${n}판, 5석 전원 NN)`);
  console.log(`  정규엔트로피 = 엔트로피 / log(합법수). 0=단호, 1=완전 무작위.`);
  for (const k of ['bidding', 'floor', 'play', 'dealMissWindow']) if (P[k].n) show(k, P[k]);
  console.log(`  프렌드 선언`);
  if (F.held.n) show('  마이티 보유(정석 제약)', F.held);
  if (F.notHeld.n) show('  마이티 미보유(문제 구간)', F.notHeld);
})();
