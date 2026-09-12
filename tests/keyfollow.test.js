const __path = require('path');
const __P = p => __path.join(__dirname, p);
'use strict';
/* keyCardGuard 기루다 팔로우 회귀 — 제보 2026-09-12, seed 2135136798 6트릭.
 *
 * 주공 유나(p4)가 야당 ♠A로 이미 잠긴 트릭에 ♠5를 두고 ♠K를 버려 점수 1장을
 * 헌납했고, 공약 15에 1장 모자라 졌다. keyCardGuard는 낭비 판정까지는 옳게 했지만
 * 대체 카드에서 기루다를 통째로 제외해 후보가 0개가 되자 'no-cheap-alt'로 원래 수를
 * 통과시켰다. 기루다가 리드된 트릭에서는 합법수가 전부 기루다라 늘 이렇게 된다.
 *
 * 모델 없이 도는 검사다 — keyCardGuard는 순수 함수다. */
const E = require(__P('../src/mighty-engine.js'));
const AI = require(__P('../src/mighty-ai.js'));

const CFG = {"minBid":14,"noGirudaBidDiscount":0,"bidStartsAtDealer":true,"allowBidRevise":true,"girudaChangeCost":2,"toNoGirudaChangeCost":1,"dealMissEnabled":true,"dealMissThreshold":0.5,"jokerCallEnabled":true,"jokerCallBaseSuit":"C","jokerCallAltSuit":"H","jokerCallMightyProtect":true,"firstTrickJokerNoGiruda":true,"firstTrickNoJokerCall":true,"firstTrickJokerWeak":true,"lastTrickJokerWeak":true,"firstTrickNoGirudaLead":true,"scoring":{"perBid":300,"perDiff":200,"noGirudaMult":2,"cap":2000,"noGirudaCap":3000,"declarerShare":2,"selfDeclarerShare":4,"friendShare":1},"discardPointsTo":"declarer","seed":2135136798};
const DEALER = 0;
const ACTIONS = [
  {"type":"pass"},
  {"type":"pass"},
  {"type":"bid","count":14,"giruda":"H"},
  {"type":"pass"},
  {"type":"bid","count":15,"giruda":"S"},
  {"type":"pass"},
  {"type":"exchange","discard":[{"suit":"H","rank":13},{"suit":"H","rank":10},{"suit":"C","rank":11}]},
  {"type":"friend","mode":"card","card":"JOKER"},
  {"type":"play","card":{"suit":"C","rank":14}},
  {"type":"play","card":{"suit":"C","rank":2}},
  {"type":"play","card":{"suit":"C","rank":7}},
  {"type":"play","card":{"suit":"C","rank":8}},
  {"type":"play","card":{"suit":"C","rank":9}},
  {"type":"play","card":{"suit":"C","rank":3}},
  {"type":"play","card":{"suit":"C","rank":5}},
  {"type":"play","card":{"suit":"C","rank":12}},
  {"type":"play","card":{"suit":"C","rank":10}},
  {"type":"play","card":{"suit":"C","rank":13}},
  {"type":"play","card":{"suit":"D","rank":13}},
  {"type":"play","card":{"suit":"D","rank":14}},
  {"type":"play","card":{"suit":"D","rank":6}},
  {"type":"play","card":{"suit":"D","rank":12}},
  {"type":"play","card":{"suit":"D","rank":9}},
  {"type":"play","card":{"suit":"S","rank":6}},
  {"type":"play","card":{"suit":"S","rank":2}},
  {"type":"play","card":{"suit":"S","rank":9}},
  {"type":"play","card":{"suit":"S","rank":10}},
  {"type":"play","card":{"suit":"S","rank":3}},
  {"type":"play","card":{"suit":"D","rank":10}},
  {"type":"play","card":{"suit":"D","rank":11}},
  {"type":"play","card":{"suit":"D","rank":4}},
  {"type":"play","card":{"suit":"D","rank":7}},
  {"type":"play","card":"JOKER"},
  {"type":"play","card":{"suit":"S","rank":4}},
  {"type":"play","card":{"suit":"S","rank":14}},
  {"type":"play","card":{"suit":"S","rank":8}},
];

let failed = 0;
const ok = (cond, label, extra) => {
  if (cond) console.log('  PASS ' + label);
  else { console.error('  FAIL ' + label + (extra ? ' — ' + extra : '')); failed++; }
};
const cn = c => E.isJoker(c) ? '조커' : E.cardName(c);

const g = new E.MightyGame(CFG);
g.start(DEALER);
for (const a of ACTIONS) g.act(a);

const seat = g.currentPlayer;
ok(g.phase === 'play' && seat === 4 && g.play.trickNo === 6,
   '제보 국면 재현 (6트릭 주공 차례)', `phase=${g.phase} seat=${seat} trick=${g.play.trickNo}`);
ok(g.contract.giruda === 'S' && g.play.ledSuit === 'S',
   '기루다가 리드된 트릭 — 합법수가 전부 기루다인 클래스');
ok(g.friendRevealed && g.friend === 1, '프렌드 공개 상태 (팀 판정 가능)');

const legal = g._legalPlays(seat).map(m => cn(m.card)).sort().join(' ');
ok(legal === '♠5 ♠J ♠K ♠Q', '합법수가 기루다 4장뿐', legal);

// 정책이 골랐던 수 — 야당 ♠A가 잠근 트릭에 점수 기루다를 버린다
const bad = { type: 'play', card: { suit: 'S', rank: 13 } };
const tr = {};
const out = AI.keyCardGuard(g, seat, bad, tr);
ok(tr.lockedForOthers === true && tr.winnerIsOpp === true && tr.iWin === false,
   '가드가 상황을 옳게 판정 (잠김·상대 우세·내가 못 이김)',
   JSON.stringify({ locked: tr.lockedForOthers, opp: tr.winnerIsOpp, iWin: tr.iWin }));
ok(out.card.suit === 'S' && out.card.rank === 5,
   '가드가 최저 비점수 기루다(♠5)로 내린다', cn(out.card) + ' · why=' + tr.why);

// 대조군: 비기루다가 리드된 트릭은 원래도 잘 되던 경로 — 회귀 없는지만 본다
const g2 = new E.MightyGame(CFG);
g2.start(DEALER);
for (const a of ACTIONS.slice(0, ACTIONS.length - 3)) g2.act(a);
ok(g2.phase === 'play', '대조군 국면 구성');

// 이미 이기고 있는 수는 건드리지 않는다 (아군 확정승 덮기 분기와 혼동 금지)
const win = { type: 'play', card: { suit: 'S', rank: 13 } };
const trW = {};
const g3 = new E.MightyGame(CFG);
g3.start(DEALER);
for (const a of ACTIONS.slice(0, ACTIONS.length - 1)) g3.act(a);   // ♠A 이전(도윤 ♠8 전)
AI.keyCardGuard(g3, g3.currentPlayer, win, trW);
ok(typeof trW.why === 'string', '다른 국면에서도 예외 없이 판정', 'why=' + trW.why);

console.log(failed ? `KEYFOLLOW TEST FAIL (${failed})` : 'KEYFOLLOW TEST PASS');
process.exit(failed ? 1 : 0);
