/**
 * JC 인증 (전좌석 마스터) — 조커를 카드 프렌드로 지목한 판에서, 여당 좌석이
 * 조커콜을 하는 결정을 교정하면 이득인가.
 *
 * 제보 (2026-08-10, seed 573961911 트릭3): 주공이 조커 프렌드를 부른 뒤 ♣3으로
 * 조커콜 → 아군(프렌드)의 조커가 최약 취급으로 강제 소모되고, 최저 클럽 리드라
 * 그 트릭도 야당이 가져갔다. v7·v8·v9 모두 이 국면에서 조커콜을 1순위로 고른다.
 *
 * 클래스(좌석 가시 정보만): 프렌드 선언이 '카드 프렌드 = 조커' & 행위 좌석이
 * 여당 확정(주공 또는 공개된 프렌드) & 조커 미보유 & 정책이 조커콜을 선택.
 * 야당의 조커콜은 아군 조커를 뽑는 정당한 수라 제외한다.
 *
 * 개입 방식 env JC_MODE:
 *   drop (기본) — 조커콜 선언만 떼고 같은 카드를 그냥 리드
 *   next        — 조커콜 액션을 후보에서 빼고 정책 차선으로 교체
 *   force       — 기회가 생길 때마다 A팔은 조커콜을 강제, B팔은 같은 카드 일반
 *                 리드를 강제한다. 정책이 이 수를 얼마나 자주 고르든 무관하게
 *                 "조커 프렌드 판에서 여당의 조커콜이 손해인가"만 잰다.
 *                 (자연 발화가 드물어 drop/next 모드로는 표본이 안 모인다)
 *
 * 측정 대상 env JC_SIDE:
 *   ruling (기본) — 여당의 자해 조커콜. 개입은 '콜 제거'
 *   opp           — 야당의 조커콜 **미사용**. 확정 야당(비주공·카드프렌드 미보유)이
 *                   조커 미보유·조커 미출현 상태로 조커콜 카드를 들고 리드할 때,
 *                   A팔은 콜 없이 리드(현행 정책 습관), B팔은 콜 강제.
 *                   지표는 그대로 주공 상금이라 **음수가 야당 이득**이다.
 *                   (2026-08-10 제보: 프렌드 조커를 뽑을 수단이 있는데 안 쓴다)
 *
 * 사용: node tools/research/jcall_cert.js [판수]   env MODEL·SEED_BASE·JC_MODE·JC_SIDE
 */
'use strict';
const path = require('path');
const P = p => path.join(__dirname, p);
const ort = require('onnxruntime-node');
const E = require(P('../../src/mighty-engine.js'));
const AI = require(P('../../src/mighty-ai.js'));
const M = require(P('../../src/mighty-master.js'));
const MODEL = process.env.MODEL || P('../../web/model/mighty_master_v9.onnx');
const SEED0 = parseInt(process.env.SEED_BASE || '6100000', 10);
const MODE = process.env.JC_MODE || 'drop';
const SIDE = process.env.JC_SIDE || 'ruling';
const PER = ['gambler', 'balanced', 'careful'];
const A_PLAY0 = 149, A_JOKERCALL = 206;

/** 발동 클래스 — 액션이 조커콜이고, 그 좌석이 조커 프렌드 판의 여당인가 */
function fireCond(g, seat, act) {
  if (!act || !act.jokerCall) return false;
  const fd = g.friendDecl;
  if (!fd || fd.mode !== 'card' || !fd.card || !E.isJoker(fd.card)) return false;
  if (g.hands[seat].some(c => E.isJoker(c))) return false;      // 자기가 조커 보유면 별개 국면
  const ruling = seat === g.declarer || (g.friendRevealed && seat === g.friend);
  return ruling;                                                // 야당의 조커콜은 정당
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
  let best = -1, bv = -Infinity;
  for (let i = 0; i < M.ACTION_DIM; i++) {
    if (!mask[i] || i === A_JOKERCALL) continue;                 // 조커콜만 후보에서 제외
    if (logits[i] > bv) { bv = logits[i]; best = i; }
  }
  return best;
}

