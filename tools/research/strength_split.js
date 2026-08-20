/**
 * 두 후보수의 손익이 **주공 패 강도**에 따라 어떻게 갈리는지 본다.
 *
 * 제보(2026-08-20): 마이티가 이미 깔린 트릭에서 야당이 조커를 버렸다. 보이는
 * 정보만으로는 접전인데(교사 +28), 실제 손패에서는 조커를 아끼는 쪽이 1,200
 * 좋았다. 차이의 원인은 그 판의 주공이 예외적으로 강했다는 것이다. 그래서
 * "주공이 이 정도로 강할 때는 어느 쪽이 옳은가"를 구간별로 나눠 재려고 만들었다.
 *
 * 방법: 결정화 한 벌마다 두 후보를 **같은 세계에서** 굴려 짝지어 비교한다(페어드).
 * 세계마다 주공이 쥔 기루다 수를 세어 구간으로 묶고, 구간별 평균 차이를 낸다.
 *
 * 사용: node tools/research/strength_split.js <복기.md> <착수인덱스> <수A> <수B>
 *   수 표기: JOKER · H10 · S14 …
 *   env MODEL(기본 v16e) · K(결정화, 기본 400) · SEAT(기준 좌석, 기본 착수 좌석)
 */
'use strict';
const fs = require('fs');
const path = require('path');
const P = p => path.join(__dirname, p);
const ort = require('onnxruntime-node');
const E = require(P('../../src/mighty-engine.js'));
const AI = require(P('../../src/mighty-ai.js'));

const MODEL = process.env.MODEL || 'v16e';
const K = parseInt(process.env.K || '400', 10);
const md = fs.readFileSync(process.argv[2], 'utf8');
const rec = JSON.parse(md.split('```json')[1].split('```')[0]);
const IDX = parseInt(process.argv[3], 10);
const parseCard = s => s.toUpperCase() === 'JOKER' ? E.JOKER
  : ({ suit: s[0].toUpperCase(), rank: parseInt(s.slice(1), 10) });
const CAND = [parseCard(process.argv[4]), parseCard(process.argv[5])];

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
  const seat = process.env.SEAT !== undefined ? parseInt(process.env.SEAT, 10) : rec.actions[IDX].p;
  const gir = g.contract.giruda;
  const realTrumps = g.hands[g.declarer].filter(c => !E.isJoker(c) && c.suit === gir).length;
  console.log(`트릭 ${g.play.trickNo} · 기준 좌석 ${seat} · 기루다 ${gir} · 주공 ${g.declarer}`);
  console.log(`후보: ${CAND.map(E.cardName).join(' vs ')} · 결정화 ${K}벌 · 같은 세계에서 둘 다 굴린다`);
  console.log(`실제 판의 주공 잔여 기루다: ${realTrumps}장\n`);

  let sc = 424242;
  const rnd = () => { sc = (sc * 1103515245 + 12345) & 0x7fffffff; return sc / 0x7fffffff; };
  const rows = [];
  for (let k = 0; k < K; k++) {
    const d = determinize(g, seat, rnd);
    if (!d) continue;
    const trumps = d.hands[d.declarer].filter(c => !E.isJoker(c) && c.suit === gir).length;
    const vals = [];
    for (const card of CAND) {
      const sim = cloneGame(d);
      try { sim.act({ type: 'play', card }); } catch (e) { vals.push(null); continue; }
      let guard = 0;
      while (sim.phase !== 'done' && sim.phase !== 'redeal' && guard++ < 200)
        sim.act(await ag[sim.currentPlayer].act(sim, sim.currentPlayer));
      vals.push(sim.phase === 'done' ? { prize: sim.result.prizes[seat], run: !!sim.result.run } : null);
    }
    if (vals[0] && vals[1]) rows.push({ trumps, a: vals[0], b: vals[1] });
  }

  const stat = a => {
    const m = a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
    const v = a.length > 1 ? a.reduce((x, y) => x + (y - m) ** 2, 0) / (a.length - 1) : 0;
    return { m, ci: a.length ? 1.96 * Math.sqrt(v / a.length) : 0 };
  };
  // 가상 판에서 주공의 기루다 기대값이 2장쯤이라 구간을 잘게 나눠야 꼬리가 보인다
  // (제보 판의 실제 주공은 5장이었다 — 분포의 꼬리다).
  const buckets = [
    { name: '기루다 0~1장', f: t => t <= 1 },
    { name: '기루다 2장', f: t => t === 2 },
    { name: '기루다 3장', f: t => t === 3 },
    { name: '기루다 4장', f: t => t === 4 },
    { name: '기루다 5장+', f: t => t >= 5 },
  ];
  const A = E.cardName(CAND[0]), B = E.cardName(CAND[1]);
  console.log(`구간별 · 값은 좌석 ${seat} 상금 (양수면 그 좌석에 유리)`);
  console.log(`  ${'구간'.padEnd(20)} n     ${A.padEnd(5)}      ${B.padEnd(5)}      차이(${A}−${B})      런 비율 ${A}/${B}`);
  for (const bk of buckets) {
    const sel = rows.filter(r => bk.f(r.trumps));
    if (!sel.length) continue;
    const va = stat(sel.map(r => r.a.prize)), vb = stat(sel.map(r => r.b.prize));
    const d = stat(sel.map(r => r.a.prize - r.b.prize));
    const runA = 100 * sel.filter(r => r.a.run).length / sel.length;
    const runB = 100 * sel.filter(r => r.b.run).length / sel.length;
    console.log(`  ${bk.name.padEnd(20)} ${String(sel.length).padStart(4)}  ${va.m.toFixed(0).padStart(6)}  ${vb.m.toFixed(0).padStart(6)}` +
      `   ${(d.m >= 0 ? '+' : '') + d.m.toFixed(0)} ± ${d.ci.toFixed(0)}`.padEnd(20) +
      `  ${runA.toFixed(0)}% / ${runB.toFixed(0)}%`);
  }
  const all = stat(rows.map(r => r.a.prize - r.b.prize));
  console.log(`  ${'전체'.padEnd(20)} ${String(rows.length).padStart(4)}  ` +
    `${stat(rows.map(r => r.a.prize)).m.toFixed(0).padStart(6)}  ${stat(rows.map(r => r.b.prize)).m.toFixed(0).padStart(6)}` +
    `   ${(all.m >= 0 ? '+' : '') + all.m.toFixed(0)} ± ${all.ci.toFixed(0)}`);
  process.exit(0);
})().catch(e => { console.error('ERR', e && e.stack); process.exit(1); });
