/**
 * 초구 확정승 리드 개입 실험 — 주공이 초구(기루다 리드 금지)에 확정승 오프수트
 * 카드(무늬 위 서열이 내 손·묻은 패 밖에 없음)를 두고 헌납 리드를 고를 때,
 * 확정승 카드로 교체하면 이득인지 같은 딜 페어드로 잰다.
 * (2026-08-07 스크린샷 제보: 마이티+♠6장+♣A에서 ♥5 헌납 — 고정 손패 178딜에서
 *  ♣A가 +431/판 우세. 이 스크립트는 일반 클래스 인증용.)
 *
 *   A1  : 위 조건 그대로 (마이티·조커 리드 선택은 개입 안 함)
 *   A1m : A1 + 마이티 보유 시에만 (리드권 지배력이 높은 패 한정)
 *
 * 사용: node tools/research/first_lead.js [판수] [A1,A1m]   env MODEL·SEED_BASE
 */
'use strict';
const path = require('path');
const P = p => path.join(__dirname, p);
const ort = require('onnxruntime-node');
const E = require(P('../../src/mighty-engine.js'));
const AI = require(P('../../src/mighty-ai.js'));
const MODEL = process.env.MODEL || P('../../web/model/mighty_master_v6b.onnx');
const SEED0 = parseInt(process.env.SEED_BASE || '1150000', 10);
const PER = ['gambler', 'balanced', 'careful'];

function override(g, seat, mode, act) {
  if (seat !== g.declarer) return null;
  const pl = g.play;
  if (pl.trickNo !== 1 || pl.table.length !== 0 || act.jokerCall) return null;
  // 초구 프렌드 판 제외 — 초구를 이기면 프렌드가 소멸(셀프)한다. 이 판의 헌납
  // 리드는 결함이 아니라 "프렌드 만들기"다 (1차 인증에서 발화 판 −942/−2390의 정체).
  if (g.friendDecl && g.friendDecl.mode === 'first') return null;
  const c = act.card;
  if (E.isJoker(c) || E.sameCard(c, g.mightyCard)) return null;   // 키카드 리드는 존중
  const gi = g.contract.giruda;
  if (mode === 'A1m' && !g.hands[seat].some(x => !E.isJoker(x) && E.sameCard(x, g.mightyCard))) return null;
  const seen = new Set();
  for (const x of g.hands[seat]) seen.add(E.cardId(x));
  if (g.discard) for (const x of g.discard) seen.add(E.cardId(x));
  const sure = g.hands[seat].filter(x => {
    if (E.isJoker(x) || E.sameCard(x, g.mightyCard)) return false;
    if (gi !== 'N' && x.suit === gi) return false;                 // 초구 기루다 불가
    for (let r = x.rank + 1; r <= 14; r++) if (!seen.has(x.suit + r)) return false;
    return true;
  });
  if (!sure.length) return null;
  if (sure.some(x => E.sameCard(x, c))) return null;               // 이미 확정승 리드
  const cnt = s => g.hands[seat].filter(x => !E.isJoker(x) && x.suit === s).length;
  sure.sort((a, b) => b.rank - a.rank || cnt(a.suit) - cnt(b.suit));
  const top = sure[0];
  if (!g._legalPlays(seat).some(m => !m.jokerCall && !m.jokerSuit && E.sameCard(m.card, top))) return null;
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
    while (g.phase !== 'done' && g.phase !== 'redeal' && guard++ < 900) {
      const p = g.currentPlayer;
      let act = await ag[p].act(g, p);
      if (mode !== 'none' && g.phase === 'play' && act.type === 'play') {
        const o = override(g, p, mode, act);
        if (o) { act = o; hits++; fired++; }
      }
      g.act(act);
    }
    per.push(g.phase === 'done'
      ? { seed, decl: g.declarer, prize: g.result.prizes[g.declarer], win: g.result.win, fired }
      : null);
  }
  return { per, hits };
}

(async () => {
  const N = parseInt(process.argv[2] || '800', 10);
  const modes = (process.argv[3] || 'A1,A1m').split(',');
  const sess = await ort.InferenceSession.create(MODEL);
  const base = await run(N, 'none', sess);
  const bm = new Map(base.per.filter(Boolean).map(r => [r.seed, r]));
  console.log(`\n${path.basename(MODEL)} 전좌석 마스터 · 무개입 ${bm.size}판 · 주공 판당 상금 ${([...bm.values()].reduce((a, r) => a + r.prize, 0) / bm.size).toFixed(0)}`);
  for (const mode of modes) {
    const iv = await run(N, mode, sess);
    const diffs = [], fdiffs = []; let dWin = 0, fr = 0;
    for (const r of iv.per.filter(Boolean)) {
      const b = bm.get(r.seed);
      if (!b || b.decl !== r.decl) continue;
      const d = r.prize - b.prize;
      diffs.push(d);
      if (r.fired > 0) { fdiffs.push(d); fr++; dWin += (r.win ? 1 : 0) - (b.win ? 1 : 0); }
    }
    const st = a => { const n = a.length, m = a.reduce((x, y) => x + y, 0) / n;
      const sd = Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / (n - 1));
      return { n, m, ci: 1.96 * sd / Math.sqrt(n) }; };
    const all = st(diffs), fo = fdiffs.length > 1 ? st(fdiffs) : { n: fdiffs.length, m: fdiffs[0] || 0, ci: 0 };
    console.log(`\n개입 ${mode} · 짝지은 판 ${all.n} · 발화 ${iv.hits}회/${fr}판`);
    console.log(`  전체 차이 ${all.m >= 0 ? '+' : ''}${all.m.toFixed(1)} ± ${all.ci.toFixed(1)} · 발화 판 ${fo.m >= 0 ? '+' : ''}${fo.m.toFixed(1)} ± ${fo.ci.toFixed(1)} (n=${fo.n}) · 승수 ${dWin >= 0 ? '+' : ''}${dWin}`);
    console.log(fo.m - fo.ci > 0 ? '  → 유의 이득' : fo.m + fo.ci < 0 ? '  → 유의 손해' : '  → 유의차 없음');
  }
})();
