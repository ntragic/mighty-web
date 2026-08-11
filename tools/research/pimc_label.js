/**
 * 탐색 교사 라벨러 (docs/LOOKAHEAD-PLAN.md 2단계 · ExIt).
 *
 * 자가대전을 돌며 플레이 결정 국면을 샘플링하고, 각 국면에서 PIMC 탐색으로
 * '개선된 행동'을 찾아 jsonl로 남긴다. 파이썬 학습 측이 같은 판을 재현해
 * 관측을 만들고 CE 목표로 쓴다(엔진 파리티가 보장하므로 안전하다).
 *
 * 규칙 기반 conv_target과 달리 **클래스를 사람이 정의하지 않는다** — 컷·조커콜·
 * 기루다 소진이 한 탐색에서 동시에 나온다.
 *
 * 비용 조절: 후보 수(TOPM)와 결정화 수(K)와 롤아웃 깊이(DEPTH)로 조절한다.
 * DEPTH=0이면 끝까지 굴리고, N이면 N트릭만 굴린 뒤 가치 헤드로 평가한다.
 *
 * 사용: node tools/research/pimc_label.js <출력.jsonl> [판수]
 *   env MODEL · SEED_BASE · TOPM(기본 4) · K(기본 32) · DEPTH(기본 3)
 *       SAMPLE(국면 샘플링 확률, 기본 0.25) · MARGIN(정책 1위와 탐색 1위가
 *       같으면 기록하지 않는 최소 이득, 기본 0 = 전부 기록)
 *       JC_SAMPLE(조커콜 국면 샘플링 확률, 기본 1.0) · K_JC(조커콜 국면 결정화 수,
 *       기본 200) — 조커콜은 기회가 1.2만 판에 242회로 극히 드물어 균등
 *       샘플링하면 CE 신호가 컷에 묻힌다(v12에서 실측: 이득형 94.5→85.9%,
 *       자해형 9.1→12.8%로 악화). 과표집하고 결정화도 늘려 라벨 품질을 올린다.
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
const SEED0 = parseInt(process.env.SEED_BASE || '21000000', 10);
const TOPM = parseInt(process.env.TOPM || '4', 10);
const K = parseInt(process.env.K || '32', 10);
const DEPTH = parseInt(process.env.DEPTH || '3', 10);
const SAMPLE = parseFloat(process.env.SAMPLE || '0.25');
const MARGIN = parseFloat(process.env.MARGIN || '0');
const JC_SAMPLE = parseFloat(process.env.JC_SAMPLE || '1.0');
const K_JC = parseInt(process.env.K_JC || '200', 10);
// 특수카드 무력화 국면(조커콜·마이티 무늬 리드)은 이득이 여러 트릭 뒤에 실현된다.
// 깊이 3에서 자르면 조커콜 가치가 평균 1,155 과소평가된다(keykill_probe 실측).
// 그래서 이 국면만 끝까지 굴리고(DEPTH_JC=0) 결정화도 크게 준다.
const DEPTH_JC = parseInt(process.env.DEPTH_JC || String(DEPTH), 10);
const KEYKILL_ONLY = process.env.KEYKILL_ONLY === '1';

const SUITS = ['S', 'D', 'H', 'C'];
const allCards = () => {
  const out = [E.JOKER];
  for (const s of SUITS) for (let r = 2; r <= 14; r++) out.push({ suit: s, rank: r });
  return out;
};

function knownTo(g, seat) {
  const seen = new Set();
  for (const t of g.play.history) for (const e of t.plays) seen.add(E.cardId(e.card));
  for (const e of g.play.table) seen.add(E.cardId(e.card));
  for (const c of g.hands[seat]) seen.add(E.cardId(c));
  if (seat === g.declarer && g.discard) for (const c of g.discard) seen.add(E.cardId(c));
  return seen;
}

function voidsOf(g) {
  const v = [];
  for (let p = 0; p < E.NUM_PLAYERS; p++) v.push(new Set());
  const scan = (plays, led) => {
    if (!led) return;
    for (const e of plays) {
      if (E.isJoker(e.card)) continue;
      if (e.card.suit !== led) v[e.player].add(led);
    }
  };
  for (const t of g.play.history)
    scan(t.plays, t.ledSuit || (t.plays[0] && !E.isJoker(t.plays[0].card) ? t.plays[0].card.suit : null));
  scan(g.play.table, g.play.ledSuit);
  return v;
}

function cloneGame(g) {
  const c = Object.create(Object.getPrototypeOf(g));
  for (const k of Object.keys(g)) {
    const v = g[k];
    c[k] = (typeof v === 'object' && v !== null) ? structuredClone(v) : v;
  }
  return c;
}

function determinize(g, seat, rnd) {
  const known = knownTo(g, seat);
  const pool = allCards().filter(c => !known.has(E.cardId(c)));
  const need = [];
  for (let p = 0; p < E.NUM_PLAYERS; p++) if (p !== seat) need.push({ seat: p, n: g.hands[p].length });
  const kittyN = (seat === g.declarer || !g.discard) ? 0 : g.discard.length;
  if (need.reduce((a, b) => a + b.n, 0) + kittyN !== pool.length) return null;
  const vd = voidsOf(g);
  const order = need.slice().sort((a, b) => vd[b.seat].size - vd[a.seat].size);
  for (let attempt = 0; attempt < 40; attempt++) {
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
    if (!ok || bag.length !== kittyN) continue;
    const clone = cloneGame(g);
    for (const [p, cards] of assign) clone.hands[p] = cards;
    if (kittyN) clone.discard = bag;
    return clone;
  }
  return null;
}

/** 가치 헤드로 국면 평가 (깊이 제한 롤아웃의 말단) */
async function valueOf(sess, g, seat) {
  let obs = M.encodeObs(g, seat, []);
  const mask = M.legalMask(g, []);
  const want = M.modelObsDim(sess);
  if (want !== M.OBS_DIM) obs = obs.subarray(0, want);
  const out = await sess.run({
    obs: new ort.Tensor('float32', obs, [1, want]),
    mask: new ort.Tensor('bool', mask, [1, M.ACTION_DIM]),
  });
  return out.value ? out.value.data[0] : 0;
}

