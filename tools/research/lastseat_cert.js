/**
 * lastSeatGuard 페어드 인증 — 마지막 순번 확정승 강제가 실제로 이득인가.
 *
 * 표적 2번(docs/SESSION-HANDOFF.md 8-3·9-5). 재측정에서 A선택·B평가 후회 −18±10,
 * 판당 손실 ≈8. 정책 채택률 68.6%가 교사의 67.3%와 사실상 같아 "빈도 편향"이 아니라
 * "국면 선택 오류"로 드러났고, 그래서 증류보다 가드를 먼저 재기로 했다.
 *
 * 다만 교사도 확정승을 최선으로 보는 비율이 67.3%뿐이다 — 무조건 강제는 세 번에
 * 한 번 틀린다. 상금차 +154±37이 그 손실을 덮는지를 여기서 가른다.
 *
 * 방법: 같은 시드 페어드. 기준 팔은 배포 체인 그대로, 개입 팔은 그 뒤에
 * lastSeatGuard를 한 번 더 적용한다(가드는 아직 applyGuards에 연결돼 있지 않다 —
 * 연결하면 기준 팔이 오염되므로 인증이 끝난 뒤에 결정한다).
 *
 * 지표는 주공 상금이다. 발화 좌석이 프렌드(여당)뿐이라 부호가 일정하다 — 양수가 이득.
 *
 * 사용: node tools/research/lastseat_cert.js [판수]   env MODEL·SEED_BASE
 */
'use strict';
const path = require('path');
const P = p => path.join(__dirname, p);
const ort = require('onnxruntime-node');
const E = require(P('../../src/mighty-engine.js'));
const AI = require(P('../../src/mighty-ai.js'));
const MODEL = process.env.MODEL || P('../../web/model/mighty_master_v16e.onnx');
const SEED0 = parseInt(process.env.SEED_BASE || '4400000', 10);
const PER = ['gambler', 'balanced', 'careful'];

/**
 * 마지막 순번 확정승 가드 — 프렌드가 마지막 순번에서 점수 걸린 트릭을 확정으로
 * 가져올 수 있는데 흘리는 것을 막는다.
 *
 * 제보(2026-08-17, seed 898941411 트릭3): 조커 프렌드가 마지막 순번에서 ♣K로
 * 확정 승리할 수 있는데 ♣2를 내고 야당에 2점을 넘겼다.
 *
 * 클래스(좌석 가시 정보만, 불확실성 0 — 뒤에 아무도 없다):
 *   - 내가 프렌드다 (프렌드 카드 보유, 비주공) · 마지막 순번(테이블 4장)
 *   - 테이블 최강이 아군이 아니다 · 테이블에 점수카드가 있다
 *   - 이기는 합법수가 있고 선택지가 둘 이상인데 정책이 안 이기는 수를 골랐다
 *
 * 교체는 **최저 확정승**이다(cutGuard와 같은 방식). 키카드(마이티·조커)는 비키
 * 승수가 있으면 쓰지 않는다 — 이기기만 하면 되는 자리에 최강 카드를 태울 이유가 없다.
 *
 * 주의: 교사(PIMC)도 이 클래스에서 확정승을 최선으로 보는 비율이 67.3%뿐이다.
 * 무조건 강제는 세 번에 한 번 틀린다 — 반드시 페어드 인증 수치를 보고 켜라.
 * 롤백: createAgent({lastSeatGuard:false}).
 */
function lastSeatGuard(game, seat, action) {
  try {
    if (!action || action.type !== 'play' || game.phase !== 'play' || action.jokerCall) return action;
    if (seat === game.declarer) return action;
    const pl = game.play;
    if (!pl || pl.table.length !== E.NUM_PLAYERS - 1) return action;   // 마지막 순번만
    // 프렌드 확정: 카드 프렌드 판에서 그 카드를 내가 들고 있다(공개 전에도 자기는 안다)
    const fd = game.friendDecl;
    if (!(fd && fd.mode === 'card' && fd.card &&
          game.hands[seat].some(c => E.sameCard(c, fd.card)))) return action;
    const gt = (a, b) => a[0] > b[0] || (a[0] === b[0] && a[1] > b[1]);
    let best = null, bk = [-2, -1];
    for (const e of pl.table) {
      const k = game._cardStrength(e, pl);
      if (gt(k, bk)) { bk = k; best = e; }
    }
    if (!best) return action;
    const ally = best.player === game.declarer ||
      (game.friendRevealed && game.friend === best.player && best.player !== seat);
    if (ally) return action;                                           // 아군이 이기는 중이면 대상 아님
    if (!pl.table.some(e => E.isPointCard(e.card))) return action;     // 점수 안 걸린 트릭은 그냥 둔다
    const legal = game._legalPlays(seat).filter(m => !m.jokerCall);
    if (legal.length < 2) return action;
    const wins = m => gt(game._cardStrength(
      { player: seat, card: m.card, jokerSuit: m.jokerSuit }, pl), bk);
    if (wins({ card: action.card, jokerSuit: action.jokerSuit })) return action;  // 이미 이긴다
    const winners = legal.filter(wins);
    if (!winners.length) return action;
    // 최저 확정승: 키카드는 뒤로, 그다음 약한 순서
    const isKey = x => E.isJoker(x) || E.sameCard(x, game.mightyCard);
    winners.sort((a, b) => {
      const ka = isKey(a.card) ? 1 : 0, kb = isKey(b.card) ? 1 : 0;
      if (ka !== kb) return ka - kb;
      const sa = game._cardStrength({ player: seat, card: a.card, jokerSuit: a.jokerSuit }, pl);
      const sb = game._cardStrength({ player: seat, card: b.card, jokerSuit: b.jokerSuit }, pl);
      return sa[0] - sb[0] || sa[1] - sb[1];
    });
    const w = winners[0];
    return w.jokerSuit ? { type: 'play', card: w.card, jokerSuit: w.jokerSuit }
                       : { type: 'play', card: w.card };
  } catch (e) { return action; }
}

