/**
 * PIMC 탐침 — "정책이 앞을 못 굴리는 것인가, 아니면 그 상황을 못 배운 것인가"를
 * 가른다 (docs/LOOKAHEAD-PLAN.md 0단계).
 *
 * 방법: 관측과 모순 없게 남의 손패를 여러 벌 뽑고(결정화), 각 벌에서 후보 수를
 * 강제한 뒤 현재 정책으로 끝까지 굴려 그 좌석의 평균 상금을 낸다. 스카트·브리지
 * 계열에서 오래 쓰인 방식이다(Perfect Information Monte Carlo).
 *
 * 결정화 제약 — 전부 좌석 가시 정보다:
 *   내 손패 · 나온 카드 · (내가 주공이면) 바닥패는 이미 안다.
 *   좌석별 남은 장수는 공개 정보.
 *   보이드 추론: 어떤 좌석이 과거에 리드 무늬를 따르지 않았으면 그 무늬가 없다.
 *   내가 주공이 아니면 바닥패 3장도 미지 풀에 넣어 '아무 좌석에도 없게' 배정한다.
 *
 * 사용:
 *   node tools/research/pimc_probe.js rec <복기.md> <행동인덱스> [결정화수]
 *   node tools/research/pimc_probe.js class <cut|jcall> [판수] [결정화수]
 *     — 해당 가드가 교정하는 국면을 자가대전에서 모아 일괄 탐침한다.
 *       "탐색의 최선수 = 가드의 교정"인 비율이 진단의 핵심 수치다.
 *   env MODEL · SEED_BASE · TOPM(후보 수 상한, 기본 6)
 */
'use strict';
const fs = require('fs');
const path = require('path');
const P = p => path.join(__dirname, p);
const ort = require('onnxruntime-node');
const E = require(P('../../src/mighty-engine.js'));
const AI = require(P('../../src/mighty-ai.js'));
const M = require(P('../../src/mighty-master.js'));
const MODEL = process.env.MODEL || P('../../web/model/mighty_master_v9.onnx');
const TOPM = parseInt(process.env.TOPM || '6', 10);
const SEED0 = parseInt(process.env.SEED_BASE || '11000000', 10);

const SUITS = ['S', 'D', 'H', 'C'];
const allCards = () => {
  const out = [E.JOKER];
  for (const s of SUITS) for (let r = 2; r <= 14; r++) out.push({ suit: s, rank: r });
  return out;
};

/** 좌석 seat 시점에서 본 '이미 아는 카드' 집합 */
function knownTo(g, seat) {
  const seen = new Set();
  for (const t of g.play.history) for (const e of t.plays) seen.add(E.cardId(e.card));
  for (const e of g.play.table) seen.add(E.cardId(e.card));
  for (const c of g.hands[seat]) seen.add(E.cardId(c));
  if (seat === g.declarer && g.discard) for (const c of g.discard) seen.add(E.cardId(c));
  return seen;
}

/** 좌석별 보이드 추론 — 리드 무늬를 안 따른 이력 */
function voids(g) {
  const v = [];
  for (let p = 0; p < E.NUM_PLAYERS; p++) v.push(new Set());
  const scan = (plays, led) => {
    if (!led) return;
    for (const e of plays) {
      if (E.isJoker(e.card)) continue;                 // 조커는 어느 무늬든 낼 수 있다
      if (e.card.suit !== led) v[e.player].add(led);
    }
  };
  for (const t of g.play.history) scan(t.plays, t.ledSuit || (t.plays[0] && !E.isJoker(t.plays[0].card) ? t.plays[0].card.suit : null));
  scan(g.play.table, g.play.ledSuit);
  return v;
}

/**
 * 결정화 — 미지의 카드를 제약에 맞게 좌석과 바닥패에 배정한 게임 사본을 만든다.
 * 실패하면 null (호출자가 재시도).
 */
function determinize(g, seat, rnd) {
  const known = knownTo(g, seat);
  const pool = allCards().filter(c => !known.has(E.cardId(c)));
  const need = [];                                     // {seat, n}
  for (let p = 0; p < E.NUM_PLAYERS; p++) {
    if (p === seat) continue;
    need.push({ seat: p, n: g.hands[p].length });
  }
  const kittyN = (seat === g.declarer || !g.discard) ? 0 : g.discard.length;
  const total = need.reduce((a, b) => a + b.n, 0) + kittyN;
  if (total !== pool.length) return null;              // 카운트 불일치 — 안전하게 포기
  const vd = voids(g);

  // 제약이 빡빡한 좌석부터 채운다(보이드가 많은 순)
  const order = need.slice().sort((a, b) => vd[b.seat].size - vd[a.seat].size);
  for (let attempt = 0; attempt < 60; attempt++) {
    const bag = pool.slice();
    for (let i = bag.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [bag[i], bag[j]] = [bag[j], bag[i]];
    }
    const assign = new Map();
    let ok = true;
    for (const { seat: p, n } of order) {
      const take = [];
      for (let i = 0; i < bag.length && take.length < n; i++) {
        const c = bag[i];
        if (!E.isJoker(c) && vd[p].has(c.suit)) continue;
        take.push(c); bag[i] = null;
      }
      if (take.length < n) { ok = false; break; }
      for (let i = bag.length - 1; i >= 0; i--) if (bag[i] === null) bag.splice(i, 1);
      assign.set(p, take);
    }
    if (!ok) continue;
    // 남은 것이 바닥패
    if (bag.length !== kittyN) continue;
    const clone = cloneGame(g);
    for (const [p, cards] of assign) clone.hands[p] = cards;
    if (kittyN) clone.discard = bag;
    return clone;
  }
  return null;
}

