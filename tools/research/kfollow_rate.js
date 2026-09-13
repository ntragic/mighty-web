/**
 * 기루다 팔로우 낭비 클래스의 원시 채택률 — 증류 후보 등재용 수치.
 *
 * v3.0.8의 keyCardGuard 폴백은 이 클래스를 배포 경로에서 막는다. 하지만 정책
 * 자체는 여전히 틀린 카드를 고른다(제보 seed 2135136798 6트릭에서 v16e가 ♠K를
 * 골랐다). 증류로 이식하려면 두 값이 필요하다.
 *
 *   기회      클래스가 성립하는 국면 수 (판당 밀도 — 증류 샘플 밀도의 근사)
 *   원시 채택률 그 기회에서 정책이 이미 최저 비용 카드를 고르는 비율
 *
 * 3차 앵커 증류(2026-08-10) 교훈: update당 샘플이 다른 관례의 3% 미만이면 CE가
 * KL에 눌려 이식되지 않는다(조커콜 1.6샘플/update). 그래서 밀도를 함께 잰다.
 *
 * 클래스 정의(가드 판정과 무관하게 구조로만 잡는다 — 폴백이 들어간 뒤에도 같은
 * 국면을 세야 하므로 keyCardGuard의 trace 상태만 읽고 교정 결과는 쓰지 않는다):
 *   - 기루다가 리드된 트릭이라 합법수가 전부 기루다다 (ledSuit === giruda)
 *   - 남은 사람이 테이블 최강을 못 넘긴다 (lockedForOthers)
 *   - 그 최강이 상대팀이다 (winnerIsOpp) · 내 수로는 못 이긴다 (!iWin)
 *   - 더 싼 합법수가 실제로 존재한다 (선택의 여지가 있는 자리만)
 *
 * 사용: node tools/research/kfollow_rate.js [판수]   env MODEL·SEED_BASE
 */
'use strict';
const path = require('path');
const P = p => path.join(__dirname, p);
const ort = require('onnxruntime-node');
const E = require(P('../../src/mighty-engine.js'));
const AI = require(P('../../src/mighty-ai.js'));
const M = require(P('../../src/mighty-master.js'));
const MODEL = process.env.MODEL || P('../../web/model/mighty_master_v16e.onnx');
const SEED0 = parseInt(process.env.SEED_BASE || '3300000', 10);
const PER = ['gambler', 'balanced', 'careful'];

const isKeyOf = (g, x) => E.isJoker(x) || E.sameCard(x, g.mightyCard);
const cost = (g, c) => (c.rank || 0) + (E.isPointCard(c) ? 30 : 0);

function sideOf(g, seat) {
  if (seat === g.declarer) return 'att';
  if (g.friendRevealed) return (g.friend !== null && seat === g.friend) ? 'att' : 'def';
  const fd = g.friendDecl;
  if (fd && fd.mode === 'card' && fd.card && g.hands[seat].some(x => E.sameCard(x, fd.card))) return 'att';
  return 'unknown';
}

/** 이기지 못하는 합법수 중 최저 비용(키카드 제외). 없으면 null. */
function idealPick(g, seat) {
  const pl = g.play;
  let bk = [-2, -1];
  for (const e of pl.table) {
    const k = g._cardStrength(e, pl);
    if (k[0] > bk[0] || (k[0] === bk[0] && k[1] > bk[1])) bk = k;
  }
  const beats = m => {
    const k = g._cardStrength({ player: seat, card: m.card, jokerSuit: m.jokerSuit }, pl);
    return k[0] > bk[0] || (k[0] === bk[0] && k[1] > bk[1]);
  };
  const cand = g._legalPlays(seat).filter(m => !m.jokerCall && !isKeyOf(g, m.card) && !beats(m));
  if (!cand.length) return null;
  cand.sort((a, b) => cost(g, a.card) - cost(g, b.card));
  return cand[0];
}

(async () => {
  const N = parseInt(process.argv[2] || '2000', 10);
  const sess = await ort.InferenceSession.create(MODEL);
  const tally = {
    att: { opp: 0, ok: 0, point: 0 }, def: { opp: 0, ok: 0, point: 0 },
    unknown: { opp: 0, ok: 0, point: 0 },
  };
  let deals = 0, decisions = 0;

  for (let i = 0; i < N; i++) {
    const seed = SEED0 + i;
    const rng = E.makeRng(seed);
    const g = new E.MightyGame({ seed });
    const ag = [];
    for (let s = 0; s < E.NUM_PLAYERS; s++)
      ag.push(await AI.createAgent({ tier: 'master', persona: PER[s % 3], rng, session: sess, ort }));
    g.start(Math.floor(rng() * E.NUM_PLAYERS));
    let guard = 0;
    while (g.phase !== 'done' && g.phase !== 'redeal' && guard++ < 900) {
      const p = g.currentPlayer;
      if (g.phase === 'play') decisions++;
      const gi = g.contract ? g.contract.giruda : 'N';
      const trumpFollow = g.phase === 'play' && gi !== 'N' &&
        g.play.table.length > 0 && g.play.ledSuit === gi;

      if (trumpFollow) {
        // 정책 원수를 따로 뽑는다 — 가드가 이미 교정한 수로는 모델을 못 잰다.
        const a = await M.chooseAction(sess, ort, g, p, []);
        const raw = M.actionToEngine(a, g, []);
        if (raw && raw.type === 'play') {
          const tr = {};
          AI.keyCardGuard(g, p, raw, tr);
          const ideal = idealPick(g, p);
          if (tr.lockedForOthers === true && tr.winnerIsOpp === true && tr.iWin === false &&
              ideal && cost(g, ideal.card) < cost(g, raw.card)) {
            const t = tally[sideOf(g, p)];
            t.opp++;                                   // 더 싼 수가 있는데 안 골랐다
            if (E.isPointCard(raw.card)) t.point++;    // 점수카드까지 버린 경우
          } else if (tr.lockedForOthers === true && tr.winnerIsOpp === true &&
                     tr.iWin === false && ideal) {
            const t = tally[sideOf(g, p)];
            t.opp++; t.ok++;                           // 이미 최저 비용을 골랐다
          }
        }
      }
      g.act(await ag[p].act(g, p));
    }
    if (g.phase === 'done') deals++;
  }

  const line = (k) => {
    const t = tally[k];
    const rate = t.opp ? (100 * t.ok / t.opp) : 0;
    return `${k.padEnd(7)} 기회 ${String(t.opp).padStart(5)} (판당 ${(t.opp / deals).toFixed(3)}) · ` +
           `원시 채택 ${rate.toFixed(1)}% · 오답 ${t.opp - t.ok}회 (그중 점수카드 투입 ${t.point}회)`;
  };
  console.log(`${path.basename(MODEL)} 전좌석 마스터 · 완료 ${deals}판 · 플레이 결정 ${decisions}회`);
  console.log('클래스: 기루다 팔로우 · 상대가 잠근 트릭 · 더 싼 합법수 존재');
  for (const k of ['att', 'def', 'unknown']) console.log(line(k));
  const all = ['att', 'def', 'unknown'].reduce((a, k) =>
    ({ opp: a.opp + tally[k].opp, ok: a.ok + tally[k].ok }), { opp: 0, ok: 0 });
  console.log(`합계    기회 ${all.opp} (판당 ${(all.opp / deals).toFixed(3)}) · ` +
              `원시 채택 ${(100 * all.ok / Math.max(1, all.opp)).toFixed(1)}%`);
})();
