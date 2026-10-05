/**
 * 확정승 판정에 좌석별 보이드를 넣으면 가드가 새로 잡을 자리가 생기는가 — 후회 측정.
 *
 * 배경(2026-10-05, Records/round2·round5 복기): keyCardGuard의 위협 집합은 안 본
 * 카드를 전부 살아있는 위협으로 본다. 남은 좌석이 그 무늬 보이드임이 플레이로
 * 증명돼도 반영하지 않는다(src/mighty-ai.js 위협 계산). 관측 인코더(void4x4)와
 * PIMC 딜러(voids)는 이미 보이드를 쓰는데 가드만 안 쓴다.
 *
 * 281판 스캔: 보이드를 넣으면 '아무도 못 넘김'으로 바뀌는 자리가 판당 0.89회,
 * 그 중 실제로 점수패를 낸 자리가 판당 0.21회였다. 빈도는 확인됐고 남은 질문은
 * 건당 이득이다 — 그걸 여기서 교사(PIMC)로 잰다.
 *
 * 클래스(좌석 가시 정보만):
 *   - 비주공·리드 아님 · 테이블 최강이 상대팀(내가 아는 범위에서 확정)
 *   - 보이드를 반영하면 뒤 좌석 누구도 최강을 못 넘긴다(= 상대 확정승)
 *   - 보이드를 빼면 위협이 남는다(= 현행 가드가 못 보는 자리, 이게 측정 표적)
 *   - 내가 이길 수 있는 합법수가 없다(버릴 카드만 고르는 자리)
 *   - 점수패와 비점수패를 둘 다 들고 있다(가드가 교체할 대상이 있다)
 *
 * 가드 처방은 '최저 비점수패'다. 교사가 그걸 최선으로 보는 비율과, 정책이 흘리는
 * 후회(A선택·B평가)가 가드 채택 여부를 가른다. lastSeat 표적이 교사 동의율
 * 67.3%에서 중립으로 끝난 전례가 있다 — 동의율이 낮으면 가드로 가지 않는다.
 *
 * 사용: node tools/research/voidlock_probe.js [딜수]
 *   env MODELS(기본 v16e) · SEED_BASE · PIMC_N(교사값 낼 국면 수, 기본 60) · K(결정화, 기본 64)
 */
'use strict';
const path = require('path');
const P = p => path.join(__dirname, p);
const ort = require('onnxruntime-node');
const E = require(P('../../src/mighty-engine.js'));
const AI = require(P('../../src/mighty-ai.js'));
const M = require(P('../../src/mighty-master.js'));

const N = parseInt(process.argv[2] || '600', 10);
const MODELS = (process.env.MODELS || 'v16e').split(',').map(s => s.trim());
const GEN = process.env.GEN || MODELS[0];
const SEED0 = parseInt(process.env.SEED_BASE || '88000000', 10);
const PIMC_N = parseInt(process.env.PIMC_N || '60', 10);
const K = parseInt(process.env.K || '64', 10);
const BLUNDER = parseFloat(process.env.BLUNDER || '200');
const A_PLAY0 = 149, A_JS0 = 201, A_JOKER = 205;
const SUITS4 = ['S', 'D', 'H', 'C'];

const idxOf = mv => E.isJoker(mv.card)
  ? (mv.jokerSuit ? A_JS0 + ['S','D','H','C'].indexOf(mv.jokerSuit) : A_JOKER)
  : A_PLAY0 + M.cidx(mv.card);

function cloneGame(g) {
  const c = Object.create(Object.getPrototypeOf(g));
  for (const k of Object.keys(g)) {
    const v = g[k];
    c[k] = (typeof v === 'object' && v !== null) ? structuredClone(v) : v;
  }
  return c;
}
const allCards = () => {
  const out = [E.JOKER];
  for (const s of SUITS4) for (let r = 2; r <= 14; r++) out.push({ suit: s, rank: r });
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
  const v = []; for (let p = 0; p < E.NUM_PLAYERS; p++) v.push(new Set());
  const scan = (plays, led) => { if (!led) return;
    for (const e of plays) {
      // 마이티·조커는 팔로우 면제 — 오프수트로 나와도 '무늬 없음'의 근거가 아니다
      if (E.isJoker(e.card) || (g.mightyCard && E.sameCard(e.card, g.mightyCard))) continue;
      if (e.card.suit !== led) v[e.player].add(led); } };
  for (const t of g.play.history)
    scan(t.plays, t.ledSuit || (t.plays[0] && !E.isJoker(t.plays[0].card) ? t.plays[0].card.suit : null));
  scan(g.play.table, g.play.ledSuit);
  return v;
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
    for (let i = bag.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1));
      [bag[i], bag[j]] = [bag[j], bag[i]]; }
    const assign = new Map(); let ok = true;
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

