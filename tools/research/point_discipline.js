/**
 * 점수카드 규율 측정 — 두 방향을 같이 본다.
 *
 *  (A) 헌납: 야당이 이미 잠근 트릭에 점수카드를 태운다. 손실.
 *  (B) 보태기: 아군이 이미 잠근 트릭에 '탑이 아닌' 점수카드를 얹는다. 이득.
 *
 * 둘 다 "이 트릭은 이미 결판났다"는 같은 인식에서 갈라져 나오는 행동이다.
 * A만 재면 정책이 점수카드를 그냥 아끼는 것과 구분할 수 없다. B를 같이 재야
 * 결판 인식을 실제로 학습했는지 판별된다.
 *
 * 판정은 전지적(채점 전용). keywaste_true.js의 lockedTrick과 동일 정의.
 *
 * 사용: node tools/research/point_discipline.js [판수] [상대티어]
 *   env MODEL=경로 · TIER=master|advanced(기준선) · KEY_GUARD=off
 */
'use strict';
const path = require('path');
const P = p => path.join(__dirname, p);
const ort = require('onnxruntime-node');
const E = require(P('../../src/mighty-engine.js'));
const AI = require(P('../../src/mighty-ai.js'));
const MODEL = process.env.MODEL || P('../../web/model/mighty_master_v4.onnx');
const TIER = process.env.TIER || 'master';
const GUARD = process.env.KEY_GUARD !== 'off';
const PER = ['gambler', 'balanced', 'careful'];

const strength = (g, e, pl) => g._cardStrength(e, pl);
const stronger = (a, b) => a[0] > b[0] || (a[0] === b[0] && a[1] > b[1]);

function lockedTrick(g, seat) {
  const pl = g.play;
  if (!pl || pl.table.length === 0) return null;
  const decl = g.declarer, fr = g.friend;
  if (decl == null) return null;
  const team = p => (p === decl || (fr !== null && p === fr)) ? 'R' : 'O';
  let best = null, bk = [-2, -1];
  for (const e of pl.table) { const k = strength(g, e, pl); if (stronger(k, bk)) { bk = k; best = e; } }
  if (!best || best.player === seat) return null;
  const acted = new Set(pl.table.map(e => e.player)); acted.add(seat);
  for (let p = 0; p < E.NUM_PLAYERS; p++) {
    if (acted.has(p)) continue;
    for (const m of g._legalPlays(p)) {
      const k = strength(g, { player: p, card: m.card, jokerSuit: m.jokerSuit, jokerCall: m.jokerCall }, pl);
      if (stronger(k, bk)) return null;
    }
  }
  return { allyWins: team(best.player) === team(seat) };
}

/** 이 카드가 자기 무늬에서 현재 살아있는 최고인가 (전지적, 채점 전용) */
function isTopOfSuit(g, seat, card) {
  if (E.isJoker(card)) return true;
  for (let p = 0; p < E.NUM_PLAYERS; p++) {
    for (const x of g.hands[p]) {
      if (p === seat && E.sameCard(x, card)) continue;
      if (E.isJoker(x) || x.suit !== card.suit) continue;
      if (x.rank > card.rank) return false;
    }
  }
  return true;
}

const pct = (a, b) => b ? (100 * a / b).toFixed(1) + '%' : '—';
const se = (a, b) => b ? (100 * Math.sqrt((a / b) * (1 - a / b) / b)).toFixed(2) : '—';

