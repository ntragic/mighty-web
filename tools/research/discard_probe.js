/**
 * 프렌드 버림(discard) 국면의 후보 그룹화 타당성 측정.
 *
 * 제보(2026-08-23, seed 1322498089): 주공 바로 다음 좌석의 프렌드가 점수를 계속
 * 흘린다. 3트릭에 ♦Q(후회 170), 5트릭에 ♠Q — 둘 다 트릭을 못 이기는 카드였고
 * 같은 무늬의 더 낮은 카드가 손에 있었다.
 *
 * 가설(교사 2안 = 후보 그룹화): 트릭을 못 이기는 같은 무늬 카드들은 그 트릭에
 * 대해 **동등**하다. 동등한 후보 중 하나만 남기면 (a) 탐색 예산이 진짜 다른
 * 선택지에 몰리고 (b) 탐색이 없는 국면에서도 낭비가 사라진다.
 *
 * 다만 무엇을 남길지는 **누가 이기고 있느냐에 따라 뒤집힌다**:
 *   - 야당이 이기는 중 → 점수패를 주지 않는다. 낮은 끗 우선(높은 끗은 미래 승부수).
 *   - 아군이 이기는 중 → 점수패를 몰아준다. 우리 편이 그 1점을 가져간다.
 * 한 방향만 규칙으로 박으면 반대쪽이 망가지므로 둘 다 잰다.
 *
 * 재는 것:
 *   1) 빈도 — 정책이 그룹 안에서 '나쁜 쪽'을 고르는 비율(좌석 역할별)
 *   2) 값   — 교사(K벌 PIMC, A/B 분리)로 고른 수 vs 그룹 대표의 상금 차
 *   3) 안전성 — 교사가 오히려 '나쁜 쪽'을 선호하는 비율(반례율)
 *
 * 사용: node tools/research/discard_probe.js [딜수]
 *   env MODEL(기본 v16e) · K(교사 결정화, 기본 48) · PIMC_N(기본 300)
 *       BLUNDER(기본 200) · SEED_BASE · ROLE(all|friend|declarer|defender)
 */
'use strict';
const path = require('path');
const P = p => path.join(__dirname, p);
const ort = require('onnxruntime-node');
const E = require(P('../../src/mighty-engine.js'));
const AI = require(P('../../src/mighty-ai.js'));
const M = require(P('../../src/mighty-master.js'));

const N = parseInt(process.argv[2] || '400', 10);
const MODEL = process.env.MODEL || 'v16e';
const K = parseInt(process.env.K || '48', 10);
const PIMC_N = parseInt(process.env.PIMC_N || '300', 10);
const BLUNDER = parseFloat(process.env.BLUNDER || '200');
const SEED0 = parseInt(process.env.SEED_BASE || '77000000', 10);
const ROLE = process.env.ROLE || 'all';

const A_PLAY0 = 149, A_JS0 = 201, A_JOKER = 205;
const SUITS4 = ['S', 'D', 'H', 'C'];
const idxOf = mv => E.isJoker(mv.card)
  ? (mv.jokerSuit ? A_JS0 + SUITS4.indexOf(mv.jokerSuit) : A_JOKER)
  : A_PLAY0 + M.cidx(mv.card);
const isPoint = c => !E.isJoker(c) && c.rank >= 10;

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

/** 좌석에서 보이는 정보만으로 판정한 역할. 프렌드는 공개 전이면 본인만 안다. */
function roleOf(g, p) {
  if (p === g.declarer) return 'declarer';
  const fd = g.friendDecl;
  if (fd && fd.mode === 'card' && fd.card && g.hands[p].some(c => E.sameCard(c, fd.card))) return 'friend';
  if (g.friendRevealed && g.friend === p) return 'friend';
  return 'defender';
}
/**
 * p 시점에서 q가 아군인가 — 'ally' | 'opp' | 'unknown'.
 *
 * 확실도가 좌석마다 다르다는 게 핵심이다.
 *   - 승자가 주공이거나 공개된 프렌드면 어느 좌석에서나 확정된다.
 *   - 승자가 비공개 좌석이면, **프렌드 좌석만** 확정할 수 있다(주공도 나도 아니니
 *     야당이다). 주공은 그게 자기 프렌드일 수 있고, 야당은 그게 프렌드일 수 있다.
 * 불확실 구간을 섞으면 '점수패를 줘야 하나 말아야 하나'가 뒤섞이므로 따로 센다.
 */
