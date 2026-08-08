/**
 * dlead 인증 (전좌석 마스터) — 확정 야당(카드 프렌드 미보유·비주공)이 기루다를
 * 리드하기로 한 결정을, 정책 자신의 차선 비기루다 리드로 교체하면 이득인가.
 * (2026-08-08 제보: 야당 트릭2 ♣2 리드 추천 — 4후보 중 최하, 주공 정리 대행)
 * 교사는 임의 휴리스틱이 아니라 같은 정책의 로짓 argmax(기루다 제외) — 교체
 * 카드가 나빠서 실험이 오염되는 것을 막는다. 지표: 주공 상금(음수=야당 이득).
 * 사용: node tools/research/dlead_cert.js [판수]   env MODEL·SEED_BASE
 */
'use strict';
const path = require('path');
const P = p => path.join(__dirname, p);
const ort = require('onnxruntime-node');
const E = require(P('../../src/mighty-engine.js'));
const AI = require(P('../../src/mighty-ai.js'));
const M = require(P('../../src/mighty-master.js'));
const MODEL = process.env.MODEL || P('../../web/model/mighty_master_v6b.onnx');
const SEED0 = parseInt(process.env.SEED_BASE || '1500000', 10);
const PER = ['gambler', 'balanced', 'careful'];
const A_PLAY0 = 149, A_JS0 = 201, A_JOKER = 205;

async function nonTrumpBest(sess, g, seat) {
  // 정책 로짓에서 기루다 일반 플레이·조커콜 제외 argmax
  let obs = M.encodeObs(g, seat, []);
  const mask = M.legalMask(g, []);
  const want = M.modelObsDim(sess);
  if (want !== M.OBS_DIM) obs = obs.subarray(0, want);
  const out = await sess.run({
    obs: new ort.Tensor('float32', obs, [1, want]),
    mask: new ort.Tensor('bool', mask, [1, M.ACTION_DIM]),
  });
  const logits = out.logits.data;
  const gi = g.contract.giruda;
  let best = -1, bv = -Infinity;
  for (let i = 0; i < M.ACTION_DIM; i++) {
    if (!mask[i]) continue;
    if (i === 206) continue;                                   // 조커콜 제외
    if (i >= A_PLAY0 && i < A_PLAY0 + 52) {
      const card = idxCard(i - A_PLAY0);
      if (gi !== 'N' && card.suit === gi) continue;            // 기루다 제외
    }
    if (i >= A_JS0 && i < A_JS0 + 4) {
      if (gi !== 'N' && ['S','D','H','C'][i - A_JS0] === gi) continue; // 조커로 기루다 요구도 제외
    }
    if (logits[i] > bv) { bv = logits[i]; best = i; }
  }
  return best;
}
function idxCard(i) { return i === 52 ? 'JOKER' : { suit: ['S','D','H','C'][Math.floor(i / 13)], rank: i % 13 + 2 }; }

function fireCond(g, seat, act) {
  if (seat === g.declarer || act.jokerCall) return false;
  const pl = g.play;
  if (pl.table.length !== 0) return false;
  const gi = g.contract.giruda;
  if (gi === 'N') return false;
  const c = act.card;
  if (E.isJoker(c) || E.sameCard(c, g.mightyCard) || c.suit !== gi) return false;
  // 확정 야당: 카드 프렌드 판에서 프렌드 카드 미보유 (공개 전에도 좌석 가시 확정)
  const fd = g.friendDecl;
  if (!fd || fd.mode !== 'card' || !fd.card) return false;
  if (g.hands[seat].some(x => E.sameCard(x, fd.card))) return false;
  if (g.friendRevealed && g.friend === seat) return false;
  return true;
}

async function run(N, iv, sess) {
  const per = []; let hits = 0;
  for (let i = 0; i < N; i++) {
    const seed = SEED0 + i;
    const rng = E.makeRng(seed);
    const g = new E.MightyGame({ seed });
    const ag = [];
    for (let s = 0; s < E.NUM_PLAYERS; s++)
      ag.push(await AI.createAgent({ tier: 'master', persona: PER[s % 3], rng, session: sess, ort, keyGuard: true }));
    g.start(Math.floor(rng() * E.NUM_PLAYERS));
    let guard = 0, fired = 0;
    while (g.phase !== 'done' && g.phase !== 'redeal' && guard++ < 900) {
      const p = g.currentPlayer;
      let act = await ag[p].act(g, p);
      if (iv && g.phase === 'play' && act.type === 'play' && fireCond(g, p, act)) {
        const ai2 = await nonTrumpBest(sess, g, p);
        if (ai2 >= 0) {
          const alt = M.actionToEngine(ai2, g, []);
          if (alt && alt.type === 'play') { act = alt; hits++; fired++; }
        }
      }
      g.act(act);
    }
    per.push(g.phase === 'done'
      ? { seed, decl: g.declarer, prize: g.result.prizes[g.declarer], win: g.result.win, fired }
      : null);
  }
  return { per, hits };
}

(async () => {
  const N = parseInt(process.argv[2] || '800', 10);
  const sess = await ort.InferenceSession.create(MODEL);
  const base = await run(N, false, sess);
  const iv = await run(N, true, sess);
  const bm = new Map(base.per.filter(Boolean).map(r => [r.seed, r]));
  const diffs = [], fdiffs = []; let dWin = 0, fr = 0;
  for (const r of iv.per.filter(Boolean)) {
    const b = bm.get(r.seed);
    if (!b || b.decl !== r.decl) continue;
    const d = r.prize - b.prize;
    diffs.push(d);
    if (r.fired > 0) { fdiffs.push(d); fr++; dWin += (r.win ? 1 : 0) - (b.win ? 1 : 0); }
  }
  const st = a => { const n = a.length, m = a.reduce((x, y) => x + y, 0) / n;
    const sd = Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / (n - 1));
    return { n, m, ci: 1.96 * sd / Math.sqrt(n) }; };
  const all = st(diffs), fo = fdiffs.length > 1 ? st(fdiffs) : { n: fdiffs.length, m: fdiffs[0] || 0, ci: 0 };
  console.log(`${path.basename(MODEL)} 전좌석 마스터 · 짝지은 ${all.n}판 · 발화 ${iv.hits}회/${fr}판`);
  console.log(`주공 상금 변화(음수=야당 이득) 전체 ${all.m >= 0 ? '+' : ''}${all.m.toFixed(1)} ± ${all.ci.toFixed(1)}`);
  console.log(`발화 판 한정 ${fo.m >= 0 ? '+' : ''}${fo.m.toFixed(1)} ± ${fo.ci.toFixed(1)} (n=${fo.n}) · 여당 승수 변화 ${dWin >= 0 ? '+' : ''}${dWin}`);
  console.log(fo.m + fo.ci < 0 ? '→ 야당 유의 이득 — 가드 승격 근거'
    : fo.m - fo.ci > 0 ? '→ 야당 유의 손해 — 현재 정책이 옳다' : '→ 유의차 없음');
})();
