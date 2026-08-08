/**
 * C1 인증 (전좌석 마스터) — 주공이 '위 서열이 밖에 남은' 기루다 국면에서
 * 점수 기루다(10·J·Q·K·A)를 리드하기로 한 결정을, 같은 정책의 차선
 * (점수 기루다 리드 제외 argmax)으로 교체하면 이득인가.
 * 셀프 리뷰 500판 C1 클러스터(74건, lineGain 111,800)의 페어드 인증.
 * 탑 조건(위 서열 없음)은 topLeadGuard 영역이라 제외. 지표: 주공 상금.
 * 사용: node tools/research/c1_cert.js [판수]   env MODEL·SEED_BASE
 */
'use strict';
const path = require('path');
const P = p => path.join(__dirname, p);
const ort = require('onnxruntime-node');
const E = require(P('../../src/mighty-engine.js'));
const AI = require(P('../../src/mighty-ai.js'));
const M = require(P('../../src/mighty-master.js'));
const MODEL = process.env.MODEL || P('../../web/model/mighty_master_v6b.onnx');
const SEED0 = parseInt(process.env.SEED_BASE || '1800000', 10);
const PER = ['gambler', 'balanced', 'careful'];
const A_PLAY0 = 149;

function seenSet(g, seat) {
  const s = new Set();
  for (const tr of g.play.history) for (const e of tr.plays) s.add(E.cardId(e.card));
  for (const c of g.hands[seat]) s.add(E.cardId(c));
  if (g.discard) for (const c of g.discard) s.add(E.cardId(c));
  return s;
}
function fireCond(g, seat, act) {
  if (seat !== g.declarer || act.jokerCall) return false;
  const pl = g.play;
  if (pl.table.length !== 0) return false;
  const gi = g.contract.giruda;
  if (gi === 'N') return false;
  const c = act.card;
  if (E.isJoker(c) || E.sameCard(c, g.mightyCard) || c.suit !== gi || !E.isPointCard(c)) return false;
  const seen = seenSet(g, seat);
  for (let r = c.rank + 1; r <= 14; r++) if (!seen.has(gi + r)) return true;  // 위 서열 잔존
  return false;
}
async function nextBest(sess, g, seat) {
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
  const seen = seenSet(g, seat);
  let best = -1, bv = -Infinity;
  for (let i = 0; i < M.ACTION_DIM; i++) {
    if (!mask[i] || i === 206) continue;
    if (i >= A_PLAY0 && i < A_PLAY0 + 52) {
      const cd = M.idxCard(i - A_PLAY0);
      // 클래스 액션(위 서열 잔존 점수 기루다 리드) 자체는 후보에서 제외
      if (cd.suit === gi && E.isPointCard(cd) && !E.sameCard(cd, g.mightyCard)) {
        let higher = false;
        for (let r = cd.rank + 1; r <= 14; r++) if (!seen.has(gi + r)) { higher = true; break; }
        if (higher) continue;
      }
    }
    if (logits[i] > bv) { bv = logits[i]; best = i; }
  }
  return best;
}

async function run(N, iv, sess) {
  const per = []; let hits = 0;
  for (let i = 0; i < N; i++) {
    const seed = SEED0 + i;
    const rng = E.makeRng(seed);
    const g = new E.MightyGame({ seed });
    const ag = [];
    for (let s = 0; s < E.NUM_PLAYERS; s++)
      ag.push(await AI.createAgent({ tier: 'master', persona: PER[s % 3], rng, session: sess, ort, keyGuard: true,
        dleadGuard: process.env.RAWPOL === '1' ? false : undefined,
        c1Guard: process.env.RAWPOL === '1' ? false : undefined }));
    g.start(Math.floor(rng() * E.NUM_PLAYERS));
    let guard = 0, fired = 0;
    while (g.phase !== 'done' && g.phase !== 'redeal' && guard++ < 900) {
      const p = g.currentPlayer;
      let act = await ag[p].act(g, p);
      if (iv && g.phase === 'play' && act.type === 'play' && fireCond(g, p, act)) {
        const ai2 = await nextBest(sess, g, p);
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
  console.log(`주공 상금 변화(양수=주공 이득) 전체 ${all.m >= 0 ? '+' : ''}${all.m.toFixed(1)} ± ${all.ci.toFixed(1)}`);
  console.log(`발화 판 한정 ${fo.m >= 0 ? '+' : ''}${fo.m.toFixed(1)} ± ${fo.ci.toFixed(1)} (n=${fo.n}) · 여당 승수 변화 ${dWin >= 0 ? '+' : ''}${dWin}`);
  console.log(fo.m - fo.ci > 0 ? '→ 주공 유의 이득 — 가드/증류 승격 근거'
    : fo.m + fo.ci < 0 ? '→ 유의 손해 — 현재 정책이 옳다' : '→ 유의차 없음');
})();