async function run(N, iv, sess) {
  const per = []; let hits = 0, decls = 0, jokerFriend = 0, policyCalls = 0;
  for (let i = 0; i < N; i++) {
    const seed = SEED0 + i;
    const rng = E.makeRng(seed);
    const g = new E.MightyGame({ seed });
    const ag = [];
    for (let s = 0; s < E.NUM_PLAYERS; s++)
      ag.push(await AI.createAgent({ tier: 'master', persona: PER[s % 3], rng, session: sess, ort,
        // RAWPOL=1 — 가드를 끄고 원시 정책을 잰다. 가드가 켜져 있으면 정책이
        // 조커콜을 골라도 떼어낸 뒤라 '자연 채택률'이 항상 0으로 나온다.
        jcallGuard: process.env.RAWPOL === '1' ? false : undefined }));
    g.start(Math.floor(rng() * E.NUM_PLAYERS));
    let guard = 0, fired = 0, natural = 0;
    while (g.phase !== 'done' && g.phase !== 'redeal' && guard++ < 900) {
      const p = g.currentPlayer;
      let act = await ag[p].act(g, p);
      if (MODE === 'force' && g.phase === 'play' && SIDE === 'opp') {
        // 야당의 조커콜 미사용 — A팔 콜 없음(현행 습관), B팔 콜 강제
        const fd = g.friendDecl;
        const holdsFriendCard = fd && fd.mode === 'card' && fd.card &&
          g.hands[p].some(c => E.sameCard(c, fd.card));
        const surelyOpp = p !== g.declarer && !holdsFriendCard &&
          !(g.friendRevealed && p === g.friend);
        if (surelyOpp && !g.hands[p].some(c => E.isJoker(c))) {
          const seen = new Set();
          for (const tr of g.play.history) for (const e of tr.plays) seen.add(E.cardId(e.card));
          for (const c of g.hands[p]) seen.add(E.cardId(c));
          if (!seen.has(E.JOKER)) {                       // 뽑을 조커가 아직 살아 있어야 한다
            const call = g._legalPlays(p).find(m => m.jokerCall);
            if (call) {
              hits++; fired++;
              if (act.jokerCall) { policyCalls++; natural++; }
              act = iv ? { type: 'play', card: call.card, jokerCall: true }
                       : { type: 'play', card: call.card };
            }
          }
        }
      } else if (MODE === 'force' && g.phase === 'play') {
        const fd = g.friendDecl;
        const jf = fd && fd.mode === 'card' && fd.card && E.isJoker(fd.card);
        const ruling = p === g.declarer || (g.friendRevealed && p === g.friend);
        if (jf && ruling && !g.hands[p].some(c => E.isJoker(c))) {
          const call = g._legalPlays(p).find(m => m.jokerCall);
          if (call) {
            hits++; fired++;
            if (act.jokerCall) { policyCalls++; natural++; }   // 강제 전 정책 자체 선택
            act = iv ? { type: 'play', card: call.card }
                     : { type: 'play', card: call.card, jokerCall: true };
          }
        }
      } else if (g.phase === 'play' && act.type === 'play' && fireCond(g, p, act)) {
        if (MODE === 'drop') {
          const alt = { type: 'play', card: act.card };           // 콜만 뗀다
          if (g._legalPlays(p).some(m => !m.jokerCall && E.sameCard(m.card, act.card))) {
            if (iv) { act = alt; fired++; }
            hits++;
          }
        } else {
          const ai2 = await nextBest(sess, g, p);
          if (ai2 >= 0) {
            const alt = M.actionToEngine(ai2, g, []);
            if (alt && alt.type === 'play') { if (iv) { act = alt; fired++; } hits++; }
          }
        }
      }
      g.act(act);
    }
    const fd = g.friendDecl;
    if (fd && fd.mode === 'card' && fd.card && E.isJoker(fd.card)) jokerFriend++;
    if (g.declarer !== null && g.declarer !== undefined) decls++;
    per.push(g.phase === 'done'
      ? { seed, decl: g.declarer, prize: g.result.prizes[g.declarer], win: g.result.win, fired, natural }
      : null);
  }
  return { per, hits, decls, jokerFriend, policyCalls };
}

(async () => {
  const N = parseInt(process.argv[2] || '2400', 10);
  const sess = await ort.InferenceSession.create(MODEL);
  const base = await run(N, false, sess);
  const iv = await run(N, true, sess);
  const bm = new Map(base.per.filter(Boolean).map(r => [r.seed, r]));
  const diffs = [], fdiffs = [], ndiffs = []; let dWin = 0, fr = 0;
  for (const r of iv.per.filter(Boolean)) {
    const b = bm.get(r.seed);
    if (!b || b.decl !== r.decl) continue;
    const d = r.prize - b.prize;
    diffs.push(d);
    if (r.fired > 0) { fdiffs.push(d); fr++; dWin += (r.win ? 1 : 0) - (b.win ? 1 : 0); }
    if (b.natural > 0) ndiffs.push(d);            // 정책이 스스로 조커콜을 고른 판만
  }
  const st = a => { const n = a.length, m = a.reduce((x, y) => x + y, 0) / n;
    const sd = Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / (n - 1));
    return { n, m, ci: 1.96 * sd / Math.sqrt(n) }; };
  const all = st(diffs), fo = fdiffs.length > 1 ? st(fdiffs) : { n: fdiffs.length, m: fdiffs[0] || 0, ci: 0 };
  console.log(`${path.basename(MODEL)} 전좌석 마스터 · mode=${MODE} side=${SIDE} · 짝지은 ${all.n}판 · 발화 ${base.hits}회/${fr}판`);
  console.log(`조커 카드 프렌드 판 ${base.jokerFriend}/${N} (${(100 * base.jokerFriend / N).toFixed(1)}%)`);
  if (MODE === 'force')
    console.log(`기회 ${base.hits}회 중 정책이 스스로 조커콜 선택 ${base.policyCalls}회 (${(100 * base.policyCalls / Math.max(1, base.hits)).toFixed(1)}%)`);
  console.log(`주공 상금 변화(양수=주공 이득) 전체 ${all.m >= 0 ? '+' : ''}${all.m.toFixed(1)} ± ${all.ci.toFixed(1)}`);
  console.log(`발화 판 한정 ${fo.m >= 0 ? '+' : ''}${fo.m.toFixed(1)} ± ${fo.ci.toFixed(1)} (n=${fo.n}) · 여당 승수 변화 ${dWin >= 0 ? '+' : ''}${dWin}`);
  if (ndiffs.length > 1) {
    const na = st(ndiffs);
    console.log(`  └ 정책이 스스로 고른 판만 ${na.m >= 0 ? '+' : ''}${na.m.toFixed(1)} ± ${na.ci.toFixed(1)} (n=${na.n})`);
  }
  if (SIDE === 'opp') {
    console.log(fo.m + fo.ci < 0 ? '→ 야당 유의 이득 (주공 상금 감소) — 조커콜을 써야 한다'
      : fo.m - fo.ci > 0 ? '→ 야당 유의 손해 — 안 쓰는 현행이 옳다' : '→ 유의차 없음');
  } else {
    console.log(fo.m - fo.ci > 0 ? '→ 주공 유의 이득 — 가드 승격 근거'
      : fo.m + fo.ci < 0 ? '→ 유의 손해 — 현재 정책이 옳다' : '→ 유의차 없음');
  }
})();
