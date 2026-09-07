#!/usr/bin/env node
/**
 * find-practice-seed.js — 초보자 연습판에 쓸 고정 시드를 찾는다.
 *
 *   node tools/find-practice-seed.js [탐색개수]
 *
 * 연습판이 가르치려는 것은 한 판의 전 국면이다. 그런데 사람이 주공이 못 되면
 * 바닥패 묻기와 프렌드 지정을 아예 못 보고 지나간다. 무작위 시드로는 그게
 * 다섯 번에 한 번쯤밖에 안 나온다. 그래서 다음 조건을 모두 만족하는 시드를
 * 찾아 하드코딩한다:
 *
 *   - 사람 자리(0번)가 규칙기반 권장 공약을 부르면 봇들이 넘지 않아 주공이 된다
 *   - 사람 손에 마이티나 조커가 있다 (튜토리얼에서 배운 카드를 실제로 쥐어 본다)
 *   - 권장 공약이 14~16 (최소 공약 언저리 — 첫 판부터 무리한 공약을 가르치지 않는다)
 *   - 사람이 부를 프렌드가 있다 (마이티·조커를 다 쥐고 있으면 노프렌드로 빠진다)
 *
 * 룰은 마이티리그 기본값으로 고정한다. 사용자가 룰을 바꿔도 연습판은 이 설정으로
 * 돌아야 시드가 뜻을 갖는다.
 */
const E = require('../src/mighty-engine.js');

const CFG = {
  minBid: 14, noGirudaBidDiscount: 0, bidStartsAtDealer: true,
  allowBidRevise: true, girudaChangeCost: 2, toNoGirudaChangeCost: 1,
  dealMissEnabled: false, dealMissThreshold: 0.5,   // 연습판은 딜미스를 끈다
  jokerCallEnabled: true, jokerCallBaseSuit: 'C', jokerCallAltSuit: 'H',
  jokerCallMightyProtect: true, firstTrickJokerNoGiruda: true, firstTrickNoJokerCall: true,
  firstTrickJokerWeak: true, lastTrickJokerWeak: true, firstTrickNoGirudaLead: true,
  discardPointsTo: 'declarer',
  scoring: { perBid: 300, perDiff: 200, noGirudaMult: 2, cap: 2000, noGirudaCap: 3000,
             declarerShare: 2, selfDeclarerShare: 4, friendShare: 1 },
};
const DEALER = 4;               // 사람(0번)이 첫 비딩 차례가 되도록 — 딜러 다음부터 돈다
const HUMAN = 0;

const advisor = () => new E.HeuristicAgent(E.PERSONAS.balanced, E.makeRng(0x4D2), { tier: 'advanced' });

function trial(seed) {
  const g = new E.MightyGame({ ...CFG, seed });
  g.start(DEALER);
  if (g.phase !== 'bidding') return null;            // 딜미스 재분배 등

  const hand = g.hands[HUMAN].slice();
  const ag = advisor();
  const hasJ = hand.some(E.isJoker);

  // 사람은 권장 공약을 그대로 부르고, 나머지는 평소대로 둔다
  const bots = [null, advisor(), advisor(), advisor(), advisor()];
  let humanBid = null, guard = 0;
  while (g.phase === 'bidding' && guard++ < 60) {
    const seat = g.currentPlayer;
    if (seat === HUMAN) {
      const a = ag.actBidding(g);
      if (a.type === 'bid' && humanBid === null) humanBid = { ...a };
      g.act(a);
    } else g.act(bots[seat].act(g));
  }
  if (g.phase === 'redeal' || g.phase === 'dealMissWindow') return null;
  if (g.declarer !== HUMAN) return null;
  if (!humanBid || humanBid.count < 14 || humanBid.count > 16) return null;
  // 마이티는 기루다가 정해져야 정해진다 — 기루다가 스페이드면 ♦A, 아니면 ♠A.
  const mighty = humanBid.giruda === 'S' ? { suit: 'D', rank: 14 } : { suit: 'S', rank: 14 };
  const hasM = hand.some(c => !E.isJoker(c) && E.sameCard(c, mighty));
  if (!hasM && !hasJ) return null;                   // 배운 카드를 하나는 쥐어 준다
  if (hasM && hasJ) return null;                     // 둘 다면 프렌드를 부를 이유가 약하다

  // 바닥패까지 받은 뒤에도 부를 프렌드가 남아 있는지 본다
  if (g.phase === 'floor') g.act(advisor().actExchange(g));
  if (g.phase !== 'friend') return null;
  const fr = advisor().actFriend(g);
  if (fr.mode === 'none') return null;               // 노프렌드면 프렌드 국면을 못 배운다

  const est = ag.evalHand(hand, humanBid.giruda, g).est;
  return { seed, bid: humanBid, est, hasM, hasJ, friend: fr.mode,
           hand: hand.map(c => E.isJoker(c) ? 'JOKER' : E.cardName(c)).join(' ') };
}

const N = Number(process.argv[2] || 40000);
const found = [];
for (let seed = 1; seed <= N && found.length < 12; seed++) {
  let r = null;
  try { r = trial(seed); } catch (e) { r = null; }
  if (r) found.push(r);
}
if (!found.length) { console.error('조건에 맞는 시드를 못 찾았다'); process.exit(1); }
// 조커를 쥔 손을 앞에 둔다 — 조커 리드·조커콜을 실제로 겪어 볼 수 있다
found.sort((a, b) => (b.hasJ ? 1 : 0) - (a.hasJ ? 1 : 0) || b.est - a.est);
for (const r of found) {
  console.log(`seed ${r.seed} · 공약 ${r.bid.count}${r.bid.giruda} · est ${r.est.toFixed(1)}` +
              ` · 마이티 ${r.hasM ? 'O' : 'X'} 조커 ${r.hasJ ? 'O' : 'X'} · 프렌드 ${r.friend}`);
  console.log(`         손패: ${r.hand}`);
}
console.log(`\n권장: seed ${found[0].seed}, dealer ${DEALER}`);