/** 엔진 상태 깊은 복사 — 엔진은 순수 데이터라 구조적 복제로 충분하다 */
function cloneGame(g) {
  const c = Object.create(Object.getPrototypeOf(g));
  for (const k of Object.keys(g)) {
    const v = g[k];
    c[k] = (typeof v === 'object' && v !== null) ? structuredClone(v) : v;
  }
  return c;
}

/** 정책 상위 후보 (합법수 중 확률 상위 TOPM) */
async function candidates(sess, g, seat) {
  let obs = M.encodeObs(g, seat, []);
  const mask = M.legalMask(g, []);
  const want = M.modelObsDim(sess);
  if (want !== M.OBS_DIM) obs = obs.subarray(0, want);
  const out = await sess.run({
    obs: new ort.Tensor('float32', obs, [1, want]),
    mask: new ort.Tensor('bool', mask, [1, M.ACTION_DIM]),
  });
  const lg = out.logits.data;
  const idx = [];
  for (let i = 0; i < M.ACTION_DIM; i++) if (mask[i]) idx.push(i);
  let mx = -Infinity;
  for (const i of idx) mx = Math.max(mx, lg[i]);
  let z = 0; const pr = {};
  for (const i of idx) { const e = Math.exp(lg[i] - mx); pr[i] = e; z += e; }
  const rows = idx.map(i => ({ i, p: pr[i] / z })).sort((a, b) => b.p - a.p);
  return { rows: rows.slice(0, TOPM), all: rows };
}

const label = (g, ai) => {
  const a = M.actionToEngine(ai, g, []);
  if (!a || !a.card) return String(ai);
  return E.cardName(a.card) + (a.jokerCall ? '(조커콜)' : '');
};

/** 한 국면 탐침 — 후보별 결정화 평균 상금 */
async function probe(sess, g, seat, K, rnd) {
  const { rows } = await candidates(sess, g, seat);
  const dets = [];
  for (let k = 0; k < K; k++) {
    const d = determinize(g, seat, rnd);
    if (d) dets.push(d);
  }
  if (!dets.length) return null;
  const agents = [];
  for (let s = 0; s < E.NUM_PLAYERS; s++)
    agents.push(await AI.createAgent({
      tier: 'master', session: sess, ort,
      // 탐색의 평가자는 배포 정책이지만, 진단 대상 가드는 꺼서 동어반복을 막는다
      jcallGuard: process.env.RAWPOL === '1' ? false : undefined,
      cutGuard: process.env.RAWPOL === '1' ? false : undefined,
    }));
  const res = [];
  for (const cand of rows) {
    let sum = 0, n = 0; const vals = [];
    for (const d of dets) {
      const sim = cloneGame(d);
      const act = M.actionToEngine(cand.i, sim, []);
      if (!act) continue;
      try { sim.act(act); } catch (e) { continue; }
      let guard = 0;
      while (sim.phase !== 'done' && sim.phase !== 'redeal' && guard++ < 200) {
        const p = sim.currentPlayer;
        sim.act(await agents[p].act(sim, p));
      }
      if (sim.phase !== 'done') continue;
      const pz = sim.result.prizes[seat];
      sum += pz; n++; vals.push(pz);
    }
    if (n > 1) {
      const m = sum / n;
      const sd = Math.sqrt(vals.reduce((a, b) => a + (b - m) ** 2, 0) / (n - 1));
      res.push({ i: cand.i, p: cand.p, v: m, n, ci: 1.96 * sd / Math.sqrt(n) });
    } else if (n) res.push({ i: cand.i, p: cand.p, v: sum, n, ci: 0 });
  }
  res.sort((a, b) => b.v - a.v);
  return { policyTop: rows[0].i, pimc: res, dets: dets.length };
}