function sideOfWinner(g, p, q) {
  if (q === p) return 'unknown';
  const atk = roleOf(g, p) !== 'defender';
  if (q === g.declarer || (g.friendRevealed && g.friend === q)) return atk ? 'ally' : 'opp';
  if (roleOf(g, p) === 'friend') return 'opp';        // 주공도 나도 아니면 야당이다
  return 'unknown';
}

/**
 * 버림 국면 판정 + 무늬별 동등 그룹.
 * 대상에서 빼는 카드: 조커·조커콜 수·마이티·조커콜 카드(♣3/♥3)·미공개 프렌드 카드.
 * 셋 다 그 트릭 밖의 값(변신·정보 공개)을 가져서 끗수만으로 동등하다고 볼 수 없다.
 */
function discardState(g, p) {
  if (g.phase !== 'play' || !g.play || g.play.table.length === 0) return null;
  const legal = g._legalPlays(p);
  if (legal.length < 2) return null;
  let best = null, bk = [-2, -1];
  for (const e of g.play.table) {
    const k = g._cardStrength(e, g.play);
    if (k[0] > bk[0] || (k[0] === bk[0] && k[1] > bk[1])) { bk = k; best = e; }
  }
  if (!best) return null;
  const side = sideOfWinner(g, p, best.player);
  const fd = g.friendDecl;
  const jc = g.jokerCallCard;
  const excluded = mv => E.isJoker(mv.card) || mv.jokerCall
    || (g.mightyCard && E.sameCard(mv.card, g.mightyCard))
    || (jc && E.sameCard(mv.card, jc))
    || (fd && fd.mode === 'card' && fd.card && !g.friendRevealed && E.sameCard(mv.card, fd.card));
  const losing = mv => {
    const k = g._cardStrength({ card: mv.card, jokerSuit: mv.jokerSuit, player: p,
                               jokerCall: mv.jokerCall }, g.play);
    return !(k[0] > bk[0] || (k[0] === bk[0] && k[1] > bk[1]));
  };
  const pool = legal.filter(mv => !excluded(mv) && losing(mv));
  if (pool.length < 2) return null;
  const groups = new Map();
  for (const mv of pool) {
    const s = mv.card.suit;
    if (!groups.has(s)) groups.set(s, []);
    groups.get(s).push(mv);
  }
  for (const [s, arr] of [...groups]) if (arr.length < 2) groups.delete(s);
  if (!groups.size) return null;
  return { legal, side, groups, bk };
}

/** 그룹 안 '좋은 쪽' 한 장. 야당이 이기는 중이면 점수패 회피+낮은 끗,
 *  아군이 이기는 중이면 점수패 몰아주기+(동점이면) 낮은 끗. */
function repOf(arr, allyWin) {
  const key = mv => allyWin
    ? [isPoint(mv.card) ? 0 : 1, mv.card.rank]      // 점수패 먼저, 그 다음 낮은 끗
    : [isPoint(mv.card) ? 1 : 0, mv.card.rank];     // 비점수패 먼저, 그 다음 낮은 끗
  return arr.slice().sort((a, b) => {
    const ka = key(a), kb = key(b);
    return ka[0] - kb[0] || ka[1] - kb[1];
  })[0];
}

