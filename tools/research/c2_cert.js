/**
 * C2 인증 (전좌석 마스터) — 프렌드 공개 전, 비주공 좌석이 '이기지 못하는'
 * 점수카드를 팔로우로 태우는 결정을, 같은 정책의 차선(지는 점수카드 제외
 * argmax — 비점수 버림·마이티 오버테이크 등)으로 교체하면 이득인가.
 * 셀프 리뷰 C2 클러스터(pre·follow·point 89건, lineGain 105,800)의 인증.
 * 공개 전엔 팀 미상이므로 지표는 '발화 좌석 본인 상금'의 페어드 차이.
 * 사용: node tools/research/c2_cert.js [판수]   env MODEL·SEED_BASE
 */
'use strict';
const path = require('path');
const P = p => path.join(__dirname, p);
const ort = require('onnxruntime-node');
const E = require(P('../../src/mighty-engine.js'));
const AI = require(P('../../src/mighty-ai.js'));
const M = require(P('../../src/mighty-master.js'));
const MODEL = process.env.MODEL || P('../../training/b4a_single.onnx');
const SEED0 = parseInt(process.env.SEED_BASE || '1900000', 10);
const PER = ['gambler', 'balanced', 'careful'];
const A_PLAY0 = 149;
const gt = (a, b) => a[0] > b[0] || (a[0] === b[0] && a[1] > b[1]);

function bestOnTable(g) {
  let bk = [-2, -1];
  for (const e of g.play.table) {
    const k = g._cardStrength(e, g.play);
    if (gt(k, bk)) bk = k;
  }
  return bk;
}
function fireCond(g, seat, act) {
  if (seat === g.declarer || g.friendRevealed || act.jokerCall) return false;
  const pl = g.play;
  if (!pl.table.length) return false;
  const c = act.card;
  if (E.isJoker(c) || E.sameCard(c, g.mightyCard) || !E.isPointCard(c)) return false;
  return !gt(g._cardStrength({ player: seat, card: c }, pl), bestOnTable(g));
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
  const bk = bestOnTable(g);
  let best = -1, bv = -Infinity;
  for (let i = 0; i < M.ACTION_DIM; i++) {
    if (!mask[i] || i === 206) continue;
    if (i >= A_PLAY0 && i < A_PLAY0 + 52) {
      const cd = M.idxCard(i - A_PLAY0);
      if (E.isPointCard(cd) && !E.sameCard(cd, g.mightyCard)
          && !gt(g._cardStrength({ player: seat, card: cd }, g.play), bk)) continue; // 지는 점수카드 제외
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
      ag.push(await AI.createAgent({ tier: 'master', persona: PER[s % 3], rng, session: sess, ort, keyGuard: true }));
    g.start(Math.floor(rng() * E.NUM_PLAYERS));
    let guard = 0; const fseats = new Set();
    while (g.phase !== 'done' && g.phase !== 'redeal' && guard++ < 900) {
      const p = g.currentPlayer;
      let act = await ag[p].act(g, p);
      if (iv && g.phase === 'play' && act.type === 'play' && fireCond(g, p, act)) {
        const ai2 = await nextBest(sess, g, p);
        if (ai2 >= 0) {
          const alt = M.actionToEngine(ai2, g, []);
          if (alt && alt.type === 'play') { act = alt; hits++; fseats.add(p); }
        }
      }
      g.act(act);
    }
    per.push(g.phase === 'done'
      ? { seed, decl: g.declarer, prizes: g.result.prizes.slice(), fseats: [...fseats] }
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
  const fdiffs = []; let fr = 0;
  for (const r of iv.per.filter(Boolean)) {
    const b = bm.get(r.seed);
    if (!b || b.decl !== r.decl) continue;
    if (!r.fseats.length) continue;
    fr++;
    let d = 0;
    for (const s of r.fseats) d += r.prizes[s] - b.prizes[s];
    fdiffs.push(d / r.fseats.length);          // 발화 좌석 평균
  }
  const st = a => { const n = a.length, m = a.reduce((x, y) => x + y, 0) / n;
    const sd = Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / (n - 1));
    return { n, m, ci: 1.96 * sd / Math.sqrt(n) }; };
  const fo = fdiffs.length > 1 ? st(fdiffs) : { n: fdiffs.length, m: fdiffs[0] || 0, ci: 0 };
  console.log(`${path.basename(MODEL)} 전좌석 마스터 · 발화 ${iv.hits}회/${fr}판`);
  console.log(`발화 좌석 본인 상금 변화 ${fo.m >= 0 ? '+' : ''}${fo.m.toFixed(1)} ± ${fo.ci.toFixed(1)} (n=${fo.n})`);
  console.log(fo.m - fo.ci > 0 ? '→ 유의 이득 — 승격 근거'
    : fo.m + fo.ci < 0 ? '→ 유의 손해 — 현재 정책이 옳다' : '→ 유의차 없음');
})();