(async () => {
  const OUT = process.argv[2] || 'pimc_labels.jsonl';
  const N = parseInt(process.argv[3] || '300', 10);
  const sess = await ort.InferenceSession.create(MODEL);
  const ws = fs.createWriteStream(OUT);
  let seedCounter = 12345;
  const rnd = () => { seedCounter = (seedCounter * 1103515245 + 12345) & 0x7fffffff;
    return seedCounter / 0x7fffffff; };

  // 롤아웃용 에이전트 — 배포 경로 그대로(가드 포함)가 평가자다
  const ag = [];
  for (let s = 0; s < E.NUM_PLAYERS; s++)
    ag.push(await AI.createAgent({ tier: 'master', session: sess, ort }));

  let labeled = 0, changed = 0, jcLabeled = 0;
  for (let i = 0; i < N; i++) {
    const seed = SEED0 + i;
    const rng = E.makeRng(seed);
    const g = new E.MightyGame({ seed });
    g.start(Math.floor(rng() * E.NUM_PLAYERS));
    const actions = [];
    let guard = 0;
    while (g.phase !== 'done' && g.phase !== 'redeal' && guard++ < 900) {
      const p = g.currentPlayer;
      const act = await ag[p].act(g, p);
      // 특수카드 무력화 국면인가 — 조커콜(조커 무력화) 또는 확정 야당의
      // 마이티 무늬 리드(마이티 무력화). 드물고 결정적이라 과표집한다.
      let isJC = false;
      if (g.phase === 'play' && g.play.table.length === 0) {
        const legal = g._legalPlays(p);
        const fd = g.friendDecl;
        const holdsFriendCard = fd && fd.mode === 'card' && fd.card &&
          g.hands[p].some(c => E.sameCard(c, fd.card));
        const oppSeat = p !== g.declarer && !holdsFriendCard &&
          !(g.friendRevealed && p === g.friend);
        if (legal.some(m => m.jokerCall)) isJC = true;
        if (!isJC && oppSeat && !g.hands[p].some(c => E.isJoker(c))) {
          const seen = new Set();
          for (const t of g.play.history) for (const e of t.plays) seen.add(E.cardId(e.card));
          for (const c of g.hands[p]) seen.add(E.cardId(c));
          const ms = g.mightyCard.suit;
          if (!seen.has(E.cardId(g.mightyCard)) &&
              legal.some(m => !m.jokerCall && !E.isJoker(m.card) && m.card.suit === ms
                              && !E.sameCard(m.card, g.mightyCard)))
            isJC = true;                    // 마이티 끌어내기 가능 국면
        }
      }
      const take = g.phase === 'play' && act.type === 'play' &&
        (isJC ? rnd() < JC_SAMPLE : (!KEYKILL_ONLY && rnd() < SAMPLE));
      if (take) {
        const kUse = isJC ? K_JC : K;
        const dUse = isJC ? DEPTH_JC : DEPTH;
        // 후보 — 정책 상위 TOPM
        let obs = M.encodeObs(g, p, []);
        const mask = M.legalMask(g, []);
        const want = M.modelObsDim(sess);
        if (want !== M.OBS_DIM) obs = obs.subarray(0, want);
        const out = await sess.run({
          obs: new ort.Tensor('float32', obs, [1, want]),
          mask: new ort.Tensor('bool', mask, [1, M.ACTION_DIM]),
        });
        const lg = out.logits.data;
        const idx = [];
        for (let a = 0; a < M.ACTION_DIM; a++) if (mask[a]) idx.push(a);
        idx.sort((a, b) => lg[b] - lg[a]);
        const cands = idx.slice(0, TOPM);
        if (cands.length > 1) {
          const dets = [];
          for (let k = 0; k < kUse; k++) { const d = determinize(g, p, rnd); if (d) dets.push(d); }
          if (dets.length >= 8) {
            const scores = [];
            for (const ci of cands) {
              let sum = 0, n = 0;
              for (const d of dets) {
                const sim = cloneGame(d);
                const a0 = M.actionToEngine(ci, sim, []);
                if (!a0) continue;
                try { sim.act(a0); } catch (e) { continue; }
                const stopTrick = sim.play ? sim.play.trickNo + dUse : 99;
                let gd = 0;
                while (sim.phase !== 'done' && sim.phase !== 'redeal' && gd++ < 200) {
                  if (dUse > 0 && sim.play && sim.play.trickNo >= stopTrick
                      && sim.play.table.length === 0) break;      // 트릭 경계에서 절단
                  const q = sim.currentPlayer;
                  sim.act(await ag[q].act(sim, q));
                }
                const v = sim.phase === 'done'
                  ? sim.result.prizes[p] / 1000                   // 상금 스케일 맞춤
                  : await valueOf(sess, sim, p);
                sum += v; n++;
              }
              if (n) scores.push({ i: ci, v: sum / n });
            }
            if (scores.length > 1) {
              scores.sort((a, b) => b.v - a.v);
              const best = scores[0], polTop = cands[0];
              const polScore = scores.find(x => x.i === polTop);
              const gain = polScore ? best.v - polScore.v : 0;
              if (best.i !== polTop) changed++;
              if (gain >= MARGIN) {
                ws.write(JSON.stringify({
                  seed, dealer: g.dealer, cfg: g.config, upto: actions.length, seat: p,
                  target: best.i, policyTop: polTop, gain: +gain.toFixed(4), jc: isJC ? 1 : 0,
                  actions: actions.map(a => JSON.parse(JSON.stringify(a))),
                }) + '\n');
                labeled++;
                if (isJC) jcLabeled++;
              }
            }
          }
        }
      }
      actions.push(JSON.parse(JSON.stringify(act)));
      g.act(act);
    }
    if ((i + 1) % 25 === 0)
      process.stderr.write(`  ${i + 1}/${N}판 · 라벨 ${labeled} · 정책과 다른 목표 ${changed}\n`);
  }
  ws.end();
  console.log(`라벨 ${labeled}건 (조커콜 국면 ${jcLabeled}건) · 정책 1위와 다른 목표 ` +
    `${changed}건 (${(100 * changed / Math.max(1, labeled)).toFixed(1)}%) → ${OUT}`);
})();
