/**
 * 주공이 마이티를 못 쥔 판에서 프렌드 선언 방식 3종 비교.
 *   base   학습 정책 그대로 (후처리 off)
 *   mighty 마이티 카드 콜 강제 (현행 후처리와 동일)
 *   first  초구 프렌드 강제
 * 같은 딜·같은 계약 페어드. 주공의 조커 보유 여부로 나눠 본다.
 * 사용: node exp_friendmode.js [트리거판수]   env: MODEL=
 */
'use strict';
const E = require('../../src/mighty-engine.js');
const M = require('../../src/mighty-master.js');
const ort = require(process.env.ORT_PATH || 'onnxruntime-node');
const MODEL = process.env.MODEL || require('path').join(__dirname, '../../web/model/mighty_master_v4.onnx');
const NUM = 5;
M.setFriendCallFix('off');            // 원 정책을 재기 위해 후처리는 끈다

async function play(seed, persona, cond, sess) {
  const g = new E.MightyGame({ seed });
  new E.HeuristicAgent(E.PERSONAS[persona], g.rng, { tier: 'advanced' });
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
      const mc = g.mightyCard, hand = g.hands[g.declarer];
      if (hand.some(c => E.sameCard(c, mc))) return null;      // 마이티 보유 판은 제외
      info = { hasJoker: hand.some(c => E.isJoker(c)),
               baseMode: act.mode,
               baseCard: act.card ? (E.isJoker(act.card) ? 'JOKER'
                 : (E.sameCard(act.card, mc) ? 'MIGHTY' : 'other')) : null,
               giruda: g.contract.giruda, count: g.contract.count };
      if (cond === 'mighty') act = { type: 'friend', mode: 'card', card: mc };
      else if (cond === 'first') act = { type: 'friend', mode: 'first' };
    }
    g.act(act);
  }
  const r = g.result;
  const fr = (r.friend != null && r.friend !== r.declarer) ? r.friend : null;
  info.win = !!r.win;
  info.rulingPrize = r.prizes[r.declarer] + (fr != null ? r.prizes[fr] : 0);
  info.selfFriend = fr === null;
  info.contract = `${r.contract.giruda}${r.contract.count}`;
  return info;
}

const pct = (a, b) => b ? (a / b * 100).toFixed(1) + '%' : '—';
const se = arr => {
  const n = arr.length; if (!n) return [0, 0];
  const mu = arr.reduce((s, x) => s + x, 0) / n;
  if (n < 2) return [mu, 0];
  return [mu, Math.sqrt(arr.reduce((s, x) => s + (x - mu) ** 2, 0) / (n - 1) / n)];
};
const CONDS = ['base', 'mighty', 'first'];

function report(title, rows) {
  if (!rows.length) { console.log(`\n${title}: 표본 없음`); return; }
  console.log(`\n${title}  (${rows.length}판)`);
  const get = (c, f) => rows.map(r => f(r[c]));
  for (const c of CONDS) {
    const [w, ws] = se(get(c, x => x.win ? 1 : 0));
    const [p, ps] = se(get(c, x => x.rulingPrize));
    const self = rows.filter(r => r[c].selfFriend).length;
    let d = '';
    if (c !== 'base') {
      const dw = rows.map(r => (r[c].win ? 1 : 0) - (r.base.win ? 1 : 0));
      const dp = rows.map(r => r[c].rulingPrize - r.base.rulingPrize);
      const [dwm, dws] = se(dw), [dpm, dps] = se(dp);
      d = `  | Δ승률 ${dwm * 100 >= 0 ? '+' : ''}${(dwm * 100).toFixed(1)}±${(dws * 100).toFixed(1)}pt` +
          `  Δ상금 ${dpm >= 0 ? '+' : ''}${dpm.toFixed(0)}±${dps.toFixed(0)}`;
    }
    console.log(`  ${c.padEnd(7)} 여당승률 ${(w * 100).toFixed(1)}±${(ws * 100).toFixed(1)}%  ` +
      `여당상금 ${p >= 0 ? '+' : ''}${p.toFixed(0)}±${ps.toFixed(0)}  ` +
      `셀프화 ${pct(self, rows.length)}${d}`);
  }
}

(async () => {
  const N = parseInt(process.argv[2] || '400', 10);
  const sess = await ort.InferenceSession.create(MODEL);
  const all = [];
  let seed = 700000, n = 0, tried = 0;
  while (n < N) {
    const s = ++seed; tried++;
    const persona = ['gambler', 'balanced', 'careful'][n % 3];
    const row = {};
    let ok = true;
    for (const c of CONDS) {
      const r = await play(s, persona, c, sess);
      if (!r) { ok = false; break; }
      row[c] = r;
    }
    if (!ok || row.mighty.contract !== row.base.contract ||
        row.first.contract !== row.base.contract) continue;
    n++; all.push(row);
    if (n % 50 === 0) process.stderr.write(`  ${n}/${N} (${tried}딜)\r`);
  }
  console.log(`\n주공 마이티 미보유 판의 프렌드 선언 방식 비교 (${MODEL}, 5석 전원 NN)`);
  console.log(`  트리거 ${n}판 / 시도 ${tried}딜 = ${pct(n, tried)}`);
  const bm = all.filter(r => r.base.baseCard === 'MIGHTY').length;
  console.log(`  base 정책 분포: 마이티콜 ${pct(bm, n)}  ` +
    `조커콜 ${pct(all.filter(r => r.base.baseCard === 'JOKER').length, n)}  ` +
    `기타카드 ${pct(all.filter(r => r.base.baseCard === 'other').length, n)}  ` +
    `초구 ${pct(all.filter(r => r.base.baseMode === 'first').length, n)}`);
  report('[전체]', all);
  report('[주공이 조커 보유]', all.filter(r => r.base.hasJoker));
  report('[주공이 조커 미보유]', all.filter(r => !r.base.hasJoker));
  report('[base가 마이티를 안 부른 판]', all.filter(r => r.base.baseCard !== 'MIGHTY'));
})();