async function run(N, intervene, sess) {
  const per = [];
  let hits = 0;
  for (let i = 0; i < N; i++) {
    const seed = SEED0 + i;
    const rng = E.makeRng(seed);
    const g = new E.MightyGame({ seed });
    const ag = [];
    for (let s = 0; s < E.NUM_PLAYERS; s++)
      ag.push(await AI.createAgent({ tier: 'master', persona: PER[s % 3], rng, session: sess, ort }));
    g.start(Math.floor(rng() * E.NUM_PLAYERS));
    let guard = 0, fired = 0, feat = null;
    while (g.phase !== 'done' && g.phase !== 'redeal' && guard++ < 900) {
      const p = g.currentPlayer;
      let act = await ag[p].act(g, p);
      if (g.phase === 'play' && act.type === 'play') {
        const alt = lastSeatGuard(g, p, act);
        if (alt !== act) {                       // 가드가 교체를 제안했다 = 발화
          hits++; fired++;
          if (!feat) {                           // 판별 슬라이스용 — 첫 발화의 특징만
            const pts = g.play.table.filter(e => E.isPointCard(e.card)).length;
            feat = {
              pts,                                        // 걸린 점수카드 수
              key: E.isJoker(alt.card) || E.sameCard(alt.card, g.mightyCard),
              trick: g.play.trickNo,
              revealed: !!g.friendRevealed,
            };
          }
          if (intervene) act = alt;
        }
      }
      g.act(act);
    }
    per.push(g.phase === 'done'
      ? { seed, decl: g.declarer, prize: g.result.prizes[g.declarer], win: g.result.win, fired, feat }
      : null);
  }
  return { per, hits };
}

(async () => {
  const N = parseInt(process.argv[2] || '3000', 10);
  const sess = await ort.InferenceSession.create(MODEL);
  const base = await run(N, false, sess);
  const iv = await run(N, true, sess);
  const bm = new Map(base.per.filter(Boolean).map(r => [r.seed, r]));
  const diffs = [], fdiffs = [], slices = [];
  let dWin = 0, fr = 0;
  for (const r of iv.per.filter(Boolean)) {
    const b = bm.get(r.seed);
    if (!b || b.decl !== r.decl) continue;
    const d = r.prize - b.prize;
    diffs.push(d);
    if (r.fired > 0) {
      fdiffs.push(d); fr++; dWin += (r.win ? 1 : 0) - (b.win ? 1 : 0);
      if (b.feat) slices.push({ d, ...b.feat });
    }
  }
  const st = a => {
    const n = a.length, m = a.reduce((x, y) => x + y, 0) / n;
    const sd = Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / (n - 1));
    return { n, m, ci: 1.96 * sd / Math.sqrt(n) };
  };
  const all = st(diffs);
  const fo = fdiffs.length > 1 ? st(fdiffs) : { n: fdiffs.length, m: fdiffs[0] || 0, ci: 0 };
  console.log(`${path.basename(MODEL)} 전좌석 마스터 · 짝지은 ${all.n}판 · ` +
              `발화 ${base.hits}회/${fr}판 (판당 ${(base.hits / Math.max(1, all.n)).toFixed(3)}회)`);
  console.log(`주공 상금 변화(양수=여당 이득) 전체 ${all.m >= 0 ? '+' : ''}${all.m.toFixed(1)} ± ${all.ci.toFixed(1)}`);
  console.log(`발화 판 한정 ${fo.m >= 0 ? '+' : ''}${fo.m.toFixed(1)} ± ${fo.ci.toFixed(1)} (n=${fo.n}) · 여당 승수 변화 ${dWin >= 0 ? '+' : ''}${dWin}`);
  console.log(fo.m - fo.ci > 0 ? '→ 유의 이득 — 가드 승격 근거'
    : fo.m + fo.ci < 0 ? '→ 유의 손해 — 강제하면 안 된다(정책이 옳다)'
    : '→ 유의차 없음 — 승격 보류');

  // 탐색적 슬라이스 — 다중비교라 확정 근거가 아니다. 좁힌 변형을 만들 값어치가
  // 있는지만 본다(sig → sigW 선례).
  console.log('\n[탐색적 슬라이스] 다중비교 주의 — 단독 승격 근거로 쓰지 마라');
  const show = (label, arr) => {
    if (arr.length < 2) { console.log(`  ${label.padEnd(22)} n=${arr.length} (표본 부족)`); return; }
    const v = st(arr.map(x => x.d));
    console.log(`  ${label.padEnd(22)} ${v.m >= 0 ? '+' : ''}${v.m.toFixed(0)} ± ${v.ci.toFixed(0)} (n=${v.n})`);
  };
  show('점수카드 1장', slices.filter(x => x.pts === 1));
  show('점수카드 2장 이상', slices.filter(x => x.pts >= 2));
  show('교체수가 키카드', slices.filter(x => x.key));
  show('교체수가 비키카드', slices.filter(x => !x.key));
  show('트릭 1~5', slices.filter(x => x.trick <= 5));
  show('트릭 6~10', slices.filter(x => x.trick >= 6));
  show('프렌드 공개 후', slices.filter(x => x.revealed));
  show('프렌드 공개 전', slices.filter(x => !x.revealed));
})();