/**
 * 보이드 반영 위협 집합 — keyCardGuard(src/mighty-ai.js)의 계산을 그대로 옮기되
 * useVoids면 '그 무늬를 가질 수 있는 좌석이 남아 있을 때만' 위협으로 센다.
 */
function threatsLeft(g, seat, useVoids) {
  const pl = g.play, cfg = g.config || {};
  const gir = g.contract ? g.contract.giruda : 'N';
  const gt = (a, b) => a[0] > b[0] || (a[0] === b[0] && a[1] > b[1]);
  let bk = [-2, -1], best = null;
  for (const e of pl.table) { const k = g._cardStrength(e, pl); if (gt(k, bk)) { bk = k; best = e; } }
  if (!best) return null;
  const seen = knownTo(g, seat);
  const acted = new Set(pl.table.map(e => e.player)); acted.add(seat);
  const rest = [];
  for (let p = 0; p < E.NUM_PLAYERS; p++) if (!acted.has(p)) rest.push(p);
  const V = useVoids ? voidsOf(g) : null;
  const canHold = suit => !V || rest.some(p => !V[p].has(suit));
  const threats = [];
  if (rest.length) {
    const jokerCanWin = !pl.jokerCallActive &&
      !(pl.trickNo === 1 && cfg.firstTrickJokerWeak !== false) &&
      !(pl.trickNo >= E.HAND_SIZE && cfg.lastTrickJokerWeak !== false);
    let ruff = true;
    if (pl.ledSuit && gir !== 'N' && pl.ledSuit !== gir) {
      let unseenLed = 0;
      for (let r = 2; r <= 14; r++) if (!seen.has(pl.ledSuit + r)) unseenLed++;
      if (unseenLed >= rest.length) ruff = false;
      if (V && rest.every(p => !V[p].has(pl.ledSuit))) ruff = false;   // 전원 팔로우 가능 = 컷 불가
    }
    if (!seen.has(E.cardId(g.mightyCard)) && canHold(g.mightyCard.suit)) threats.push([4, 0]);
    if (jokerCanWin && !seen.has(E.JOKER)) threats.push([3, 0]);
    if (gir !== 'N' && ruff && canHold(gir))
      for (let r = 2; r <= 14; r++) if (!seen.has(gir + r)) threats.push([2, r]);
    if (pl.ledSuit && canHold(pl.ledSuit))
      for (let r = 2; r <= 14; r++) if (!seen.has(pl.ledSuit + r)) threats.push([1, r]);
  }
  return { bk, best, n: threats.filter(t => gt(t, bk)).length };
}

/** 클래스 판정 — 맞으면 {legal, winners, pts} 반환 */
function classOf(g, p) {
  if (g.phase !== 'play' || p === g.declarer) return null;
  const pl = g.play;
  if (!pl || pl.table.length === 0 || pl.table.length >= E.NUM_PLAYERS - 1) return null;  // 리드·마지막 순번 제외
  const on = threatsLeft(g, p, true), off = threatsLeft(g, p, false);
  if (!on || !off) return null;
  if (on.n !== 0 || off.n === 0) return null;            // 보이드로만 확정이 되는 자리
  // 팀 판정 — 좌석 가시 정보만. 상대팀이 이기는 중일 때만 손해가 성립한다
  const fd = g.friendDecl;
  const iAmFriend = (g.friendRevealed && g.friend === p) ||
    (fd && fd.mode === 'card' && fd.card && g.hands[p].some(c => E.sameCard(c, fd.card)));
  const w = on.best.player;
  let winnerIsOpp = null;
  if (w === g.declarer) winnerIsOpp = !iAmFriend;
  else if (g.friendRevealed) winnerIsOpp = iAmFriend ? !(g.friend === w) : (g.friend === w);
  if (winnerIsOpp !== true) return null;
  const legal = g._legalPlays(p).filter(mv => !mv.jokerCall);
  if (legal.length < 2) return null;
  const gt = (a, b) => a[0] > b[0] || (a[0] === b[0] && a[1] > b[1]);
  const winners = legal.filter(mv => gt(g._cardStrength(
    { card: mv.card, jokerSuit: mv.jokerSuit, player: p }, pl), on.bk));
  if (winners.length) return null;                       // 이길 수 있으면 다른 문제다
  const pts = legal.filter(mv => E.isPointCard(mv.card));
  const cheap = legal.filter(mv => !E.isPointCard(mv.card));
  if (!pts.length || !cheap.length) return null;         // 고를 게 있어야 가드가 의미 있다
  // winners 자리에 '가드 처방'을 넣는다 — 하네스는 이 집합 채택률을 센다
  cheap.sort((a, b) => (E.isJoker(a.card) ? 99 : a.card.rank) - (E.isJoker(b.card) ? 99 : b.card.rank));
  return { legal, winners: [cheap[0]], pts: pts.length };
}

