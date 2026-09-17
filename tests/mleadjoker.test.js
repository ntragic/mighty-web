const __path = require('path');
const __P = p => __path.join(__dirname, p);
'use strict';
/* 마이티 무늬 리드 금지의 '약한 조커' 예외 — 제보 2026-09-17, 1판 seed 1438626284 1트릭.
 *
 * 기루다 ♣라 첫 트릭 클럽 리드가 룰로 막히고, 마이티 ♠A라 스페이드 리드가 가드로 막혀
 * 조커(♥)만 남았다. 첫 트릭이라 약해진 조커가 유나 ♥A에 졌다(정책은 ♠Q 58.6%).
 * 금지 목록 계산은 순수 함수라 모델 없이 돈다. */
const E = require(__P('../src/mighty-engine.js'));
const AI = require(__P('../src/mighty-ai.js'));
const A = require(__P('../src/mighty-analysis.js'));

const cfg = {
  minBid: 14, noGirudaBidDiscount: 0, bidStartsAtDealer: true, allowBidRevise: true,
  girudaChangeCost: 2, toNoGirudaChangeCost: 1, dealMissEnabled: true, dealMissThreshold: 0.5,
  jokerCallEnabled: true, jokerCallBaseSuit: 'C', jokerCallAltSuit: 'H', jokerCallMightyProtect: true,
  firstTrickJokerNoGiruda: true, firstTrickNoJokerCall: true, firstTrickJokerWeak: true,
  lastTrickJokerWeak: true, firstTrickNoGirudaLead: true,
  scoring: { perBid: 300, perDiff: 200, noGirudaMult: 2, cap: 2000, noGirudaCap: 3000,
             declarerShare: 2, selfDeclarerShare: 4, friendShare: 1 },
  discardPointsTo: 'declarer', seed: 1438626284,
};
const P = (p, s, r, extra) => ({ p, ph: 'play', a: { type: 'play', card: { suit: s, rank: r }, ...(extra || {}) } });
const actions = [
  { p: 1, ph: 'bidding', a: { type: 'bid', count: 14, giruda: 'H' } },
  { p: 2, ph: 'bidding', a: { type: 'pass' } },
  { p: 3, ph: 'bidding', a: { type: 'bid', count: 15, giruda: 'C' } },
  { p: 4, ph: 'bidding', a: { type: 'pass' } },
  { p: 0, ph: 'bidding', a: { type: 'pass' } },
  { p: 1, ph: 'bidding', a: { type: 'pass' } },
  { p: 3, ph: 'floor', a: { type: 'exchange', discard: [{ suit: 'H', rank: 11 }, { suit: 'D', rank: 8 }, { suit: 'S', rank: 7 }] } },
  { p: 3, ph: 'friend', a: { type: 'friend', mode: 'card', card: { suit: 'S', rank: 14 } } },
  { p: 3, ph: 'play', a: { type: 'play', card: 'JOKER', jokerSuit: 'H' } },
  P(4,'H',14), P(0,'H',2), P(1,'H',12), P(2,'H',10),
  P(4,'H',4), P(0,'H',13), P(1,'H',7), P(2,'C',5), P(3,'S',4),
  P(2,'S',2), P(3,'S',12), P(4,'S',14), P(0,'S',5), P(1,'S',9),
  P(4,'D',10), P(0,'D',2), P(1,'D',14), P(2,'D',9), P(3,'C',2),
  P(3,'C',9), P(4,'C',10), P(0,'C',8), P(1,'C',3), P(2,'S',3),
  P(4,'D',11), P(0,'D',12), P(1,'D',4), P(2,'D',13), P(3,'C',7),
  P(3,'C',6), P(4,'C',13), P(0,'C',14), P(1,'S',13), P(2,'S',10),
  P(0,'D',5), P(1,'H',6), P(2,'D',7), P(3,'C',11), P(4,'D',6),
  P(3,'C',4), P(4,'H',5), P(0,'S',6), P(1,'H',3), P(2,'D',3),
  P(3,'C',12), P(4,'H',9), P(0,'S',11), P(1,'H',8), P(2,'S',8),
];
const rec = { seed: 1438626284, dealer: 1, cfg, actions };

let failed = 0;
const ok = (cond, label, extra) => {
  if (cond) console.log('  PASS ' + label);
  else { console.error('  FAIL ' + label + (extra ? ' — ' + extra : '')); failed++; }
};

// 픽스처 무결성 — 끝까지 재생하면 기록대로 여당 15로 끝나야 한다
const full = new E.MightyGame(cfg); full.start(rec.dealer);
for (const x of actions) full.act(x.a);
ok(full.result.yeodangPoints === 15 && full.result.win, '기보 재생이 기록과 일치 (여당 15 승)');

const idx = actions.findIndex(x => x.ph === 'play');
const g = A.rebuild(rec, idx);
const seat = g.currentPlayer;
ok(seat === 3 && g.play.trickNo === 1 && g.play.table.length === 0, '제보 국면 재현 (1트릭 주공 도윤 리드)');
ok(g.contract.giruda === 'C' && E.sameCard(g.mightyCard, { suit: 'S', rank: 14 }), '기루다 ♣ · 마이티 ♠A');

const legal = g._legalPlays(seat);
ok(legal.every(m => E.isJoker(m.card) || m.card.suit === 'S'), '클럽은 첫 트릭 리드 금지 룰로 합법수에서 빠진다',
   legal.map(m => E.isJoker(m.card) ? 'JOKER' : E.cardName(m.card)).join(' '));
ok(AI.jokerWeakThisTrick(g) === true, '첫 트릭이라 조커가 약해진다');

const off = AI.mightyLeadBans(g, seat, { mightyLeadJokerException: false });
ok(off instanceof Set && off.size === 2, '예외 없으면 ♠Q·♠4가 금지돼 조커만 남는다', 'size=' + (off && off.size));

const on = AI.mightyLeadBans(g, seat, { mightyLeadJokerException: true });
ok(on === null, '예외가 켜지면 금지를 푼다 — 남은 수가 약한 조커뿐이므로');

const def = AI.mightyLeadBans(g, seat, {});
ok(def === null, '기본값으로 예외가 켜져 있다 (인증 +1,506.9±418.5 후 채택)');

const guardOff = AI.mightyLeadBans(g, seat, { mightyLeadGuard: false });
ok(guardOff === null, '가드 자체를 끄면 당연히 금지가 없다');

// 대조: 2트릭부터는 조커가 약하지 않다 — 예외가 번지면 안 된다
const g2 = A.rebuild(rec, idx + 5);
ok(g2.play.trickNo === 2 && AI.jokerWeakThisTrick(g2) === false, '2트릭에서는 조커가 약하지 않다');

console.log(failed ? `MLEADJOKER TEST FAIL (${failed})` : 'MLEADJOKER TEST PASS');
process.exit(failed ? 1 : 0);