async function policyTopM(sess, g, seat, m) {
  let obs = M.encodeObs(g, seat, []);
  const mask = M.legalMask(g, []);
  const want = M.modelObsDim(sess);
  if (want !== obs.length) obs = obs.subarray(0, want);
  const out = await sess.run({
    obs: new ort.Tensor('float32', obs, [1, want]),
    mask: new ort.Tensor('bool', mask, [1, M.ACTION_DIM]),
  });
  const lg = out.logits.data;
  const v = [];
  for (let i = 0; i < M.ACTION_DIM; i++) if (mask[i]) v.push([lg[i], i]);
  v.sort((a, b) => b[0] - a[0]);
  return { top: v.slice(0, m).map(x => x[1]),
           margin: v.length > 1 ? v[0][0] - v[1][0] : 99 };
}

async function policyTop(sess, g, seat) {
  let obs = M.encodeObs(g, seat, []);
  const mask = M.legalMask(g, []);
  const want = M.modelObsDim(sess);
  if (want !== obs.length) obs = obs.subarray(0, want);
  const out = await sess.run({
    obs: new ort.Tensor('float32', obs, [1, want]),
    mask: new ort.Tensor('bool', mask, [1, M.ACTION_DIM]),
  });
  const lg = out.logits.data;
  const v = [];
  for (let i = 0; i < M.ACTION_DIM; i++) if (mask[i]) v.push([lg[i], i]);
  v.sort((a, b) => b[0] - a[0]);
  return { act: v[0][1], margin: v.length > 1 ? v[0][0] - v[1][0] : 99 };
}

