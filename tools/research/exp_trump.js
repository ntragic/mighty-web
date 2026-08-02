/**
 * 프렌드 기루다 리드 개입 실험: 프렌드 좌석의 "기루다 정리"를 강제/억제해 승률 기여도 측정.
 * 개입은 플레이 페이즈 + 프렌드 공개 후 + 프렌드가 리드하는 시점에만 적용 →
 * 딜·계약·프렌드 정체가 조건간 동일 (페어드 비교).
 *
 * 사용: node exp_trump.js [게임수] [agent=nn|adv] [조건...]
 *   조건: base | force | force2 | suppress
 */
'use strict';
const E = require('../../src/mighty-engine.js');
const M = require('../../src/mighty-master.js');
const { Metrics } = require('./metrics.js');
const ort = require(process.env.ORT_PATH || 'onnxruntime-node');
const MODEL = process.env.MODEL || require('path').join(__dirname, '../../web/model/mighty_master_v4.onnx');
const NUM = 5;

const isTrump = (c, gir) => gir !== 'N' && !E.isJoker(c) && c.suit === gir;
const isKey = (c, g) => E.isJoker(c) || E.sameCard(c, g.mightyCard);

/** 개입: 프렌드가 리드하는 시점의 action을 조건에 맞게 교체 */
function intervene(g, seat, act, cond) {
  if (cond === 'base') return act;
  if (g.phase !== 'play' || g.play.table.length !== 0) return act;   // 리드 시점만
  if (!g.friendRevealed || g.friend === null || g.friend !== seat) return act;
  const gir = g.contract.giruda;
  if (gir === 'N') return act;
  const legal = g.legalActions().filter(m => m.card);
  const trumps = legal.filter(m => isTrump(m.card, gir));
  if (cond === 'force' || cond === 'force2') {
    if (!trumps.length) return act;
    if (cond === 'force2' && trumps.length < 2) return act;
    // 가장 센 기루다로 리드 (상대 기루다 뽑기 목적)
    let best = trumps[0];
    for (const m of trumps) if (m.card.rank > best.card.rank) best = m;
    return best;
  }
  if (cond === 'suppress') {
    if (!act.card || !isTrump(act.card, gir)) return act;
    const alt = legal.filter(m => !isTrump(m.card, gir) && !isKey(m.card, g));
    if (!alt.length) return act;
    let best = alt[0];
    for (const m of alt) if (m.card.rank > best.card.rank) best = m;
    return best;
  }
  return act;
}

/**
 * agentKind: 'nn' 전원 NN | 'adv' 전원 고급 휴리스틱
 *          | 'mix' hSeat만 고급 휴리스틱(사람 주공 대리), 나머지 NN.
 *            mix는 hSeat가 실제 주공이 된 판만 유효 — 아니면 입찰 직후 조기 폐기.
 * probeOnly: 입찰 종료 시점에 주공만 확인하고 중단 (자격 판정용)
 */
async function play(seed, persona, agentKind, cond, sess, hSeat, probeOnly) {
  const g = new E.MightyGame({ seed });
  const agent = new E.HeuristicAgent(E.PERSONAS[persona], g.rng, { tier: 'advanced' });
  g.start(Math.floor(g.rng() * NUM));
  if (g.phase === 'redeal') return null;
  const ob = new Metrics();
  const picks = [[], [], [], [], []];
  let guard = 0;
  while (g.phase !== 'done') {
    if (g.phase === 'redeal' || ++guard > 800) return null;
    if (g.phase !== 'bidding' && agentKind === 'mix') {
      if (g.declarer !== hSeat) return null;          // 자격 미달 딜: 조기 폐기
      if (probeOnly) return { qualified: true };
    }
    const seat = g.currentPlayer;
    const useNN = agentKind === 'nn' || (agentKind === 'mix' && seat !== hSeat);
    let act;
    if (useNN) {
      const a = await M.chooseAction(sess, ort, g, seat, picks[seat]);
      act = M.actionToEngine(a, g, picks[seat]);
      if (!act) continue;
    } else {
      act = agent.act(g);
    }
    act = intervene(g, seat, act, cond);
    ob.record(g, act);
    g.act(act);
  }
  const r = g.result;
  const fr = (r.friend != null && r.friend !== r.declarer) ? r.friend : null;
  const rulingPrize = r.prizes[r.declarer] + (fr != null ? r.prizes[fr] : 0);
  const m = fr != null ? ob.finish(g)[fr].post : null;
  return { win: !!r.win, rulingPrize, hasFriend: fr != null, fm: m,
           contract: `${r.contract.giruda}${r.contract.count}` };
}

