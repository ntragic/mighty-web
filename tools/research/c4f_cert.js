/**
 * C4 인증 (전좌석 마스터) — 여당 좌석(주공·확정 프렌드)이 마이티 미출현·미보유
 * 상태에서 '마이티 무늬'를 리드하는 결정을 정책 차선으로 교체하면 이득인가.
 * 아군 마이티를 팔로우 강제로 뽑아 최저가 트릭에 소모시키는 수
 * (2026-08-08 제보 seed 985545496: 프렌드 ♦5 리드 — 5후보 최하 −550/판).
 * 야당의 마이티 무늬 리드는 정당한 뽑기 시도일 수 있어 제외. 지표: 주공 상금.
 * 사용: node tools/research/c4_cert.js [판수]   env MODEL·SEED_BASE
 *
 * 클래스 좁힘·넓힘 스윕(2026-08-09): C4f 원본(SCOPE=first)이 발화 43판 −353±460으로
 * 기각됐으므로 표본을 늘리고 정의를 갈라 재인증한다.
 *   C4_SCOPE   first(기본, 초구 프렌드 판의 프렌드) | friend(모드 무관 공개 프렌드)
 *              | yeodang(공개 후 여당 좌석 전부 — 주공 포함)
 *   C4_MAXRANK 리드 카드 서열 상한(기본 14=무제한). 10이면 J·Q·K 리드는 정당한
 *              뽑기 시도로 보고 제외하고, 낮은 카드로 아군 마이티를 태우는 수만 잡는다.
 */
'use strict';
const path = require('path');
const P = p => path.join(__dirname, p);
const ort = require('onnxruntime-node');
const E = require(P('../../src/mighty-engine.js'));
const AI = require(P('../../src/mighty-ai.js'));
const M = require(P('../../src/mighty-master.js'));
const MODEL = process.env.MODEL || P('../../training/b4a_single.onnx');
const SEED0 = parseInt(process.env.SEED_BASE || '2500000', 10);
const PER = ['gambler', 'balanced', 'careful'];
const A_PLAY0 = 149;

// 좌석 가시 정보만 — 바닥패(discard)는 주공만 안다. 프렌드 좌석에서 이걸 세면
// 배포 가드가 쓸 수 없는 정보로 클래스를 정의하게 된다(2026-08-09 수정).
function seenSet(g, seat) {
  const s = new Set();
  for (const tr of g.play.history) for (const e of tr.plays) s.add(E.cardId(e.card));
  for (const c of g.hands[seat]) s.add(E.cardId(c));
  if (seat === g.declarer && g.discard) for (const c of g.discard) s.add(E.cardId(c));
  return s;
}
const SCOPE = process.env.C4_SCOPE || 'first';
const MAXRANK = parseInt(process.env.C4_MAXRANK || '14', 10);

function fireCond(g, seat, act) {
  if (act.jokerCall) return false;
  const pl = g.play;
  if (pl.table.length !== 0) return false;
  if (!g.friendRevealed) return false;
  if (SCOPE === 'first') {
    // 원본 좁힌 클래스: '초구 프렌드' 판에서 확정된 프렌드만 (제보 2건 모두 이 조건)
    const fd = g.friendDecl;
    if (!fd || fd.mode !== 'first') return false;
    if (g.friend !== seat) return false;
  } else if (SCOPE === 'friend') {
    if (g.friend !== seat) return false;
  } else {                                            // yeodang — 주공 포함
    if (g.friend !== seat && g.declarer !== seat) return false;
  }
  const c = act.card;
  const ms = g.mightyCard.suit;
  if (E.isJoker(c) || E.sameCard(c, g.mightyCard) || c.suit !== ms) return false;
  if (c.rank > MAXRANK) return false;                 // 높은 카드 리드는 정당한 뽑기
  if (g.hands[seat].some(x => !E.isJoker(x) && E.sameCard(x, g.mightyCard))) return false;
  const seen = seenSet(g, seat);
  return !seen.has(E.cardId(g.mightyCard));           // 마이티 미출현 (아군 뽑힘 위험)
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
      // 클래스 액션(마이티 무늬 리드) 자체는 후보에서 제외 — MAXRANK로 좁혔으면
      // 그 위 서열의 마이티 무늬 리드는 대체재로 남긴다(뽑기 시도는 정당하므로).
      if (cd.suit === g.mightyCard.suit && !E.sameCard(cd, g.mightyCard) && cd.rank <= MAXRANK) continue;
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
  console.log(`${path.basename(MODEL)} 전좌석 마스터 · scope=${SCOPE} maxrank=${MAXRANK} · 짝지은 ${all.n}판 · 발화 ${iv.hits}회/${fr}판`);
  console.log(`주공 상금 변화(양수=주공 이득) 전체 ${all.m >= 0 ? '+' : ''}${all.m.toFixed(1)} ± ${all.ci.toFixed(1)}`);
  console.log(`발화 판 한정 ${fo.m >= 0 ? '+' : ''}${fo.m.toFixed(1)} ± ${fo.ci.toFixed(1)} (n=${fo.n}) · 여당 승수 변화 ${dWin >= 0 ? '+' : ''}${dWin}`);
  console.log(fo.m - fo.ci > 0 ? '→ 주공 유의 이득 — 가드/증류 승격 근거'
    : fo.m + fo.ci < 0 ? '→ 유의 손해 — 현재 정책이 옳다' : '→ 유의차 없음');
})();
