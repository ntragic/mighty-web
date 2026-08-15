/**
 * ============================================================
 *  Mighty Engine (마이티 게임 엔진) — v0.1
 * ============================================================
 *  - 순수 로직 모듈 (UI 독립, 브라우저/Node 겸용)
 *  - 5인 마이티: 딜링 → 비딩 → 바닥패 교환/공약 수정 → 프렌드 지정
 *    → 10트릭 플레이 → 점수/상금 정산
 *  - 스코어링: "마이티리그" 엑셀 수식 이식
 *      점수 V = ((목표-13)*300*(승±1) + (승 ? (획-목+1)*200 : (획-목)*200)) * (노기루다?2:1)
 *      상금 W = clamp(V, ±2000) / 노기루다 ±3000, 런(20점)은 캡 고정
 *      배분   = 주공 ×2 (셀프 ×4), 프렌드 ×1, 야당 각 −1 (제로섬)
 *
 *  사용 흐름:
 *    const g = new MightyGame({ seed: 42 });
 *    g.start();                          // 딜링 → phase 'bidding'
 *    g.legalActions()                    // 현재 차례 플레이어의 합법 액션 목록
 *    g.act({type:'bid', count:14, giruda:'S'}) ...
 *    ... phase가 'done'이 되면 g.result 에 정산 결과
 * ============================================================
 */

'use strict';

// ---------------------------------------------------------------
// 상수
// ---------------------------------------------------------------
const SUITS = ['S', 'D', 'H', 'C'];            // 스페이드/다이아/하트/클로버
const SUIT_KO = { S: '스', D: '다', H: '하', C: '크', N: '노' };
const RANKS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]; // 11=J 12=Q 13=K 14=A
const JOKER = 'JOKER';
const NUM_PLAYERS = 5;
const HAND_SIZE = 10;
const FLOOR_SIZE = 3;
const TOTAL_POINT_CARDS = 20;

// ---------------------------------------------------------------
// 기본 설정 (엑셀 리그 룰 + 통상 룰 기본값, 전부 오버라이드 가능)
// ---------------------------------------------------------------
const DEFAULT_CONFIG = {
  // --- 비딩 ---
  minBid: 14,                 // 최소 공약 (리그 데이터 기준 14; 통상 13)
  bidStartsAtDealer: false,   // true면 딜러부터 비딩 (기본 false — 구버전 리플레이 재현 보존)
  maxBid: 20,
  noGirudaBidDiscount: 0,     // 노기루다 최소공약 차감 (예: 1이면 13에 노기루다 가능)
  allowBidRevise: true,       // 바닥패 후 공약 수정 허용
  girudaChangeCost: 2,        // 바닥패 후 무늬 변경 시 공약 +2
  toNoGirudaChangeCost: 1,    // 바닥패 후 노기루다 전환 시 공약 +1
  redealOnAllPass: true,      // 전원 패스 시 재딜

  // --- 딜미스 (선택제) ---
  dealMissEnabled: true,
  dealMissThreshold: 0.5,     // 점수합(J·Q·K·A=1, 10=0.5, 조커=-1) 이하 → 선언 '가능'
  declarerCanDealMiss: false, // 공약을 따낸 주공은 딜미스 선언 불가 (불리한 판 회피 방지)

  // --- 조커/마이티 ---
  jokerCallEnabled: true,
  jokerCallMightyProtect: true,   // 조커콜 시 마이티로 조커 보호 허용 (표준 룰)
  jokerCallBaseSuit: 'C',         // 조커콜 기본 카드 무늬 (기본 클럽3)
  jokerCallAltSuit: 'H',          // 기루다와 겹칠 때 대체 무늬 (기본 하트3)
  firstTrickNoJokerCall: true,  // 초구 조커콜 금지
  firstTrickJokerWeak: true,    // 초구 조커 최약
  lastTrickJokerWeak: true,     // 막트릭 조커 최약
  firstTrickNoGirudaLead: true, // 초구 주공 기루다 선출 금지
  firstTrickJokerNoGiruda: true, // 초구 조커 선으로 기루다를 '부르는' 것도 금지 (위 룰 우회 방지)

  // --- 버린 카드(바닥패 3장) 점수 귀속: 'defenders' | 'declarer' | 'lastTrickWinner'
  discardPointsTo: 'declarer',   // 묻은 점수카드는 여당 귀속 (고정 룰)

  // --- 스코어링 (엑셀 수식 파라미터) ---
  scoring: {
    baseTricks: 13,           // (목표-13) 의 13
    perBid: 300,              // 공약 초과분 단가
    perDiff: 200,             // 획득-목표 차 단가
    winBonus: 1,              // 승리 시 (차+1) 의 +1
    noGirudaMult: 2,
    cap: 2000,
    noGirudaCap: 3000,
    runScore: 20,             // 런 판정 점수(전 점수카드 획득)
    declarerShare: 2,
    selfDeclarerShare: 4,
    friendShare: 1,
  },

  seed: null,                 // 재현 가능 시뮬레이션용 시드 (null이면 Math.random)
};

