/* mighty-analysis.js — v2 AI 복기: 하이라이트 판정 엔진 (UI 독립, node 테스트 가능)
 *
 * 판정 원칙 (docs/V2-PLAN.md):
 *  - 스크리닝은 가치 헤드 ΔEV, 확정은 같은 국면 페어드 롤아웃.
 *  - 대상은 인간 좌석의 플레이 페이즈 결정만 (입찰·프렌드 지정은 보류).
 *  - 등급: 결정적(승패 다수 뒤집힘) / 손해(상금차>=100) / 부정확(극단만, >=60).
 *  - 로컬 게임이라 분석 시점 완전 정보 시뮬레이션 가능. 마스터는 오라클이 아니므로
 *    롤아웃 표본·뒤집힘 비율을 결과에 그대로 담아 UI가 표기한다.
 */
(function () {
'use strict';
const IS_NODE = (typeof module !== 'undefined' && module.exports);
const E = IS_NODE ? require('./mighty-engine.js') : window.MightyEngine;
const M = IS_NODE ? require('./mighty-master.js') : window.MightyMaster;
// 지연 해석 — 번들에서 analysis가 ai보다 먼저 로드되므로 즉시 참조하면 undefined
const getAI = () => (IS_NODE ? require('./mighty-ai.js') : window.MightyAI);

const GRADE = { CRITICAL: '결정적', LOSS: '손해', SLIP: '부정확' };
// SLIP 80: 정밀도 벤치에서 60은 검증 통과율이 낮았다(표본 4건 중 1건) — 더 극단만 표시
const TH = { LOSS: 100, SLIP: 80, FLIP_HI: 2 / 3, FLIP_LO: 1 / 3 };
// 페어드 롤아웃의 샘플링 온도. 배포는 argmax(T=0)인데 롤아웃만 T=1이면 양 팔
// 모두 실전보다 약하게 둔다 — 그 괴리가 오탐으로 나온다. v2.9.0에서 0.5로
// 내렸다(정밀도 벤치 250판×2 독립 배치, docs/rollout-temp.txt):
//   T=1   결정적 8/9 · 손해 84/94 · 부정확 4/8 → 오탐 15/111
//   T=0.5 결정적 10/10 · 손해 92/98 · 부정확 2/2 → 오탐 8/110
// 두 배치 모두 개선, 악화 지표 없음. 0에 더 붙이지 않는 이유는 롤아웃이
// 불확실성 표본이기도 해서다 — 완전 결정론이면 n=24가 같은 라인 24개가 된다.
// 연구용 덮어쓰기: env ROLL_T.
const ROLL_TEMP = (IS_NODE && process.env.ROLL_T) ? parseFloat(process.env.ROLL_T) : 0.5;

function rebuild(rec, upto) {
  const g = new E.MightyGame(rec.cfg);
  g.start(rec.dealer);
  const n = (upto === undefined) ? rec.actions.length : upto;
  for (let i = 0; i < n; i++) g.act(rec.actions[i].a);
  return g;
}

/** 인간 좌석의 플레이 결정 인덱스 목록 */
function playDecisions(rec, seat) {
  const out = [];
  for (let i = 0; i < rec.actions.length; i++) {
    const x = rec.actions[i];
    if (x.p === seat && x.ph === 'play' && x.a && x.a.type === 'play') out.push(i);
  }
  return out;
}

async function infer(sess, ort, g, seat) {
  const obs = M.encodeObs(g, seat);
  const mask = M.legalMask(g);
  const want = M.modelObsDim(sess);
  const o = obs.length === want ? obs : obs.slice(0, want);
  const r = await sess.run({
    obs: new ort.Tensor('float32', o, [1, want]),
    mask: new ort.Tensor('bool', mask, [1, M.ACTION_DIM]),
  });
  return { logits: r.logits.data, value: r.value ? r.value.data[0] : 0, mask };
}

/**
 * 마스크된 소프트맥스 샘플 (rng: () => [0,1)).
 * temp<1이면 분포를 배포 경로(argmax)에 가깝게 죈다 — 롤아웃이 실전보다 약하게
 * 두는 편향을 줄인다. 기본값은 ROLL_TEMP.
 */
function sampleIdx(logits, mask, rng, temp = ROLL_TEMP) {
  const t = (temp > 0 ? temp : 1);
  let mx = -Infinity;
  for (let i = 0; i < mask.length; i++) if (mask[i] && logits[i] > mx) mx = logits[i];
  let z = 0; const p = new Float64Array(mask.length);
  for (let i = 0; i < mask.length; i++) if (mask[i]) { p[i] = Math.exp((logits[i] - mx) / t); z += p[i]; }
  let u = rng() * z;
  for (let i = 0; i < mask.length; i++) if (mask[i]) { u -= p[i]; if (u <= 0) return i; }
  for (let i = mask.length - 1; i >= 0; i--) if (mask[i]) return i;
  return -1;
}

function greedyIdx(logits, mask) {
  let b = -1, bv = -Infinity;
  for (let i = 0; i < mask.length; i++) if (mask[i] && logits[i] > bv) { bv = logits[i]; b = i; }
  return b;
}

/** 현 국면부터 전 좌석 마스터로 플레이아웃. greedy=true면 결정론(고스트 라인용). */
async function playout(sess, ort, g, { rng = null, record = null, maxSteps = 400 } = {}) {
  let steps = 0;
  while (g.phase !== 'done' && g.phase !== 'redeal' && steps++ < maxSteps) {
    const p = g.currentPlayer;
    const { logits, mask } = await infer(sess, ort, g, p);
    const ai = rng ? sampleIdx(logits, mask, rng) : greedyIdx(logits, mask);
    let act = M.actionToEngine(ai, g, []);
    if (!act) throw new Error('playout: 액션 변환 실패 idx=' + ai);
    // 배포 마스터의 최종 경로와 동일하게 — 가드 미적용 시뮬은 실제로 나오지
    // 않을 낭비 수를 라인에 섞는다 (코칭 정합 버그와 같은 계열)
    if (act.type === 'play') act = await getAI().applyGuards(sess, ort, g, p, act);
    if (record) record.push({ p, ph: g.phase, a: JSON.parse(JSON.stringify(act)) });
    g.act(act);
  }
  return g;
}

/** 플레이 액션 → 정책 액션 인덱스 (플레이 페이즈 전용) */
function playActionIdx(a) {
  if (a.jokerCall) return 206;                       // A_PLAY_JOKERCALL
  if (E.isJoker(a.card)) return a.jokerSuit ? 201 + ['S','D','H','C'].indexOf(a.jokerSuit) : 205;
  return 149 + M.cidx(a.card);
}

/**
 * 1단계 스크리닝 — 결정별 EV 곡선과 ΔEV(정책 상위 대안 대비).
 * 반환 decisions[k]: {idx, trick, actual, v, vAfterAct, altIdx, vAfterAlt, dEV}
 */
async function screenRound(sess, ort, rec, seat, { tick } = {}) {
  const idxs = playDecisions(rec, seat);
  const out = [];
  for (const idx of idxs) {
    const g = rebuild(rec, idx);
    if (g.phase !== 'play' || g.currentPlayer !== seat) continue;
    const trick = g.play.trickNo;
    const { logits, value, mask } = await infer(sess, ort, g, seat);
    const actualA = rec.actions[idx].a;
    const actIdx = playActionIdx(actualA);
    // 후보: 실제 수 + 정책 상위 2개 (실제 수 제외)
    const cands = [];
    const order = [];
    for (let i = 0; i < mask.length; i++) if (mask[i]) order.push(i);
    order.sort((a, b) => logits[b] - logits[a]);
    for (const i of order) { if (i !== actIdx && cands.length < 2) cands.push(i); }
    const after = async (ai) => {
      const g2 = rebuild(rec, idx);
      const act = M.actionToEngine(ai, g2, []);
      if (!act) return null;
      g2.act(act);
      if (g2.phase === 'done') return g2.result.prizes[seat] / 2000;
      if (g2.phase === 'redeal') return 0;
      return (await infer(sess, ort, g2, seat)).value;
    };
    const vAct = await after(actIdx);
    let best = null;
    for (const c of cands) {
      const v = await after(c);
      if (v !== null && (best === null || v > best.v)) best = { idx: c, v };
    }
    out.push({
      idx, trick, actual: actualA, actIdx, v: value,
      vAfterAct: vAct,
      altIdx: best ? best.idx : null,
      vAfterAlt: best ? best.v : null,
      dEV: (best && vAct !== null) ? (best.v - vAct) : 0,
    });
    if (tick) await tick();
  }
  return out;
}

/** 2단계 — 같은 국면 페어드 롤아웃 (실제 수 vs 대안 수) */
async function rolloutPair(sess, ort, rec, seat, idx, altIdx, { n = 24, seed = 7, tick, keepLines = false } = {}) {
  const arms = { act: [], alt: [] };
  const altLines = [];
  const actIdx = playActionIdx(rec.actions[idx].a);
  for (let r = 0; r < n; r++) {
    for (const [arm, ai] of [['act', actIdx], ['alt', altIdx]]) {
      const g = rebuild(rec, idx);
      const first = M.actionToEngine(ai, g, []);
      if (!first) { arms[arm].push(null); continue; }
      const record = (keepLines && arm === 'alt')
        ? [{ p: seat, ph: 'play', a: JSON.parse(JSON.stringify(first)) }] : null;
      g.act(first);
      if (g.phase !== 'done' && g.phase !== 'redeal')
        await playout(sess, ort, g, { rng: E.makeRng(seed * 1000003 + r), record });
      const pz = g.phase === 'done' ? g.result.prizes[seat] : 0;
      arms[arm].push(pz);
      if (record) altLines.push({ prize: pz, actions: record,
        result: g.phase === 'done' ? g.result : null });
    }
    if (tick) await tick();
  }
  const stat = (xs) => {
    const v = xs.filter(x => x !== null);
    const mean = v.reduce((a, b) => a + b, 0) / v.length;
    return { mean, win: v.filter(x => x > 0).length, n: v.length };
  };
  return { act: stat(arms.act), alt: stat(arms.alt), altLines };
}

function classify(ro) {
  const d = ro.alt.mean - ro.act.mean;
  const flip = (ro.alt.win / ro.alt.n >= TH.FLIP_HI) && (ro.act.win / ro.act.n <= TH.FLIP_LO);
  if (flip) return { grade: GRADE.CRITICAL, dPrize: d };
  if (d >= TH.LOSS) return { grade: GRADE.LOSS, dPrize: d };
  if (d >= TH.SLIP) return { grade: GRADE.SLIP, dPrize: d };
  return null;
}

/** 대안 수 이후 결정론 라인 — 복기 화면에서 고스트 재생용 */
async function ghostLine(sess, ort, rec, seat, idx, altIdx) {
  const g = rebuild(rec, idx);
  const first = M.actionToEngine(altIdx, g, []);
  if (!first) return null;
  const tail = [{ p: seat, ph: 'play', a: JSON.parse(JSON.stringify(first)) }];
  g.act(first);
  if (g.phase !== 'done' && g.phase !== 'redeal')
    await playout(sess, ort, g, { record: tail });
  return {
    actions: rec.actions.slice(0, idx).concat(tail),
    result: g.phase === 'done' ? g.result : null,
  };
}

function cardName(a) {
  if (a.jokerCall) return E.cardName(a.card) + '(조커콜)';
  if (E.isJoker(a.card)) return '조커' + (a.jokerSuit ? `(${a.jokerSuit})` : '');
  return E.cardName(a.card);
}

function idxCardName(ai, g) {
  const act = M.actionToEngine(ai, g, []);
  return act ? cardName(act) : '?';
}

/**
 * 전체 파이프라인. opts.tick: 청크 양보 콜백(UI 프레임 유지),
 * opts.topK: 롤아웃 확정 대상 수, opts.n: 암당 롤아웃 수.
 * 반환: {evCurve, decisions, highlights}
 */
async function analyzeRound(sess, ort, rec, seat, opts = {}) {
  const { topK = 5, n = 24, seed = 7, tick = null, onProgress = null } = opts;
  const decisions = await screenRound(sess, ort, rec, seat, { tick });
  const evCurve = decisions.map(d => ({ idx: d.idx, trick: d.trick, v: d.v }));
  const suspects = decisions.filter(d => d.altIdx !== null && d.dEV > 0.02)
    .sort((a, b) => b.dEV - a.dEV).slice(0, topK);
  const highlights = [];
  let done = 0;
  for (const s of suspects) {
    const ro = await rolloutPair(sess, ort, rec, seat, s.idx, s.altIdx, { n, seed, tick, keepLines: true });
    const cls = classify(ro);
    if (onProgress) onProgress(++done, suspects.length);
    if (!cls) continue;
    const g = rebuild(rec, s.idx);
    // 고스트 = 가드 포함 argmax 반사실 라인 — "대안 수를 두고 실제 AI들이
    // 그대로 이어갔다면"의 결정론 라인. 실제 라인(역시 argmax+가드 진행)과
    // 같은 강도의 비교라 공정하다. 샘플링 롤아웃(T=ROLL_TEMP)은 양 팔 모두
    // 실전보다 약하게 두므로 등급 판정(평균 비교)에만 쓰고 재생 라인으론 쓰지 않는다.
    const ghost = await ghostLine(sess, ort, rec, seat, s.idx, s.altIdx);
    // 반사실 라인의 실제 이득 — 사용자에게 약속하는 수치는 이것이다.
    // 시뮬 평균(dPrize)은 샘플링 세계의 페어드 차이라 등급 판정에는 옳지만
    // "실제 대비 이득" 예측으로는 과대다(실플레이 캘리브레이션: 약속 +949 대
    // 라인 실이득 +38). 라인이 실제보다 좋아지는 하이라이트만 노출한다.
    const lineGain = (ghost && ghost.result && rec.result)
      ? ghost.result.prizes[seat] - rec.result.prizes[seat] : null;
    if (lineGain === null || lineGain <= 0) continue;
    highlights.push({
      idx: s.idx, trick: s.trick, grade: cls.grade,
      dPrize: Math.round(cls.dPrize), lineGain,
      actual: cardName(s.actual), alt: idxCardName(s.altIdx, g), altIdx: s.altIdx,
      flip: { act: ro.act, alt: ro.alt },
      ghost,
    });
  }
  highlights.sort((a, b) => b.lineGain - a.lineGain);
  return { evCurve, decisions, highlights };
}

const api = { analyzeRound, screenRound, rolloutPair, ghostLine, classify,
              playDecisions, rebuild, playActionIdx, infer, GRADE, TH };
if (IS_NODE) module.exports = api;
else window.MightyAnalysis = api;

})();
