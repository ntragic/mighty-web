"""
mighty_engine.py — 마이티 엔진 Python 포트 (JS mighty-engine.js와 동작 일치)
DGX Spark RL 학습용. 시드 RNG(mulberry32)까지 동일 구현하여 JS와 딜 결과가 일치한다.
파리티 검증: parity_test.py (JS 트레이스 재생 대조)
"""
from __future__ import annotations
import math

SUITS = ['S', 'D', 'H', 'C']
RANKS = list(range(2, 15))
JOKER = 'JOKER'
NUM_PLAYERS = 5
HAND_SIZE = 10
FLOOR_SIZE = 3
TOTAL_POINT_CARDS = 20

DEFAULT_CONFIG = {
    'minBid': 14, 'maxBid': 20, 'noGirudaBidDiscount': 0,
    'bidStartsAtDealer': False,   # True면 딜러부터 비딩 (JS 엔진과 동일해야 함)
    'allowBidRevise': True, 'girudaChangeCost': 2, 'toNoGirudaChangeCost': 1,
    'redealOnAllPass': True,
    'dealMissEnabled': True, 'dealMissThreshold': 0.5,
    'declarerCanDealMiss': False,   # 공약을 따낸 주공은 딜미스 선언 불가
    'jokerCallEnabled': True, 'jokerCallBaseSuit': 'C', 'jokerCallAltSuit': 'H',
    'jokerCallMightyProtect': True,   # 조커콜 시 마이티로 조커 보호 허용
    'firstTrickJokerNoGiruda': True,  # 초구 조커 선으로 기루다 지정 금지
    'firstTrickNoJokerCall': True, 'firstTrickJokerWeak': True,
    'lastTrickJokerWeak': True, 'firstTrickNoGirudaLead': True,
    'discardPointsTo': 'declarer',
    'scoring': {
        'baseTricks': 13, 'perBid': 300, 'perDiff': 200, 'winBonus': 1,
        'noGirudaMult': 2, 'cap': 2000, 'noGirudaCap': 3000, 'runScore': 20,
        'declarerShare': 2, 'selfDeclarerShare': 4, 'friendShare': 1,
    },
    'seed': None,
}


def make_rng(seed):
    """JS mulberry32와 비트 단위 동일."""
    if seed is None:
        import random
        return random.random
    M = 0xFFFFFFFF
    a = seed & M

    def rng():
        nonlocal a
        a = (a + 0x6D2B79F5) & M
        t = ((a ^ (a >> 15)) * ((a | 1) & M)) & M                 # imul(a^(a>>>15), 1|a)
        t = (((t + (((t ^ (t >> 7)) * ((t | 61) & M)) & M)) & M) ^ t) & M
        return ((t ^ (t >> 14)) & M) / 4294967296
    return rng


# ---------------- 카드 유틸 ----------------
def card_id(c):
    return JOKER if c == JOKER else c[0] + str(c[1])


def parse_card(s):
    return JOKER if s == JOKER else (s[0], int(s[1:]))


def is_joker(c):
    return c == JOKER


def is_point(c):
    return (not is_joker(c)) and c[1] >= 10


def same(a, b):
    return a == b


def deal_miss_value(hand):
    """딜미스 점수합: J,Q,K,A=1 · 10=0.5 · 조커=-1"""
    v = 0.0
    for c in hand:
        if is_joker(c):
            v -= 1
        elif c[1] >= 11:
            v += 1
        elif c[1] == 10:
            v += 0.5
    return v


def build_deck():
    deck = [(s, r) for s in SUITS for r in RANKS]
    deck.append(JOKER)
    return deck


def deep_merge(base, over):
    for k, v in (over or {}).items():
        if isinstance(v, dict) and isinstance(base.get(k), dict):
            deep_merge(base[k], v)
        else:
            base[k] = v
    return base