async function topAction(sess, g, seat) {
  let obs = M.encodeObs(g, seat, []);
  const mask = M.legalMask(g, []);
  const want = M.modelObsDim(sess);
  if (want !== obs.length) obs = obs.subarray(0, want);
  const out = await sess.run({
    obs: new ort.Tensor('float32', obs, [1, want]),
    mask: new ort.Tensor('bool', mask, [1, M.ACTION_DIM]),
  });
  const lg = out.logits.data;
  let best = -1, bv = -Infinity;
  for (let i = 0; i < M.ACTION_DIM; i++) if (mask[i] && lg[i] > bv) { bv = lg[i]; best = i; }
  return best;
}

(async () => {
  const sess = {};
  for (const id of new Set([...MODELS, GEN]))
    sess[id] = await ort.InferenceSession.create(P(`../../web/model/mighty_master_${id}.onnx`));
  const ag = [];
  for (let p = 0; p < 5; p++) ag.push(await AI.createAgent({ tier: 'master', session: sess[GEN], ort }));
  let sc = 24680; const rnd = () => { sc = (sc * 1103515245 + 12345) & 0x7fffffff; return sc / 0x7fffffff; };

  const hit = {}, regret = {}, paired = {}, honest = {}, blunder = {};
  for (const id of MODELS) { hit[id] = 0; regret[id] = []; paired[id] = []; honest[id] = []; blunder[id] = []; }
  let states = 0, deals = 0, pimcDone = 0, pimcWin = 0, pimcGain = [];

  for (let i = 0; i < N; i++) {
    const g = new E.MightyGame({ seed: SEED0 + i });
    g.start(i % 5);
    let guard = 0;
    while (g.phase !== 'done' && g.phase !== 'redeal' && guard++ < 900) {
      const p = g.currentPlayer;
      const cls = classOf(g, p);
      if (cls) {
        states++;
        const winIdx = new Set(cls.winners.map(idxOf));
        const polTopPre = {};

        const polTop = {};
        for (const id of MODELS) {
          polTop[id] = await topAction(sess[id], g, p);
          if (winIdx.has(polTop[id])) hit[id]++;
        }
        // 교사값 — 비싸므로 앞 PIMC_N개만
        if (pimcDone < PIMC_N) {
          const dets = [];
          for (let k = 0; k < K; k++) { const d = determinize(g, p, rnd); if (d) dets.push(d); }
          if (dets.length >= 8) {
            const cands = cls.legal.slice(0, 6);
            const scores = [];
            for (const mv of cands) {
              let sum = 0, n = 0, sumA = 0, nA = 0, sumB = 0, nB = 0;
              for (let di = 0; di < dets.length; di++) {
                const sim = cloneGame(dets[di]);
                try { sim.act({ type: 'play', card: mv.card, jokerSuit: mv.jokerSuit }); }
                catch (e) { continue; }
                let gd = 0;
                while (sim.phase !== 'done' && sim.phase !== 'redeal' && gd++ < 200)
                  sim.act(await ag[sim.currentPlayer].act(sim, sim.currentPlayer));
                if (sim.phase === 'done') {
                  const pr = sim.result.prizes[p];
                  sum += pr; n++;
                  if (di % 2) { sumB += pr; nB++; } else { sumA += pr; nA++; }
                }
              }
              // A/B 분할: 최선수를 A에서 고르고 값은 B에서 읽는다. 같은 표본에서
              // 고르고 재면 표본 최대가 위로 편향돼(승자의 저주) 후회가 부풀려진다.
              if (n) scores.push({ mv, v: sum / n,
                                   a: nA ? sumA / nA : null, b: nB ? sumB / nB : null });
            }
            if (scores.length > 1) {
              scores.sort((a, b) => b.v - a.v);
              pimcDone++;
              if (winIdx.has(idxOf(scores[0].mv))) pimcWin++;
              // 후회 = 교사 최선수 값 − 정책이 고른 수의 값. 실제로 흘린 상금이다.
              const byIdx = new Map(scores.map(x => [idxOf(x.mv), x.v]));
              // 같은 국면·같은 교사값이므로 모델 간 차이는 페어드로 재야 한다.
              // 비페어드 평균끼리 빼면 국면 분산(σ≈115)이 그대로 남아 판당 몇십짜리
              // 개선이 신뢰구간에 묻힌다.
              const base = byIdx.get(polTop[MODELS[MODELS.length - 1]]);
              for (const id of MODELS) {
                const v = byIdx.get(polTop[id]);
                if (v !== undefined) regret[id].push(scores[0].v - v);
                if (v !== undefined && base !== undefined) paired[id].push(v - base);
              }
              const ok = scores.filter(s => s.a !== null && s.b !== null);
              if (ok.length > 1) {
                const bestA = ok.reduce((x, y) => (y.a > x.a ? y : x));
                const byB = new Map(ok.map(s => [idxOf(s.mv), s.b]));
                for (const id of MODELS) {
                  const vb = byB.get(polTop[id]);
                  if (vb !== undefined) {
                    honest[id].push(bestA.b - vb);
                    // 대형 실수 = 교사 최선수보다 BLUNDER 이상 손해. 사람이 체감하는
                    // 것은 평균 후회가 아니라 "저건 아니지" 소리 나오는 이 장면이고,
                    // 비율이라 평균보다 신뢰구간이 훨씬 좁다(같은 국면 페어드).
                    blunder[id].push(bestA.b - vb >= BLUNDER ? 1 : 0);
                  }
                }
              }
              const bestWin = scores.find(s => winIdx.has(idxOf(s.mv)));
              const bestLose = scores.find(s => !winIdx.has(idxOf(s.mv)));
              if (bestWin && bestLose) pimcGain.push(bestWin.v - bestLose.v);
            }
          }
        }
      }
      g.act(await ag[p].act(g, p));
    }
    if (g.phase === 'done') deals++;
    if ((i + 1) % 100 === 0) process.stderr.write(`  ${i + 1}/${N}딜 · 국면 ${states} · PIMC ${pimcDone}\n`);
  }

  console.log(`클래스 voidlock · 생성 모델 ${GEN} · 완료 딜 ${deals}/${N} · 클래스 국면 ${states}개 (딜당 ${(states / Math.max(1, deals)).toFixed(2)})`);
  const stat = a => {
    const m = a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
    const v = a.length > 1 ? a.reduce((x, y) => x + (y - m) ** 2, 0) / (a.length - 1) : 0;
    return { m, ci: a.length ? 1.96 * Math.sqrt(v / a.length) : 0 };
  };
  const BASE = MODELS[MODELS.length - 1];
  console.log(`\n모델      처방 채택률    후회(같은표본)   후회(A선택·B평가)   대형실수율   ${BASE} 대비 페어드`);
  for (const id of MODELS) {
    const r = stat(regret[id]), h = stat(honest[id]), d = stat(paired[id]);
    console.log(`  ${id.padEnd(7)} ${(100 * hit[id] / Math.max(1, states)).toFixed(1).padStart(6)}%` +
      `      −${r.m.toFixed(0).padStart(4)} ± ${r.ci.toFixed(0)}` +
      `      ${h.m >= 0 ? '−' : '+'}${Math.abs(h.m).toFixed(0).padStart(4)} ± ${h.ci.toFixed(0)}` +
      `   ${(100 * blunder[id].reduce((x, y) => x + y, 0) / Math.max(1, blunder[id].length)).toFixed(1).padStart(5)}%` +
      `   ${id === BASE ? '기준' : `${d.m >= 0 ? '+' : ''}${d.m.toFixed(1)} ± ${d.ci.toFixed(1)}` +
        `${Math.abs(d.m) > d.ci ? (d.m > 0 ? ' 유의 개선' : ' 유의 악화') : ''}`}`);
  }
  console.log('  ※ 같은 표본에서 고르고 재면 표본 최대가 위로 편향된다(승자의 저주).' +
    ' A선택·B평가가 실제로 흘린 값이다.');
  if (pimcDone) {
    const m = pimcGain.reduce((a, b) => a + b, 0) / Math.max(1, pimcGain.length);
    const v = pimcGain.reduce((a, b) => a + (b - m) ** 2, 0) / Math.max(1, pimcGain.length - 1);
    console.log(`\n교사(PIMC ${K}벌 · ${pimcDone}국면) 가드 처방(최저 비점수패)이 최선인 비율 ${(100 * pimcWin / pimcDone).toFixed(1)}%`);
    console.log(`  처방 − 비처방 최선 상금차 평균 ${m >= 0 ? "+" : ""}${m.toFixed(0)} ± ${(1.96 * Math.sqrt(v / Math.max(1, pimcGain.length))).toFixed(0)} (n=${pimcGain.length})`);
  }
  console.log('\n보이드를 반영하면 상대 확정승이 증명되는 자리다 — 점수패를 얹을 이유가 없다면 후회가 그대로 손실이다.');
  process.exit(0);
})().catch(e => { console.error('ERR', e && e.stack); process.exit(1); });
