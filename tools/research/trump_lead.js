/**
 * 기루다 리드 관례 개입 실험 — "탑부터 정리"가 현재 정책(낮은 기루다 탐색)보다
 * 승률상 유리한지 같은 딜 페어드로 잰다.
 *
 * 테이블: 5좌석 전부 마스터(argmax, 결정론). 개입은 주공 좌석의 리드 결정에만.
 * 조건 판정은 좌석 가시 정보만 사용(출현 카드·내 손·주공 묻은 패) — 전지적 금지.
 *
 *   top : 정책이 기루다 리드를 골랐고, 내 최고 기루다 위 서열이 밖에 없으면
 *         최고 기루다로 교체 (단독 탑 포함)
 *   run : top 조건 + 밖 서열 1·2위를 모두 보유(AKQ류 연속 탑)일 때만
 *   any : run 조건 + 정책이 비기루다 리드를 골라도 스위프 강제
 *
 * 사용: node tools/research/trump_lead.js [판수] [top,run,any]
 *   env MODEL=경로 · SEED_BASE=시작 시드
 */
'use strict';
const path = require('path');
const P = p => path.join(__dirname, p);
const ort = require('onnxruntime-node');
const E = require(P('../../src/mighty-engine.js'));
const AI = require(P('../../src/mighty-ai.js'));
const MODEL = process.env.MODEL || P('../../web/model/mighty_master_v6b.onnx');
const SEED0 = parseInt(process.env.SEED_BASE || '910000', 10);
const PER = ['gambler', 'balanced', 'careful'];

function seenSet(g, seat) {
  const s = new Set(); const pl = g.play;
  for (const tr of pl.history) for (const e of tr.plays) s.add(E.cardId(e.card));
  for (const e of pl.table) s.add(E.cardId(e.card));
  for (const c of g.hands[seat]) s.add(E.cardId(c));
  if (seat === g.declarer && g.discard) for (const c of g.discard) s.add(E.cardId(c));
  return s;
}

function override(g, seat, mode, act) {
  if (seat !== g.declarer) return null;
  const pl = g.play;
  if (pl.table.length !== 0 || act.jokerCall) return null;
  const gi = g.contract.giruda;
  if (gi === 'N') return null;
  const c = act.card;
  if (E.isJoker(c)) return null;
  if (mode !== 'any' && c.suit !== gi) return null;      // 기루다 리드 결정에만 개입
  // 마이티는 기루다 무늬가 될 수 없다(기루다 S면 마이티는 D-A) — 순수 서열 비교면 충분
  const myTr = g.hands[seat].filter(x => !E.isJoker(x) && x.suit === gi)
    .sort((a, b) => b.rank - a.rank);
  if (!myTr.length) return null;
  const top = myTr[0];
  if (c.suit === gi && E.sameCard(c, top)) return null;  // 이미 최고 기루다
  const seen = seenSet(g, seat);
  const outRanks = [];
  for (let r = 14; r >= 2; r--) if (!seen.has(gi + r)) outRanks.push(r);
  if (!outRanks.length) return null;                      // 정리할 상대 기루다 없음
  if (outRanks[0] > top.rank) return null;                // 위 서열이 밖에 있음
  if (mode === 'run' || mode === 'any') {
    // 연속 탑: 내 2번째 기루다가 (탑 제거 후) 밖 서열 1위보다도 높아야 한다
    if (myTr.length < 2 || myTr[1].rank < outRanks[0]) return null;
  }
  const legal = g._legalPlays(seat);
  if (!legal.some(m => !m.jokerCall && !m.jokerSuit && E.sameCard(m.card, top))) return null;
  return { type: 'play', card: top };
}

async function run(N, mode, sess) {
  const per = []; let hits = 0;
  for (let i = 0; i < N; i++) {
    const seed = SEED0 + i;
    const rng = E.makeRng(seed);
    const g = new E.MightyGame({ seed });
    const ag = [];
    for (let s = 0; s < E.NUM_PLAYERS; s++)
      ag.push(await AI.createAgent({ tier: 'master', persona: PER[s % 3], rng, session: sess, ort, keyGuard: true }));
    g.start(Math.floor(rng() * E.NUM_PLAYERS));
    let guard = 0, fired = 0;
    while (g.phase !== 'done' && g.phase !== 'redeal') {
      const p = g.currentPlayer;
      let act = await ag[p].act(g, p);
      if (mode !== 'none' && g.phase === 'play' && act.type === 'play') {
        const o = override(g, p, mode, act);
        if (o) { act = o; hits++; fired++; }
      }
      g.act(act);
      if (++guard > 900) break;
    }
    per.push(g.phase === 'done'
      ? { seed, decl: g.declarer, prize: g.result.prizes[g.declarer], win: g.result.win, fired }
      : null);
  }
  return { per, hits };
}

(async () => {
  const N = parseInt(process.argv[2] || '500', 10);
  const modes = (process.argv[3] || 'top,run,any').split(',');
  const sess = await ort.InferenceSession.create(MODEL);

  const base = await run(N, 'none', sess);
  const bm = new Map(base.per.filter(Boolean).map(r => [r.seed, r]));
  const bMean = [...bm.values()].reduce((a, r) => a + r.prize, 0) / bm.size;
  const bWin = [...bm.values()].filter(r => r.win).length;
  console.log(`\n${path.basename(MODEL)} 전좌석 마스터 · 무개입: ${bm.size}판 · 주공 판당 상금 ${bMean.toFixed(0)} · 여당 승률 ${(100 * bWin / bm.size).toFixed(1)}%`);

  for (const mode of modes) {
    const iv = await run(N, mode, sess);
    const diffs = [], fdiffs = []; let dWin = 0, firedRounds = 0;
    for (const r of iv.per.filter(Boolean)) {
      const b = bm.get(r.seed);
      if (!b || b.decl !== r.decl) continue;   // 개입은 play만 바꾸므로 주공은 항상 동일
      const d = r.prize - b.prize;
      diffs.push(d);
      if (r.fired > 0) { fdiffs.push(d); firedRounds++; dWin += (r.win ? 1 : 0) - (b.win ? 1 : 0); }
    }
    const st = a => {
      const n = a.length, m = a.reduce((x, y) => x + y, 0) / n;
      const sd = Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / (n - 1));
      return { n, m, ci: 1.96 * sd / Math.sqrt(n) };
    };
    const all = st(diffs), fo = fdiffs.length > 1 ? st(fdiffs) : { n: fdiffs.length, m: fdiffs[0] || 0, ci: 0 };
    console.log(`\n개입 ${mode} · 짝지은 판 ${all.n} · 발화 ${iv.hits}회 / ${firedRounds}판`);
    console.log(`  전체 판당 상금 차이   ${all.m >= 0 ? '+' : ''}${all.m.toFixed(1)} ± ${all.ci.toFixed(1)}`);
    console.log(`  발화 판 한정 차이     ${fo.m >= 0 ? '+' : ''}${fo.m.toFixed(1)} ± ${fo.ci.toFixed(1)} (n=${fo.n})`);
    console.log(`  발화 판 여당 승수 변화 ${dWin >= 0 ? '+' : ''}${dWin}`);
    console.log(fo.m - fo.ci > 0 ? '  → 탑 리드가 유의하게 이득'
      : fo.m + fo.ci < 0 ? '  → 유의하게 손해 — 현재 탐색 정책이 옳다'
      : '  → 유의차 없음');
  }
})();
