/**
 * 입찰 로직 점검: 낙찰 시점의 패 구성 대비 공약을 기록해 과대입찰 구간을 찾는다.
 * 사용: node exp_bidding.js [게임수] [구성...]
 *   구성: nnall(5석 NN) | advall(5석 고급) | nnseat(NN 1석 vs 고급 4석)
 */
'use strict';
const E = require('../../src/mighty-engine.js');
const M = require('../../src/mighty-master.js');
const ort = require(process.env.ORT_PATH || 'onnxruntime-node');
const MODEL = process.env.MODEL || require('path').join(__dirname, '../../web/model/mighty_master_v4.onnx');
const NUM = 5;

/** 낙찰 직후(바닥패 교환 전) 주공 10장의 세기 */
function handFeat(hand, giruda, mightyCard) {
  const f = { mighty: 0, joker: 0, girudaLen: 0, aces: 0, points: 0, girudaTop: 0 };
  for (const c of hand) {
    if (E.isJoker(c)) { f.joker = 1; continue; }
    if (E.sameCard(c, mightyCard)) f.mighty = 1;
    if (c.rank === 14) f.aces++;
    if (c.rank >= 10) f.points++;
    if (giruda !== 'N' && c.suit === giruda) {
      f.girudaLen++;
      if (c.rank >= 12) f.girudaTop++;
    }
  }
  return f;
}

async function play(seed, persona, mode, nnSeat, sess) {
  const g = new E.MightyGame({ seed });
  const agent = new E.HeuristicAgent(E.PERSONAS[persona], g.rng, { tier: 'advanced' });
  g.start(Math.floor(g.rng() * NUM));
  if (g.phase === 'redeal') return null;
  const picks = [[], [], [], [], []];
  let guard = 0, feat = null, bidCount = 0;
  while (g.phase !== 'done') {
    if (g.phase === 'redeal' || ++guard > 800) return null;
    const seat = g.currentPlayer;
    const wasBidding = g.phase === 'bidding';
    const useNN = mode === 'nnall' || (mode === 'nnseat' && seat === nnSeat);
    let act;
    if (useNN) {
      const a = await M.chooseAction(sess, ort, g, seat, picks[seat]);
      act = M.actionToEngine(a, g, picks[seat]);
      if (!act) continue;
    } else {
      act = agent.act(g);
    }
    if (wasBidding && act.type === 'bid') bidCount++;
    g.act(act);
    if (wasBidding && g.phase !== 'bidding' && g.declarer != null && !feat) {
      // 낙찰 확정 시점: 주공 손패는 아직 10장
      feat = handFeat(g.hands[g.declarer], g.contract.giruda, g.mightyCard);
      feat.giruda = g.contract.giruda;
      feat.count = g.contract.count;
      feat.declarer = g.declarer;
      feat.declByNN = mode === 'nnall' || (mode === 'nnseat' && g.declarer === nnSeat);
      feat.bids = bidCount;
    }
  }
  if (!feat) return null;
  const r = g.result;
  feat.win = !!r.win;
  feat.prize = r.prizes[r.declarer];
  feat.yeodang = r.yeodangPoints;
  return feat;
}

const pct = (a, b) => b ? (a / b * 100).toFixed(1) + '%' : '—';
const mean = a => a.length ? (a.reduce((s, x) => s + x, 0) / a.length) : 0;
const G = () => ({ n: 0, win: 0, prize: [], pts: [], gl: [], pt: [], mg: 0, jk: 0, cnt: [] });
const push = (g, r) => {
  g.n++; if (r.win) g.win++; g.prize.push(r.prize); g.pts.push(r.yeodang);
  g.gl.push(r.girudaLen); g.pt.push(r.points); g.mg += r.mighty; g.jk += r.joker; g.cnt.push(r.count);
};
const line = (label, g) => `    ${label.padEnd(20)} ${String(g.n).padStart(4)}건  ` +
  `주공승률 ${pct(g.win, g.n).padStart(6)}  주공상금 ${mean(g.prize) >= 0 ? '+' : ''}${mean(g.prize).toFixed(0).padStart(5)}  ` +
  `획득점수 ${mean(g.pts).toFixed(1).padStart(4)}`;

(async () => {
  const N = parseInt(process.argv[2] || '800', 10);
  const modes = process.argv.slice(3).length ? process.argv.slice(3) : ['nnall', 'advall'];
  const sess = modes.some(m => m !== 'advall') ? await ort.InferenceSession.create(MODEL) : null;
  console.log(`입찰 점검 (${N}판/구성, nn=${MODEL})`);
  for (const mode of modes) {
    const byCount = {}, byMighty = { 'M+J+': G(), 'M+J-': G(), 'M-J+': G(), 'M-J-': G() };
    const byGirudaLen = {}, byGiruda = {};
    let seed = 700000, n = 0, all = G();
    while (n < N) {
      const s = ++seed;
      const persona = ['gambler', 'balanced', 'careful'][n % 3];
      const r = await play(s, persona, mode, n % NUM, sess);
      if (!r) continue;
      if (mode === 'nnseat' && !r.declByNN) continue;   // NN이 주공인 판만
      n++;
      push(all, r);
      (byCount[r.count] = byCount[r.count] || G()) && push(byCount[r.count], r);
      push(byMighty[`M${r.mighty ? '+' : '-'}J${r.joker ? '+' : '-'}`], r);
      const gl = r.giruda === 'N' ? 'NG' : Math.min(r.girudaLen, 7);
      (byGirudaLen[gl] = byGirudaLen[gl] || G()) && push(byGirudaLen[gl], r);
      (byGiruda[r.giruda] = byGiruda[r.giruda] || G()) && push(byGiruda[r.giruda], r);
      if (n % 100 === 0) process.stderr.write(`  ${mode} ${n}/${N}\r`);
    }
    console.log(`\n### ${mode}`);
    console.log(line('전체', all));
    console.log(`  공약별`);
    for (const k of Object.keys(byCount).sort((a, b) => a - b)) console.log(line(`공약 ${k}`, byCount[k]));
    console.log(`  마이티·조커 보유별 (낙찰 시점, 바닥패 교환 전)`);
    for (const k of ['M+J+', 'M+J-', 'M-J+', 'M-J-']) console.log(line(k, byMighty[k]));
    console.log(`  기루다 장수별`);
    for (const k of Object.keys(byGirudaLen).sort()) console.log(line(`기루다 ${k}장`, byGirudaLen[k]));
    console.log(`  기루다 무늬별 (+ 낙찰 패 구성)`);
    for (const k of Object.keys(byGiruda).sort()) {
      const g2 = byGiruda[k];
      console.log(line(`기루다 ${k}`, g2) +
        `  | 기루다 ${mean(g2.gl).toFixed(2)}장  점수카드 ${mean(g2.pt).toFixed(2)}  ` +
        `마이티 ${pct(g2.mg, g2.n)}  조커 ${pct(g2.jk, g2.n)}  공약 ${mean(g2.cnt).toFixed(2)}`);
    }
  }
})();
