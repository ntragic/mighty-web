/**
 * 모델 대결 — NEW 1좌석 vs OLD 4좌석, 같은 딜 페어드.
 *
 * arm1: seed%5 좌석에 NEW, 나머지 OLD  ·  arm2: 전좌석 OLD (기준)
 * diff = arm1의 그 좌석 상금 − arm2의 같은 좌석 상금.
 * OLD 환경에서 NEW가 버는 상금 우위를 잰다. 관례 채택률(주공 리드에서
 * 탑 조건 성립 시 탑 기루다 선택)도 같이 센다.
 *
 * 사용: node tools/research/model_h2h.js <NEW.onnx> <OLD.onnx> [판수]
 *   env SEED_BASE=시작 시드
 */
'use strict';
const path = require('path');
const P = p => path.join(__dirname, p);
const ort = require('onnxruntime-node');
const E = require(P('../../src/mighty-engine.js'));
const AI = require(P('../../src/mighty-ai.js'));
const SEED0 = parseInt(process.env.SEED_BASE || '960000', 10);
const PER = ['gambler', 'balanced', 'careful'];

function seenSet(g, seat) {
  const s = new Set(); const pl = g.play;
  for (const tr of pl.history) for (const e of tr.plays) s.add(E.cardId(e.card));
  for (const e of pl.table) s.add(E.cardId(e.card));
  for (const c of g.hands[seat]) s.add(E.cardId(c));
  if (seat === g.declarer && g.discard) for (const c of g.discard) s.add(E.cardId(c));
  return s;
}

// 탑 조건: 주공 리드·기루다 리드 선택·내 최고 기루다 위 서열 미출현·상대 기루다 잔존
function topOpportunity(g, seat, act) {
  if (seat !== g.declarer || g.play.table.length !== 0) return null;
  const gi = g.contract.giruda;
  if (gi === 'N' || E.isJoker(act.card) || act.card.suit !== gi) return null;
  const myTr = g.hands[seat].filter(x => !E.isJoker(x) && x.suit === gi)
    .sort((a, b) => b.rank - a.rank);
  if (!myTr.length) return null;
  const seen = seenSet(g, seat);
  const outR = [];
  for (let r = 14; r >= 2; r--) if (!seen.has(gi + r)) outR.push(r);
  if (!outR.length || outR[0] > myTr[0].rank) return null;
  return { top: myTr[0], took: E.sameCard(act.card, myTr[0]) };
}

async function playRound(seed, models, conv) {
  // models: 좌석별 세션 배열
  const rng = E.makeRng(seed);
  const g = new E.MightyGame({ seed });
  const ag = [];
  for (let s = 0; s < E.NUM_PLAYERS; s++)
    ag.push(await AI.createAgent({ tier: 'master', persona: PER[s % 3], rng, session: models[s], ort, keyGuard: true }));
  g.start(Math.floor(rng() * E.NUM_PLAYERS));
  let guard = 0;
  while (g.phase !== 'done' && g.phase !== 'redeal' && guard++ < 900) {
    const p = g.currentPlayer;
    const act = await ag[p].act(g, p);
    if (conv && g.phase === 'play' && act.type === 'play') {
      const op = topOpportunity(g, p, act);
      if (op) { conv[p].opp++; if (op.took) conv[p].took++; }
    }
    g.act(act);
  }
  return g.phase === 'done' ? g : null;
}

(async () => {
  const [newPath, oldPath] = process.argv.slice(2, 4);
  const N = parseInt(process.argv[4] || '600', 10);
  const sNew = await ort.InferenceSession.create(newPath);
  const sOld = await ort.InferenceSession.create(oldPath);

  const diffs = []; let wNew = 0, wOld = 0;
  const convNew = Array.from({ length: 5 }, () => ({ opp: 0, took: 0 }));
  const convOld = Array.from({ length: 5 }, () => ({ opp: 0, took: 0 }));
  let done = 0;
  for (let i = 0; i < N; i++) {
    const seed = SEED0 + i, k = i % 5;
    const m1 = [sOld, sOld, sOld, sOld, sOld]; m1[k] = sNew;
    const g1 = await playRound(seed, m1, convNew);
    const g2 = await playRound(seed, [sOld, sOld, sOld, sOld, sOld], convOld);
    if (!g1 || !g2) continue;
    done++;
    diffs.push(g1.result.prizes[k] - g2.result.prizes[k]);
    if (g1.result.prizes[k] > 0) wNew++;
    if (g2.result.prizes[k] > 0) wOld++;
    if (done % 100 === 0) process.stderr.write(`${done}...\n`);
  }
  const n = diffs.length;
  const m = diffs.reduce((a, b) => a + b, 0) / n;
  const sd = Math.sqrt(diffs.reduce((a, b) => a + (b - m) ** 2, 0) / (n - 1));
  const ci = 1.96 * sd / Math.sqrt(n);
  const cs = a => { const o = a.reduce((x, y) => ({ opp: x.opp + y.opp, took: x.took + y.took })); return o.opp ? `${(100 * o.took / o.opp).toFixed(1)}% [${o.took}/${o.opp}]` : '기회 0'; };
  console.log(`NEW=${path.basename(newPath)} vs OLD=${path.basename(oldPath)} · 유효 ${n}판`);
  console.log(`NEW 좌석 판당 상금 우위  ${m >= 0 ? '+' : ''}${m.toFixed(1)} ± ${ci.toFixed(1)}`);
  console.log(`좌석 양상금 판 비율      NEW ${(100 * wNew / n).toFixed(1)}% vs OLD ${(100 * wOld / n).toFixed(1)}%`);
  console.log(`탑 리드 관례 채택률      NEW ${cs(convNew)} vs OLD ${cs(convOld)}`);
  console.log(m - ci > 0 ? '→ NEW 유의 우세' : m + ci < 0 ? '→ NEW 유의 열세' : '→ 동등 (유의차 없음)');
})();
