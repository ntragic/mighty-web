/**
 * 마이티 무늬 리드 금지의 '약한 조커' 예외 — 페어드 인증.
 *
 * 제보(2026-09-17, 1판 seed 1438626284 1트릭): 기루다 ♣라 첫 트릭 클럽 리드가 룰로
 * 막히고, 마이티 ♠A라 스페이드 리드가 mightyLeadGuard로 막혀 조커(♥)만 남았다.
 * 첫 트릭이라 약해진 조커가 유나 ♥A에 졌다. 정책은 ♠Q 58.6%·♠4 35.7%였고
 * 롤아웃 48회에서 ♠Q가 +1,467 나았다.
 *
 * 예외: 금지하고 남는 리드가 이번 트릭에서 약해진 조커뿐이면 금지를 푼다.
 *
 * 방법: 같은 시드 페어드, v16e 전좌석 마스터. 기준 팔은 예외 없음(현행 배포),
 * 개입 팔은 createAgent({mightyLeadJokerException:true}).
 * 발화 = 예외가 금지를 실제로 푼 자리(AI.mightyLeadBans가 옵션 유무로 갈리는 곳).
 *
 * 계산 절약: 발화가 없던 판은 두 팔의 모든 결정이 같다(마스터는 argmax+결정론 가드,
 * 탐색 끔). 그래서 개입 팔은 기준 팔에서 발화한 판만 돌린다. 이 가정은 발화 없는
 * 판 표본으로 직접 검사한다 — 어긋나면 인증을 무효로 한다.
 *
 * 지표: 주공 상금(발화 좌석은 리드하는 여당 — 사실상 1트릭 주공이라 양수가 이득).
 *
 * 사용: node tools/research/mlead_cert.js [판수]   env MODEL·SEED_BASE·CHECK(결정론 검사 판수)
 */
'use strict';
const path = require('path');
const P = p => path.join(__dirname, p);
const ort = require('onnxruntime-node');
const E = require(P('../../src/mighty-engine.js'));
const AI = require(P('../../src/mighty-ai.js'));
const MODEL = process.env.MODEL || P('../../web/model/mighty_master_v16e.onnx');
const SEED0 = parseInt(process.env.SEED_BASE || '5500000', 10);
const CHECK = parseInt(process.env.CHECK || '40', 10);
const PER = ['gambler', 'balanced', 'careful'];

async function play(seed, exception, sess) {
  const rng = E.makeRng(seed);
  const g = new E.MightyGame({ seed });
  const ag = [];
  for (let s = 0; s < E.NUM_PLAYERS; s++)
    ag.push(await AI.createAgent({ tier: 'master', persona: PER[s % 3], rng, session: sess, ort,
                                   mightyLeadJokerException: exception }));
  g.start(Math.floor(rng() * E.NUM_PLAYERS));
  let guard = 0, fired = 0, firedTrick = null;
  while (g.phase !== 'done' && g.phase !== 'redeal' && guard++ < 900) {
    const p = g.currentPlayer;
    if (g.phase === 'play' && g.play.table.length === 0) {
      const off = AI.mightyLeadBans(g, p, { mightyLeadJokerException: false });
      const on = AI.mightyLeadBans(g, p, { mightyLeadJokerException: true });
      if (off && !on) { fired++; if (firedTrick === null) firedTrick = g.play.trickNo; }
    }
    g.act(await ag[p].act(g, p));
  }
  return g.phase === 'done'
    ? { seed, decl: g.declarer, prize: g.result.prizes[g.declarer], win: g.result.win, fired, firedTrick }
    : null;
}

(async () => {
  const N = parseInt(process.argv[2] || '3000', 10);
  const sess = await ort.InferenceSession.create(MODEL);

  const base = [];
  for (let i = 0; i < N; i++) base.push(await play(SEED0 + i, false, sess));
  const done = base.filter(Boolean);
  const firedBase = done.filter(r => r.fired > 0);

  // 결정론 검사: 발화 없는 판에서 개입 팔이 기준 팔과 똑같이 끝나는가
  let mismatch = 0, checked = 0;
  for (const r of done.filter(x => x.fired === 0).slice(0, CHECK)) {
    const iv = await play(r.seed, true, sess);
    checked++;
    if (!iv || iv.prize !== r.prize || iv.decl !== r.decl) mismatch++;
  }

  const diffs = [];
  let dWin = 0;
  for (const r of firedBase) {
    const iv = await play(r.seed, true, sess);
    if (!iv || iv.decl !== r.decl) continue;
    diffs.push(iv.prize - r.prize);
    dWin += (iv.win ? 1 : 0) - (r.win ? 1 : 0);
  }
  const st = a => {
    const n = a.length; if (n < 2) return { n, m: a[0] || 0, ci: 0 };
    const m = a.reduce((x, y) => x + y, 0) / n;
    const sd = Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / (n - 1));
    return { n, m, ci: 1.96 * sd / Math.sqrt(n) };
  };
  const fo = st(diffs);
  // 발화 없는 판은 차이 0 — 전체 평균은 발화 판 합을 완료 판 수로 나눈 것
  const allMean = diffs.reduce((x, y) => x + y, 0) / Math.max(1, done.length);
  const allAll = done.map(r => 0); diffs.forEach((d, i) => { allAll[i] = d; });
  const all = st(allAll);

  console.log(`${path.basename(MODEL)} 전좌석 마스터 · 완료 ${done.length}판 · 발화 판 ${firedBase.length} ` +
              `(판당 ${(firedBase.length / Math.max(1, done.length)).toFixed(4)}) · 발화 트릭 ` +
              JSON.stringify(firedBase.reduce((o, r) => (o[r.firedTrick] = (o[r.firedTrick] || 0) + 1, o), {})));
  console.log(`결정론 검사: 발화 없는 판 ${checked}개 중 불일치 ${mismatch}개` +
              (mismatch ? '  ← 가정 깨짐, 이 인증은 무효' : '  (가정 성립)'));
  console.log(`발화 판 주공 상금 변화 ${fo.m >= 0 ? '+' : ''}${fo.m.toFixed(1)} ± ${fo.ci.toFixed(1)} (n=${fo.n}) · 여당 승수 변화 ${dWin >= 0 ? '+' : ''}${dWin}`);
  console.log(`전체(발화 없는 판 차이 0 포함) ${allMean >= 0 ? '+' : ''}${allMean.toFixed(2)} ± ${all.ci.toFixed(2)}`);
  console.log(fo.n < 2 ? '→ 표본 부족'
    : fo.m - fo.ci > 0 ? '→ 유의 이득 — 예외 채택 근거'
    : fo.m + fo.ci < 0 ? '→ 유의 손해 — 예외를 넣으면 안 된다'
    : '→ 유의차 없음');
})().catch(e => { console.error(e); process.exit(1); });