# ---------------- 스코어링 (엑셀 수식) ----------------
def compute_round_score(bid, won, no_giruda, sc):
    win = won >= bid
    base = (bid - sc['baseTricks']) * sc['perBid'] * (1 if win else -1)
    diff = (won - bid + sc['winBonus']) * sc['perDiff'] if win else (won - bid) * sc['perDiff']
    score = (base + diff) * (sc['noGirudaMult'] if no_giruda else 1)
    cap = sc['noGirudaCap'] if no_giruda else sc['cap']
    prize = cap if won == sc['runScore'] else max(-cap, min(cap, score))
    return win, score, prize


def distribute_prize(prize, declarer, friend, n, sc):
    out = [0] * n
    is_self = friend is None or friend == declarer
    for p in range(n):
        if p == declarer:
            out[p] = prize * (sc['selfDeclarerShare'] if is_self else sc['declarerShare'])
        elif (not is_self) and p == friend:
            out[p] = prize * sc['friendShare']
        else:
            out[p] = -prize
    return out


# ---------------- 게임 본체 ----------------
class MightyGame:
    def __init__(self, config=None):
        import copy
        self.config = deep_merge(copy.deepcopy(DEFAULT_CONFIG), config or {})
        self.rng = make_rng(self.config['seed'])
        self.phase = 'idle'
        self.declarer = None
        self.contract = None
        self.friend = None
        self.friend_decl = None
        self.friend_revealed = False
        self.discard = []
        self.redeal_reason = None

    # ---------- 딜 ----------
    def start(self, dealer=0):
        deck = build_deck()
        for i in range(len(deck) - 1, 0, -1):
            j = math.floor(self.rng() * (i + 1))
            deck[i], deck[j] = deck[j], deck[i]
        self.dealer = dealer
        self.hands = [deck[p * HAND_SIZE:(p + 1) * HAND_SIZE] for p in range(NUM_PLAYERS)]
        self.floor = deck[NUM_PLAYERS * HAND_SIZE:]

        # 딜미스는 자동이 아닌 '선언 가능' 자격 (JS v0.8 파리티)
        self.phase = 'bidding'
        self.bidding = {'turn': (dealer if self.config['bidStartsAtDealer']
                                 else dealer + 1) % NUM_PLAYERS,
                        'active': [True] * NUM_PLAYERS, 'best': None}
        return self

    # ---------- 공통 ----------
    def deal_miss_eligible(self, p):
        if not self.config['dealMissEnabled']:
            return False
        return deal_miss_value(self.hands[p]) <= self.config['dealMissThreshold']

    @property
    def current_player(self):
        if self.phase == 'bidding':
            return self.bidding['turn']
        if self.phase in ('floor', 'friend'):
            return self.declarer
        if self.phase == 'dealMissWindow':
            return self.dm_queue[self.dm_idx]
        if self.phase == 'play':
            return self.play['turn']
        return None

    def act(self, action):
        ph = self.phase
        if ph == 'bidding':
            return self._act_bid(action)
        if ph == 'floor':
            return self._act_exchange(action)
        if ph == 'friend':
            return self._act_friend(action)
        if ph == 'dealMissWindow':
            return self._act_deal_miss_window(action)
        if ph == 'play':
            return self._act_play(action)
        raise RuntimeError(f'no actions in phase {ph}')

    # ---------- 비딩 ----------
    def _min_legal_bid(self, giruda):
        disc = self.config['noGirudaBidDiscount'] if giruda == 'N' else 0
        floor_ = self.config['minBid'] - disc
        best = self.bidding['best']
        if not best:
            return floor_
        return max(floor_, best['count'] + 1)

    def legal_bids(self):
        acts = [{'type': 'pass'}]
        if self.deal_miss_eligible(self.bidding['turn']):
            acts.append({'type': 'dealMiss'})
        for g in SUITS + ['N']:
            mn = self._min_legal_bid(g)
            for c in range(mn, self.config['maxBid'] + 1):
                acts.append({'type': 'bid', 'count': c, 'giruda': g})
        return acts

    def _act_bid(self, action):
        b = self.bidding
        p = b['turn']
        if action['type'] == 'dealMiss':
            if not self.deal_miss_eligible(p):
                raise ValueError('not eligible for deal-miss')
            self.phase = 'redeal'
            self.redeal_reason = {'type': 'dealMiss', 'player': p}
            return self
        if action['type'] == 'pass':
            b['active'][p] = False
        elif action['type'] == 'bid':
            mn = self._min_legal_bid(action['giruda'])
            if action['count'] < mn or action['count'] > self.config['maxBid']:
                raise ValueError(f"illegal bid {action['count']}{action['giruda']}")
            b['best'] = {'player': p, 'count': action['count'], 'giruda': action['giruda']}
        else:
            raise ValueError('bidding: expected bid|pass')

        remaining = sum(b['active'])
        if remaining == 0:
            if b['best']:
                return self._finish_bidding()
            self.phase = 'redeal'
            self.redeal_reason = {'type': 'allPass'}
            return self
        if remaining == 1 and b['best'] and b['active'][b['best']['player']]:
            return self._finish_bidding()
        while True:
            b['turn'] = (b['turn'] + 1) % NUM_PLAYERS
            if b['active'][b['turn']]:
                break
        return self

    def _finish_bidding(self):
        best = self.bidding['best']
        self.declarer = best['player']
        self.contract = {'count': best['count'], 'giruda': best['giruda']}
        self.hands[self.declarer].extend(self.floor)
        self.floor_original = list(self.floor)
        self.floor = []
        self.phase = 'floor'
        return self

    # ---------- 바닥패 교환 ----------
    def _act_exchange(self, action):
        if action['type'] != 'exchange':
            raise ValueError('floor: expected exchange')
        hand = self.hands[self.declarer]
        disc = action['discard']
        if not disc or len(disc) != FLOOR_SIZE:
            raise ValueError(f'must discard exactly {FLOOR_SIZE}')

        revise = action.get('revise')
        if revise and self.config['allowBidRevise']:
            cur = self.contract
            if revise['giruda'] != cur['giruda']:
                cost = (self.config['toNoGirudaChangeCost'] if revise['giruda'] == 'N'
                        else self.config['girudaChangeCost'])
                if revise['count'] < cur['count'] + cost:
                    raise ValueError('revise cost')
            elif revise['count'] < cur['count']:
                raise ValueError('cannot lower bid')
            if revise['count'] > self.config['maxBid']:
                raise ValueError('exceeds max bid')

        used, idxs = set(), []
        for c in disc:
            found = -1
            for i, h in enumerate(hand):
                if i not in used and same(h, c):
                    found = i
                    break
            if found < 0:
                raise ValueError(f'discard card not in hand: {card_id(c)}')
            used.add(found)
            idxs.append(found)
        for i in sorted(idxs, reverse=True):
            hand.pop(i)
        self.discard = list(disc)
        if revise and self.config['allowBidRevise']:
            self.contract = {'count': revise['count'], 'giruda': revise['giruda']}
        self.phase = 'friend'
        return self

    # ---------- 마이티/조커콜 ----------
    @property
    def mighty_card(self):
        return ('D', 14) if self.contract['giruda'] == 'S' else ('S', 14)

    @property
    def joker_call_card(self):
        base = self.config.get('jokerCallBaseSuit', 'C')
        s = base
        if self.contract['giruda'] == base:
            s = self.config.get('jokerCallAltSuit')
            if not s or s == base:
                s = 'C' if base == 'H' else 'H'
        return (s, 3)

    # ---------- 프렌드 ----------
    def _act_friend(self, action):
        if action['type'] != 'friend':
            raise ValueError('friend: expected friend')
        self.friend_decl = {'mode': action['mode'], 'card': action.get('card')}
        self.friend = None
        self.friend_revealed = False
        if action['mode'] == 'card':
            card = action['card']
            for p in range(NUM_PLAYERS):
                if any(same(c, card) for c in self.hands[p]):
                    self.friend = None if p == self.declarer else p
                    break
        elif action['mode'] == 'none':
            self.friend = None
            self.friend_revealed = True
        # 딜미스 창구 (공약·바닥패 확정 후, 자격자 좌석 순)
        allow_decl = self.config.get('declarerCanDealMiss', False)
        self.dm_queue = [p for p in range(NUM_PLAYERS)
                         if self.config['dealMissEnabled'] and self.deal_miss_eligible(p)
                         and (allow_decl or p != self.declarer)]
        if self.dm_queue:
            self.phase = 'dealMissWindow'
            self.dm_idx = 0
        else:
            self._start_play()
        return self

    def _act_deal_miss_window(self, action):
        p = self.dm_queue[self.dm_idx]
        if action['type'] == 'dealMiss':
            if p == self.declarer and not self.config.get('declarerCanDealMiss', False):
                raise ValueError('declarer cannot declare a misdeal')
            self.phase = 'redeal'
            self.redeal_reason = {'type': 'dealMiss', 'player': p}
            return self
        if action['type'] != 'proceed':
            raise ValueError('dealMissWindow: expected dealMiss|proceed')
        self.dm_idx += 1
        if self.dm_idx >= len(self.dm_queue):
            self._start_play()
        return self

    # ---------- 플레이 ----------
    def _start_play(self):
        self.phase = 'play'
        self.play = {
            'trickNo': 1, 'leader': self.declarer, 'turn': self.declarer,
            'table': [], 'ledSuit': None, 'jokerCallActive': False,
            'capturedPoints': [0] * NUM_PLAYERS,
            'capturedCards': [[] for _ in range(NUM_PLAYERS)],
            'tricksWon': [0] * NUM_PLAYERS,
            'history': [], 'lastTrickWinner': None,
        }

    def _has_suit(self, p, suit):
        return any((not is_joker(c)) and c[0] == suit for c in self.hands[p])

    def legal_plays(self, p):
        pl = self.play
        hand = self.hands[p]
        cfg = self.config
        g = self.contract['giruda']
        leading = len(pl['table']) == 0
        moves = []

        if pl['jokerCallActive'] and any(is_joker(c) for c in hand):
            forced = [{'card': JOKER, 'forced': True}]
            if cfg.get('jokerCallMightyProtect', True):
                m = next((c for c in hand
                          if (not is_joker(c)) and same(c, self.mighty_card)), None)
                if m is not None:
                    forced.append({'card': m, 'protect': True})
            return forced

        if leading:
            ban_giruda = (cfg['firstTrickNoGirudaLead'] and
                          cfg.get('firstTrickJokerNoGiruda', True) and
                          pl['trickNo'] == 1 and g != 'N')
            for c in hand:
                if is_joker(c):
                    for s in SUITS:
                        if ban_giruda and s == g:
                            continue
                        moves.append({'card': JOKER, 'jokerSuit': s})
                    continue
                if (cfg['firstTrickNoGirudaLead'] and pl['trickNo'] == 1
                        and g != 'N' and c[0] == g):
                    if any((not is_joker(h)) and h[0] != g for h in hand):
                        continue
                moves.append({'card': c})
                if cfg['jokerCallEnabled'] and same(c, self.joker_call_card):
                    if not (cfg['firstTrickNoJokerCall'] and pl['trickNo'] == 1):
                        moves.append({'card': c, 'jokerCall': True})
            return moves

        must = pl['ledSuit'] and self._has_suit(p, pl['ledSuit'])
        for c in hand:
            if is_joker(c):
                moves.append({'card': JOKER})
                continue
            if same(c, self.mighty_card):
                moves.append({'card': c})
                continue
            if must and c[0] != pl['ledSuit']:
                continue
            moves.append({'card': c})
        return moves

    def _act_play(self, action):
        pl = self.play
        p = pl['turn']
        legal = self.legal_plays(p)
        match = None
        for m in legal:
            if (same(m['card'], action['card'])
                    and bool(m.get('jokerCall')) == bool(action.get('jokerCall'))
                    and ('jokerSuit' not in m or m['jokerSuit'] == action.get('jokerSuit'))):
                match = m
                break
        if match is None:
            raise ValueError(f'illegal play: {card_id(action["card"])} by P{p}')

        hand = self.hands[p]
        for i, h in enumerate(hand):
            if same(h, action['card']):
                hand.pop(i)
                break

        entry = {'player': p, 'card': action['card']}
        if is_joker(action['card']) and len(pl['table']) == 0:
            entry['jokerSuit'] = action.get('jokerSuit')
        if action.get('jokerCall'):
            entry['jokerCall'] = True
            pl['jokerCallActive'] = True
        pl['table'].append(entry)

        if len(pl['table']) == 1:
            pl['ledSuit'] = (action.get('jokerSuit') if is_joker(action['card'])
                             else action['card'][0])

        fd = self.friend_decl
        if (fd['mode'] == 'card' and not self.friend_revealed
                and fd['card'] and same(action['card'], fd['card'])):
            self.friend_revealed = True

        if len(pl['table']) == NUM_PLAYERS:
            self._resolve_trick()
        else:
            pl['turn'] = (pl['turn'] + 1) % NUM_PLAYERS
        return self

    def card_strength(self, entry, pl):
        cfg = self.config
        g = self.contract['giruda']
        c = entry['card']
        if (not is_joker(c)) and same(c, self.mighty_card):
            return (4, 0)
        if is_joker(c):
            weak = (pl['jokerCallActive']
                    or (cfg['firstTrickJokerWeak'] and pl['trickNo'] == 1)
                    or (cfg['lastTrickJokerWeak'] and pl['trickNo'] == HAND_SIZE))
            return (-1, 0) if weak else (3, 0)
        if g != 'N' and c[0] == g:
            return (2, c[1])
        if c[0] == pl['ledSuit']:
            return (1, c[1])
        return (0, 0)

    def _resolve_trick(self):
        pl = self.play
        best, bk = None, (-2, -1)
        for e in pl['table']:
            k = self.card_strength(e, pl)
            if k[0] > bk[0] or (k[0] == bk[0] and k[1] > bk[1]):
                bk, best = k, e
        winner = best['player']
        pts = [e for e in pl['table'] if is_point(e['card'])]
        pl['capturedPoints'][winner] += len(pts)
        pl['capturedCards'][winner].extend(e['card'] for e in pts)
        pl['tricksWon'][winner] += 1
        pl['history'].append({'trickNo': pl['trickNo'], 'leader': pl['leader'],
                              'plays': list(pl['table']), 'winner': winner,
                              'points': len(pts)})
        if self.friend_decl['mode'] == 'first' and pl['trickNo'] == 1:
            self.friend = None if winner == self.declarer else winner
            self.friend_revealed = True
        pl['lastTrickWinner'] = winner

        if pl['trickNo'] == HAND_SIZE:
            return self._finish_game()
        pl['trickNo'] += 1
        pl['leader'] = winner
        pl['turn'] = winner
        pl['table'] = []
        pl['ledSuit'] = None
        pl['jokerCallActive'] = False

    def _finish_game(self):
        pl = self.play
        cfg = self.config
        disc_pts = sum(1 for c in self.discard if is_point(c))
        yeodang = pl['capturedPoints'][self.declarer]
        if self.friend is not None:
            yeodang += pl['capturedPoints'][self.friend]
        if disc_pts > 0:
            if cfg['discardPointsTo'] == 'declarer':
                yeodang += disc_pts
            elif cfg['discardPointsTo'] == 'lastTrickWinner':
                w = pl['lastTrickWinner']
                if w == self.declarer or w == self.friend:
                    yeodang += disc_pts
        no_g = self.contract['giruda'] == 'N'
        win, score, prize = compute_round_score(self.contract['count'], yeodang, no_g,
                                                cfg['scoring'])
        prizes = distribute_prize(prize, self.declarer, self.friend, NUM_PLAYERS,
                                  cfg['scoring'])
        self.phase = 'done'
        self.result = {
            'declarer': self.declarer, 'friend': self.friend,
            'contract': dict(self.contract), 'noGiruda': no_g,
            'yeodangPoints': yeodang, 'yadangPoints': TOTAL_POINT_CARDS - yeodang,
            'discardPoints': disc_pts, 'win': win, 'score': score, 'prize': prize,
            'prizes': prizes, 'run': yeodang == cfg['scoring']['runScore'],
            'backRun': yeodang == 0,
            'tricksWon': list(pl['tricksWon']),
            'capturedPoints': list(pl['capturedPoints']),
        }
        return self
