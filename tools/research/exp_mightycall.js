/**
 * "주공이 마이티 미보유인데 조커 프렌드" 케이스 분석 + 개입 실험.
 *  - 마이티가 어느 팀에 떨어졌는지(프렌드/야당/바닥패)별 승률
 *  - base(그대로) vs forceMighty(마이티 콜로 강제 교체) 페어드 비교
 * 트리거 안 걸리는 딜은 프렌드 선언 직후 조기 폐기.
 * 사용: node exp_mightycall.js [트리거판수]   env: MODEL=
 */
'use strict';
const E = require('../../src/mighty-engine.js');
const M = require('../../src/mighty-master.js');
const ort = require(process.env.ORT_PATH || 'onnxruntime-node');
const MODEL = process.env.MODEL || require('path').join(__dirname, '../../web/model/mighty_master_v4.onnx');
const NUM = 5;

async function play(seed, persona, cond, sess, probeOnly) {
  const g = new E.MightyGame({ seed });
  new E.HeuristicAgent(E.PERSONAS[persona], g.rng, { tier: 'advanced' });  // rng 소비 정렬용
  g.start(Math.floor(g.rng() * NUM));
  if (g.phase === 'redeal') return null;
  const picks = [[], [], [], [], []];
  let guard = 0, info = null;
  while (g.phase !== 'done') {
    if (g.phase === 'redeal' || ++guard > 800) return null;
    const seat = g.currentPlayer;
    const atFriend = g.phase === 'friend';
    const a = await M.chooseAction(sess, ort, g, seat, picks[seat]);
    let act = M.actionToEngine(a, g, picks[seat]);
    if (!act) continue;
    if (atFriend) {
      const mc = g.mightyCard;
      const declHasMighty = g.hands[g.declarer].some(c => E.sameCard(c, mc));
      const trigger = act.mode === 'card' && act.card && E.isJoker(act.card) && !declHasMighty;
      if (!trigger) return null;                       // 트리거 미발생 딜 폐기
      if (probeOnly) return { trigger: true };
      // 마이티가 실제로 어디 있는지
      let holder = null;
      for (let p = 0; p < NUM; p++) if (g.hands[p].some(c => E.sameCard(c, mc))) { holder = p; break; }
      const inFloor = holder === null && g.discard.some(c => E.sameCard(c, mc));
      info = { holder, inFloor, giruda: g.contract.giruda, count: g.contract.count };
      if (cond === 'forceMighty') act = { type: 'friend', mode: 'card', card: mc };
    }
    g.act(act);
  }
  const r = g.result;
  const fr = (r.friend != null && r.friend !== r.declarer) ? r.friend : null;
  info.win = !!r.win;
  info.rulingPrize = r.prizes[r.declarer] + (fr != null ? r.prizes[fr] : 0);
  info.friendSeat = fr;
  info.mightyTeam = info.inFloor ? 'floor'
    : (info.holder === r.declarer || info.holder === fr) ? 'ruling' : 'opp';
  info.contract = `${r.contract.giruda}${r.contract.count}`;
  return info;
}

const pct = (a, b) => b ? (a / b * 100).toFixed(1) + '%' : '—';
const se = arr => {
  const n = arr.length, mu = arr.reduce((s, x) => s + x, 0) / n;
  if (n < 2) return [mu, 0];
  return [mu, Math.sqrt(arr.reduce((s, x) => s + (x - mu) ** 2, 0) / (n - 1) / n)];
};

(async () => {
  const N = parseInt(process.argv[2] || '150', 10);
  const sess = await ort.InferenceSession.create(MODEL);
  const conds = ['base', 'forceMighty'];
  const res = { base: { win: [], prize: [] }, forceMighty: { win: [], prize: [] } };
  const land = { ruling: { n: 0, win: 0 }, opp: { n: 0, win: 0 }, floor: { n: 0, win: 0 } };
  let seed = 700000, n = 0, tried = 0;
  while (n < N) {
    const s = ++seed; tried++;
    const persona = ['gambler', 'balanced', 'careful'][n % 3];
    const q = await play(s, persona, 'base', sess, true);
    if (!q) continue;
    const rows = [];
    let ok = true;
    for (const c of conds) {
      const r = await play(s, persona, c, sess, false);
      if (!r) { ok = false; break; }
      rows.push(r);
    }
    if (!ok || rows[0].contract !== rows[1].contract) continue;
    n++;
    conds.forEach((c, i) => { res[c].win.push(rows[i].win ? 1 : 0); res[c].prize.push(rows[i].rulingPrize); });
    const L = land[rows[0].mightyTeam]; L.n++; if (rows[0].win) L.win++;
    if (n % 25 === 0) process.stderr.write(`  ${n}/${N} (${tried}딜 시도)\r`);
  }
  console.log(`\n"주공 마이티 미보유 + 조커 프렌드 콜" 분석 (${MODEL})`);
  console.log(`  트리거 ${n}판 / 시도 ${tried}딜 = ${pct(n, tried)}`);
  console.log(`\n  base에서 마이티가 떨어진 곳별 결과`);
  for (const k of ['ruling', 'opp', 'floor'])
    console.log(`    ${({ ruling: '여당(프렌드)', opp: '야당', floor: '바닥패' })[k].padEnd(14)} ` +
      `${String(land[k].n).padStart(4)}건 ${pct(land[k].n, n).padStart(6)}  여당승률 ${pct(land[k].win, land[k].n)}`);
  console.log(`\n  개입 비교 (같은 딜·같은 계약)`);
  const [bw, bws] = se(res.base.win), [bp, bps] = se(res.base.prize);
  const [fw, fws] = se(res.forceMighty.win), [fp, fps] = se(res.forceMighty.prize);
  const dw = res.forceMighty.win.map((x, i) => x - res.base.win[i]);
  const dp = res.forceMighty.prize.map((x, i) => x - res.base.prize[i]);
  const [dwm, dws] = se(dw), [dpm, dps] = se(dp);
  console.log(`    base(조커 콜)     여당승률 ${(bw * 100).toFixed(1)}±${(bws * 100).toFixed(1)}%  여당상금 ${bp >= 0 ? '+' : ''}${bp.toFixed(0)}±${bps.toFixed(0)}`);
  console.log(`    forceMighty(교체) 여당승률 ${(fw * 100).toFixed(1)}±${(fws * 100).toFixed(1)}%  여당상금 ${fp >= 0 ? '+' : ''}${fp.toFixed(0)}±${fps.toFixed(0)}`);
  console.log(`    Δ(마이티 콜 − 조커 콜) 승률 ${dwm * 100 >= 0 ? '+' : ''}${(dwm * 100).toFixed(1)}±${(dws * 100).toFixed(1)}pt  ` +
    `여당상금 ${dpm >= 0 ? '+' : ''}${dpm.toFixed(0)}±${dps.toFixed(0)}`);
})();
