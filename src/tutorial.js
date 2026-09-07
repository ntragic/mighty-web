/* ============================================================
 *  tutorial.js — 규칙 튜토리얼 슬라이드 (텍스트 전용)
 * ============================================================
 *  마이티를 한 번도 안 해 본 사람이 첫 판을 두기 전에 읽는 여덟 장이다.
 *  그리는 일은 ui.js가 한다 — 여기는 무엇을 말할지만 담는다. ui.js에 넣지 않은
 *  이유는 분량이다. 한·영 두 벌이라 3200줄짜리 파일을 더 키우면 읽기 어려워진다.
 *
 *  카드 표기는 엔진에 의존하지 않는 서술형이다: {s:'S', r:14}는 스페이드 A,
 *  'JK'는 조커. hi는 그 트릭을 가져가는 카드의 자리(0부터)로, 그림이 스스로
 *  말하게 한다 — 다섯 장을 늘어놓기만 하면 어느 것이 이겼는지 읽히지 않는다.
 *  ui.js가 그릴 때 엔진 카드로 옮긴다. 로드 순서에 얽히지 않게 하려는
 *  것이다 — 이 파일은 엔진보다 먼저 읽혀도 안전해야 한다.
 *
 *  용어는 docs/GLOSSARY.md가 확정본이다(기루다=Trump, 바닥패=Kitty,
 *  여당=Attackers, 야당=Defenders, 세팅=Claim).
 * ============================================================ */
