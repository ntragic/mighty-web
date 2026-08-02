/**
 * 기루다 3장 이하 입찰 강제 패스 개입 실험.
 * 실전 조건(NN 1석 vs 고급 휴리스틱 4석)에서 NN 좌석 입찰만 교체.
 * 입찰을 바꾸면 계약·역할이 달라지므로, 성과는 "그 좌석의 상금"으로 잰다(역할 무관).
 * 전원 패스로 재딜이 나면 상금 0으로 집계하고 비율을 따로 보고.
 * 사용: node exp_bidpass.js [트리거판수] [임계장수]   env: MODEL=
 */
'use strict';
const E = require('../../src/mighty-engine.js');
const M = require('../../src/mighty-master.js');
const ort = require(process.env.ORT_PATH || 'onnxruntime-node');
const MODEL = process.env.MODEL || require('path').join(__dirname, '../../web/model/mighty_master_v4.onnx');
const NUM = 5;

async function play(seed, persona, cond, sess, nnSeat, thresh) {
  const g = new E.MightyGame({ seed });
  const agent = new E.HeuristicAgent(E.PERSONAS[persona], g.rng, { tier: 'advanced' });
  g.start(Math.floor(g.rng() * NUM));
  if (g.phase === 'redeal') return null;
  const picks = [[], [], [], [], []];
  let guard = 0, trigger = false, declFeat = null;
  while (g.phase !== 'done') {
    if (++guard > 800) return null;
    if (g.phase === 'redeal')                       // 전원 패스 → 재딜
      return { redeal: true, trigger, seatPrize: 0, role: 'redeal' };
    const seat = g.currentPlayer;
    let act;
    if (seat === nnSeat) {
      const a = await M.chooseAction(sess, ort, g, seat, picks[seat]);
      act = M.actionToEngine(a, g, picks[seat]);
      if (!act) continue;
      // 트리거: 기루다 무늬가 3장 이하인데 입찰 (노기루다는 제외 — NN의 강점 구간)
      if (g.phase === 'bidding' && act.type === 'bid' && act.giruda !== 'N') {
        const len = g.hands[seat].filter(c => !E.isJoker(c) && c.suit === act.giruda).length;
        if (len <= thresh) {
          trigger = true;
          if (cond === 'forcePass') act = { type: 'pass' };
        }
      }
    } else {
      act = agent.act(g);
    }
    const wasBidding = g.phase === 'bidding';
    g.act(act);
    if (wasBidding && g.phase !== 'bidding' && g.declarer != null && !declFeat) {
      // 낙찰 확정 시점: 주공 손패 10장 (바닥패 교환 전)
      const gir = g.contract.giruda;
      declFeat = { declarer: g.declarer, giruda: gir,
        girudaLen: gir === 'N' ? -1
          : g.hands[g.declarer].filter(c => !E.isJoker(c) && c.suit === gir).length };
    }
  }
  const r = g.result;
  const fr = (r.friend != null && r.friend !== r.declarer) ? r.friend : null;
  return { redeal: false, trigger, declFeat, seatPrize: r.prizes[nnSeat],
           role: nnSeat === r.declarer ? 'declarer' : (nnSeat === fr ? 'friend' : 'defender'),
           win: !!r.win, declarer: r.declarer };
}

const pct = (a, b) => b ? (a / b * 100).toFixed(1) + '%' : '—';
const se = arr => {
  const n = arr.length, mu = arr.reduce((s, x) => s + x, 0) / n;
  if (n < 2) return [mu, 0];
  return [mu, Math.sqrt(arr.reduce((s, x) => s + (x - mu) ** 2, 0) / (n - 1) / n)];
};

(async () => {
  const N = parseInt(process.argv[2] || '300', 10);
  const thresh = parseInt(process.argv[3] || '3', 10);
  const sess = await ort.InferenceSession.create(MODEL);
  const conds = ['base', 'forcePass'];
  const res = { base: { p: [], role: {}, redeal: 0 }, forcePass: { p: [], role: {}, redeal: 0 } };
  let seed = 700000, n = 0, tried = 0;
  while (n < N) {
    const s = ++seed; tried++;
    const persona = ['gambler', 'balanced', 'careful'][n % 3];
    const nnSeat = n % NUM;
    const b = await play(s, persona, 'base', sess, nnSeat, thresh);
    // 자격: base에서 NN이 실제로 기루다 thresh장 이하로 낙찰한 판만
    if (!b || b.redeal || !b.declFeat) continue;
    if (b.declFeat.declarer !== nnSeat) continue;
    if (b.declFeat.giruda === 'N' || b.declFeat.girudaLen > thresh) continue;
    const f = await play(s, persona, 'forcePass', sess, nnSeat, thresh);
    if (!f) continue;
    n++;
    for (const [c, r] of [['base', b], ['forcePass', f]]) {
      res[c].p.push(r.seatPrize);
      res[c].role[r.role] = (res[c].role[r.role] || 0) + 1;
      if (r.redeal) res[c].redeal++;
    }
    if (n % 50 === 0) process.stderr.write(`  ${n}/${N} (${tried}딜)\r`);
  }
  console.log(`\n기루다 ${thresh}장 이하 입찰 강제 패스 (${MODEL}, NN 1석 vs 고급 휴리스틱 4석)`);
  console.log(`  트리거 ${n}판 / 시도 ${tried}딜 = ${pct(n, tried)}`);
  for (const c of conds) {
    const [m, s2] = se(res[c].p);
    const roles = Object.entries(res[c].role).sort()
      .map(([k, v]) => `${k} ${pct(v, n)}`).join('  ');
    console.log(`  ${c.padEnd(10)} 좌석상금 ${m >= 0 ? '+' : ''}${m.toFixed(0)}±${s2.toFixed(0)}  ` +
      `재딜 ${pct(res[c].redeal, n)}  | 역할 ${roles}`);
  }
  const d = res.forcePass.p.map((x, i) => x - res.base.p[i]);
  const [dm, ds] = se(d);
  console.log(`  Δ(강제패스 − 그대로) 좌석상금 ${dm >= 0 ? '+' : ''}${dm.toFixed(0)}±${ds.toFixed(0)}`);
})();