// ─────────────────────────────────────────────────────────────
(async () => {
  const mode = process.argv[2] || 'rec';
  const sess = await ort.InferenceSession.create(MODEL);
  let seedCounter = 1;
  const rnd = () => {                                   // 재현 가능한 난수
    seedCounter = (seedCounter * 1103515245 + 12345) & 0x7fffffff;
    return seedCounter / 0x7fffffff;
  };

  if (mode === 'rec') {
    const md = fs.readFileSync(process.argv[3], 'utf8');
    const rec = JSON.parse(md.split('```json')[1].split('```')[0]);
    const IDX = parseInt(process.argv[4], 10);
    const K = parseInt(process.argv[5] || '48', 10);
    const g = new E.MightyGame(rec.cfg);
    g.start(rec.dealer);
    for (let i = 0; i < IDX; i++) g.act(rec.actions[i].a);
    const seat = rec.actions[IDX].p;
    const r = await probe(sess, g, seat, K, rnd);
    if (!r) { console.log('결정화 실패 — 제약 불충족'); return; }
    console.log(`${path.basename(MODEL)} · 트릭 ${g.play.trickNo} · 좌석 ${seat} · 결정화 ${r.dets}벌`);
    console.log(`정책 1순위: ${label(g, r.policyTop)}`);
    console.log('PIMC 평가 (좌석 본인 평균 상금):');
    for (const x of r.pimc)
      console.log(`  ${label(g, x.i).padEnd(12)} ${x.v >= 0 ? '+' : ''}${x.v.toFixed(0).padStart(6)} ± ${x.ci.toFixed(0).padStart(5)}  (정책 ${(x.p * 100).toFixed(1)}%)`);
    console.log(`→ PIMC 최선수: ${label(g, r.pimc[0].i)}`);
    return;
  }

  // class 모드 — 가드가 교정하는 국면을 모아 일괄 탐침
  const cls = process.argv[3] || 'cut';
  const N = parseInt(process.argv[4] || '400', 10);
  const K = parseInt(process.argv[5] || '32', 10);
  const guardFn = cls === 'jcall' ? AI.jokerCallGuard : AI.cutGuard;
  const agents = [];
  for (let s = 0; s < E.NUM_PLAYERS; s++)
    agents.push(await AI.createAgent({ tier: 'master', session: sess, ort,
      jcallGuard: false, cutGuard: false }));   // 원시 정책으로 국면을 모은다
  let probed = 0, agreeGuard = 0, agreePolicy = 0, other = 0, dirOk = 0;
  for (let i = 0; i < N && probed < 30; i++) {
    const seed = SEED0 + i;
    const g = new E.MightyGame({ seed });
    const rng = E.makeRng(seed);
    g.start(Math.floor(rng() * E.NUM_PLAYERS));
    let guard = 0;
    while (g.phase !== 'done' && g.phase !== 'redeal' && guard++ < 900) {
      const p = g.currentPlayer;
      const act = await agents[p].act(g, p);
      if (g.phase === 'play' && act.type === 'play') {
        const fixed = guardFn(g, p, act);
        if (fixed !== act) {                    // 가드가 교정하는 국면 = 탐침 대상
          const r = await probe(sess, g, p, K, rnd);
          if (r) {
            probed++;
            const best = r.pimc[0].i;
            const fixedIdx = M.legalMask(g, []) && actionIndexOf(g, fixed);
            const origIdx = actionIndexOf(g, act);
            if (best === fixedIdx) agreeGuard++;
            else if (best === origIdx) agreePolicy++;
            else other++;
            // 방향 일치 — 정확히 같은 카드가 아니어도 가드와 같은 방향인가
            const bestAct = M.actionToEngine(best, g, []);
            const gi = g.contract ? g.contract.giruda : 'N';
            const dir = cls === 'jcall'
              ? !(bestAct && bestAct.jokerCall)                       // 콜을 안 한다
              : !!(bestAct && bestAct.card && !E.isJoker(bestAct.card)
                   && gi !== 'N' && bestAct.card.suit === gi);        // 기루다로 컷한다
            if (dir) dirOk++;
            console.log(`  [${probed}] seed=${seed} 정책 ${label(g, origIdx)} · 가드 ${label(g, fixedIdx)} · PIMC ${label(g, best)}`);
          }
        }
      }
      g.act(act);
    }
  }
  console.log(`\n${cls} 클래스 · 탐침 ${probed}건 · 결정화 ${K}벌`);
  console.log(`  PIMC = 가드 교정   ${agreeGuard} (${(100 * agreeGuard / Math.max(1, probed)).toFixed(0)}%)`);
  console.log(`  PIMC = 원래 정책수 ${agreePolicy} (${(100 * agreePolicy / Math.max(1, probed)).toFixed(0)}%)`);
  console.log(`  PIMC = 제3의 수    ${other} (${(100 * other / Math.max(1, probed)).toFixed(0)}%)`);
  console.log(`  방향 일치(같은 취지) ${dirOk} (${(100 * dirOk / Math.max(1, probed)).toFixed(0)}%)`);
  const rate = dirOk / Math.max(1, probed);
  console.log(rate >= 0.7
    ? '→ 가설 A(전개 능력 부족) 지지 — 탐색은 답을 찾는다'
    : rate < 0.4
      ? '→ 가설 B(표본 부족) 지지 — 탐색으로도 못 찾는다'
      : '→ 판정 보류 — 결정화 표본을 늘려 재측정');
})();

/** 엔진 액션 → 정책 액션 인덱스 */
function actionIndexOf(g, a) {
  if (!a || a.type !== 'play') return -1;
  if (a.jokerCall) return 206;
  if (E.isJoker(a.card)) return a.jokerSuit ? 201 + ['S', 'D', 'H', 'C'].indexOf(a.jokerSuit) : 205;
  return 149 + M.cidx(a.card);
}