(function () {
'use strict';

const KO = [
  {
    title: '마이티는 이런 게임입니다',
    body: [
      '다섯 명이 각자 열 장씩 받아 열 번을 겨룹니다. 한 번의 겨룸을 트릭이라고 합니다.',
      '트릭마다 가장 센 카드를 낸 사람이 그 트릭에 나온 다섯 장을 모두 가져갑니다.',
      '중요한 것은 가져간 카드의 수가 아니라, 그 안에 점수카드가 몇 장 들어 있느냐입니다.',
    ],
  },
  {
    title: '점수카드는 스무 장뿐입니다',
    body: [
      '각 무늬의 10, J, Q, K, A가 점수카드입니다. 네 무늬에 다섯 장씩, 모두 스무 장.',
      '나머지 카드는 아무리 많이 모아도 점수가 되지 않습니다.',
      '세기는 A가 가장 세고 2가 가장 약합니다.',
    ],
    cards: [{ s: 'S', r: 10 }, { s: 'S', r: 11 }, { s: 'S', r: 12 }, { s: 'S', r: 13 }, { s: 'S', r: 14 }],
    note: '이 다섯 장이 스페이드의 점수카드입니다',
  },
  {
    title: '트릭은 이렇게 굴러갑니다',
    body: [
      '먼저 내는 사람을 리드라고 합니다. 리드는 아무 카드나 낼 수 있습니다.',
      '나머지 넷은 리드와 같은 무늬가 손에 있으면 반드시 그 무늬를 내야 합니다.',
      '같은 무늬 중 가장 높은 카드를 낸 사람이 그 트릭을 가져갑니다.',
    ],
    cards: [{ s: 'H', r: 7 }, { s: 'H', r: 13 }, { s: 'H', r: 3 }, { s: 'H', r: 14 }, { s: 'H', r: 9 }],
    hi: [3],
    note: '하트로 리드한 트릭 — 하트 A를 낸 사람이 가져갑니다',
  },
  {
    title: '기루다는 무늬 하나를 특별하게 만듭니다',
    body: [
      '판마다 무늬 하나가 기루다(으뜸무늬)가 됩니다. 공약을 부른 사람이 정합니다.',
      '리드 무늬가 손에 없으면 기루다를 내서 그 트릭을 끊어 가져올 수 있습니다.',
      '기루다는 다른 무늬의 어떤 카드보다 셉니다. 기루다 2가 하트 A를 이깁니다.',
    ],
    cards: [{ s: 'H', r: 14 }, { s: 'S', r: 2 }],
    hi: [1],
    note: '기루다가 스페이드일 때 — 오른쪽이 이깁니다',
  },
  {
    title: '마이티와 조커',
    body: [
      '마이티는 판 전체에서 가장 센 카드 한 장입니다. 기루다가 스페이드면 다이아 A가, 그 밖에는 스페이드 A가 마이티입니다.',
      '조커는 두 번째로 셉니다. 조커로 리드하면 따라올 무늬를 지정할 수 있습니다.',
      '조커콜(클럽 3)로 리드하면 조커를 가진 사람은 조커를 내야 합니다. 조커를 억지로 끌어내는 수입니다.',
    ],
    cards: [{ s: 'S', r: 14 }, 'JK', { s: 'C', r: 3 }],
    note: '마이티 · 조커 · 조커콜',
  },
  {
    title: '공약 — 몇 점을 가져올지 약속합니다',
    body: [
      '패를 받으면 "기루다를 스페이드로 하고 점수카드 열네 장을 가져오겠다"처럼 부릅니다.',
      '더 높이 부르는 사람이 없으면 그 사람이 주공이 됩니다. 자신이 없으면 패스합니다.',
      '마이티리그 룰에서는 최소 열네 장부터 부를 수 있습니다.',
    ],
  },
  {
    title: '바닥패를 묻고, 프렌드를 부릅니다',
    body: [
      '주공이 되면 바닥에 깔린 세 장을 받고, 손에서 세 장을 골라 다시 묻습니다.',
      '그다음 프렌드를 지정합니다. 보통 자기가 갖고 있지 않은 가장 센 카드를 부릅니다.',
      '그 카드를 가진 사람이 프렌드입니다. 그 카드가 나오기 전까지는 아무도 누가 프렌드인지 모릅니다.',
    ],
  },
  {
    title: '이기는 조건',
    body: [
      '주공과 프렌드가 여당, 나머지 셋이 야당입니다.',
      '여당이 공약한 만큼 점수카드를 모으면 여당이 이깁니다. 한 장이라도 모자라면 야당이 이깁니다.',
      '스무 장을 전부 가져오면 런, 야당이 여당을 한 장도 못 가져가게 막으면 백런입니다.',
    ],
  },
];

const EN = [
  {
    title: 'What Mighty is',
    body: [
      'Five players each get ten cards and play ten rounds. One round is called a trick.',
      'Whoever plays the strongest card takes all five cards of that trick.',
      'What matters is not how many cards you take, but how many point cards are among them.',
    ],
  },
  {
    title: 'There are only twenty point cards',
    body: [
      'The 10, J, Q, K and A of each suit are point cards — five per suit, twenty in all.',
      'Every other card is worthless no matter how many you collect.',
      'A is the strongest rank and 2 the weakest.',
    ],
    cards: [{ s: 'S', r: 10 }, { s: 'S', r: 11 }, { s: 'S', r: 12 }, { s: 'S', r: 13 }, { s: 'S', r: 14 }],
    note: 'These five are the point cards of spades',
  },
  {
    title: 'How a trick works',
    body: [
      'The player who goes first leads, and may play any card.',
      'The other four must follow the led suit if they hold it.',
      'The highest card of the led suit takes the trick.',
    ],
    cards: [{ s: 'H', r: 7 }, { s: 'H', r: 13 }, { s: 'H', r: 3 }, { s: 'H', r: 14 }, { s: 'H', r: 9 }],
    hi: [3],
    note: 'Hearts were led — the ace of hearts takes it',
  },
  {
    title: 'Trump makes one suit special',
    body: [
      'Each round one suit becomes trump, chosen by whoever wins the bidding.',
      'If you are void in the led suit you may cut in with a trump and take the trick.',
      'Any trump beats any card of another suit — the two of trumps beats the ace of hearts.',
    ],
    cards: [{ s: 'H', r: 14 }, { s: 'S', r: 2 }],
    hi: [1],
    note: 'With spades as trump, the card on the right wins',
  },
  {
    title: 'The Mighty and the Joker',
    body: [
      'The Mighty is the single strongest card in the deck. It is the ace of diamonds when spades are trump, and the ace of spades otherwise.',
      'The Joker is second strongest. Leading it lets you name the suit everyone must follow.',
      'Leading the Joker Call (the three of clubs) forces whoever holds the Joker to play it.',
    ],
    cards: [{ s: 'S', r: 14 }, 'JK', { s: 'C', r: 3 }],
    note: 'Mighty, Joker, Joker Call',
  },
  {
    title: 'Bidding — promising a score',
    body: [
      'After looking at your hand you bid something like "spades as trump, and I will take fourteen point cards".',
      'If nobody bids higher you become the declarer. Pass if your hand is not worth it.',
      'Under Mighty League rules the lowest bid is fourteen.',
    ],
  },
  {
    title: 'Bury the kitty, call a friend',
    body: [
      'As declarer you pick up the three kitty cards, then bury any three from your hand.',
      'Then you call a friend — usually the strongest card you do not hold yourself.',
      'Whoever holds that card is your friend, and nobody knows who until the card appears.',
    ],
  },
  {
    title: 'How the round is won',
    body: [
      'The declarer and the friend are the attackers; the other three are the defenders.',
      'Attackers win by collecting at least as many point cards as they bid. One short and the defenders win.',
      'Taking all twenty is a Run; holding the attackers to none is a Back Run.',
    ],
  },
];

/* ---------------- 용어 사전 ----------------
 * 규칙을 한 번 읽었다고 용어가 붙지 않는다. 판이 도는 중에 '기루다가 뭐였지'가
 * 나오면 그 자리에서 답이 나와야 한다.
 *
 * k  화면에 뜨는 표제어
 * m  본문에서 이 뜻으로 읽어야 할 낱말들(표제어 자체는 자동 포함). 영어는 굴절형이
 *    있어 별도로 적는다. 한 문단에 같은 용어를 여러 번 표시하지는 않는다.
 * d  한 문장 뜻풀이. 다른 용어를 끌어들이지 않고 그 자리에서 닫히게 쓴다.
 *
 * 표제어는 docs/GLOSSARY.md가 확정본이다.
 */
const TERMS_KO = [
  { k: '기루다', d: '판마다 정해지는 으뜸무늬. 다른 무늬의 어떤 카드보다 세다.' },
  { k: '노기루다', d: '기루다 없이 두는 공약. 마이티와 조커만 특별하다.' },
  { k: '마이티', d: '판 전체에서 가장 센 카드 한 장. 기루다가 스페이드면 다이아 A, 아니면 스페이드 A.' },
  { k: '조커', d: '두 번째로 센 카드. 리드로 내면 따라올 무늬를 지정할 수 있다.' },
  { k: '조커콜', d: '클럽 3으로 리드해 조커를 가진 사람에게 조커를 강제로 내게 하는 수.' },
  { k: '공약', m: ['공약'], d: '점수카드를 몇 장 가져오겠다는 약속. 가장 높이 부른 사람이 주공이 된다.' },
  { k: '주공', d: '공약을 따내 판을 이끄는 사람. 바닥패를 받고 프렌드를 부른다.' },
  { k: '프렌드', d: '주공이 지목한 카드를 가진 사람. 그 카드가 나올 때까지 누구인지 모른다.' },
  { k: '초구 프렌드', d: '첫 트릭을 가져가는 사람이 프렌드가 되는 지정 방식.' },
  { k: '여당', d: '주공과 프렌드 편. 공약한 만큼 점수카드를 모으면 이긴다.' },
  { k: '야당', d: '나머지 세 사람. 여당이 공약에 한 장이라도 못 미치게 막으면 이긴다.' },
  { k: '트릭', d: '다섯 명이 한 장씩 내는 한 번의 겨룸. 한 판에 열 번 있다.' },
  { k: '리드', d: '트릭에서 먼저 내는 자리. 아무 카드나 낼 수 있고, 나머지는 그 무늬를 따라야 한다.' },
  { k: '점수카드', d: '각 무늬의 10 J Q K A. 모두 스무 장이고, 이것만 점수가 된다.' },
  { k: '바닥패', d: '아무에게도 안 돌린 세 장. 주공이 받아 손에서 세 장을 다시 묻는다.' },
  { k: '딜미스', d: '패가 너무 약할 때 판을 무르고 다시 돌리자고 선언하는 것.' },
  { k: '런', d: '여당이 점수카드 스무 장을 전부 가져간 것.' },
  { k: '백런', d: '야당이 여당을 한 장도 못 가져가게 막은 것.' },
  { k: '세팅', d: '남은 트릭을 전부 이긴다고 선언해 판을 일찍 끝내는 것.' },
];
const TERMS_EN = [
  { k: 'Trump', m: ['trump', 'trumps'], d: 'The suit chosen for this round. Any trump beats any card of another suit.' },
  { k: 'No Trump', m: ['no trump'], d: 'A contract played without a trump suit. Only the Mighty and the Joker stay special.' },
  { k: 'Mighty', d: 'The single strongest card. The ace of diamonds when spades are trump, the ace of spades otherwise.' },
  { k: 'Joker', d: 'The second strongest card. Leading it lets you name the suit others must follow.' },
  { k: 'Joker Call', d: 'Leading the three of clubs to force whoever holds the Joker to play it.' },
  { k: 'Bid', m: ['bid', 'bids'], d: 'A promise of how many point cards your side will take. The highest bidder becomes declarer.' },
  { k: 'Declarer', m: ['declarer'], d: 'The player who won the bidding. Takes the kitty and calls a friend.' },
  { k: 'Friend', m: ['friend'], d: 'Whoever holds the card the declarer called. Nobody knows who until that card appears.' },
  { k: 'Attackers', m: ['attackers'], d: 'The declarer and the friend. They win by meeting the bid.' },
  { k: 'Defenders', m: ['defenders'], d: 'The other three players. They win by holding the attackers one card short.' },
  { k: 'Trick', m: ['trick', 'tricks'], d: 'One round where each of the five plays a card. Ten per deal.' },
  { k: 'Point card', m: ['point card', 'point cards'], d: 'The 10, J, Q, K and A of each suit — twenty in all, and the only cards that score.' },
  { k: 'Kitty', m: ['kitty'], d: 'The three cards dealt to nobody. The declarer takes them and buries three.' },
  { k: 'Misdeal', m: ['misdeal'], d: 'Declaring a hand too weak to play, which throws the deal out and redeals.' },
  { k: 'Run', d: 'Taking all twenty point cards.' },
  { k: 'Back Run', d: 'Holding the attackers to no point cards at all.' },
  { k: 'Claim', d: 'Declaring you will win every remaining trick, ending the round early.' },
];

globalThis.MightyTutorial = {
  slides(lang) { return (lang === 'en' ? EN : KO).map(s => ({ ...s })); },
  /** 표제어는 긴 것부터 — '노기루다'가 '기루다'에 먹히면 안 된다. */
  terms(lang) {
    return (lang === 'en' ? TERMS_EN : TERMS_KO)
      .map(x => ({ ...x, m: [x.k, ...(x.m || [])] }))
      .sort((a, b) => b.k.length - a.k.length);
  },
};
if (typeof module !== 'undefined' && module.exports) module.exports = globalThis.MightyTutorial;
})();
