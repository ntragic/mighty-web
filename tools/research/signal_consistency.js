/**
 * 신호 일관성 측정 — 인간 관례의 최소 집합 두 가지.
 *
 *  (1) 주공이 기루다를 리드한 트릭에서 프렌드가 점수카드로 응답하는 비율
 *      (점수/비점수 선택지가 둘 다 있을 때만 기회로 계수)
 *  (2) 프렌드 공개 후, 프렌드가 리드할 때 주공의 빈 무늬(기루다 아님)를 리드하는 비율
 *      (빈 무늬 리드 가능 + 다른 선택지 존재 시 기회. 주공 보이드는 채점용 전지적 판정)
 *
 * 측정 좌석이 프렌드가 된 판만 집계한다.
 *
 * 사용: node tools/research/signal_consistency.js [판수] [상대티어]
 *   env MODEL=경로 · TIER=master|advanced(기준선)
 */
'use strict';
const path = require('path');
const P = p => path.join(__dirname, p);
const ort = require('onnxruntime-node');
const E = require(P('../../src/mighty-engine.js'));
const AI = require(P('../../src/mighty-ai.js'));
const MODEL = process.env.MODEL || P('../../web/model/mighty_master_v4.onnx');
const TIER = process.env.TIER || 'master';
const PER = ['gambler', 'balanced', 'careful'];

const pct = (a, b) => b ? (100 * a / b).toFixed(1) + '%' : '—';
const se = (a, b) => b ? (100 * Math.sqrt((a / b) * (1 - a / b) / b)).toFixed(2) : '—';

(async () => {
  const N = parseInt(process.argv[2] || '2000', 10);
  const oppTier = process.argv[3] || 'advanced';
  const sess = TIER === 'master' ? await ort.InferenceSession.create(MODEL) : null;

  let rounds = 0, friendRounds = 0, seat = 0;
  let ptOpp = { pre: 0, post: 0 }, ptYes = { pre: 0, post: 0 };   // (1)
  let voidOpp = 0, voidYes = 0, giLead = 0, leads = 0;            // (2)

  for (let i = 0; i < N; i++) {
    const rng = E.makeRng(900000 + i);
    const g = new E.MightyGame({ seed: 900000 + i });
    const ag = [];
    for (let s = 0; s < E.NUM_PLAYERS; s++) ag.push(s === seat
      ? (TIER === 'master'
          ? await AI.createAgent({ tier: 'master', session: sess, ort, keyGuard: true })
          : await AI.createAgent({ tier: TIER, persona: 'balanced', rng }))
      : await AI.createAgent({ tier: oppTier, persona: PER[s % 3], rng }));
    g.start(Math.floor(rng() * E.NUM_PLAYERS));

    let guard = 0, wasFriend = false;
    const ev = [];   // 이번 판의 이벤트 버퍼 — 프렌드 판으로 확정되면 집계
    while (g.phase !== 'done' && g.phase !== 'redeal') {
      const p = g.currentPlayer;
      let e = null;
      if (g.phase === 'play' && p === seat && g.declarer !== null && p !== g.declarer) {
        const pl = g.play, gi = g.contract.giruda;
        const isKey = c => E.isJoker(c) || E.sameCard(c, g.mightyCard);
        const legal = g._legalPlays(p).filter(m => !m.jokerCall);
        if (pl.table.length > 0) {
          // (1) 주공 기루다 리드 트릭인가
          const lead = pl.table[0];
          if (lead.player === g.declarer && !E.isJoker(lead.card) && gi !== 'N'
              && lead.card.suit === gi) {
            const pts = legal.filter(m => E.isPointCard(m.card) && !isKey(m.card));
            const non = legal.filter(m => !E.isPointCard(m.card) && !isKey(m.card));
            if (pts.length && non.length)
              e = { kind: 'pt', rev: g.friendRevealed ? 'post' : 'pre' };
          }
        } else if (g.friendRevealed && g.friend === p) {
          // (2) 공개 후 프렌드 리드
          const declHand = g.hands[g.declarer];
          const voidSuits = ['S', 'D', 'H', 'C'].filter(su =>
            su !== gi && !declHand.some(c => !E.isJoker(c) && c.suit === su));
          const canVoid = legal.some(m => !E.isJoker(m.card) && voidSuits.includes(m.card.suit));
          const canOther = legal.some(m => E.isJoker(m.card) || !voidSuits.includes(m.card.suit));
          if (canVoid && canOther) e = { kind: 'void' };
          else e = { kind: 'leadonly' };
        }
      }
      const act = await ag[p].act(g, p);
      if (e && act.type === 'play') {
        const c = act.card;
        const isKey = E.isJoker(c) || E.sameCard(c, g.mightyCard);
        if (e.kind === 'pt')
          ev.push({ k: 'pt', rev: e.rev, yes: E.isPointCard(c) && !isKey });
        else if (e.kind === 'void') {
          const gi = g.contract.giruda;
          const declHand = g.hands[g.declarer];
          const hitVoid = !E.isJoker(c) && c.suit !== gi &&
            !declHand.some(x => !E.isJoker(x) && x.suit === c.suit);
          ev.push({ k: 'void', yes: hitVoid, gi: !E.isJoker(c) && gi !== 'N' && c.suit === gi });
        } else if (e.kind === 'leadonly')
          ev.push({ k: 'lead', gi: !E.isJoker(c) && g.contract.giruda !== 'N' && c.suit === g.contract.giruda });
      }
      g.act(act);
      if (g.friend === seat) wasFriend = true;
      if (++guard > 900) break;
    }
    if (g.phase !== 'done') continue;
    rounds++;
    if (wasFriend && g.friend === seat) {
      friendRounds++;
      for (const e2 of ev) {
        if (e2.k === 'pt') { ptOpp[e2.rev]++; if (e2.yes) ptYes[e2.rev]++; }
        else if (e2.k === 'void') { voidOpp++; leads++; if (e2.yes) voidYes++; if (e2.gi) giLead++; }
        else if (e2.k === 'lead') { leads++; if (e2.gi) giLead++; }
      }
    }
    seat = (seat + 1) % E.NUM_PLAYERS;
  }

  const who = TIER === 'master' ? `${path.basename(MODEL)}` : `${TIER}(휴리스틱)`;
  console.log(`\n${who} · ${rounds}판 중 프렌드 판 ${friendRounds}`);
  console.log(`\n(1) 주공 기루다 리드에 점수카드 응답 [높을수록 관례적]`);
  for (const r of ['pre', 'post'])
    console.log(`    공개 ${r === 'pre' ? '전' : '후'}  ${pct(ptYes[r], ptOpp[r])} ± ${se(ptYes[r], ptOpp[r])}  [${ptYes[r]}/${ptOpp[r]}]`);
  console.log(`\n(2) 공개 후 프렌드 리드 — 주공 빈 무늬 리드 [높을수록 관례적]`);
  console.log(`    기회 ${voidOpp} · 실행 ${voidYes}  →  ${pct(voidYes, voidOpp)} ± ${se(voidYes, voidOpp)}`);
  console.log(`    (참고) 공개 후 전체 리드 ${leads}회 중 기루다 리드 ${giLead} (${pct(giLead, leads)})`);
})();
