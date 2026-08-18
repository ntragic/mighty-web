/**
 * 마지막 순번 확정승 회피 — 세대별 퇴화인지 잰다.
 *
 * 제보(2026-08-17, seed 898941411 트릭3): 조커 프렌드가 **마지막 순번**에서
 * ♣K로 확정 승리할 수 있는데 ♣2를 내고 야당에 2점을 넘겼다. PIMC 400벌에서
 * ♣K가 실제 착수보다 판당 436 낫다(−247 vs −683, 신뢰구간 비중첩).
 *
 * 단서: v8이 80%로 ♣K를 고르는데 v16e는 30.5%다. 세대를 거치며 사라진 능력일
 * 수 있어 계통 비교가 필요하다. 가드로 덮기 전에 그것부터 확인한다.
 *
 * 클래스(좌석 가시 정보만, 불확실성 0):
 *   - 내가 프렌드(프렌드 카드 보유·비주공)
 *   - **마지막 순번**(테이블에 4장) → 이기는 수는 곧 확정승
 *   - 현재 테이블 최강이 아군이 아니다
 *   - 이기는 합법수가 있고 선택지가 둘 이상
 *   - 테이블에 점수카드가 있다(넘기면 야당 득점)
 *
 * 사용: node tools/research/lastseat_probe.js [딜수]
 *   env MODELS='v16e,v13,v11ctl,v8,v6b,v5' · GEN(국면 생성 모델, 기본 MODELS[0])
 *       SEED_BASE · PIMC_N(PIMC로 교사값을 낼 국면 수, 기본 0) · K(결정화, 기본 64)
 */
'use strict';
const path = require('path');
const P = p => path.join(__dirname, p);
const ort = require('onnxruntime-node');
const E = require(P('../../src/mighty-engine.js'));
const AI = require(P('../../src/mighty-ai.js'));
const M = require(P('../../src/mighty-master.js'));

const N = parseInt(process.argv[2] || '600', 10);
const MODELS = (process.env.MODELS || 'v16e,v13,v11ctl,v8,v6b,v5').split(',').map(s => s.trim());
const GEN = process.env.GEN || MODELS[0];
const SEED0 = parseInt(process.env.SEED_BASE || '77000000', 10);
const PIMC_N = parseInt(process.env.PIMC_N || '0', 10);
const K = parseInt(process.env.K || '64', 10);
// CLASS: lastseat(기본) = 마지막 순번 확정승 | weaklead = 아군이 명목상 최강이나
// 확정승 아니고 뒤에 2명+ | oppwin = 최강이 야당. 8/16 제보(컷 미실행)를 비율이
// 아니라 후회로 재측정하기 위해 넣었다 — 비율 일치는 국면 선택 오류를 못 잡는다.
const CLASS = process.env.CLASS || 'lastseat';
// BLUNDER: 대형 실수 판정선(상금). 라벨 이득 중앙값이 88·평균 141이라 200이면
// '한눈에 보이는 실수'에 해당한다.
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
    for (const e of plays) { if (E.isJoker(e.card)) continue;
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

/** 클래스 판정 — 맞으면 {legal, winners} 반환 */
function classOf(g, p) {
  if (g.phase !== 'play' || p === g.declarer) return null;
  if (g.play.table.length === 0) return null;                      // 리드는 제외
  if (CLASS === 'lastseat' && g.play.table.length !== E.NUM_PLAYERS - 1) return null;
  const fd = g.friendDecl;
  if (!(fd && fd.mode === 'card' && fd.card &&
        g.hands[p].some(c => E.sameCard(c, fd.card)))) return null;
  let best = null, bk = [-2, -1];
  for (const e of g.play.table) {
    const k = g._cardStrength(e, g.play);
    if (k[0] > bk[0] || (k[0] === bk[0] && k[1] > bk[1])) { bk = k; best = e; }
  }
  if (!best) return null;
  const ally = best.player === g.declarer ||
    (g.friendRevealed && g.friend === best.player && best.player !== p);
  const behind = E.NUM_PLAYERS - 1 - g.play.table.length;
  if (CLASS === 'weaklead') {
    if (!ally || behind < 2) return null;                           // 아군 최강 + 뒤에 2명+
  } else {
    if (ally) return null;                                          // 야당이 이기는 중만
  }
  const pts = g.play.table.filter(e => !E.isJoker(e.card) && e.card.rank >= 10).length;
  if (CLASS === 'lastseat' && pts === 0) return null;               // 마지막 순번은 점수 걸린 것만
  const legal = g._legalPlays(p);
  if (legal.length < 2) return null;
  const winners = legal.filter(mv => {
    const k = g._cardStrength({ card: mv.card, jokerSuit: mv.jokerSuit, player: p,
                               jokerCall: mv.jokerCall }, g.play);
    return k[0] > bk[0] || (k[0] === bk[0] && k[1] > bk[1]);
  });
  return winners.length ? { legal, winners, pts } : null;
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

  console.log(`클래스 ${CLASS} · 생성 모델 ${GEN} · 완료 딜 ${deals}/${N} · 클래스 국면 ${states}개 (딜당 ${(states / Math.max(1, deals)).toFixed(2)})`);
  const stat = a => {
    const m = a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
    const v = a.length > 1 ? a.reduce((x, y) => x + (y - m) ** 2, 0) / (a.length - 1) : 0;
    return { m, ci: a.length ? 1.96 * Math.sqrt(v / a.length) : 0 };
  };
  const BASE = MODELS[MODELS.length - 1];
  console.log(`\n모델      확정승 채택률   후회(같은표본)   후회(A선택·B평가)   대형실수율   ${BASE} 대비 페어드`);
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
    console.log(`\n교사(PIMC ${K}벌 · ${pimcDone}국면) 확정승이 최선인 비율 ${(100 * pimcWin / pimcDone).toFixed(1)}%`);
    console.log(`  확정승 − 비확정승 상금차 평균 ${m >= 0 ? "+" : ""}${m.toFixed(0)} ± ${(1.96 * Math.sqrt(v / Math.max(1, pimcGain.length))).toFixed(0)} (n=${pimcGain.length})`);
  }
  console.log('\n마지막 순번이라 위험이 0이다 — 교사값이 높으면 회피는 순손실이다.');
  process.exit(0);
})().catch(e => { console.error('ERR', e && e.stack); process.exit(1); });
