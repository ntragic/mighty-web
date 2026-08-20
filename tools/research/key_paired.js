/**
 * 키카드 클래스 강제 페어드 인증 — 최종 판정용.
 *
 * 왜 강제 페어드인가: 두 모델을 각자 끝까지 두게 하면 첫 갈림 이후 완전히 다른
 * 판이 되어 분산이 폭발한다(실측 53딜에 ±530). 판당 120짜리 효과를 가리려면
 * 발화 딜 4,000개가 필요해 현실적이지 않다. 그래서 프로젝트 인증 하네스 방식대로
 * **같은 판을 공유하다가 그 결정 하나만 갈라** 끝까지 굴린다. 나머지 좌석과
 * 이후 수는 전부 동일한 에이전트가 두므로 차이가 그 한 수에서만 온다.
 *
 * 설계:
 *   기준 정책(OLD)으로 판을 진행하다 좌석 S가 T1·T2 키카드 소비 국면에 오면,
 *   NEW의 1순위 수와 OLD의 1순위 수를 비교한다. 같으면 발화가 아니다(차이 없음).
 *   다르면 그 지점에서 두 갈래로 복제해 각각 강제한 뒤, 이후는 **양쪽 다 OLD**로
 *   끝까지 굴린다. 지표는 여당 상금 — 프렌드의 일은 여당을 돕는 것이다.
 *
 * 사용: node tools/research/key_paired.js <NEW.onnx> <OLD.onnx> [딜수]
 *   env SEED_BASE · TRICK_MAX(기본 2)
 */
'use strict';
const path = require('path');
const P = p => path.join(__dirname, p);
const ort = require('onnxruntime-node');
const E = require(P('../../src/mighty-engine.js'));
const AI = require(P('../../src/mighty-ai.js'));
const M = require(P('../../src/mighty-master.js'));

const NEW = process.argv[2] || P('../../web/model/mighty_master_v16e.onnx');
const OLD = process.argv[3] || P('../../web/model/mighty_master_v13.onnx');
const N = parseInt(process.argv[4] || '2000', 10);
const SEED0 = parseInt(process.env.SEED_BASE || '64000000', 10);
const TRICK_MAX = parseInt(process.env.TRICK_MAX ||
  (process.env.CLASS === 'weaklead' ? '99' : '2'), 10);
// 긴 실행이 중간에 끊겨도 표본이 살아남도록 차이값을 즉시 적는다
const OUT = process.env.OUT || '';
// K>0이면 실제 손패 한 벌 대신 결정화 K벌을 평균낸다. 상금 분산이 2,700이라
// 한 벌 굴리기로는 판당 100짜리 효과를 못 가른다(203딜에 ±326). 평균내면 √K배 준다.
const K = parseInt(process.env.K || '0', 10);
const fs = require('fs');

function cloneGame(g) {
  const c = Object.create(Object.getPrototypeOf(g));
  for (const k of Object.keys(g)) {
    const v = g[k];
    c[k] = (typeof v === 'object' && v !== null) ? structuredClone(v) : v;
  }
  return c;
}

const SUITS4 = ['S', 'D', 'H', 'C'];
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

function keyChance(g, p) {
  if (g.phase !== 'play' || p === g.declarer) return false;
  const fd = g.friendDecl;
  if (!(fd && fd.mode === 'card' && fd.card &&
        g.hands[p].some(c => E.sameCard(c, fd.card)))) return false;
  const legal = g._legalPlays(p);
  if (legal.length < 2) return false;
  return legal.some(mv => E.isJoker(mv.card) || E.sameCard(mv.card, g.mightyCard));
}

/** weaklead 국면 — 아군이 명목상 최강이나 확정승이 아니고 뒤에 2명 이상 남았다.
 *  lastseat_probe.js의 CLASS=weaklead와 같은 술어다(좌석 가시 정보만). */
function weakleadChance(g, p) {
  if (g.phase !== 'play' || p === g.declarer || g.play.table.length === 0) return false;
  const fd = g.friendDecl;
  if (!(fd && fd.mode === 'card' && fd.card &&
        g.hands[p].some(c => E.sameCard(c, fd.card)))) return false;
  let best = null, bk = [-2, -1];
  for (const e of g.play.table) {
    const k = g._cardStrength(e, g.play);
    if (k[0] > bk[0] || (k[0] === bk[0] && k[1] > bk[1])) { bk = k; best = e; }
  }
  if (!best) return false;
  const ally = best.player === g.declarer ||
    (g.friendRevealed && g.friend === best.player && best.player !== p);
  if (!ally || E.NUM_PLAYERS - 1 - g.play.table.length < 2) return false;
  const legal = g._legalPlays(p);
  if (legal.length < 2) return false;
  return legal.some(mv => {
    const k = g._cardStrength({ card: mv.card, jokerSuit: mv.jokerSuit, player: p,
                               jokerCall: mv.jokerCall }, g.play);
    return k[0] > bk[0] || (k[0] === bk[0] && k[1] > bk[1]);
  });
}

