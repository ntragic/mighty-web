/**
 * 복기의 특정 착수 지점을 재현해 **정책·배포 탐색·교사**가 각각 무엇을 고르는지 본다.
 *
 * 제보 국면에서 "누가 잘못 골랐나"를 가리는 도구다. explain_move.js가 정책 분포만
 * 보여 주는 데 비해, 이쪽은 배포와 같은 탐색(결정화 32벌·끝까지 롤아웃)과 더 큰 교사
 * 탐색을 함께 돌리고 A/B 분리 평가로 후보별 값을 매긴다(승자의 저주 제거).
 *
 * 사용: node tools/research/state_probe.js <복기.md> <행동인덱스>
 *   인덱스를 생략하면 play 액션을 순번과 함께 나열한다.
 *   env MODEL(기본 v16e) · K_S(배포 탐색 결정화, 기본 32) · K(교사, 기본 128)
 */
'use strict';
const fs = require('fs');
const path = require('path');
const P = p => path.join(__dirname, p);
const ort = require('onnxruntime-node');
const E = require(P('../../src/mighty-engine.js'));
const AI = require(P('../../src/mighty-ai.js'));
const M = require(P('../../src/mighty-master.js'));

const MODEL = process.env.MODEL || 'v16e';
const K_S = parseInt(process.env.K_S || '32', 10);
const K = parseInt(process.env.K || '128', 10);
const md = fs.readFileSync(process.argv[2], 'utf8');
const rec = JSON.parse(md.split('```json')[1].split('```')[0]);

if (process.argv[3] === undefined) {
  let n = 0;
  rec.actions.forEach((x, i) => {
    if (x.ph !== 'play') return;
    console.log(`${String(i).padStart(3)}  좌석 ${x.p}  ${x.a.card ? E.cardName(x.a.card) : x.a.type}` +
      (++n % 5 === 0 ? '   ← 트릭 끝' : ''));
  });
  process.exit(0);
}
const IDX = parseInt(process.argv[3], 10);