const pct = (a, b) => b ? (a / b * 100).toFixed(1) + '%' : '—';
const se = (arr) => {
  const n = arr.length, mu = arr.reduce((s, x) => s + x, 0) / n;
  const v = arr.reduce((s, x) => s + (x - mu) * (x - mu), 0) / (n - 1);
  return [mu, Math.sqrt(v / n)];
};

(async () => {
  const N = parseInt(process.argv[2] || '400', 10);
  const agentKind = process.argv[3] || 'nn';
  const conds = process.argv.slice(4).length ? process.argv.slice(4)
                                             : ['base', 'force', 'force2', 'suppress'];
  const sess = agentKind !== 'adv' ? await ort.InferenceSession.create(MODEL) : null;
  console.log(`프렌드 기루다 리드 개입 실험 (${agentKind}${agentKind === 'nn' ? '=' + MODEL : ''}, ` +
              `${agentKind === 'mix' ? '주공석만 고급 휴리스틱 + 나머지 NN' : '5석 동일 에이전트'}, ` +
              `${N}판/조건, 동일 딜)`);

  // 조건별 결과를 딜 단위로 모아 페어드 비교
  const res = {};
  for (const c of conds) res[c] = { win: [], prize: [], fg: 0, fgc: 0, pull: 0, leads: 0 };
  let seed = 700000, n = 0, probed = 0, tried = 0;
  while (n < N) {
    const s = ++seed;
    const persona = ['gambler', 'balanced', 'careful'][n % 3];
    tried++;
    const hSeat = n % NUM;
    if (agentKind === 'mix') {                       // 자격 판정 먼저 (플레이 비용 회피)
      const q = await play(s, persona, agentKind, 'base', sess, hSeat, true);
      if (!q) continue;
      probed++;
    }
    const rows = [];
    let ok = true;
    for (const c of conds) {
      const r = await play(s, persona, agentKind, c, sess, hSeat, false);
      if (!r || !r.hasFriend) { ok = false; break; }
      rows.push(r);
    }
    if (!ok) continue;
    // 계약이 조건간 동일한지 확인 (개입은 플레이 페이즈 한정이므로 같아야 함)
    if (rows.some(r => r.contract !== rows[0].contract)) continue;
    n++;
    conds.forEach((c, i) => {
      const r = rows[i], a = res[c];
      a.win.push(r.win ? 1 : 0); a.prize.push(r.rulingPrize);
      if (r.fm) { a.fg += r.fm.trumpLeadForgone; a.fgc += r.fm.trumpLeadChance;
                  a.pull += r.fm.trumpPull; a.leads += r.fm.leads; }
    });
    if (n % 50 === 0) process.stderr.write(`  ${n}/${N}\r`);
  }

  console.log(`\n프렌드 있는 판 ${n}판 (조건간 계약 동일)` +
    (agentKind === 'mix' ? `  | 시도 ${tried}딜, 주공자격 ${probed}딜` : ''));
  const b = res[conds[0]];
  for (const c of conds) {
    const a = res[c];
    const [wm, ws] = se(a.win), [pm, ps] = se(a.prize);
    let d = '';
    if (c !== conds[0]) {
      const dw = a.win.map((x, i) => x - b.win[i]);
      const dp = a.prize.map((x, i) => x - b.prize[i]);
      const [dwm, dws] = se(dw), [dpm, dps] = se(dp);
      d = `  | Δ승률 ${(dwm * 100 >= 0 ? '+' : '')}${(dwm * 100).toFixed(1)}±${(dws * 100).toFixed(1)}pt` +
          `  Δ여당상금 ${dpm >= 0 ? '+' : ''}${dpm.toFixed(0)}±${dps.toFixed(0)}`;
    }
    console.log(`  ${c.padEnd(9)} 여당승률 ${(wm * 100).toFixed(1)}±${(ws * 100).toFixed(1)}%  ` +
      `여당상금 ${pm >= 0 ? '+' : ''}${pm.toFixed(0)}±${ps.toFixed(0)}  ` +
      `[프렌드 공개후 기루다회피 ${pct(a.fg, a.fgc)} (${a.fg}/${a.fgc})  ` +
      `기루다뽑기 ${pct(a.pull, a.leads)}]${d}`);
  }
})();