// CLASS: keyspend(기본, 트릭 TRICK_MAX 이하) | weaklead(트릭 제한 없음)
const CLASS = process.env.CLASS || 'keyspend';
const chanceOf = CLASS === 'weaklead' ? weakleadChance : keyChance;

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

/** 지정 수를 강제한 뒤 끝까지 OLD로 굴린다 */
async function rollout(g0, seat, actIdx, agents) {
  const g = cloneGame(g0);
  const a = M.actionToEngine(actIdx, g, []);
  if (!a) return null;
  try { g.act(a); } catch (e) { return null; }
  let guard = 0;
  while (g.phase !== 'done' && g.phase !== 'redeal' && guard++ < 900)
    g.act(await agents[g.currentPlayer].act(g, g.currentPlayer));
  return g.phase === 'done' ? g.result.prizes[g.result.declarer] : null;
}

(async () => {
  const sNew = await ort.InferenceSession.create(NEW);
  const sOld = await ort.InferenceSession.create(OLD);
  const ag = [];
  for (let p = 0; p < 5; p++)
    ag.push(await AI.createAgent({ tier: 'master', session: sOld, ort }));

  let sc = 987654321;
  const rnd = () => { sc = (sc * 1103515245 + 12345) & 0x7fffffff; return sc / 0x7fffffff; };
  const diffs = [];
  let fired = 0, sameCnt = 0, deals = 0;
  for (let i = 0; i < N; i++) {
    const seed = SEED0 + i, dealer = i % 5, S = 1 + (i % 4);
    const g = new E.MightyGame({ seed });
    g.start(dealer);
    let guard = 0, used = false;
    while (g.phase !== 'done' && g.phase !== 'redeal' && guard++ < 900) {
      const p = g.currentPlayer;
      if (!used && p === S && g.phase === 'play' && g.play.trickNo <= TRICK_MAX
          && chanceOf(g, p)) {
        used = true;
        const aNew = await topAction(sNew, g, p);
        const aOld = await topAction(sOld, g, p);
        if (aNew === aOld) { sameCnt++; }
        else {
          let vNew, vOld;
          if (K > 0) {
            const dets = [];
            for (let k = 0; k < K; k++) { const d = determinize(g, p, rnd); if (d) dets.push(d); }
            if (dets.length < 8) { g.act(await ag[p].act(g, p)); continue; }
            let sn = 0, so = 0, cnt = 0;
            for (const d of dets) {
              const a = await rollout(d, p, aNew, ag);
              const b = await rollout(d, p, aOld, ag);
              if (a !== null && b !== null) { sn += a; so += b; cnt++; }
            }
            if (!cnt) { g.act(await ag[p].act(g, p)); continue; }
            vNew = sn / cnt; vOld = so / cnt;
          } else {
            vNew = await rollout(g, p, aNew, ag);
            vOld = await rollout(g, p, aOld, ag);
          }
          if (vNew !== null && vOld !== null) {
            fired++; diffs.push(vNew - vOld);
            if (OUT) fs.appendFileSync(OUT, `${vNew - vOld}\n`);
          }
        }
      }
      g.act(await ag[p].act(g, p));
    }
    if (g.phase === 'done') deals++;
    if ((i + 1) % 250 === 0)
      process.stderr.write(`  ${i + 1}/${N}딜 · 갈림 ${fired} · 동일 ${sameCnt}\n`);
  }
  const m = diffs.reduce((a, b) => a + b, 0) / Math.max(1, diffs.length);
  const v = diffs.reduce((a, b) => a + (b - m) ** 2, 0) / Math.max(1, diffs.length - 1);
  const ci = 1.96 * Math.sqrt(v / Math.max(1, diffs.length));
  console.log(`${path.basename(NEW)} vs ${path.basename(OLD)} · 트릭 ${TRICK_MAX} 이하`);
  console.log(`완료 딜 ${deals}/${N} · 수가 갈린 딜 ${fired} · 같은 수 ${sameCnt}`);
  console.log(`여당 상금 페어드 차이 ${m >= 0 ? '+' : ''}${m.toFixed(1)} ± ${ci.toFixed(1)}` +
              `  → ${Math.abs(m) > ci ? (m > 0 ? '유의 우세' : '유의 열세') : '유의차 없음'}`);
  process.exit(0);
})().catch(e => { console.error('ERR', e && e.stack); process.exit(1); });