const SUITS4 = ['S', 'D', 'H', 'C'];
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
function determinize(g, seat, rnd) {
  const seen = new Set();
  for (const t of g.play.history) for (const e of t.plays) seen.add(E.cardId(e.card));
  for (const e of g.play.table) seen.add(E.cardId(e.card));
  for (const c of g.hands[seat]) seen.add(E.cardId(c));
  if (seat === g.declarer && g.discard) for (const c of g.discard) seen.add(E.cardId(c));
  const pool = allCards().filter(c => !seen.has(E.cardId(c)));
  const need = [];
  for (let p = 0; p < E.NUM_PLAYERS; p++) if (p !== seat) need.push({ seat: p, n: g.hands[p].length });
  const kittyN = (seat === g.declarer || !g.discard) ? 0 : g.discard.length;
  if (need.reduce((a, b) => a + b.n, 0) + kittyN !== pool.length) return null;
  const voids = [];
  for (let p = 0; p < E.NUM_PLAYERS; p++) voids.push(new Set());
  const scan = (plays, led) => {
    if (!led) return;
    for (const e of plays) {
      // 마이티·조커는 팔로우 면제다 — 오프수트로 나와도 그 무늬가 없다는 근거가
      // 못 된다. 세지 않으면 '주공이 기루다를 든 세계'를 아예 상상하지 못한다
      // (2026-08-20 제보에서 발견: 마이티를 낸 주공을 항상 기루다 0장으로 봤다).
      if (E.isJoker(e.card) || (g.mightyCard && E.sameCard(e.card, g.mightyCard))) continue;
      if (e.card.suit !== led) voids[e.player].add(led);
    }
  };
  for (const t of g.play.history)
    scan(t.plays, t.ledSuit || (t.plays[0] && !E.isJoker(t.plays[0].card) ? t.plays[0].card.suit : null));
  scan(g.play.table, g.play.ledSuit);
  const order = need.slice().sort((a, b) => voids[b.seat].size - voids[a.seat].size);
  for (let attempt = 0; attempt < 60; attempt++) {
    const bag = pool.slice();
    for (let i = bag.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1));
      [bag[i], bag[j]] = [bag[j], bag[i]]; }
    const assign = new Map(); let ok = true;
    for (const { seat: p, n } of order) {
      const take = [];
      for (let i = 0; i < bag.length && take.length < n; i++) {
        const c = bag[i];
        if (!E.isJoker(c) && voids[p].has(c.suit)) continue;
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

(async () => {
  const sess = await ort.InferenceSession.create(P(`../../web/model/mighty_master_${MODEL}.onnx`));
  const ag = [];
  for (let p = 0; p < 5; p++) ag.push(await AI.createAgent({ tier: 'master', session: sess, ort }));

  const g = new E.MightyGame(rec.cfg);
  g.start(rec.dealer);
  for (let i = 0; i < IDX; i++) g.act(rec.actions[i].a);
  const seat = rec.actions[IDX].p;
  const played = rec.actions[IDX].a;
  const legal = g._legalPlays(seat);
  const side = seat === g.declarer ? '주공'
    : (g.friendRevealed && g.friend === seat) ? '프렌드(공개)' : '야당 또는 미공개';
  console.log(`트릭 ${g.play.trickNo} · 좌석 ${seat}(${side}) · 기루다 ${g.contract.giruda} · 마이티 ${E.cardName(g.mightyCard)}`);
  console.log(`리드무늬 ${g.play.ledSuit || '(선)'} · 테이블 ${g.play.table.map(e => `${e.player}:${E.cardName(e.card)}`).join(' ') || '(없음)'}`);
  console.log(`손패: ${g.hands[seat].map(E.cardName).join(' ')}`);
  console.log(`합법수 ${legal.length}개: ${legal.map(m => E.cardName(m.card) + (m.jokerCall ? '(콜)' : '')).join(' ')}`);
  console.log(`실제 착수: ${played.card ? E.cardName(played.card) : played.type}`);

  const noSearch = await AI.createAgent({ tier: 'master', session: sess, ort });
  const searchAg = await AI.createAgent({ tier: 'master', session: sess, ort,
    classSearch: { K: K_S, gate: 1.3, gateOppwin: 1.8, gateDeclarer: 0.46, topM: 5, budgetMs: 20000 } });
  const aPol = await noSearch.act(cloneGame(g), seat);
  const aSea = await searchAg.act(cloneGame(g), seat);
  console.log(`정책+가드: ${aPol.card ? E.cardName(aPol.card) : aPol.type}` +
    ` · 배포 탐색: ${aSea.card ? E.cardName(aSea.card) : aSea.type}`);

  let sc = 20260820;
  const rnd = () => { sc = (sc * 1103515245 + 12345) & 0x7fffffff; return sc / 0x7fffffff; };
  const dets = [];
  for (let k = 0; k < K; k++) { const d = determinize(g, seat, rnd); if (d) dets.push(d); }
  console.log(`\n교사 평가 — 결정화 ${dets.length}벌 · A에서 고르고 B에서 값을 읽는다 (좌석 ${seat} 상금 기준)`);
  const rows = [];
  for (const mv of legal) {
    let sA = 0, nA = 0, sB = 0, nB = 0;
    for (let di = 0; di < dets.length; di++) {
      const sim = cloneGame(dets[di]);
      try { sim.act({ type: 'play', card: mv.card, jokerSuit: mv.jokerSuit, jokerCall: mv.jokerCall }); }
      catch (e) { continue; }
      let guard = 0;
      while (sim.phase !== 'done' && sim.phase !== 'redeal' && guard++ < 200)
        sim.act(await ag[sim.currentPlayer].act(sim, sim.currentPlayer));
      if (sim.phase !== 'done') continue;
      const pr = sim.result.prizes[seat];
      if (di % 2) { sB += pr; nB++; } else { sA += pr; nA++; }
    }
    if (nA && nB) rows.push({ mv, a: sA / nA, b: sB / nB });
  }
  rows.sort((x, y) => y.a - x.a);
  for (const r of rows) {
    const isPlayed = played.card && !E.isJoker(played.card) && !E.isJoker(r.mv.card)
      ? E.sameCard(r.mv.card, played.card)
      : (E.isJoker(r.mv.card) && (played.card === 'JOKER' || E.isJoker(played.card || {})));
    console.log(`  ${E.cardName(r.mv.card).padEnd(5)} A선택 ${r.a.toFixed(0).padStart(6)} · B평가 ${r.b.toFixed(0).padStart(6)}` +
      `${r === rows[0] ? '  ← 교사 1위' : ''}${isPlayed ? '  ← 실제' : ''}`);
  }
  const best = rows[0];
  const actual = rows.find(r => (E.isJoker(r.mv.card) && (played.card === 'JOKER' || E.isJoker(played.card || {})))
    || (played.card && !E.isJoker(played.card) && !E.isJoker(r.mv.card) && E.sameCard(r.mv.card, played.card)));
  if (best && actual && best !== actual)
    console.log(`\n실제 착수의 후회(B평가): ${(best.b - actual.b).toFixed(0)}`);
  process.exit(0);
})().catch(e => { console.error('ERR', e && e.stack); process.exit(1); });