(async () => {
  const N = parseInt(process.argv[2] || '600', 10);
  const oppTier = process.argv[3] || 'advanced';
  const sess = TIER === 'master' ? await ort.InferenceSession.create(MODEL) : null;

  let rounds = 0, seat = 0;
  // A) 헌납  B) 보태기 — 프렌드 공개 전/후 분리
  const C = () => ({ pre: 0, post: 0 });
  const feedOpp = C(), feedBad = C(), addOpp = C(), addGood = C();
  let addTop = 0;
  const addByTrick = {}, missByTrick = {};
  const bump = (o, k) => { o[k] = (o[k] || 0) + 1; };

  for (let i = 0; i < N; i++) {
    const rng = E.makeRng(900000 + i);
    const g = new E.MightyGame({ seed: 900000 + i });
    const ag = [];
    for (let s = 0; s < E.NUM_PLAYERS; s++) ag.push(s === seat
      ? (TIER === 'master'
          ? await AI.createAgent({ tier: 'master', session: sess, ort, keyGuard: GUARD })
          : await AI.createAgent({ tier: TIER, persona: 'balanced', rng }))
      : await AI.createAgent({ tier: oppTier, persona: PER[s % 3], rng }));
    g.start(Math.floor(rng() * E.NUM_PLAYERS));

    let guard = 0;
    while (g.phase !== 'done' && g.phase !== 'redeal') {
      const p = g.currentPlayer;
      let mode = null, trickNo = 0, rev = 'pre';
      if (g.phase === 'play' && p === seat) {
        const lock = lockedTrick(g, p);
        if (lock) {
          const isKey = c => E.isJoker(c) || E.sameCard(c, g.mightyCard);
          const legal = g._legalPlays(p);
          const pts = legal.filter(m => E.isPointCard(m.card) && !isKey(m.card));
          const nonPts = legal.filter(m => !E.isPointCard(m.card) && !isKey(m.card));
          trickNo = g.play.trickNo;
          rev = g.friendRevealed ? 'post' : 'pre';
          if (lock.allyWins) {
            // 탑이 아닌 점수카드를 들고 있고, 안 낼 선택지도 있을 때만 기회
            const safe = pts.filter(m => !isTopOfSuit(g, p, m.card));
            if (safe.length && nonPts.length) { mode = 'add'; addOpp[rev]++; }
          } else {
            if (pts.length && nonPts.length) { mode = 'feed'; feedOpp[rev]++; }
          }
        }
      }
      const act = await ag[p].act(g, p);
      if (mode && act.type === 'play') {
        const c = act.card;
        const isKey = E.isJoker(c) || E.sameCard(c, g.mightyCard);
        const gave = E.isPointCard(c) && !isKey;
        if (mode === 'feed' && gave) feedBad[rev]++;
        if (mode === 'add') {
          if (gave) {
            addGood[rev]++;
            bump(addByTrick, trickNo);
            if (isTopOfSuit(g, p, c)) addTop++;   // 탑을 줘버린 경우 (과잉)
          } else bump(missByTrick, trickNo);
        }
      }
      g.act(act);
      if (++guard > 900) break;
    }
    if (g.phase !== 'done') continue;
    rounds++;
    seat = (seat + 1) % E.NUM_PLAYERS;
  }

  const who = TIER === 'master' ? `${path.basename(MODEL)} 가드${GUARD ? 'ON' : 'OFF'}` : `${TIER}(휴리스틱 기준선)`;
  const tot = o => o.pre + o.post;
  const line = (b, o) => `${pct(tot(b), tot(o))} ± ${se(tot(b), tot(o))}  ` +
    `(공개 전 ${pct(b.pre, o.pre)} [${b.pre}/${o.pre}] · 공개 후 ${pct(b.post, o.post)} [${b.post}/${o.post}])`;
  console.log(`\n${who} · ${rounds}판 · 상대 ${oppTier}`);
  console.log(`\n(A) 헌납 — 야당이 잠근 트릭에 점수카드를 태움 [낮을수록 좋음]`);
  console.log(`    ${line(feedBad, feedOpp)}`);
  console.log(`\n(B) 보태기 — 아군이 잠근 트릭에 탑 아닌 점수카드를 얹음 [높을수록 좋음]`);
  console.log(`    ${line(addGood, addOpp)}`);
  console.log(`    그중 탑 카드를 줘버린 과잉: ${addTop} (${pct(addTop, tot(addGood))})`);
  const tricks = [...new Set([...Object.keys(addByTrick), ...Object.keys(missByTrick)])]
    .map(Number).sort((a, b) => a - b);
  console.log(`\n    트릭별 보태기 성공률`);
  for (const t of tricks) {
    const a = addByTrick[t] || 0, m = missByTrick[t] || 0;
    console.log(`      트릭 ${String(t).padStart(2)}  ${String(a).padStart(3)}/${String(a + m).padStart(3)}  ${pct(a, a + m).padStart(6)}`);
  }
})();