// ---------------------------------------------------------------
// 유틸: 시드 RNG (mulberry32)
// ---------------------------------------------------------------
function makeRng(seed) {
  if (seed === null || seed === undefined) return Math.random;
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------
// 카드 유틸
// ---------------------------------------------------------------
function cardId(c) { return c === JOKER ? JOKER : c.suit + c.rank; }
function isJoker(c) { return c === JOKER; }
function isPointCard(c) { return !isJoker(c) && c.rank >= 10; }
function rankName(r) { return { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' }[r] || String(r); }
function cardName(c) {
  if (isJoker(c)) return '조커';
  const s = { S: '♠', D: '♦', H: '♥', C: '♣' }[c.suit];
  return s + rankName(c.rank);
}
function sameCard(a, b) {
  if (isJoker(a) || isJoker(b)) return a === b;
  return a.suit === b.suit && a.rank === b.rank;
}
/** 딜미스 점수합: J,Q,K,A=1 · 10=0.5 · 조커=-1 */
function dealMissValue(hand) {
  let v = 0;
  for (const c of hand) {
    if (isJoker(c)) v -= 1;
    else if (c.rank >= 11) v += 1;
    else if (c.rank === 10) v += 0.5;
  }
  return v;
}

function buildDeck() {
  const deck = [];
  for (const s of SUITS) for (const r of RANKS) deck.push({ suit: s, rank: r });
  deck.push(JOKER);
  return deck; // 53장
}

// ---------------------------------------------------------------
// 스코어링 (엑셀 수식 이식) — 순수 함수
// ---------------------------------------------------------------
/**
 * @param bid 목표 (Q)
 * @param won 여당 획득 점수 (R)
 * @param noGiruda 노기루다 여부 (T)
 * @param sc scoring config
 * @returns { win, score(V), prize(W) }
 */
function computeRoundScore(bid, won, noGiruda, sc) {
  const win = won >= bid;
  const base = (bid - sc.baseTricks) * sc.perBid * (win ? 1 : -1);
  const diff = win ? (won - bid + sc.winBonus) * sc.perDiff : (won - bid) * sc.perDiff;
  const score = (base + diff) * (noGiruda ? sc.noGirudaMult : 1);
  const cap = noGiruda ? sc.noGirudaCap : sc.cap;
  let prize;
  if (won === sc.runScore) prize = cap;                    // 런: 캡 고정 지급
  else prize = Math.max(-cap, Math.min(cap, score));       // 캡 클램프
  return { win, score, prize };
}

/**
 * 상금 배분 (엑셀 '개인별 상금' 시트 수식 이식)
 * 주공 ×declarerShare (셀프 ×selfDeclarerShare), 프렌드 ×friendShare, 야당 각 −1
 */
function distributePrize(prize, declarer, friend, numPlayers, sc) {
  const out = new Array(numPlayers).fill(0);
  const isSelf = friend === null || friend === declarer;
  for (let p = 0; p < numPlayers; p++) {
    if (p === declarer) out[p] = prize * (isSelf ? sc.selfDeclarerShare : sc.declarerShare);
    else if (!isSelf && p === friend) out[p] = prize * sc.friendShare;
    else out[p] = -prize;
  }
  return out;
}

// ---------------------------------------------------------------
// 게임 본체
// ---------------------------------------------------------------
class MightyGame {
  constructor(config = {}) {
    this.config = deepMerge(structuredCloneSafe(DEFAULT_CONFIG), config);
    this.rng = makeRng(this.config.seed);
    this.phase = 'idle'; // idle → bidding → floor → friend → play → done | redeal
    this.log = [];
  }

  // ---------- 시작/딜링 ----------
  start(dealer = 0) {
    const deck = buildDeck();
    // Fisher–Yates
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    this.dealer = dealer;
    this.hands = [];
    for (let p = 0; p < NUM_PLAYERS; p++) {
      this.hands.push(deck.slice(p * HAND_SIZE, (p + 1) * HAND_SIZE));
    }
    this.floor = deck.slice(NUM_PLAYERS * HAND_SIZE); // 3장

    // 딜미스는 자동이 아닌 '선언 가능' 자격 (비딩 중 또는 프렌드 확정 후 창구에서 선택)
    // 비딩 초기화 (딜러 왼쪽부터)
    this.phase = 'bidding';
    this.bidding = {
      turn: (this.config.bidStartsAtDealer ? dealer : dealer + 1) % NUM_PLAYERS,
      active: new Array(NUM_PLAYERS).fill(true),
      best: null, // {player, count, giruda}
    };
    return this;
  }

  /** 현재 손패 기준 딜미스 선언 자격 */
  dealMissEligible(p) {
    if (!this.config.dealMissEnabled) return false;
    return dealMissValue(this.hands[p]) <= this.config.dealMissThreshold;
  }

  // ---------- 공통 API ----------
  get currentPlayer() {
    switch (this.phase) {
      case 'bidding': return this.bidding.turn;
      case 'floor':
      case 'friend': return this.declarer;
      case 'dealMissWindow': return this.dmQueue[this.dmIdx];
      case 'play': return this.play.turn;
      default: return null;
    }
  }

  /** 현재 차례 플레이어의 합법 액션 목록 */
  legalActions() {
    switch (this.phase) {
      case 'bidding': return this._legalBids();
      case 'floor': return [{ type: 'exchange', note: 'discard 3 cards (+optional revise)' }];
      case 'friend': return [{ type: 'friend', note: 'card | first | none' }];
      case 'dealMissWindow': return [{ type: 'dealMiss' }, { type: 'proceed' }];
      case 'play': return this._legalPlays(this.play.turn).map(m => ({ type: 'play', ...m }));
      default: return [];
    }
  }

  /** 액션 실행 */
  act(action) {
    switch (this.phase) {
      case 'bidding': return this._actBid(action);
      case 'floor': return this._actExchange(action);
      case 'friend': return this._actFriend(action);
      case 'dealMissWindow': return this._actDealMissWindow(action);
      case 'play': return this._actPlay(action);
      default: throw new Error(`no actions in phase ${this.phase}`);
    }
  }

  // ---------- 비딩 ----------
  _minLegalBid(giruda) {
    const disc = giruda === 'N' ? this.config.noGirudaBidDiscount : 0;
    const floor = this.config.minBid - disc;
    const best = this.bidding.best;
    if (!best) return floor;
    return Math.max(floor, best.count + 1);
  }

  _legalBids() {
    const acts = [{ type: 'pass' }];
    if (this.dealMissEligible(this.bidding.turn)) acts.push({ type: 'dealMiss' });
    for (const g of [...SUITS, 'N']) {
      const mn = this._minLegalBid(g);
      for (let c = mn; c <= this.config.maxBid; c++) {
        acts.push({ type: 'bid', count: c, giruda: g });
      }
    }
    return acts;
  }

  _actBid(action) {
    const b = this.bidding;
    const p = b.turn;
    if (action.type === 'dealMiss') {
      if (!this.dealMissEligible(p)) throw new Error('not eligible for deal-miss');
      this.phase = 'redeal';
      this.redealReason = { type: 'dealMiss', player: p, value: dealMissValue(this.hands[p]) };
      return this;
    }
    if (action.type === 'pass') {
      b.active[p] = false;
      this.log.push({ ev: 'pass', player: p });
    } else if (action.type === 'bid') {
      const mn = this._minLegalBid(action.giruda);
      if (action.count < mn || action.count > this.config.maxBid) {
        throw new Error(`illegal bid ${action.count}${action.giruda} (min ${mn})`);
      }
      b.best = { player: p, count: action.count, giruda: action.giruda };
      this.log.push({ ev: 'bid', player: p, count: action.count, giruda: action.giruda });
    } else throw new Error('bidding: expected bid|pass');

    const remaining = b.active.filter(Boolean).length;
    if (remaining === 0) {
      if (b.best) return this._finishBidding();
      this.phase = 'redeal';
      this.redealReason = { type: 'allPass' };
      return this;
    }
    if (remaining === 1 && b.best && b.active[b.best.player]) {
      return this._finishBidding();
    }
    // 다음 활성 플레이어
    do { b.turn = (b.turn + 1) % NUM_PLAYERS; } while (!b.active[b.turn]);
    return this;
  }

  _finishBidding() {
    const { player, count, giruda } = this.bidding.best;
    this.declarer = player;
    this.contract = { count, giruda };
    this.hands[player].push(...this.floor);
    this.floorOriginal = this.floor.slice();
    this.floor = [];
    this.phase = 'floor';
    this.log.push({ ev: 'declarer', player, count, giruda });
    return this;
  }

  // ---------- 바닥패 교환 + 공약 수정 ----------
  /** action: { type:'exchange', discard:[3 cards], revise?: {count, giruda} } */
  _actExchange(action) {
    if (action.type !== 'exchange') throw new Error('floor: expected exchange');
    const hand = this.hands[this.declarer];
    if (!action.discard || action.discard.length !== FLOOR_SIZE) {
      throw new Error(`must discard exactly ${FLOOR_SIZE}`);
    }

    // --- 검증 먼저 (원자성: 실패 시 상태 불변) ---
    if (action.revise && this.config.allowBidRevise) {
      const { count, giruda } = action.revise;
      const cur = this.contract;
      if (giruda !== cur.giruda) {
        const cost = giruda === 'N' ? this.config.toNoGirudaChangeCost : this.config.girudaChangeCost;
        const minNew = cur.count + cost;
        if (count < minNew) throw new Error(`revise needs count >= ${minNew}`);
      } else if (count < cur.count) {
        throw new Error('cannot lower bid');
      }
      if (count > this.config.maxBid) throw new Error('exceeds max bid');
    }
    const removeIdx = [];
    const used = new Set();
    for (const c of action.discard) {
      const i = hand.findIndex((h, idx) => !used.has(idx) && sameCard(h, c));
      if (i < 0) throw new Error(`discard card not in hand: ${cardName(c)}`);
      used.add(i); removeIdx.push(i);
    }

    // --- 적용 ---
    removeIdx.sort((a, b) => b - a).forEach(i => hand.splice(i, 1));
    this.discard = action.discard.slice();
    if (action.revise && this.config.allowBidRevise) {
      this.contract = { count: action.revise.count, giruda: action.revise.giruda };
      this.log.push({ ev: 'revise', ...action.revise });
    }
    this.phase = 'friend';
    return this;
  }

  // ---------- 프렌드 지정 ----------
  get mightyCard() {
    return this.contract.giruda === 'S' ? { suit: 'D', rank: 14 } : { suit: 'S', rank: 14 };
  }
  get jokerCallCard() {
    const base = this.config.jokerCallBaseSuit || 'C';
    let s = base;
    if (this.contract.giruda === base) {
      s = this.config.jokerCallAltSuit;
      if (!s || s === base) s = base === 'H' ? 'C' : 'H';
    }
    return { suit: s, rank: 3 };
  }

  /** action: {type:'friend', mode:'card'|'first'|'none', card?} */
  _actFriend(action) {
    if (action.type !== 'friend') throw new Error('friend: expected friend');
    this.friendDecl = { mode: action.mode, card: action.card || null };
    this.friend = null;          // 실제 프렌드 (엔진 내부 확정, 공개는 revealed로)
    this.friendRevealed = false;

    if (action.mode === 'card') {
      if (!action.card) throw new Error('card friend needs a card');
      for (let p = 0; p < NUM_PLAYERS; p++) {
        if (this.hands[p].some(c => sameCard(c, action.card))) {
          this.friend = (p === this.declarer) ? null : p; // 본인/바닥패 보유 → 사실상 셀프
          break;
        }
      }
    } else if (action.mode === 'none') {
      this.friend = null;
      this.friendRevealed = true;
    }
    // 'first' 모드는 1트릭 후 확정

    // 딜미스 창구: 공약·바닥패 확정 후, 게임 시작 전 선언 기회 (자격자만, 좌석 순)
    this.dmQueue = [];
    if (this.config.dealMissEnabled) {
      for (let p = 0; p < NUM_PLAYERS; p++) {
        if (p === this.declarer && !this.config.declarerCanDealMiss) continue; // 주공 제외
        if (this.dealMissEligible(p)) this.dmQueue.push(p);
      }
    }
    if (this.dmQueue.length > 0) {
      this.phase = 'dealMissWindow';
      this.dmIdx = 0;
    } else {
      this._startPlay();
    }
    return this;
  }

  _actDealMissWindow(action) {
    const p = this.dmQueue[this.dmIdx];
    if (action.type === 'dealMiss') {
      if (p === this.declarer && !this.config.declarerCanDealMiss)
        throw new Error('declarer cannot declare a misdeal');
      this.phase = 'redeal';
      this.redealReason = { type: 'dealMiss', player: p, value: dealMissValue(this.hands[p]) };
      return this;
    }
    if (action.type !== 'proceed') throw new Error('dealMissWindow: expected dealMiss|proceed');
    this.dmIdx++;
    if (this.dmIdx >= this.dmQueue.length) this._startPlay();
    return this;
  }

  // ---------- 트릭 플레이 ----------
  _startPlay() {
    this.phase = 'play';
    this.play = {
      trickNo: 1,
      leader: this.declarer,
      turn: this.declarer,
      table: [],            // [{player, card, jokerSuit?, jokerCall?}]
      ledSuit: null,
      jokerCallActive: false,
      capturedPoints: new Array(NUM_PLAYERS).fill(0),
      capturedCards: [[], [], [], [], []],
      tricksWon: new Array(NUM_PLAYERS).fill(0),
      history: [],
      lastTrickWinner: null,
    };
  }

  _hasSuit(p, suit) {
    return this.hands[p].some(c => !isJoker(c) && c.suit === suit);
  }

  /** 합법 플레이 목록: [{card, jokerSuit?, jokerCall?}] */
  _legalPlays(p) {
    const pl = this.play;
    const hand = this.hands[p];
    const cfg = this.config;
    const g = this.contract.giruda;
    const isLeader = pl.table.length === 0;
    const moves = [];

    // 조커콜 발동 중 & 조커 보유 → 조커 강제
    // 조커콜: 조커 보유자는 조커를 내야 한다.
    // 단 마이티를 함께 보유하면 마이티를 내어 조커를 보호할 수 있다(표준 룰).
    if (pl.jokerCallActive && hand.some(isJoker)) {
      const forced = [{ card: JOKER, forced: true }];
      if (cfg.jokerCallMightyProtect) {
        const m = hand.find(c => !isJoker(c) && sameCard(c, this.mightyCard));
        if (m) forced.push({ card: m, protect: true });
      }
      return forced;
    }

    if (isLeader) {
      for (const c of hand) {
        if (isJoker(c)) {
          // 조커 선출: 무늬 지정 필요
          // 초구 기루다 선출 금지 룰이 켜져 있으면, 조커로 기루다를 '부르는' 것도 막는다
          // (같은 트릭에 기루다를 강요해 룰을 우회하는 것을 방지)
          const banGiruda = cfg.firstTrickNoGirudaLead && cfg.firstTrickJokerNoGiruda &&
                            pl.trickNo === 1 && g !== 'N';
          for (const s of SUITS) {
            if (banGiruda && s === g) continue;
            moves.push({ card: JOKER, jokerSuit: s });
          }
          continue;
        }
        // 초구 주공 기루다 선출 금지 (기루다 외 카드가 있을 때만)
        if (cfg.firstTrickNoGirudaLead && pl.trickNo === 1 && g !== 'N' && c.suit === g) {
          const hasNonGiruda = hand.some(h => !isJoker(h) && h.suit !== g);
          if (hasNonGiruda) continue;
        }
        moves.push({ card: c });
        // 조커콜 카드 선출 시 조커콜 선택지
        if (cfg.jokerCallEnabled && sameCard(c, this.jokerCallCard)) {
          if (!(cfg.firstTrickNoJokerCall && pl.trickNo === 1)) {
            moves.push({ card: c, jokerCall: true });
          }
        }
      }
      return moves;
    }

    // 팔로우: 마이티/조커는 면제
    const mustFollow = pl.ledSuit && this._hasSuit(p, pl.ledSuit);
    for (const c of hand) {
      if (isJoker(c)) { moves.push({ card: JOKER }); continue; }
      if (sameCard(c, this.mightyCard)) { moves.push({ card: c }); continue; }
      if (mustFollow && c.suit !== pl.ledSuit) continue;
      moves.push({ card: c });
    }
    return moves;
  }

  /** action: {type:'play', card, jokerSuit?, jokerCall?} */
  _actPlay(action) {
    const pl = this.play;
    const p = pl.turn;
    const legal = this._legalPlays(p);
    const match = legal.find(m =>
      sameCard(m.card, action.card) &&
      (!!m.jokerCall === !!action.jokerCall) &&
      (m.jokerSuit === undefined || m.jokerSuit === action.jokerSuit)
    );
    if (!match) throw new Error(`illegal play: ${cardName(action.card)} by P${p}`);

    // 손에서 제거
    const hand = this.hands[p];
    const i = hand.findIndex(h => sameCard(h, action.card));
    hand.splice(i, 1);

    const entry = { player: p, card: action.card };
    if (isJoker(action.card) && pl.table.length === 0) {
      entry.jokerSuit = action.jokerSuit;
    }
    if (action.jokerCall) {
      entry.jokerCall = true;
      pl.jokerCallActive = true;
    }
    pl.table.push(entry);

    // 리드 무늬 확정
    if (pl.table.length === 1) {
      pl.ledSuit = isJoker(action.card) ? action.jokerSuit : action.card.suit;
    }

    // 프렌드 공개 체크 (카드 프렌드)
    if (this.friendDecl.mode === 'card' && !this.friendRevealed &&
        this.friendDecl.card && sameCard(action.card, this.friendDecl.card)) {
      this.friendRevealed = true;
    }

    if (pl.table.length === NUM_PLAYERS) {
      this._resolveTrick();
    } else {
      pl.turn = (pl.turn + 1) % NUM_PLAYERS;
    }
    return this;
  }

  _cardStrength(entry, pl) {
    const cfg = this.config;
    const g = this.contract.giruda;
    const c = entry.card;
    // 서열 클래스: 4=마이티, 3=조커, 2=기루다, 1=리드무늬, 0=기타
    if (!isJoker(c) && sameCard(c, this.mightyCard)) return [4, 0];
    if (isJoker(c)) {
      const weak =
        pl.jokerCallActive ||
        (cfg.firstTrickJokerWeak && pl.trickNo === 1) ||
        (cfg.lastTrickJokerWeak && pl.trickNo === HAND_SIZE);
      return weak ? [-1, 0] : [3, 0];
    }
    if (g !== 'N' && c.suit === g) return [2, c.rank];
    if (c.suit === pl.ledSuit) return [1, c.rank];
    return [0, 0];
  }

  _resolveTrick() {
    const pl = this.play;
    let best = null, bestKey = [-2, -1];
    for (const e of pl.table) {
      const k = this._cardStrength(e, pl);
      if (k[0] > bestKey[0] || (k[0] === bestKey[0] && k[1] > bestKey[1])) {
        bestKey = k; best = e;
      }
    }
    const winner = best.player;
    const pts = pl.table.filter(e => isPointCard(e.card));
    pl.capturedPoints[winner] += pts.length;
    pl.capturedCards[winner].push(...pts.map(e => e.card));
    pl.tricksWon[winner]++;
    pl.history.push({
      trickNo: pl.trickNo, leader: pl.leader,
      plays: pl.table.slice(), winner, points: pts.length,
    });
    this.log.push({ ev: 'trick', no: pl.trickNo, winner, points: pts.length });

    // 초구 프렌드 확정
    if (this.friendDecl.mode === 'first' && pl.trickNo === 1) {
      this.friend = (winner === this.declarer) ? null : winner;
      this.friendRevealed = true;
    }
    pl.lastTrickWinner = winner;

    if (pl.trickNo === HAND_SIZE) return this._finishGame();
    pl.trickNo++;
    pl.leader = winner;
    pl.turn = winner;
    pl.table = [];
    pl.ledSuit = null;
    pl.jokerCallActive = false;
  }

  // ---------- 정산 ----------
  _finishGame() {
    const pl = this.play;
    const cfg = this.config;
    const discardPts = this.discard.filter(isPointCard).length;

    let yeodang = pl.capturedPoints[this.declarer];
    if (this.friend !== null) yeodang += pl.capturedPoints[this.friend];

    if (discardPts > 0) {
      if (cfg.discardPointsTo === 'declarer') yeodang += discardPts;
      else if (cfg.discardPointsTo === 'lastTrickWinner') {
        const w = pl.lastTrickWinner;
        if (w === this.declarer || w === this.friend) yeodang += discardPts;
      }
      // 'defenders' → 여당 획득에 미포함 (야당 귀속)
    }

    const noGiruda = this.contract.giruda === 'N';
    const { win, score, prize } = computeRoundScore(this.contract.count, yeodang, noGiruda, cfg.scoring);
    const prizes = distributePrize(prize, this.declarer, this.friend, NUM_PLAYERS, cfg.scoring);

    this.phase = 'done';
    this.result = {
      declarer: this.declarer,
      friend: this.friend,
      contract: { ...this.contract },
      noGiruda,
      yeodangPoints: yeodang,
      yadangPoints: TOTAL_POINT_CARDS - yeodang,
      discardPoints: discardPts,
      win, score, prize, prizes,
      run: yeodang === cfg.scoring.runScore,
      backRun: yeodang === 0,
      tricksWon: pl.tricksWon.slice(),
      capturedPoints: pl.capturedPoints.slice(),
    };
    this.log.push({ ev: 'done', ...this.result });
    return this;
  }

  /**
   * 세팅(클레임) 판정: p가 남은 모든 트릭을 확정적으로 이기는가.
   * - p 시점의 지식만 사용 (출현 카드 + 자기 손패 + 주공이면 묻은 패)
   * - 보수적 충분조건: 모든 보유 카드가 '선출 시 반드시 이기는 카드'
   *   → 순서와 무관하게 매 트릭 승리 + 리드 유지가 보장됨
   */
  claimEligible(p) {
    if (this.phase !== 'play') return false;
    const pl = this.play;
    if (pl.table.length !== 0 || pl.turn !== p) return false;
    const hand = this.hands[p];
    if (hand.length === 0) return false;
    const cfg = this.config;
    const g = this.contract.giruda;

    const seen = new Set();
    for (const t of pl.history) for (const e of t.plays) seen.add(cardId(e.card));
    for (const c of hand) seen.add(cardId(c));
    if (p === this.declarer && this.discard) for (const c of this.discard) seen.add(cardId(c));

    // [엄격 모드] 마이티·조커는 반드시 '정산 완료'여야 한다
    //   = 이미 출현했거나 / 내 손에 있거나 / (주공이면) 내가 묻었거나
    const mightyOut = !seen.has(cardId(this.mightyCard));
    const jokerOut = !seen.has(JOKER);
    if (mightyOut || jokerOut) return false;   // 변수 카드가 남아 있으면 세팅 불가
    const jokerThreat = false;
    const outHigher = (suit, rank) => {
      for (let r = rank + 1; r <= 14; r++) if (!seen.has(suit + r)) return true;
      return false;
    };
    const outAnySuit = suit => {
      for (let r = 2; r <= 14; r++) if (!seen.has(suit + r)) return true;
      return false;
    };

    // [엄격 모드] 무늬 카운트 완전성: 내가 못 본 카드 = 상대 손패 (묻힌 패 불확실성 없음)
    let unseenCount = 0;
    for (const s of SUITS) for (let r = 2; r <= 14; r++) if (!seen.has(s + r)) unseenCount++;
    if (!seen.has(JOKER)) unseenCount++;
    let oppCards = 0;
    for (let q = 0; q < NUM_PLAYERS; q++) if (q !== p) oppCards += this.hands[q].length;
    if (unseenCount !== oppCards) return false;   // 바닥패 3장이 미지수면 카운트 불완전

    for (const c of hand) {
      if (sameCard(c, this.mightyCard)) continue;           // 마이티는 항상 최강
      if (isJoker(c)) {
        // 보유 조커는 '남은 모든 트릭에서 강할 때'만 안전 (막트릭 최약 등 고려)
        for (let t = pl.trickNo; t <= HAND_SIZE; t++) {
          const weak = (cfg.firstTrickJokerWeak && t === 1) ||
                       (cfg.lastTrickJokerWeak && t === HAND_SIZE);
          if (weak) return false;
        }
        continue;
      }
      if (mightyOut || jokerThreat) return false;
      if (g !== 'N' && c.suit === g) {
        if (outHigher(g, c.rank)) return false;             // 더 높은 기루다 존재
      } else {
        if (outHigher(c.suit, c.rank)) return false;        // 같은 무늬 상위 존재
        if (g !== 'N' && outAnySuit(g)) return false;       // 기루다 컷 위험
      }
    }
    return true;
  }

  // ---------- AI용 관측 (정보 은닉) ----------
  getObservation(p) {
    const obs = {
      phase: this.phase,
      player: p,
      hand: this.hands[p] ? this.hands[p].slice() : [],
      dealer: this.dealer,
      declarer: this.declarer ?? null,
      contract: this.contract ? { ...this.contract } : null,
      friendDecl: this.friendDecl ? { ...this.friendDecl } : null,
      friendRevealed: this.friendRevealed ?? false,
      friend: (this.friendRevealed ? this.friend : null),
      log: this.log,
    };
    if (this.phase === 'play') {
      const pl = this.play;
      obs.trickNo = pl.trickNo;
      obs.table = pl.table.slice();
      obs.ledSuit = pl.ledSuit;
      obs.jokerCallActive = pl.jokerCallActive;
      obs.capturedPoints = pl.capturedPoints.slice();
      obs.tricksWon = pl.tricksWon.slice();
      obs.history = pl.history;
      obs.mightyCard = this.mightyCard;
      obs.jokerCallCard = this.jokerCallCard;
    }
    return obs;
  }
}

// ---------------------------------------------------------------
// 헬퍼
// ---------------------------------------------------------------
function structuredCloneSafe(o) { return JSON.parse(JSON.stringify(o)); }
function deepMerge(base, over) {
  for (const k of Object.keys(over || {})) {
    if (over[k] && typeof over[k] === 'object' && !Array.isArray(over[k]) &&
        base[k] && typeof base[k] === 'object') {
      deepMerge(base[k], over[k]);
    } else base[k] = over[k];
  }
  return base;
}

// ---------------------------------------------------------------
// 랜덤 에이전트 (엔진 검증용 — 3단계에서 휴리스틱으로 교체)
// ---------------------------------------------------------------
class RandomAgent {
  constructor(rng) { this.rng = rng || Math.random; }
  pick(arr) { return arr[Math.floor(this.rng() * arr.length)]; }

  actBidding(game) {
    const acts = game.legalActions();
    const bids = acts.filter(a => a.type === 'bid');
    if (bids.length === 0 || this.rng() < 0.8) return { type: 'pass' };
    // 최소 공약 위주로
    const minCount = Math.min(...bids.map(b => b.count));
    const cands = bids.filter(b => b.count === minCount);
    return this.pick(cands);
  }

  actExchange(game) {
    const hand = game.hands[game.declarer].slice();
    // 비점수카드 우선 랜덤 3장
    hand.sort((a, b) => (isPointCard(a) ? 1 : 0) - (isPointCard(b) ? 1 : 0) + (this.rng() - 0.5) * 0.5);
    return { type: 'exchange', discard: hand.slice(0, FLOOR_SIZE) };
  }

  actFriend(game) {
    const hand = game.hands[game.declarer];
    const m = game.mightyCard;
    if (!hand.some(c => sameCard(c, m))) return { type: 'friend', mode: 'card', card: m };
    if (!hand.some(isJoker)) return { type: 'friend', mode: 'card', card: JOKER };
    // 기루다 A (마이티 무늬 제외) 시도, 없으면 초구 프렌드
    const g = game.contract.giruda;
    if (g !== 'N') {
      const gA = { suit: g, rank: 14 };
      if (!hand.some(c => sameCard(c, gA)) && !sameCard(gA, m)) {
        return { type: 'friend', mode: 'card', card: gA };
      }
    }
    return { type: 'friend', mode: 'first' };
  }

  actPlay(game) {
    const acts = game.legalActions();
    return this.pick(acts);
  }

  act(game) {
    switch (game.phase) {
      case 'bidding': return this.actBidding(game);
      case 'floor': return this.actExchange(game);
      case 'friend': return this.actFriend(game);
      case 'dealMissWindow': return { type: this.rng() < 0.5 ? 'dealMiss' : 'proceed' };
      case 'play': return this.actPlay(game);
      default: throw new Error('no action for phase ' + game.phase);
    }
  }
}

/* ============================================================
 *  HeuristicAgent — 3단계: 룰 기반 휴리스틱 컴퓨터 플레이어
 * ============================================================
 *  성향 파라미터 (0~1):
 *    risk       공약 공격성 — 핸드 평가 마진을 줄이고 공약 경쟁/셀프 선언 의지 ↑
 *    friendCoop 여당 협력 — 프렌드로서 주공 지원(점수 몰아주기, 강카드 개입) 강도
 *    defCoop    야당 협력 — 야당으로서 점수 관리(회피/몰아주기)와 조커콜 협조 강도
 *  자신의 손패 + 공개 정보(테이블/기록/공약/공개된 프렌드)만 사용한다.
 * ============================================================ */

// 학습·평가 표준 성향 3종: gambler / balanced / careful (risk 차등).
// team·loner는 하위호환용으로 남겨둠 — 프렌드 공개 후 협력은 전 성향 공통 최대.
const PERSONAS = {
  gambler:  { label: '승부사',     risk: 0.85, friendCoop: 0.60, defCoop: 0.50 },
  careful:  { label: '신중파',     risk: 0.25, friendCoop: 0.70, defCoop: 0.80 },
  team:     { label: '팀플레이어', risk: 0.50, friendCoop: 0.90, defCoop: 0.90 },
  loner:    { label: '독불장군',   risk: 0.70, friendCoop: 0.35, defCoop: 0.30 },
  balanced: { label: '밸런스',     risk: 0.50, friendCoop: 0.60, defCoop: 0.60 },
};

/** 편차치를 둔 성향 무작위 생성 (4단계 학습/5단계 랭킹용 그룹 생성기) */
function randomPersonality(rng = Math.random, base = null) {
  const clamp01 = x => Math.max(0.05, Math.min(0.95, x));
  const b = base || { risk: 0.5, friendCoop: 0.6, defCoop: 0.6 };
  const dev = () => (rng() - 0.5) * 0.5;
  return {
    label: '랜덤',
    risk: clamp01(b.risk + dev()),
    friendCoop: clamp01(b.friendCoop + dev()),
    defCoop: clamp01(b.defCoop + dev()),
  };
}

const HEURISTIC_WEIGHTS = {
  // 비딩
  bidMargin: 1.3, bidRiskScale: 2.2, competeBase: 0.55, competeRisk: 0.45,
  selfThresh: 19.5, selfRisk: 2.0,
  // 리드
  trumpLead: 4, jokerLeadMid: 6, costLead: 0.25,
  // 팔로우/공통
  ptsValue: 2.2, trickBase: 1.2, overtakeAvoid: 2.5, defendPts: 0.6,
  costWin: 0.45, riskPenalty: 1.2, feed: 3.5, feedSafe: 0.55,
  dumpPtsPenalty: 4, costDump: 0.5, runProtect: 1.5, runBlock: 1.2,
  // v2: 카운팅 기반
  beatRisk: 0.3,      // 미출현 상위 카드 1장당 뒤집힐 위험 가중
  friendGuard: 2.5,   // 여당이 이기는 트릭에 프렌드가 기루다/고카드 낭비 억제
  mightyGate: 2.5,    // 저가치 트릭 마이티 소진 억제(팔로우)
  // 이른 마이티 리드 억제 — 남은 트릭에 비례(T9부터 0). 0이면 억제 없음(구동작).
  // 페어드 실측(발화 561딜): 0 → 8에서 발화 딜 여당 상금 +559 ±178, 전체 +203 ±54.
  // 10·12도 같은 값에서 평탄해 최솟값 8을 쓴다.
  mightyLeadGate: 8,
  // 고급 티어: 프렌드 미공개 구간의 아군 확률 (실측 기반 — 공개 전 비주공 승자의
  // 83%가 실제 야당, 17%가 숨은 프렌드)
  hiddenAllyPrior: 0.8,    // 야당 시점: 비주공 승자가 동료 야당일 확률
  hiddenFriendPrior: 0.2,  // 주공 시점: 비주공 승자가 숨은 프렌드일 확률
  friendFeedEvidence: 0.8,   // 주공 승 트릭에 점수 공급 → 프렌드 가능성 가중
  friendStealEvidence: 0.7,  // 주공 승 트릭 탈취 → 프렌드 가능성 감쇄
  friendGuardKey: 3.0,       // 아군 확정승 트릭에 마이티·조커 낭비 억제(프렌드)
  advJitter: 0.1,            // 고급 티어 탐색 잡음 (중급 0.3) — 협력 결정 안정화
  friendFeedScale: 1,        // 실험용: 프렌드의 주공 점수공급 강도 (0이면 신호 차단)
};

/**
 * AI 티어.
 *  intermediate(중급) — 현행 로직. 팀이 확정된 뒤에만 협력.
 *  advanced(고급)     — 프렌드 미공개 구간에서도 아군 확률로 협력 강도를 가중.
 * 마스터 티어는 신경망(mighty_master.onnx + mighty-master.js)이 담당한다.
 */
const TIERS = ['intermediate', 'advanced'];

class HeuristicAgent {
  /** personality: {risk, friendCoop, defCoop, label?, weights?: HEURISTIC_WEIGHTS 부분 오버라이드} */
  constructor(personality = PERSONAS.balanced, rng = Math.random, opts = {}) {
    this.p = { ...personality };
    this.w = { ...HEURISTIC_WEIGHTS, ...(personality.weights || {}) };
    this.rng = rng;
    this.tier = opts.tier || 'intermediate';
    if (!TIERS.includes(this.tier)) throw new Error('unknown tier ' + this.tier);
  }

  /** history 트릭의 서열 계산용 pl 스텁 */
  _trickStub(t) {
    const p0 = t.plays[0];
    return {
      ledSuit: p0.jokerSuit || (isJoker(p0.card) ? null : p0.card.suit),
      trickNo: t.trickNo,
      jokerCallActive: t.plays.some(x => x.jokerCall),
    };
  }

  /**
   * 공개 정보로 추정한 프렌드 정체 확률 (좌석별, 합 1).
   * 증거: 주공이 이긴 트릭에 점수카드를 넣어준 좌석은 프렌드 가능성↑,
   *       주공이 이기고 있던 트릭을 뺏은 좌석은 가능성↓.
   */
  _friendBelief(game, me, iAmFriend) {
    const n = NUM_PLAYERS, decl = game.declarer;
    const b = new Array(n).fill(0);
    if (iAmFriend) { b[me] = 1; return b; }
    if (game.friendRevealed) {
      if (game.friend !== null && game.friend !== undefined) b[game.friend] = 1;
      return b;                                   // 셀프/노프렌드면 전원 0
    }
    for (let p = 0; p < n; p++) if (p !== decl && p !== me) b[p] = 1;
    const pl = game.play;
    if (pl) {
      for (const t of pl.history) {
        const stub = this._trickStub(t);
        for (const e of t.plays) {
          if (e.player === decl || b[e.player] === 0) continue;
          if (t.winner === decl && isPointCard(e.card))
            b[e.player] *= 1 + this.w.friendFeedEvidence;
        }
        if (t.winner !== decl && b[t.winner]) {
          // 이 좌석이 없었다면 주공이 이겼을 트릭인가 → 탈취 증거
          let bestE = null, bestK = [-2, -1];
          for (const e of t.plays) {
            if (e.player === t.winner) continue;
            const k = game._cardStrength(e, stub);
            if (k[0] > bestK[0] || (k[0] === bestK[0] && k[1] > bestK[1])) { bestK = k; bestE = e; }
          }
          if (bestE && bestE.player === decl)
            b[t.winner] *= 1 - this.w.friendStealEvidence;
        }
      }
    }
    const sum = b.reduce((x, y) => x + y, 0);
    if (sum > 0) for (let p = 0; p < n; p++) b[p] /= sum;
    return b;
  }

  /**
   * 현재 트릭 승자가 내 아군일 신뢰도 (0~1).
   * 중급은 확정 정보만 쓰므로 0 또는 1. 고급은 프렌드 미공개 구간에서 사전확률을 쓴다.
   * 프렌드 본인은 '주공이 아닌 승자 = 야당'이 확정이므로 사전확률을 쓰지 않는다.
   */
  _allyConfidence(game, ctx) {
    const side = ctx.tableWinnerSide;
    if (side === 'none') return 0;
    // 초구 프렌드: 이 트릭의 승자가 곧 프렌드로 확정된다 → 사전확률이 아니라 역전
    const firstMode = game.friendDecl && game.friendDecl.mode === 'first' &&
                      !game.friendRevealed;
    if (ctx.side === 'ruling') {
      if (side === 'ruling') return 1;
      if (side !== 'unknown' || this.tier !== 'advanced' || ctx.iAmFriend) return 0;
      if (firstMode) return 1;                           // 초구모드면 승자가 내 프렌드가 됨
      return ctx.friendBelief ? ctx.friendBelief[ctx.tableWinner] : this.w.hiddenFriendPrior;
    }
    if (side === 'opp') return 1;
    if (side !== 'unknown' || this.tier !== 'advanced') return 0;
    if (firstMode) return 0;                             // 초구모드면 승자는 여당이 됨
    return ctx.friendBelief ? 1 - ctx.friendBelief[ctx.tableWinner] : this.w.hiddenAllyPrior;
  }

  /**
   * 플레이 시 적용할 성향.
   * 프렌드 공개(= 팀 확정) 이후에는 성향과 무관하게 최대 협력(여당/야당 모두).
   * 팀이 아직 불확실한 구간에서만 성향(friendCoop/defCoop)대로 행동한다.
   * 비딩 성향(risk)은 항상 성향대로.
   */
  _persona(game) {
    if (!game.friendRevealed) return this.p;
    if (!this._pCoop) this._pCoop = { ...this.p, friendCoop: 1, defCoop: 1 };
    return this._pCoop;
  }

  act(game) {
    switch (game.phase) {
      case 'bidding': return this.actBidding(game);
      case 'floor':   return this.actExchange(game);
      case 'friend':  return this.actFriend(game);
      case 'dealMissWindow': {
        const me = game.currentPlayer;
        const g = game.contract.giruda;
        const gCnt = g === 'N' ? 0 : game.hands[me].filter(c => !isJoker(c) && c.suit === g).length;
        return { type: gCnt >= 4 ? 'proceed' : 'dealMiss' };
      }
      case 'play':    return this.actPlay(game);
      default: throw new Error('no action for phase ' + game.phase);
    }
  }

  /* ---------------- 핸드 평가 ---------------- */
  /** 기루다 후보 g에 대한 기대 여당 점수 (프렌드 기대 포함) */
  evalHand(hand, g, game) {
    const mighty = g === 'S' ? { suit: 'D', rank: 14 } : { suit: 'S', rank: 14 };
    const hasM = hand.some(c => sameCard(c, mighty));
    const hasJ = hand.some(isJoker);
    let tricks = (hasM ? 1 : 0) + (hasJ ? 0.9 : 0);
    const bySuit = {};
    for (const s of SUITS) bySuit[s] = hand.filter(c => !isJoker(c) && c.suit === s);

    if (g !== 'N') {
      const gs = bySuit[g];
      const len = gs.length;
      tricks += Math.max(0, len - 3) * 0.9;                    // 긴 기루다
      for (const c of gs) {
        if (c.rank === 14 && !sameCard(c, mighty)) tricks += 0.95;
        else if (c.rank === 13) tricks += len >= 2 ? 0.75 : 0.4;
        else if (c.rank === 12) tricks += len >= 3 ? 0.5 : 0.2;
        else if (c.rank === 11) tricks += len >= 4 ? 0.3 : 0.1;
      }
    }
    // 사이드 수트 하이카드
    for (const s of SUITS) {
      if (s === g) continue;
      const cs = bySuit[s];
      for (const c of cs) {
        if (c.rank === 14 && !sameCard(c, mighty)) tricks += 0.8;
        else if (c.rank === 13) tricks += cs.length >= 2 ? 0.4 : 0.15;
      }
      if (g !== 'N' && cs.length === 0 && bySuit[g].length >= 3) tricks += 0.5; // 보이드+기루다
      if (g !== 'N' && cs.length === 1 && bySuit[g].length >= 4) tricks += 0.25;
    }
    if (g === 'N') {
      // 노기루다: 하이카드 집중도 요구
      let highs = 0;
      for (const c of hand) if (!isJoker(c) && c.rank >= 13) highs++;
      tricks += highs * 0.25;
      if (!hasM || !hasJ) tricks -= 1.5; // 마이티·조커 없으면 크게 감점
    }
    // 프렌드 기대치: 없는 최강 카드를 부른다
    let friendBoost = 0;
    if (!hasM) friendBoost = 3.2;
    else if (!hasJ) friendBoost = 2.8;
    else friendBoost = 2.1; // 기루다 A 등
    // 트릭 → 점수 환산: 여당 트릭당 평균 약 2.2점 + 바닥/주도권 기대
    return { est: tricks * 2.2 + friendBoost + 2.6, tricks, hasM, hasJ };
  }

  bestGiruda(hand, game) {
    let best = null;
    for (const g of SUITS) {
      const e = this.evalHand(hand, g, game);
      if (!best || e.est > best.est) best = { g, ...e };
    }
    const nt = this.evalHand(hand, 'N', game);
    if (nt.est > best.est + 1.0) best = { g: 'N', ...nt }; // NT는 보수적으로
    return best;
  }

  /* ---------------- 비딩 ---------------- */
  actBidding(game) {
    const me = game.currentPlayer;
    const hand = game.hands[me];
    const ev = this.bestGiruda(hand, game);
    // 마진: 신중할수록 큼 (risk 0 → +0.9, risk 1 → -1.3)
    const margin = this.w.bidMargin - this.w.bidRiskScale * this.p.risk;
    const afford = Math.floor(ev.est - margin);
    const legal = game.legalActions().filter(a => a.type === 'bid' && a.giruda === ev.g);
    if (legal.length === 0) return { type: 'pass' };
    const minLegal = Math.min(...legal.map(a => a.count));
    if (minLegal > afford) return { type: 'pass' };
    // 경쟁 상황에서 재공약 의지: risk 낮으면 이미 공약이 있으면 한 번 더 망설임
    if (game.bidding.best && this.rng() > this.w.competeBase + this.p.risk * this.w.competeRisk) return { type: 'pass' };
    return { type: 'bid', count: minLegal, giruda: ev.g };
  }

  /* ---------------- 바닥패 교환 (+공약 수정) ---------------- */
  actExchange(game) {
    const me = game.declarer;
    const hand = game.hands[me];
    const cfg = game.config;
    // 바닥패 반영 후 최적 기루다 재평가
    const re = this.bestGiruda(hand, game);
    let revise = null;
    const cur = game.contract;
    if (cfg.allowBidRevise && re.g !== cur.giruda) {
      const cost = re.g === 'N' ? cfg.toNoGirudaChangeCost : cfg.girudaChangeCost;
      const newCount = cur.count + cost;
      // 새 기루다 기대가 비용을 크게 상회할 때만 변경
      if (newCount <= cfg.maxBid && re.est - 2.0 >= newCount &&
          re.est > this.evalHand(hand, cur.giruda, game).est + 2.0) {
        revise = { count: newCount, giruda: re.g };
      }
    }
    const g = revise ? revise.giruda : cur.giruda;
    const mighty = g === 'S' ? { suit: 'D', rank: 14 } : { suit: 'S', rank: 14 };
    const bySuitLen = {};
    for (const s of SUITS) bySuitLen[s] = hand.filter(c => !isJoker(c) && c.suit === s).length;
    const pointPenalty = cfg.discardPointsTo === 'defenders' ? 6 : cfg.discardPointsTo === 'declarer' ? 0.5 : 3;
    const value = c => {
      if (isJoker(c) || sameCard(c, mighty)) return 999;
      let v = c.rank * 0.15;
      if (g !== 'N' && c.suit === g) v += 5;
      if (isPointCard(c)) v += pointPenalty;
      if (bySuitLen[c.suit] <= 2 && (g === 'N' || c.suit !== g)) v -= 1.2; // 보이드 생성 유도
      return v;
    };
    const discard = hand.slice().sort((a, b) => value(a) - value(b)).slice(0, FLOOR_SIZE);
    const act = { type: 'exchange', discard };
    if (revise) act.revise = revise;
    return act;
  }

  /* ---------------- 프렌드 지정 ---------------- */
  actFriend(game) {
    const me = game.declarer;
    const hand = game.hands[me];
    const has = c => hand.some(h => sameCard(h, c));
    const m = game.mightyCard;
    const g = game.contract.giruda;
    const ev = this.evalHand(hand, g, game);
    // 손이 압도적이면 셀프(노프렌드): risk가 높을수록 과감
    if (ev.est >= this.w.selfThresh - this.p.risk * this.w.selfRisk && ev.hasM && ev.hasJ) {
      return { type: 'friend', mode: 'none' };
    }
    if (!has(m)) return { type: 'friend', mode: 'card', card: m };
    if (!has(JOKER)) return { type: 'friend', mode: 'card', card: JOKER };
    if (g !== 'N') {
      const gA = { suit: g, rank: 14 };
      if (!sameCard(gA, m) && !has(gA)) return { type: 'friend', mode: 'card', card: gA };
      const gK = { suit: g, rank: 13 };
      if (!has(gK)) return { type: 'friend', mode: 'card', card: gK };
    }
    return { type: 'friend', mode: 'first' };
  }

  /* ---------------- 플레이 공통 정보 ---------------- */
  _ctx(game) {
    const me = game.play.turn;
    const pl = game.play;
    const played = [];
    for (const t of pl.history) for (const e of t.plays) played.push(e.card);
    for (const e of pl.table) played.push(e.card);
    const gone = c => played.some(x => sameCard(x, c));
    const mighty = game.mightyCard;
    // --- 카드 카운팅: 내 시점에서 미출현(=상대 손 + 바닥패) 카드 집계 ---
    const seen = new Set(played.map(c => cardId(c)));
    for (const c of game.hands[me]) seen.add(cardId(c));
    if (me === game.declarer && game.discard) for (const c of game.discard) seen.add(cardId(c));
    const outRanks = {};
    for (const s of SUITS) {
      outRanks[s] = [];
      for (let r = 14; r >= 2; r--) if (!seen.has(s + r)) outRanks[s].push(r);
    }
    const mightyOut = !seen.has(cardId(mighty));
    const jokerOut = !seen.has(JOKER);
    const iAmDeclarer = me === game.declarer;
    const iAmFriend = !iAmDeclarer && (
      (game.friendRevealed && game.friend === me) ||
      (game.friendDecl && game.friendDecl.mode === 'card' &&
       game.hands[me].some(c => sameCard(c, game.friendDecl.card))));
    const side = iAmDeclarer || iAmFriend ? 'ruling' : 'opp';
    // 현재 트릭 승자 예측
    let bestE = null, bestK = [-2, -1];
    for (const e of pl.table) {
      const k = game._cardStrength(e, pl);
      if (k[0] > bestK[0] || (k[0] === bestK[0] && k[1] > bestK[1])) { bestK = k; bestE = e; }
    }
    const winnerSide = w => {
      if (w === null) return 'none';
      if (w === game.declarer) return 'ruling';
      if (game.friendRevealed && game.friend === w) return 'ruling';
      if (game.friendRevealed && game.friend !== null) return 'opp';
      // 프렌드 미공개: 주공 외에는 불확실 → 야당으로 가정하되 표시
      return w === game.declarer ? 'ruling' : 'unknown';
    };
    // 런 추격/저지: 각자의 획득 더미는 공개 정보. 팀 합산은 프렌드 공개 후 확정.
    let rulingPts = null, oppPts = null;
    if (game.friendRevealed) {
      rulingPts = pl.capturedPoints[game.declarer] +
                  (game.friend !== null ? pl.capturedPoints[game.friend] : 0);
      oppPts = pl.capturedPoints.reduce((a, b) => a + b, 0) - rulingPts;
    }
    return {
      me, pl, gone, mighty, iAmDeclarer, iAmFriend, side, rulingPts, oppPts,
      friendBelief: this.tier === 'advanced'
        ? this._friendBelief(game, me, iAmFriend) : null,
      tableWinner: bestE ? bestE.player : null,
      tableWinnerKey: bestK,
      tableWinnerSide: bestE ? winnerSide(bestE.player) : 'none',
      pointsOnTable: pl.table.filter(e => isPointCard(e.card)).length,
      mightyGone: gone(mighty),
      jokerGone: gone(JOKER),
      isLast: pl.table.length === NUM_PLAYERS - 1,
      g: game.contract.giruda,
      outRanks, mightyOut, jokerOut,
      playersAfter: NUM_PLAYERS - 1 - pl.table.length,
    };
  }

  /** 특정 서열 키를 이길 수 있는 미출현 카드 수 (정확한 카운팅) */
  _beaters(game, ctx, key) {
    let n = 0;
    if (key[0] < 4 && ctx.mightyOut) n++;
    // 조커: 이번 트릭에 유효할 때만 위협
    const cfg = game.config;
    const jokerLive = ctx.jokerOut && !ctx.pl.jokerCallActive &&
      !(cfg.firstTrickJokerWeak && ctx.pl.trickNo === 1) &&
      !(cfg.lastTrickJokerWeak && ctx.pl.trickNo === HAND_SIZE);
    if (key[0] < 3 && jokerLive) n++;
    if (ctx.g !== 'N') {
      const outG = ctx.outRanks[ctx.g];
      if (key[0] === 2) n += outG.filter(r => r > key[1]).length;  // 더 높은 기루다
      else if (key[0] <= 1) n += outG.length;                       // 모든 기루다가 위협
    }
    if (key[0] === 1) n += ctx.outRanks[ctx.pl.ledSuit] ? ctx.outRanks[ctx.pl.ledSuit].filter(r => r > key[1]).length : 0;
    return n;
  }

  /** 이 무브를 냈을 때 이기는가 + 뒤집힐 위험도 (0 = 확정 승) */
  _winEval(game, ctx, mv) {
    const pl = ctx.pl;
    const entry = { player: ctx.me, card: mv.card };
    if (mv.jokerSuit) entry.jokerSuit = mv.jokerSuit;
    const key = game._cardStrength(entry, pl);
    const winsNow = key[0] > ctx.tableWinnerKey[0] ||
      (key[0] === ctx.tableWinnerKey[0] && key[1] > ctx.tableWinnerKey[1]);
    if (!winsNow) return { winsNow: false, risk: 1, key };
    if (ctx.isLast || key[0] === 4) return { winsNow: true, risk: 0, key };
    const b = this._beaters(game, ctx, key);
    if (b === 0) return { winsNow: true, risk: 0, key };            // 현존 탑카드: 확정
    const risk = Math.min(1, b * this.w.beatRisk * (ctx.playersAfter / 4 + 0.35));
    return { winsNow: true, risk, key };
  }

  /* ---------------- 플레이 ---------------- */
  actPlay(game) {
    const legal = game.legalActions();
    // 조커콜 강제 구간: 마이티로 조커를 보호할지 판단
    if (legal.length === 2 && legal.some(m => m.forced) && legal.some(m => m.protect)) {
      const ctx = this._ctx(game);
      const pts = ctx.pointsOnTable;
      // 트릭에 점수가 걸렸거나 후반이면 마이티로 받아 조커를 지킨다
      const late = ctx.pl.trickNo >= 6;
      return (pts >= 1 || late) ? legal.find(m => m.protect) : legal.find(m => m.forced);
    }
    if (legal.length === 1) return legal[0];
    const ctx = this._ctx(game);
    const leading = ctx.pl.table.length === 0;
    let best = null, bestScore = -1e9;
    for (const mv of legal) {
      const s = leading ? this._scoreLead(game, ctx, mv) : this._scoreFollow(game, ctx, mv);
      const jitter = this.rng() * (this.tier === 'advanced' ? this.w.advJitter : 0.3);
      if (s + jitter > bestScore) { bestScore = s + jitter; best = mv; }
    }
    return best;
  }

  _cardCost(mv, ctx) {
    // 카드 소모 비용: 강한 카드일수록 아깝다
    const c = mv.card;
    if (isJoker(c)) return 7;
    if (sameCard(c, ctx.mighty)) return 9;
    let v = c.rank * 0.28;
    if (ctx.g !== 'N' && c.suit === ctx.g) v += 1.6;
    return v;
  }

  _scoreLead(game, ctx, mv) {
    const c = mv.card;
    const p = this._persona(game);
    const myPointsOut = isPointCard(c) ? 1 : 0;
    let s = 0;
    const we = this._winEval(game, ctx, mv); // 테이블 비었으니 winsNow=true
    const winProb = 1 - we.risk;

    if (ctx.side === 'ruling') {
      // 여당 리드: 기루다 소진 유도, 확실한 트릭 캐시
      if (isJoker(c)) {
        // 조커 리드: 기루다 요구로 야당 기루다 제거 (중반 이후)
        const t = ctx.pl.trickNo;
        s = (t >= 3 && t <= 8 ? this.w.jokerLeadMid : 3) + (ctx.g !== 'N' && mv.jokerSuit === ctx.g ? 2 : 0);
        if (game.config.lastTrickJokerWeak && t >= 9) s += 4; // 막트릭 전에 소진
        if (game.config.firstTrickJokerWeak && t === 1) s = -8;
      } else if (ctx.g !== 'N' && c.suit === ctx.g) {
        const outG = ctx.outRanks[ctx.g].length;
        if (outG === 0) s = 1 + winProb * 2;                        // 밖 기루다 소진 → 드로우 무의미
        else s = this.w.trumpLead + winProb * this.w.trumpLead - (14 - c.rank) * 0.1;
        if (ctx.iAmFriend) {
          // 프렌드는 자신이 현존 탑 기루다일 때만 기루다 리드 (주공 기루다 소진 방지)
          const iAmTop = ctx.outRanks[ctx.g].every(r => r < c.rank);
          if (!iAmTop) s -= this.w.friendGuard * p.friendCoop;
          else s -= (1 - p.friendCoop) * 2;
        }
      } else if (sameCard(c, ctx.mighty)) {
        // 조커프렌드 확인용 초반 마이티 리드는 관례다 — 그대로 둔다.
        const probe = ctx.pl.trickNo <= 2 && game.friendDecl && game.friendDecl.mode === 'card'
                      && isJoker(game.friendDecl.card);
        if (probe) s = 8;
        else {
          // 마이티는 언제 내도 이긴다. 그래서 '지금 이길 트릭'을 사려고 리드에 쓰면
          // 나중에 상대가 가져갈 큰 트릭을 끊을 보험을 버리는 셈이다. 남은 트릭이
          // 많을수록 아낀다. 리드 점수는 winProb이 항상 1이라 상수 2.75였고,
          // 대안 리드는 기루다 위험으로 감점돼 마이티가 늘 1위였다(제보 재현).
          s = 2 + winProb * 3 - this.w.mightyLeadGate * Math.max(0, 9 - ctx.pl.trickNo) / 8;
        }
      } else {
        s = winProb * 5 - (c.rank <= 9 ? 0.5 : 0) + (c.rank === 14 ? 1.5 : 0);
      }
      if (myPointsOut) s -= (1 - winProb) * 4;
    } else {
      // 야당 리드
      if (mv.jokerCall) {
        // 조커콜: 조커가 살아있고 '내가 들고 있지 않을' 때만 의미 있음
        const iHoldJoker = game.hands[ctx.me].some(isJoker);
        s = (!ctx.jokerGone && !iHoldJoker) ? 4 + p.defCoop * 4 : -6;
      } else if (isJoker(c)) {
        s = -3; // 야당 조커 리드는 아껴둔다
      } else if (ctx.g !== 'N' && c.suit === ctx.g) {
        s = -2.5; // 기루다 리드 회피
      } else {
        s = (c.rank === 14 ? 3.5 : 0) + (c.rank <= 8 ? 2 : 0) + winProb * 1.5;
        if (myPointsOut) s -= 3 + p.defCoop * 2;               // 점수카드 리드 회피
      }
    }
    return s - this._cardCost(mv, ctx) * this.w.costLead;
  }

  _scoreFollow(game, ctx, mv) {
    const p = this._persona(game);
    const c = mv.card;
    const we = this._winEval(game, ctx, mv);
    const winProb = we.winsNow ? 1 - we.risk : 0;
    const pts = ctx.pointsOnTable + (isPointCard(c) ? 1 : 0);
    const cost = this._cardCost(mv, ctx);
    let s = 0;

    // 아군 신뢰도(0~1). 중급은 0/1, 고급은 미공개 구간에서 사전확률.
    const ally = this._allyConfidence(game, ctx);
    const friendlyWinning = ally > 0;

    // 현재 승자가 남은 플레이어에게 뒤집힐 수 있는지 (확정 아군/적군 승 판정)
    const winnerBeaters = ctx.tableWinner !== null ? this._beaters(game, ctx, ctx.tableWinnerKey) : 99;
    const winnerCertain = ctx.tableWinner !== null && winnerBeaters === 0;

    if (we.winsNow) {
      // 내가 이기는 수: 트릭 가치 = 점수 + 트릭 자체
      let trickValue = pts * this.w.ptsValue + this.w.trickBase;
      if (ctx.side === 'ruling') {
        if (friendlyWinning) {
          trickValue -= this.w.overtakeAvoid * ally;               // 이미 아군이 이김 → 오버테이크 자제
          if (winnerCertain) trickValue -= this.w.overtakeAvoid * ally;
          // 프렌드 가드: 아군 승 트릭에 기루다/고카드 낭비 억제
          if (ctx.iAmFriend && !isJoker(c) && !sameCard(c, ctx.mighty) &&
              ((ctx.g !== 'N' && c.suit === ctx.g) || c.rank >= 13))
            trickValue -= this.w.friendGuard * p.friendCoop * ally;
          // 마이티·조커를 아군 승 트릭에 버리지 않는다.
          //  · 아군의 승리가 '확정'이면 기본 카드 감각의 영역 → 전 티어 공통 적용
          //  · 불확실 구간(숨은 프렌드 등)의 확률적 억제는 고급 티어 전용
          if (isJoker(c) || sameCard(c, ctx.mighty)) {
            const keyCoop = ctx.iAmFriend ? p.friendCoop : 1;
            if (winnerCertain) trickValue -= this.w.friendGuardKey * keyCoop;
            else if (this.tier === 'advanced' && ctx.iAmFriend)
              trickValue -= this.w.friendGuardKey * keyCoop * ally;
          }
        }
        if (ctx.iAmFriend) trickValue += (p.friendCoop - 0.5) * 1.5;
      } else {
        trickValue += p.defCoop * pts * this.w.defendPts;        // 야당: 점수트릭 사수
        if (friendlyWinning) trickValue -= (this.w.overtakeAvoid + p.defCoop * 1.5) * ally;
      }
      // 런 상금(캡 고정)이 걸린 국면: 여당은 전 트릭 사수, 야당은 1점이라도 저지
      if (ctx.oppPts === 0 && ctx.rulingPts !== null) {
        if (ctx.side === 'ruling') trickValue += this.w.runProtect;
        else if (pts > 0) trickValue += this.w.runBlock + p.defCoop;
      }
      s = trickValue * winProb - cost * this.w.costWin;
      if (!ctx.isLast && we.risk > 0.5) s -= this.w.riskPenalty; // 어중간한 승부수 자제
    } else {
      // 이기지 못하는 수: 무엇을 버릴까
      if (isPointCard(c)) {
        // 아군이면 몰아주기, 적이면 헌납 금지 — 미공개 구간은 신뢰도로 두 항을 혼합
        const coop = ctx.side === 'ruling' ? p.friendCoop : p.defCoop;
        const safe = (ctx.isLast || winnerCertain) ? 1 : this.w.feedSafe;
        let feedS = this.w.feed * coop * safe + (c.rank === 10 ? 0.4 : 0);
        if (ctx.iAmFriend) feedS *= this.w.friendFeedScale;   // 신호 차단 실험용
        const dumpS = -this.w.dumpPtsPenalty - (ctx.side === 'opp' ? p.defCoop * 2 : 2);
        s = ally * feedS + (1 - ally) * dumpS;
      } else {
        s = 1.5 - cost * this.w.costDump;                        // 낮은 카드 정리
      }
    }
    // 조커 아끼기/소진 타이밍
    if (isJoker(c)) {
      if (!we.winsNow) s -= 4;
      if (game.config.lastTrickJokerWeak && ctx.pl.trickNo >= 9 && we.winsNow) s += 3;
      if (pts === 0 && !ctx.isLast) s -= 2;
    }
    // 마이티 타이밍: 점수 없는/저가치 트릭에 소진 억제, 큰 트릭·확정 탈취에 사용
    if (sameCard(c, ctx.mighty)) {
      if (pts === 0 && !ctx.isLast) s -= this.w.mightyGate * 1.4;
      else if (pts === 1 && !ctx.isLast && !winnerCertain) s -= this.w.mightyGate * 0.6;
      if (pts >= 2 && !friendlyWinning && winnerCertain) s += this.w.mightyGate;  // 적 확정승 큰 트릭 탈취
    }
    return s;
  }
}

/** 좌석별 에이전트 배열로 한 판 자동 진행 (재딜 시 result null) */
function playGame(config = {}, agents = null, dealerArg = null) {
  const g = new MightyGame(config);
  const as = agents || Array.from({ length: NUM_PLAYERS }, () => new RandomAgent(g.rng));
  g.start(dealerArg === null ? Math.floor(g.rng() * NUM_PLAYERS) : dealerArg);
  let guard = 0;
  while (g.phase !== 'done') {
    if (g.phase === 'redeal') return { game: g, result: null };
    g.act(as[g.currentPlayer].act(g));
    if (++guard > 500) throw new Error('game did not terminate');
  }
  return { game: g, result: g.result };
}

/** 한 판 자동 진행 (재딜 시 null 반환) */
function playRandomGame(config = {}, agent = null) {
  const g = new MightyGame(config);
  const a = agent || new RandomAgent(g.rng);
  g.start(Math.floor(g.rng() * NUM_PLAYERS));
  let guard = 0;
  while (g.phase !== 'done') {
    if (g.phase === 'redeal') return { game: g, result: null };
    g.act(a.act(g));
    if (++guard > 500) throw new Error('game did not terminate');
  }
  return { game: g, result: g.result };
}

// ---------------------------------------------------------------
// Export (Node/CommonJS + 브라우저 전역)
// ---------------------------------------------------------------
const MightyEngine = {
  MightyGame, RandomAgent, HeuristicAgent, PERSONAS, HEURISTIC_WEIGHTS, randomPersonality, playGame, playRandomGame,
  computeRoundScore, distributePrize,
  buildDeck, cardId, cardName, isPointCard, isJoker, sameCard, dealMissValue,
  SUITS, SUIT_KO, RANKS, JOKER, NUM_PLAYERS, HAND_SIZE, FLOOR_SIZE,
  TOTAL_POINT_CARDS, DEFAULT_CONFIG, makeRng,
};
if (typeof module !== 'undefined' && module.exports) module.exports = MightyEngine;
if (typeof globalThis !== 'undefined') globalThis.MightyEngine = MightyEngine;