(async () => {
  const sess = await ort.InferenceSession.create(P(`../../web/model/mighty_master_${MODEL}.onnx`));
  const ag = [];
  for (let p = 0; p < 5; p++) ag.push(await AI.createAgent({ tier: 'master', session: sess, ort }));
  let sc = 24680; const rnd = () => { sc = (sc * 1103515245 + 12345) & 0x7fffffff; return sc / 0x7fffffff; };

  const roles = ['declarer', 'friend', 'defender'];
  const sides = ['opp', 'ally', 'unknown'];
  const cnt = {};
  for (const r of roles) { cnt[r] = {}; for (const s of sides) cnt[r][s] = { n: 0, bad: 0, waste: 0 }; }
  const REG = { chosen: [], rep: [] };
  const BL = { chosen: [], rep: [] };
  // 방향(상대승/아군승/불명)별로 따로 본다 — 대표 규칙이 방향마다 반대라
  // 섞으면 서로 상쇄돼 아무 결론도 안 나온다.
  const BYSIDE = {}; for (const s of sides) BYSIDE[s] = { d: [], rep: 0, n: 0 };
  let deals = 0, pimcDone = 0, counter = 0, ties = 0, repBetter = 0;
  // 후보 중복도 — 탐색이 보는 상위 TOPM개 중 몇 개가 같은 동등 그룹에 들어가는가.
  // 중복된 슬롯은 결정화 예산을 그대로 버리는 것이라 2안의 이득이 여기서 나온다.
  const TOPM = parseInt(process.env.TOPM || '5', 10);
  let redN = 0, redSlots = 0, redDup = 0;

  // PIMC_N=0이면 교사를 아예 돌리지 않고 빈도만 센다(딜을 많이 볼 때 쓴다).
  for (let i = 0; i < N && (PIMC_N === 0 || pimcDone < PIMC_N); i++) {
    const g = new E.MightyGame({ seed: SEED0 + i });
    g.start(i % 5);
    let guard = 0;
    while (g.phase !== 'done' && g.phase !== 'redeal' && guard++ < 900) {
      const p = g.currentPlayer;
      const st = (g.phase === 'play') ? discardState(g, p) : null;
      if (st) {
        const role = roleOf(g, p);
        if (ROLE === 'all' || ROLE === role) {
          const { top } = await policyTopM(sess, g, p, TOPM);
          const act = top[0];
          // 상위 TOPM 후보 중 같은 그룹에 겹치는 슬롯 수
          {
            const owner = new Map();
            for (const [s, arr] of st.groups) for (const mv of arr) owner.set(idxOf(mv), s);
            const per = new Map();
            for (const i of top) {
              const s = owner.get(i);
              if (s !== undefined) per.set(s, (per.get(s) || 0) + 1);
            }
            let dup = 0;
            for (const [, k] of per) dup += k - 1;
            redN++; redSlots += top.length; redDup += dup;
          }
          let grp = null, chosen = null;
          for (const [, arr] of st.groups) {
            const hit = arr.find(mv => idxOf(mv) === act);
            if (hit) { grp = arr; chosen = hit; break; }
          }
          if (grp) {
            // 불확실 구간은 대표를 '점수패 회피' 쪽으로 둔다 — 확률상 야당이 이길 때가
            // 더 흔하고, 잘못 몰아주면 손해가 크다. 지표는 따로 낸다.
            const rep = repOf(grp, st.side === 'ally');
            const c = cnt[role][st.side];
            c.n++;
            if (idxOf(rep) !== act) {
              c.bad++;
              // 낭비 = 점수패 방향이 틀린 것. 야당이 이기면 점수패를 준 것,
              // 아군이 이기면 줄 수 있었는데 안 준 것.
              if (st.side === 'ally' ? (isPoint(rep.card) && !isPoint(chosen.card))
                                     : (isPoint(chosen.card) && !isPoint(rep.card))) c.waste++;
            }
            if (idxOf(rep) !== act && pimcDone < PIMC_N) {
              const dets = [];
              for (let k = 0; k < K; k++) { const d = determinize(g, p, rnd); if (d) dets.push(d); }
              if (dets.length >= 8) {
                const scores = [];
                for (const mv of [chosen, rep]) {
                  let sA = 0, nA = 0, sB = 0, nB = 0;
                  for (let di = 0; di < dets.length; di++) {
                    const sim = cloneGame(dets[di]);
                    try { sim.act({ type: 'play', card: mv.card, jokerSuit: mv.jokerSuit }); }
                    catch (e) { continue; }
                    let gd = 0;
                    while (sim.phase !== 'done' && sim.phase !== 'redeal' && gd++ < 200)
                      sim.act(await ag[sim.currentPlayer].act(sim, sim.currentPlayer));
                    if (sim.phase !== 'done') continue;
                    const pr = sim.result.prizes[p];
                    if (di % 2) { sB += pr; nB++; } else { sA += pr; nA++; }
                  }
                  if (nA && nB) scores.push({ mv, a: sA / nA, b: sB / nB });
                }
                if (scores.length === 2) {
                  pimcDone++;
                  const bestA = scores[0].a >= scores[1].a ? scores[0] : scores[1];
                  if (scores[0].a === scores[1].a) ties++;
                  if (bestA.mv === chosen) counter++;
                  if (scores[1].b > scores[0].b) repBetter++;      // B 반쪽에서 대표 승
                  const bs = BYSIDE[st.side];
                  bs.n++; bs.d.push(scores[1].b - scores[0].b);
                  if (scores[1].b > scores[0].b) bs.rep++;
                  REG.chosen.push(bestA.b - scores[0].b);
                  REG.rep.push(bestA.b - scores[1].b);
                  BL.chosen.push(bestA.b - scores[0].b >= BLUNDER ? 1 : 0);
                  BL.rep.push(bestA.b - scores[1].b >= BLUNDER ? 1 : 0);
                }
              }
            }
          }
        }
      }
      g.act(await ag[p].act(g, p));
    }
    if (g.phase === 'done') deals++;
    if ((i + 1) % 25 === 0)
      process.stderr.write(`  ${i + 1}딜 · 교사 ${pimcDone}\n`);
  }

  const stat = a => {
    const m = a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
    const v = a.length > 1 ? a.reduce((x, y) => x + (y - m) ** 2, 0) / (a.length - 1) : 0;
    return { m, ci: a.length ? 1.96 * Math.sqrt(v / a.length) : 0 };
  };
  const pct = (x, d) => `${(100 * x / Math.max(1, d)).toFixed(1)}%`;
  console.log(`\n버림 그룹화 — 모델 ${MODEL} · 딜 ${deals} · 교사 K=${K} 평가 ${pimcDone} · ROLE=${ROLE}`);
  const label = { opp: '상대가 이기는 중 — 점수패를 주면 손해',
                  ally: '아군이 이기는 중 — 점수패를 몰아줘야 이득',
                  unknown: '승자 소속 불명(비공개 좌석이 이기는 중)' };
  for (const s of sides) {
    console.log(`  ${label[s]}`);
    for (const r of roles) {
      const c = cnt[r][s];
      console.log(`    ${r.padEnd(9)} 국면 ${String(c.n).padStart(5)} · 대표 아닌 수 ${pct(c.bad, c.n)}` +
        ` · 그중 점수패 방향 오류 ${pct(c.waste, c.n)} (딜당 ${(c.waste / Math.max(1, deals)).toFixed(2)}회)`);
    }
  }
  console.log(`  후보 중복 — 상위 ${TOPM} 후보 ${redSlots}슬롯 중 동등 그룹 중복 ${redDup}슬롯` +
    ` (${pct(redDup, redSlots)}) · 국면당 ${(redDup / Math.max(1, redN)).toFixed(2)}슬롯 낭비`);
  const rc = stat(REG.chosen), rr = stat(REG.rep);
  const bc = stat(BL.chosen), br = stat(BL.rep);
  const d = REG.chosen.map((x, i) => x - REG.rep[i]);
  const ds = stat(d);
  console.log(`  교사 판정(정책 수 ≠ 대표인 국면 ${REG.chosen.length}건)`);
  const sg = x => `${x >= 0 ? '−' : '+'}${Math.abs(x).toFixed(0)}`;
  console.log(`    정책 수 후회 ${sg(rc.m)} ± ${rc.ci.toFixed(0)} · 대형실수 ${(100 * bc.m).toFixed(1)}%`);
  console.log(`    대표 수 후회 ${sg(rr.m)} ± ${rr.ci.toFixed(0)} · 대형실수 ${(100 * br.m).toFixed(1)}%`);
  console.log(`    페어드(정책 − 대표) ${ds.m >= 0 ? '+' : ''}${ds.m.toFixed(1)} ± ${ds.ci.toFixed(1)}` +
    `${Math.abs(ds.m) > ds.ci ? (ds.m > 0 ? ' → 대표가 유의 우세' : ' → 대표가 유의 열세') : ' → 유의차 없음'}`);
  console.log(`    교사가 정책 수를 선호(A 반쪽 기준 반례) ${pct(counter, REG.chosen.length)} · A동점 ${ties}건`);
  console.log(`    B 반쪽에서 대표가 더 나은 비율 ${pct(repBetter, REG.chosen.length)}`);
  console.log('  방향별 페어드(대표 − 정책, B 반쪽) — 양수면 대표가 낫다');
  for (const s of sides) {
    const bs = BYSIDE[s];
    if (!bs.n) { console.log(`    ${s.padEnd(8)} n=0`); continue; }
    const t = stat(bs.d);
    console.log(`    ${s.padEnd(8)} n=${String(bs.n).padStart(4)} · ${t.m >= 0 ? '+' : ''}${t.m.toFixed(1)} ± ${t.ci.toFixed(1)}` +
      ` · 대표 승 ${pct(bs.rep, bs.n)}` +
      `${Math.abs(t.m) > t.ci ? (t.m > 0 ? ' → 유의 우세' : ' → 유의 열세') : ' → 유의차 없음'}`);
  }
  process.exit(0);
})().catch(e => { console.error('ERR', e && e.stack); process.exit(1); });
