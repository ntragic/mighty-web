"""
mighty_encode.py — 마이티 RL 관측/행동 인코딩 + 환경 래퍼 (DGX Spark 학습용)

[행동 공간: flat 207, 페이즈별 legal mask]
  0        : PASS (비딩)
  1..40    : BID  — 1 + giruda_idx*8 + (count-13),  giruda [S,D,H,C,N], count 13..20
  41..93   : DISCARD — 41 + card_idx (0..52). 3회 순차 선택 후 자동 exchange 제출
  94..148  : FRIEND — 94+card_idx 카드 프렌드 / 147 초구 / 148 노프렌드
  149..206 : PLAY — 149+card_idx(일반 0..51) / 201..204 조커 선출(무늬 S,D,H,C)
             / 205 조커(팔로우) / 206 조커콜 카드+콜 선언

[관측: 아래 OBS 레이아웃, 자기중심(rel seat = (p-me)%5)]
  모든 특징은 행위자 시점의 공개 정보만 사용 (숨은 프렌드 점수 비유출).
  보이드 행렬·무늬별 미출현 카운트 포함 → 으뜸무늬 추정/정리 학습의 기반.
"""
from __future__ import annotations
import numpy as np
from mighty_engine import (MightyGame, SUITS, JOKER, NUM_PLAYERS, HAND_SIZE,
                           is_joker, is_point, same, card_id)

SUIT_IDX = {s: i for i, s in enumerate(SUITS)}
GIRUDA5 = SUITS + ['N']

def cidx(c):
    return 52 if is_joker(c) else SUIT_IDX[c[0]] * 13 + (c[1] - 2)

def idx_card(i):
    return JOKER if i == 52 else (SUITS[i // 13], i % 13 + 2)

# ---------------- 행동 공간 ----------------
# 학습 커리큘럼 스위치: 초반에만 "4명 패스 시 마지막 좌석 패스 불가"를 건다.
# 주공 경험이 전혀 없으면 정책이 입찰의 가치를 추정할 수 없어 전원 패스로 붕괴한다.
# 커리큘럼을 끄면 마스크가 실제 룰과 완전히 일치한다 (핸드오프 3-1 준수).
FORCE_LAST_BID = 0.0        # 0~1 확률. 1이면 항상 강제, 0이면 룰 그대로.

A_PASS = 0
A_BID0 = 1                    # 1..40
A_DISC0 = 41                  # 41..93
A_FRIEND0 = 94                # 94..146 카드 / 147 초구 / 148 노프렌드
A_FRIEND_FIRST = 147
A_FRIEND_NONE = 148
A_PLAY0 = 149                 # 149..200 일반 카드
A_PLAY_JOKER_SUIT0 = 201      # 201..204
A_PLAY_JOKER = 205
A_PLAY_JOKERCALL = 206
A_DEALMISS = 207              # 딜미스 선언 (비딩 중 or 창구)
A_PROCEED = 208               # 창구에서 진행
ACTION_DIM = 209

def bid_action(count, giruda):
    return A_BID0 + GIRUDA5.index(giruda) * 8 + (count - 13)

def decode_bid(a):
    a -= A_BID0
    return {'type': 'bid', 'count': a % 8 + 13, 'giruda': GIRUDA5[a // 8]}

# ---------------- 관측 레이아웃 ----------------
class _Layout:
    def __init__(self):
        self.sections = []
        self.dim = 0
    def add(self, name, n):
        self.sections.append((name, self.dim, n))
        self.dim += n
        return self.dim - n

L = _Layout()
O_PHASE   = L.add('phase5', 5)             # bidding/floor/friend/dealMissWindow/play
O_HAND    = L.add('hand53', 53)
O_GIRUDA  = L.add('giruda6', 6)            # S,D,H,C,N,미정
O_COUNT   = L.add('count8', 8)             # 13..20 one-hot (미정=all0)
O_DECL    = L.add('declarer_rel6', 6)      # rel0..4 + 미정
O_FDMODE  = L.add('friend_mode4', 4)       # 미선언/card/first/none
O_FCARD   = L.add('friend_card53', 53)
O_FREV    = L.add('friend_rev_rel7', 7)    # revealed flag + rel0..4 + self(주공셀프)
O_FKNOW   = L.add('friend_知2', 2)         # 내가 프렌드카드 보유 / 내가 여당 확실
O_BID     = L.add('bid_ctx13', 13)         # best count scaled1 + giruda6 + rel6
O_ACTIVE  = L.add('bid_active5', 5)
O_TRICK   = L.add('trick11', 11)           # one-hot10 + scaled
O_LED     = L.add('led5', 5)               # S,D,H,C,none
O_JC      = L.add('jokercall_ctx3', 3)     # active + 조커콜카드 내보유 + 조커 내보유
O_TABLE   = L.add('table4x54', 216)        # rel1..4 낸 카드(53)+없음(1)
O_PLAYED  = L.add('played53', 53)
O_OUTCNT  = L.add('suit_counts8', 8)       # 미출현(내손제외)/13 ×4 + 내손/13 ×4
O_CAPT    = L.add('captured10', 10)        # rel별 획득점/20 ×5 + 트릭/10 ×5
O_VOID    = L.add('void4x4', 16)           # rel1..4 × suit 보이드 추론
O_DISC    = L.add('discard54', 54)         # 주공만: 묻은 카드53 + 점수/3
O_KEY     = L.add('key_cards4', 4)         # mighty_out, joker_out, 내 마이티, 내 조커
O_TEAM    = L.add('team_pts3', 3)          # 아는 여당/야당/미확정 점수 /20
O_PICK    = L.add('discard_pick54', 54)    # 교환 중 선택 누적
O_DEALER  = L.add('dealer_rel5', 5)
O_DMVAL   = L.add('dm_ctx2', 2)            # 내 딜미스 점수합/3 + 자격 플래그
# --- v3: 좌석별 플레이 이력 요약 (신호·손패 추론의 기반) ---
O_HSUIT   = L.add('hist_suit16', 16)      # rel1..4 × 무늬별 낸 장수/5
O_HMAX    = L.add('hist_max16', 16)       # rel1..4 × 무늬별 최고 랭크
O_HTRUMP  = L.add('hist_trump4', 4)       # rel1..4 기루다 소비/5
O_HLEAD   = L.add('hist_lead20', 20)      # rel1..4 × 리드무늬4 + 리드횟수4
O_HKEY    = L.add('hist_key8', 8)         # rel1..4 × (마이티 사용, 조커 사용)
# --- v3: 자기 패의 상대 강도 (먹을 수 있는 트릭 판단의 기반) ---
O_STR     = L.add('suit_strength16', 16)  # 무늬별 (최강보유, 상위3중 보유비, 보이드, 점유율)
O_TSTR    = L.add('trump_strength2', 2)   # 기루다 점유율 + 밖보다 긴가
# --- v5: 룰 파라미터 블록 (도메인 랜덤화 대응) ---
# 관측 끝에 덧붙인다. 앞부분 688만 쓰는 구버전 모델(v4)은 그대로 동작한다.
# --- v5: 키카드 판단 근거 (현재 트릭 상태 · 무늬별 바깥 최고 · 키카드 소재 추론) ---
O_TCTX    = L.add('trick_ctx20', 20)      # 뒤에 남은 인원5 + 최강 rel6 + 최강 등급5 + 랭크1 + 아군여부3
O_TOPOUT  = L.add('top_out8', 8)          # 무늬별 바깥 최고 랭크/14 ×4 + 내가 그 위 보유 ×4
O_KCAND   = L.add('key_cand9', 9)         # rel1..4 마이티 가능 ×4 + 조커 가능 ×4 + 내 남은 장수/10
O_RULE    = L.add('rule_ctx14', 14)
# --- Phase B: 트릭 토큰 시퀀스 (완료 10 + 진행중 1, 토큰당 81) ---
# 관측 끝에 평탄화해 붙인다 — 수집기·ONNX 입출력·파리티 체계 무변경.
# 네트워크(--attn)만 이 블록을 [11,81]로 reshape해 트랜스포머로 인코딩한다.
# 앞 739만 읽는 v5 이하 모델은 그대로 동작한다.
# 토큰 구성: 낸 순서 j=0..4 × [present1 + 좌석rel5 + 무늬4 + 랭크1 + 조커/마이티/점수/기루다4]
#            = 15×5 = 75, + 승자rel5 + 트릭번호1 = 81
TOK_N, TOK_D = 11, 81
O_TOK     = L.add('trick_tok891', TOK_N * TOK_D)
OBS_DIM = L.dim

RULE_DIM = 14

def encode_rules(cfg):
    """룰 설정을 관측 벡터로. 값 범위는 대략 0~1로 맞춘다."""
    sc = cfg.get('scoring', {})
    dp = cfg.get('discardPointsTo', 'declarer')
    return [
        (cfg.get('minBid', 14) - 12) / 8.0,
        cfg.get('noGirudaBidDiscount', 0) / 2.0,
        1.0 if cfg.get('dealMissEnabled', True) else 0.0,
        cfg.get('dealMissThreshold', 0.5),
        1.0 if cfg.get('declarerCanDealMiss', False) else 0.0,
        1.0 if cfg.get('jokerCallEnabled', True) else 0.0,
        1.0 if cfg.get('jokerCallMightyProtect', True) else 0.0,
        1.0 if cfg.get('firstTrickJokerWeak', True) else 0.0,
        1.0 if cfg.get('lastTrickJokerWeak', True) else 0.0,
        1.0 if dp == 'declarer' else 0.0,
        1.0 if dp == 'defenders' else 0.0,
        sc.get('perDiff', 200) / float(sc.get('perBid', 300) or 300),
        sc.get('noGirudaMult', 2) / 3.0,
        sc.get('friendShare', 1) / 2.0,
    ]


def encode(game: MightyGame, me: int, pick_buffer=None) -> np.ndarray:
    o = np.zeros(OBS_DIM, dtype=np.float32)
    ph = game.phase
    o[O_PHASE + ['bidding', 'floor', 'friend', 'dealMissWindow', 'play'].index(ph)] = 1
    from mighty_engine import deal_miss_value
    dmv = deal_miss_value(game.hands[me])
    o[O_DMVAL + 0] = max(-1.0, min(1.0, dmv / 3.0))
    o[O_DMVAL + 1] = 1.0 if game.deal_miss_eligible(me) else 0.0
    for c in game.hands[me]:
        o[O_HAND + cidx(c)] = 1
    rel = lambda p: (p - me) % NUM_PLAYERS
    o[O_DEALER + rel(game.dealer)] = 1

    ct = game.contract
    if ct:
        o[O_GIRUDA + GIRUDA5.index(ct['giruda'])] = 1
        o[O_COUNT + min(7, max(0, ct['count'] - 13))] = 1
        o[O_DECL + rel(game.declarer)] = 1
        # 마이티/조커콜 보유
        if any(same(c, game.mighty_card) for c in game.hands[me]):
            o[O_KEY + 2] = 1
        if any(same(c, game.joker_call_card) for c in game.hands[me]):
            o[O_JC + 1] = 1
    else:
        o[O_GIRUDA + 5] = 1
        o[O_DECL + 5] = 1
    if any(is_joker(c) for c in game.hands[me]):
        o[O_KEY + 3] = 1
        o[O_JC + 2] = 1

    fd = game.friend_decl
    if fd is None:
        o[O_FDMODE + 0] = 1
    else:
        o[O_FDMODE + {'card': 1, 'first': 2, 'none': 3}[fd['mode']]] = 1
        if fd['mode'] == 'card' and fd['card']:
            o[O_FCARD + cidx(fd['card'])] = 1
            if any(same(c, fd['card']) for c in game.hands[me]):
                o[O_FKNOW + 0] = 1
    if game.friend_revealed:
        o[O_FREV + 0] = 1
        if game.friend is None:
            o[O_FREV + 6] = 1
        else:
            o[O_FREV + 1 + rel(game.friend)] = 1
    if me == (game.declarer if game.declarer is not None else -1) or o[O_FKNOW] or \
       (game.friend_revealed and game.friend == me):
        o[O_FKNOW + 1] = 1

    if ph == 'bidding':
        b = game.bidding
        if b['best']:
            o[O_BID + 0] = (b['best']['count'] - 13) / 7
            o[O_BID + 1 + GIRUDA5.index(b['best']['giruda'])] = 1
            o[O_BID + 7 + rel(b['best']['player'])] = 1
        else:
            o[O_BID + 12] = 1
        for p in range(NUM_PLAYERS):
            if b['active'][p]:
                o[O_ACTIVE + rel(p)] = 1

    # 공개 카드 집계 (플레이 전이면 0)
    played, void = [], np.zeros((NUM_PLAYERS, 4), dtype=np.float32)
    if ph == 'play':
        pl = game.play
        o[O_TRICK + pl['trickNo'] - 1] = 1
        o[O_TRICK + 10] = pl['trickNo'] / 10
        if pl['ledSuit']:
            o[O_LED + SUIT_IDX[pl['ledSuit']]] = 1
        else:
            o[O_LED + 4] = 1
        if pl['jokerCallActive']:
            o[O_JC + 0] = 1
        for r in range(1, NUM_PLAYERS):
            o[O_TABLE + (r - 1) * 54 + 53] = 1  # 기본 '없음'
        for e in pl['table']:
            r = rel(e['player'])
            if r != 0:
                o[O_TABLE + (r - 1) * 54 + 53] = 0
                o[O_TABLE + (r - 1) * 54 + cidx(e['card'])] = 1
        for t in pl['history']:
            led = t['plays'][0].get('jokerSuit') or (
                None if is_joker(t['plays'][0]['card']) else t['plays'][0]['card'][0])
            for e in t['plays']:
                played.append(e['card'])
                c = e['card']
                if led and (not is_joker(c)) and c[0] != led and not same(c, game.mighty_card):
                    void[e['player']][SUIT_IDX[led]] = 1
        for e in pl['table']:
            played.append(e['card'])
        for c in played:
            o[O_PLAYED + cidx(c)] = 1
        for r in range(1, NUM_PLAYERS):
            p = (me + r) % NUM_PLAYERS
            o[O_VOID + (r - 1) * 4: O_VOID + r * 4] = void[p]
        for r in range(NUM_PLAYERS):
            p = (me + r) % NUM_PLAYERS
            o[O_CAPT + r] = pl['capturedPoints'][p] / 20
            o[O_CAPT + 5 + r] = pl['tricksWon'][p] / 10
        # 팀 점수 (행위자 지식 기준)
        known = [game.declarer]
        ruling = pl['capturedPoints'][game.declarer]
        fknown = False
        if game.friend_revealed:
            if game.friend is not None:
                ruling += pl['capturedPoints'][game.friend]
                known.append(game.friend)
            fknown = True
        elif o[O_FKNOW + 0]:
            ruling += pl['capturedPoints'][me]
            known.append(me)
            fknown = True
        opp = unk = 0
        for p in range(NUM_PLAYERS):
            if p in known:
                continue
            if fknown or p == me:
                opp += pl['capturedPoints'][p]
            else:
                unk += pl['capturedPoints'][p]
        o[O_TEAM + 0], o[O_TEAM + 1], o[O_TEAM + 2] = ruling / 20, opp / 20, unk / 20

    # 무늬별 카운트 (미출현 = 53 - 출현 - 내 손, 주공은 묻은패 인지)
    seen = set(map(card_id, played)) | set(map(card_id, game.hands[me]))
    if game.declarer == me and game.discard:
        for c in game.discard:
            seen.add(card_id(c))
        for c in game.discard:
            o[O_DISC + cidx(c)] = 1
        o[O_DISC + 53] = sum(1 for c in game.discard if is_point(c)) / 3
    for si, s in enumerate(SUITS):
        out = sum(1 for r in range(2, 15) if s + str(r) not in seen)
        mine = sum(1 for c in game.hands[me] if (not is_joker(c)) and c[0] == s)
        o[O_OUTCNT + si] = out / 13
        o[O_OUTCNT + 4 + si] = mine / 13
    if ct:
        o[O_KEY + 0] = 1 if card_id(game.mighty_card) not in seen else 0
    o[O_KEY + 1] = 1 if JOKER not in seen else 0

    # ---- v3: 좌석별 이력 요약 (누가 무엇을 냈는가 — 신호 학습의 전제) ----
    if ph == 'play':
        pl = game.play
        gir = ct['giruda'] if ct else None
        entries = [(t['plays'], t['plays'][0]['player']) for t in pl['history']]
        entries.append((pl['table'], pl['table'][0]['player'] if pl['table'] else None))
        for plays, leader in entries:
            if plays and leader is not None:
                lc = plays[0]['card']
                lsuit = plays[0].get('jokerSuit') or (None if is_joker(lc) else lc[0])
                rl = rel(leader)
                if rl != 0:
                    o[O_HLEAD + 16 + (rl - 1)] += 0.1
                    if lsuit:
                        o[O_HLEAD + (rl - 1) * 4 + SUIT_IDX[lsuit]] += 0.2
            for e in plays:
                r = rel(e['player'])
                if r == 0:
                    continue
                c = e['card']
                if is_joker(c):
                    o[O_HKEY + (r - 1) * 2 + 1] = 1
                    continue
                if ct and same(c, game.mighty_card):
                    o[O_HKEY + (r - 1) * 2] = 1
                si = SUIT_IDX[c[0]]
                o[O_HSUIT + (r - 1) * 4 + si] += 0.2
                o[O_HMAX + (r - 1) * 4 + si] = max(o[O_HMAX + (r - 1) * 4 + si],
                                                   (c[1] - 2) / 12)
                if gir and gir != 'N' and c[0] == gir:
                    o[O_HTRUMP + (r - 1)] += 0.2
        np.clip(o[O_HSUIT:O_HSUIT + 16], 0, 1, out=o[O_HSUIT:O_HSUIT + 16])
        np.clip(o[O_HTRUMP:O_HTRUMP + 4], 0, 1, out=o[O_HTRUMP:O_HTRUMP + 4])
        np.clip(o[O_HLEAD:O_HLEAD + 20], 0, 1, out=o[O_HLEAD:O_HLEAD + 20])

    # ---- v3: 무늬별 자기 패 상대 강도 ----
    for si, s in enumerate(SUITS):
        mine = sorted((c[1] for c in game.hands[me]
                       if (not is_joker(c)) and c[0] == s), reverse=True)
        outr = [r for r in range(2, 15) if s + str(r) not in seen]
        base = O_STR + si * 4
        if not mine:
            o[base + 2] = 1.0                                   # 보이드
            continue
        o[base + 0] = 1.0 if (not outr or mine[0] > max(outr)) else 0.0
        top3 = sorted(outr + mine, reverse=True)[:3]
        o[base + 1] = sum(1 for r in top3 if r in mine) / 3.0
        o[base + 3] = len(mine) / float(len(mine) + len(outr))
    if ct and ct['giruda'] != 'N':
        g_ = ct['giruda']
        mt = sum(1 for c in game.hands[me] if (not is_joker(c)) and c[0] == g_)
        ot = sum(1 for r in range(2, 15) if g_ + str(r) not in seen)
        if mt + ot:
            o[O_TSTR + 0] = mt / float(mt + ot)
        o[O_TSTR + 1] = 1.0 if mt > ot else 0.0

    if pick_buffer:
        o[O_PICK + 53] = len(pick_buffer) / 3
        for c in pick_buffer:
            o[O_PICK + cidx(c)] = 1
    # --- v5 추론 블록 ---
    if ph == 'play':
        pl = game.play
        # 뒤에 남은 인원 (내 차례 기준)
        acted = set(e['player'] for e in pl['table'])
        rem = sum(1 for p in range(NUM_PLAYERS) if p != me and p not in acted)
        o[O_TCTX + min(4, rem)] = 1
        # 현재 최강
        best, bk = None, (-2, -1)
        for e in pl['table']:
            k = game.card_strength(e, pl)
            if k > bk:
                bk, best = k, e
        if best is None:
            o[O_TCTX + 5 + 5] = 1                      # 최강 없음 (내가 리드)
        else:
            o[O_TCTX + 5 + rel(best['player'])] = 1
            tier = {4: 4, 3: 3, 2: 2, 1: 1}.get(bk[0], 0)
            o[O_TCTX + 11 + tier] = 1
            o[O_TCTX + 16] = bk[1] / 14.0
            # 최강이 아군인가 (내가 아는 범위)
            decl = game.declarer
            i_ruling = (me == decl) or (game.friend_revealed and game.friend == me) or (
                game.friend_decl and game.friend_decl.get('mode') == 'card' and
                game.friend_decl.get('card') is not None and
                any(same(x, game.friend_decl['card']) for x in game.hands[me]))
            wo = None
            if best['player'] == decl:
                wo = not i_ruling
            elif game.friend_revealed:
                w = (game.friend is not None and best['player'] == game.friend)
                wo = (not w) if i_ruling else w
            o[O_TCTX + 17 + (2 if wo is None else (1 if wo else 0))] = 1
        # 무늬별 바깥 최고 랭크 + 내가 그 위를 쥐었는가
        for si, su in enumerate(SUITS):
            top_out = 0
            for r in range(14, 1, -1):
                if (su + str(r)) not in seen:
                    top_out = r
                    break
            o[O_TOPOUT + si] = top_out / 14.0
            mine_top = max([c[1] for c in game.hands[me]
                            if (not is_joker(c)) and c[0] == su], default=0)
            o[O_TOPOUT + 4 + si] = 1.0 if (mine_top and mine_top > top_out) else 0.0
        # 마이티·조커를 아직 쥐고 있을 수 있는 좌석 (보이드 추론 + 프렌드 선언 함의)
        m_seen = card_id(game.mighty_card) in seen
        j_seen = JOKER in seen or 'JOKER' in seen
        m_suit = SUIT_IDX[game.mighty_card[0]]
        # 프렌드 선언 함의 — 주공이 마이티/조커 프렌드를 불렀다면 주공에겐 그 카드가
        # 없고, 미공개 카드 프렌드라면 보유자(=프렌드)에게 있다. 이 연역이 빠져
        # 프렌드가 주공 마이티를 뽑는 리드를 두는 결함이 있었다(2026-08-08 제보 2건).
        fd2 = game.friend_decl
        decl2 = game.declarer
        fr2 = game.friend if game.friend_revealed else None
        m_decl_no = (fd2 and fd2.get('mode') == 'card' and fd2.get('card')
                     and same(fd2['card'], game.mighty_card))
        j_decl_no = (fd2 and fd2.get('mode') == 'card' and fd2.get('card')
                     and is_joker(fd2['card']))
        for r in range(1, NUM_PLAYERS):
            p = (me + r) % NUM_PLAYERS
            m_can = not (m_seen or void[p][m_suit])
            j_can = not j_seen
            if p == decl2:
                if m_decl_no:
                    m_can = False              # 마이티 프렌드 선언 = 주공 마이티 부재
                if j_decl_no:
                    j_can = False              # 조커 프렌드 선언 = 주공 조커 부재
            if fr2 is not None and not m_seen and m_decl_no:
                m_can = (p == fr2)             # 공개된 마이티 프렌드가 보유 확정
            if fr2 is not None and not j_seen and j_decl_no:
                j_can = (p == fr2)
            o[O_KCAND + (r - 1)] = 1.0 if m_can else 0.0
            o[O_KCAND + 4 + (r - 1)] = 1.0 if j_can else 0.0
        o[O_KCAND + 8] = len(game.hands[me]) / 10.0

    rv = encode_rules(game.config)
    for i, v in enumerate(rv):
        o[O_RULE + i] = v

    # ---- Phase B: 트릭 토큰 (플레이 순서 보존 — 손패 추론·다단계 계획의 재료) ----
    if ph == 'play':
        pl = game.play
        gir2 = ct['giruda'] if ct else None
        toks = [(t['plays'], t['winner']) for t in pl['history'][:10]]
        toks.append((pl['table'], None))                  # 진행 중 트릭 = 마지막 토큰
        for ti, (plays, winner) in enumerate(toks):
            base = O_TOK + ti * TOK_D
            for j, e in enumerate(plays[:5]):
                eb = base + j * 15
                c = e['card']
                o[eb + 0] = 1.0
                o[eb + 1 + rel(e['player'])] = 1.0
                if not is_joker(c):
                    o[eb + 6 + SUIT_IDX[c[0]]] = 1.0
                    o[eb + 10] = c[1] / 14.0
                else:
                    o[eb + 11] = 1.0
                if ct and same(c, game.mighty_card):
                    o[eb + 12] = 1.0
                if is_point(c):
                    o[eb + 13] = 1.0
                if gir2 and gir2 != 'N' and (not is_joker(c)) and c[0] == gir2:
                    o[eb + 14] = 1.0
            if winner is not None:
                o[base + 75 + rel(winner)] = 1.0
            o[base + 80] = (ti + 1) / 10.0
    return o


def episode_future(game):
    """끝난 판을 트릭별 승자·점수와 마이티·기루다 소진 시점으로 요약한다.
    미래 예측 보조 헤드(docs/LOOKAHEAD-PLAN.md 1단계)의 라벨 원천이다.
    에피소드가 끝나야 알 수 있으므로 수집기의 종료 처리에서 역채움한다."""
    pl = getattr(game, 'play', None)
    if not pl:
        return None
    gi = game.contract['giruda'] if game.contract else 'N'
    win, pts = {}, {}
    mighty_t, trump_t = -1, -1
    for t in pl['history']:
        no = t['trickNo']
        win[no] = t['winner']
        pts[no] = sum(1 for e in t['plays'] if is_point(e['card']))
        for e in t['plays']:
            c = e['card']
            if is_joker(c):
                continue
            if same(c, game.mighty_card):
                mighty_t = no
            elif gi != 'N' and c[0] == gi:
                trump_t = max(trump_t, no)          # 기루다가 마지막으로 나온 트릭
    return {'win': win, 'pts': pts, 'mighty_t': mighty_t, 'trump_t': trump_t}


FUT_DIM = 4


def future_targets(summ, team, tno):
    """트릭 tno(포함) 이후의 미래 요약 4종. 라벨 −1은 마스크(학습에서 제외).

      0: 남은 트릭 중 우리 팀이 딸 개수 /10      — 템포의 직접 지표
      1: 남은 트릭에서 우리 팀이 얻을 점수 /20   — 컷·보태기의 진짜 값
      2: 마이티가 나올 때까지 남은 트릭 /10      — 이미 나왔으면 마스크
      3: 기루다가 소진될 때까지 남은 트릭 /10    — 소진 루틴의 시야
    """
    if summ is None or tno is None or tno < 1:
        return [-1.0] * FUT_DIM
    ft = fp = 0
    for no, w in summ['win'].items():
        if no < tno:
            continue
        if w in team:
            ft += 1
            fp += summ['pts'][no]
    mi = summ['mighty_t'] - tno
    tg = summ['trump_t'] - tno
    return [ft / 10.0, fp / 20.0,
            mi / 10.0 if summ['mighty_t'] >= tno else -1.0,
            tg / 10.0 if summ['trump_t'] >= tno else -1.0]


def conv_target(game, me, act_card=None, act_jcall=False):
    """E2 관례 증류 교사 — 개입 인증을 통과한 클래스에서만 목표 카드를 돌려준다.

    좌석 가시 정보만 쓴다(전지적 판정 금지 — 잠금 판정은 배포 가드와 같은
    '미출현 카드 위협' 논리). 클래스와 인증치(2026-08-03, 페어드 개입):
      addL : 공개 후·여당·아군 가시확정승·트릭4+ → 최저 점수카드 보태기
             (트릭6+ −7.3±8.4 중립, 트릭4~5 확장 −8.8±9.8 중립 — 2026-08-06 인증)
      feedP: 공개 후·여당·야당 가시확정승 → 비점수·비기루다 최저로 회피 (+12.8±19.2 중립)
      sigW : 공개 후 프렌드가, 주공이 현재 이기고 있는 주공의 기루다 리드에
             최저 점수카드로 응답 (−4.8±5.9 중립; 무조건 응답 sig는 −6.4±5.9 유의손해로 탈락)
      trumpTop: 주공 리드에서 정책이 기루다를 골랐고(act_card), 내 최고 기루다 위
             서열이 밖에 없으며 상대 기루다가 남았으면 최고 기루다
             (+166.8±113.7 유의 이득 — 2026-08-07 인증, 2,400시드.
              리드 무늬 선택까지 강제하는 any는 +69±260 중립이라 미인증 —
              클래스는 '기루다를 내기로 한 결정의 서열 교정'에 한정)
      jcall: 프렌드 카드가 '조커'인 판에서 여당 좌석(주공·공개 프렌드, 조커 미보유)이
             조커콜을 선언 → 선언을 떼고 같은 카드를 그냥 리드
             (+1,101±254 유의 이득 — 2026-08-10 인증, 20,000시드 강제 페어드;
              독립 배치 +1,052±205, 정책 자체 선택 판만 +765±511. jokerCallGuard)
    act_card:  정책이 이 상태에서 고른 카드(일반 카드 플레이일 때만, 아니면 None).
    act_jcall: 정책이 조커콜 액션(A_PLAY_JOKERCALL)을 골랐는가.
    반환: 목표 카드 또는 None.
    """
    if game.phase != 'play':
        return None
    # jcall — 조커 프렌드 판에서 여당의 조커콜. 목표는 '같은 카드를 콜 없이 리드'라
    # 목표 카드 = 조커콜 카드 자신이다(액션 인덱스가 A_PLAY0+cidx로 바뀌면서 콜이 떨어진다).
    if act_jcall:
        fd = game.friend_decl
        if fd and fd.get('mode') == 'card' and fd.get('card') and is_joker(fd['card']):
            if not any(is_joker(c) for c in game.hands[me]):
                ruling = (me == game.declarer
                          or (game.friend_revealed and game.friend is not None
                              and me == game.friend))
                if ruling:
                    jc = game.joker_call_card
                    if any(same(m['card'], jc) for m in game.legal_plays(me)
                           if not m.get('jokerCall')):
                        return jc
        return None
    # tfeed — 공개 후 야당이, 여당이 최강인 기루다 리드 트릭에 이기지 못할 점수
    # 기루다를 태우면 최저 비점수 기루다 (2026-08-08 인증: 발화 판 주공 −895±446)
    if act_card is not None and game.friend_revealed:
        decl0, fr0 = game.declarer, game.friend
        if decl0 is not None and me != decl0 and me != fr0:
            pl0 = game.play
            gi0 = game.contract['giruda'] if game.contract else 'N'
            if pl0['table'] and gi0 != 'N' and pl0['ledSuit'] == gi0:
                c0 = act_card
                if (not is_joker(c0)) and (not same(c0, game.mighty_card)) \
                        and c0[0] == gi0 and is_point(c0):
                    bk0, bp0 = (-2, -1), -1
                    for e in pl0['table']:
                        k0 = game.card_strength(e, pl0)
                        if k0 > bk0:
                            bk0, bp0 = k0, e['player']
                    if (bp0 == decl0 or (fr0 is not None and bp0 == fr0)) \
                            and not (game.card_strength({'player': me, 'card': c0}, pl0) > bk0):
                        alts = [m['card'] for m in game.legal_plays(me)
                                if not m.get('jokerCall')
                                and not is_joker(m['card'])
                                and not same(m['card'], game.mighty_card)
                                and m['card'][0] == gi0
                                and not is_point(m['card'])
                                and not (game.card_strength({'player': me, 'card': m['card']}, pl0) > bk0)]
                        if alts:
                            return min(alts, key=lambda c: c[1])
    # cut — 공개 후, 리드 무늬 보이드 좌석이 상대팀 최강 점수 트릭에 비기루다를
    # 버릴 때 → '가시 확정승' 최저 기루다 컷 (2026-08-08 인증 +533±166, cutGuard)
    if act_card is not None and game.friend_revealed:
        plc = game.play
        gic = game.contract['giruda'] if game.contract else 'N'
        cc = act_card
        if (plc['table'] and gic != 'N' and plc['ledSuit'] != gic
                and not is_joker(cc) and not same(cc, game.mighty_card)
                and cc[0] != gic
                and not any((not is_joker(x)) and x[0] == plc['ledSuit']
                            for x in game.hands[me])
                and sum(1 for e in plc['table'] if is_point(e['card'])) >= 1):
            bkc, bpc = (-2, -1), -1
            for e in plc['table']:
                kc = game.card_strength(e, plc)
                if kc > bkc:
                    bkc, bpc = kc, e['player']
            i_rul = me == game.declarer or me == game.friend
            b_rul = bpc == game.declarer or (game.friend is not None and bpc == game.friend)
            if i_rul != b_rul:
                seenc = set()
                for t in plc['history']:
                    for e in t['plays']:
                        seenc.add(card_id(e['card']))
                for e in plc['table']:
                    seenc.add(card_id(e['card']))
                for x in game.hands[me]:
                    seenc.add(card_id(x))
                if me == game.declarer and game.discard:
                    for x in game.discard:
                        seenc.add(card_id(x))
                acted = set(e['player'] for e in plc['table'])
                acted.add(me)
                rem = sum(1 for p in range(NUM_PLAYERS) if p not in acted)
                cfgc = game.config or {}
                joker_win = (not plc['jokerCallActive']
                             and not (plc['trickNo'] == 1 and cfgc.get('firstTrickJokerWeak', True))
                             and not (plc['trickNo'] >= 10 and cfgc.get('lastTrickJokerWeak', True)))
                threats = []
                if rem > 0:
                    if card_id(game.mighty_card) not in seenc:
                        threats.append((4, 0))
                    if joker_win and JOKER not in seenc:
                        threats.append((3, 0))
                    for r in range(2, 15):
                        if gic + str(r) not in seenc:
                            threats.append((2, r))
                my_tr = sorted((x for x in game.hands[me]
                                if not is_joker(x) and x[0] == gic
                                and not same(x, game.mighty_card)),
                               key=lambda x: x[1])
                for tc in my_tr:
                    kc = game.card_strength({'player': me, 'card': tc}, plc)
                    if not (kc > bkc):
                        continue
                    if any(t > kc for t in threats):
                        continue
                    if any(same(m['card'], tc) for m in game.legal_plays(me)
                           if not m.get('jokerCall')):
                        return tc
    # trumpTop — 유일하게 리드 상태(테이블 빈 상태)·공개 전에도 성립하는 클래스
    if act_card is not None and me == game.declarer and not game.play['table']:
        gi0 = game.contract['giruda'] if game.contract else 'N'
        if gi0 != 'N' and not is_joker(act_card) and act_card[0] == gi0:
            my_tr = sorted((c for c in game.hands[me]
                            if not is_joker(c) and c[0] == gi0),
                           key=lambda c: -c[1])
            if my_tr and not same(act_card, my_tr[0]):
                seen0 = set()
                for t in game.play['history']:
                    for e in t['plays']:
                        seen0.add(card_id(e['card']))
                for c in game.hands[me]:
                    seen0.add(card_id(c))
                if game.discard:
                    for c in game.discard:
                        seen0.add(card_id(c))
                out0 = [r for r in range(14, 1, -1)
                        if gi0 + str(r) not in seen0]
                # 위 서열이 밖에 없고(out0[0] < top), 정리할 상대 기루다는 남아 있어야 한다
                if out0 and out0[0] < my_tr[0][1]:
                    legal0 = [m for m in game.legal_plays(me)
                              if not m.get('jokerCall') and not m.get('jokerSuit')]
                    if any(same(m['card'], my_tr[0]) for m in legal0):
                        return my_tr[0]
    if not game.friend_revealed:
        return None
    decl, fr = game.declarer, game.friend
    if decl is None or me not in (decl, fr):
        return None
    pl = game.play
    if not pl['table']:
        return None
    gi = game.contract['giruda'] if game.contract else 'N'
    best, bk = None, (-2, -1)
    for e in pl['table']:
        k = game.card_strength(e, pl)
        if k > bk:
            bk, best = k, e
    if best is None or best['player'] == me:
        return None
    key = lambda c: is_joker(c) or same(c, game.mighty_card)
    # sigW — 프렌드이고, 주공이 기루다를 리드해 현재 이기고 있으면 점수로 응답
    if me == fr and gi != 'N' and best['player'] == decl:
        lead = pl['table'][0]
        if (lead['player'] == decl and not is_joker(lead['card'])
                and lead['card'][0] == gi):
            legal0 = [m['card'] for m in game.legal_plays(me) if not m.get('jokerCall')]
            pts0 = [c for c in legal0 if is_point(c) and not key(c)]
            non0 = [c for c in legal0 if not is_point(c) and not key(c)]
            if pts0 and non0:
                return min(pts0, key=lambda c: c[1])
    # 가시 확정승 — 남은 사람이 낼 수 있는 위협 중 bk를 넘는 게 없는가
    seen = set()
    for t in pl['history']:
        for e in t['plays']:
            seen.add(card_id(e['card']))
    for e in pl['table']:
        seen.add(card_id(e['card']))
    for c in game.hands[me]:
        seen.add(card_id(c))
    if me == decl and game.discard:
        for c in game.discard:
            seen.add(card_id(c))
    acted = set(e['player'] for e in pl['table'])
    acted.add(me)
    rem = sum(1 for p in range(NUM_PLAYERS) if p not in acted)
    if rem > 0:
        cfg = game.config or {}
        last = pl['trickNo'] >= 10
        joker_win = (not pl['jokerCallActive']
                     and not (pl['trickNo'] == 1 and cfg.get('firstTrickJokerWeak', True))
                     and not (last and cfg.get('lastTrickJokerWeak', True)))
        ruff = True
        if pl['ledSuit'] and gi != 'N' and pl['ledSuit'] != gi:
            unseen_led = sum(1 for r in range(2, 15)
                             if pl['ledSuit'] + str(r) not in seen)
            if unseen_led >= rem:
                ruff = False
        threats = []
        if card_id(game.mighty_card) not in seen:
            threats.append((4, 0))
        if joker_win and JOKER not in seen:
            threats.append((3, 0))
        if gi != 'N' and ruff:
            for r in range(2, 15):
                if gi + str(r) not in seen:
                    threats.append((2, r))
        if pl['ledSuit']:
            for r in range(2, 15):
                if pl['ledSuit'] + str(r) not in seen:
                    threats.append((1, r))
        if any(t > bk for t in threats):
            return None
    ally = (best['player'] == decl) or (fr is not None and best['player'] == fr)
    legal = [m['card'] for m in game.legal_plays(me) if not m.get('jokerCall')]
    pts = [c for c in legal if is_point(c) and not key(c)]
    if ally:
        if pl['trickNo'] < 4:
            return None                                  # 트릭4+ 인증 (1~3은 미인증)
        non = [c for c in legal if not is_point(c) and not key(c)]
        if not pts or not non:
            return None
        return min(pts, key=lambda c: c[1])
    non = [c for c in legal if not is_point(c) and not key(c)
           and not ((not is_joker(c)) and gi != 'N' and c[0] == gi)]
    if not pts or not non:
        return None
    return min(non, key=lambda c: c[1])


def aux_labels(game, me):
    """보조 손실용 정답 (엔진 truth, 상대좌석 rel1..4 기준).
    suit16: 그 좌석이 해당 무늬를 아직 들고 있는가
    trump4: 그 좌석의 잔여 기루다 수 /10 (노기루다면 0)
    mk/jk: 마이티/조커 보유 좌석 rel0..4 (미보유 상태·소진이면 -1 — 예측 제외).
    프렌드 선언 함의를 정책이 실제로 소화하도록 위치 추론을 손실로 강제한다.
    협력 판단(기루다 정리·무늬 공략)은 전부 이 추정 위에 선다."""
    suit = np.zeros(16, dtype=np.float32)
    trump = np.zeros(4, dtype=np.float32)
    mk, jk = -1, -1
    if game.contract:
        for p in range(NUM_PLAYERS):
            for c in game.hands[p]:
                if same(c, game.mighty_card):
                    mk = (p - me) % NUM_PLAYERS
                if is_joker(c):
                    jk = (p - me) % NUM_PLAYERS
    ct = game.contract
    gir = ct['giruda'] if ct else None
    for p in range(NUM_PLAYERS):
        r = (p - me) % NUM_PLAYERS
        if r == 0:
            continue
        hand = game.hands[p]
        for si, s in enumerate(SUITS):
            if any((not is_joker(c)) and c[0] == s for c in hand):
                suit[(r - 1) * 4 + si] = 1.0
        if gir and gir != 'N':
            trump[r - 1] = sum(1 for c in hand
                               if (not is_joker(c)) and c[0] == gir) / 10.0
    return suit, trump, mk, jk


# ---------------- 환경 래퍼 ----------------
# --- 룰 도메인 랜덤화 ---
# 지역/하우스 룰 변형에 견디는 정책을 만들기 위한 샘플 공간.
# 값은 encode_rules가 관측으로 넣는 항목과 일치해야 한다.
# declarerCanDealMiss는 고정 False — 주공 딜미스는 룰 구멍이라 학습 대상이 아니다.
RULE_SPACE = {
    'minBid': [13, 14],
    'noGirudaBidDiscount': [0, 1],
    'dealMissThreshold': [0.5, 1.0],
    'jokerCallMightyProtect': [True, False],
    'firstTrickJokerWeak': [True, False],
    'lastTrickJokerWeak': [True, False],
    'discardPointsTo': ['declarer', 'defenders', 'lastTrickWinner'],
    'scoring.noGirudaMult': [2, 3],
    'scoring.friendShare': [0, 1],
    'scoring.perDiff': [150, 200, 300],
}


def sample_rules(rng, space=None, p_default=0.35):
    """룰 오버라이드 하나를 뽑는다. p_default 확률로는 리그 기본룰 그대로 둔다."""
    if rng.random() < p_default:
        return {}
    space = space or RULE_SPACE
    out, sc = {}, {}
    for k, vals in space.items():
        v = vals[int(rng.random() * len(vals))]
        if k.startswith('scoring.'):
            sc[k.split('.', 1)[1]] = v
        else:
            out[k] = v
    if sc:
        out['scoring'] = sc
    return out


def _strength(g, e, pl):
    return g.card_strength(e, pl)


def alloc_waste(game, seat, action_card):
    """Phase A 판정 — 전지적으로 '아군 확정승 트릭에 비싼 카드를 태웠는가'.

    학습 시점에만 쓰는 특권 정보다. 관측에는 들어가지 않는다.
    반환 True면 그 결정에 선호 벌점을 준다.
    """
    pl = game.play
    if not pl or not pl['table']:
        return False
    decl, fr = game.declarer, game.friend
    if decl is None:
        return False
    team = lambda p: 'R' if (p == decl or (fr is not None and p == fr)) else 'O'
    # 아군이 현재 최강인가
    best, bk = None, (-2, -1)
    for e in pl['table']:
        k = _strength(game, e, pl)
        if k > bk:
            bk, best = k, e
    if best is None or team(best['player']) != team(seat) or best['player'] == seat:
        return False
    # 남은 사람 중 누구도 넘길 수 없는가 (전지적)
    acted = {e['player'] for e in pl['table']} | {seat}
    for p in range(NUM_PLAYERS):
        if p in acted:
            continue
        for m in game.legal_plays(p):
            e = {'player': p, 'card': m['card'], 'jokerSuit': m.get('jokerSuit')}
            if _strength(game, e, pl) > bk:
                return False
    # 내가 낸 카드가 비싼가 + 더 싼 대안이 있었는가
    gi = game.contract['giruda'] if game.contract else 'N'
    def costly(c):
        return (is_joker(c) or same(c, game.mighty_card) or
                (gi != 'N' and (not is_joker(c)) and c[0] == gi) or is_point(c))
    if not costly(action_card):
        return False
    for m in game.legal_plays(seat):
        if not costly(m['card']):
            return True          # 더 싼 대안이 있었는데 비싼 카드를 냈다
    return False


class MightyEnv:
    """1게임 = 1에피소드. 보상: 종료 시 좌석별 prizes / 2000 (제로섬)."""
    PRIZE_SCALE = 2000
    REDEAL_PENALTY = 0.0     # 유찰은 중립 종료. 보조 페널티 금지(핸드오프 §5-3)

    def __init__(self, config=None, seed=None, max_redeal=50,
                 rule_random=False, rule_space=None, rule_seed=None):
        self.base_config = dict(config or {})
        self.seed = seed
        self.max_redeal = max_redeal
        self._seed_ctr = 0
        self.rule_random = rule_random
        self.rule_space = rule_space
        # Phase A: 아군 내 배분 선호 항. None이면 판정을 아예 하지 않는다(비용 0).
        self.alloc_flag = None
        self.alloc_on = False
        import random as _r
        self._rule_rng = _r.Random(rule_seed if rule_seed is not None else (seed or 0) ^ 0x5EED)

    def reset(self):
        rules = sample_rules(self._rule_rng, self.rule_space) if self.rule_random else {}
        for _ in range(self.max_redeal):
            cfg = dict(self.base_config)
            if rules:
                for k, v in rules.items():
                    if k == 'scoring':
                        cfg['scoring'] = dict(cfg.get('scoring', {}), **v)
                    else:
                        cfg[k] = v
            if self.seed is not None:
                cfg['seed'] = self.seed + self._seed_ctr
            self._seed_ctr += 1
            self.game = MightyGame(cfg)
            dealer = int(self.game.rng() * NUM_PLAYERS) if True else 0
            self.game.start(dealer)
            if self.game.phase != 'redeal':
                break
        else:
            raise RuntimeError('too many redeals')
        self.pick = []
        self.alloc_flag = (None, False) if self.alloc_on else None
        return self._out()

    def _out(self):
        p = self.game.current_player
        return encode(self.game, p, self.pick), self.legal_mask(), p

    def legal_mask(self):
        g = self.game
        m = np.zeros(ACTION_DIM, dtype=bool)
        ph = g.phase
        if ph == 'bidding':
            forced = (g.bidding['best'] is None and sum(g.bidding['active']) == 1
                      and FORCE_LAST_BID > 0
                      and (FORCE_LAST_BID >= 1.0 or g.rng() < FORCE_LAST_BID))
            if not forced:
                m[A_PASS] = True
            for a in g.legal_bids():
                if a['type'] == 'bid' and 13 <= a['count'] <= 20:
                    m[bid_action(a['count'], a['giruda'])] = True
                elif a['type'] == 'dealMiss':
                    m[A_DEALMISS] = True
        elif ph == 'dealMissWindow':
            m[A_DEALMISS] = True
            m[A_PROCEED] = True
        elif ph == 'floor':
            hand = g.hands[g.declarer]
            picked = list(self.pick)
            for c in hand:
                if any(same(c, x) for x in picked):
                    picked.remove(next(x for x in picked if same(x, c)))
                    continue
                m[A_DISC0 + cidx(c)] = True
        elif ph == 'friend':
            m[A_FRIEND0:A_FRIEND0 + 53] = True   # 자기 카드 콜 = 셀프 (허용)
            m[A_FRIEND_FIRST] = True
            m[A_FRIEND_NONE] = True
        elif ph == 'play':
            for mv in g.legal_plays(g.current_player):
                c = mv['card']
                if is_joker(c):
                    if 'jokerSuit' in mv:
                        m[A_PLAY_JOKER_SUIT0 + SUIT_IDX[mv['jokerSuit']]] = True
                    else:
                        m[A_PLAY_JOKER] = True
                elif mv.get('jokerCall'):
                    m[A_PLAY_JOKERCALL] = True
                else:
                    m[A_PLAY0 + cidx(c)] = True
        return m

    def step(self, action: int):
        """returns (obs, mask, player, rewards|None, done)"""
        g = self.game
        ph = g.phase
        if ph == 'bidding':
            if action == A_DEALMISS:
                g.act({'type': 'dealMiss'})
            else:
                g.act({'type': 'pass'} if action == A_PASS else decode_bid(action))
            if g.phase == 'redeal':          # 전원 패스/딜미스 → 전좌석 페널티 종료 (패스 캠핑 억제 셰이핑)
                return None, None, None, np.full(NUM_PLAYERS, self.REDEAL_PENALTY, dtype=np.float32), True
        elif ph == 'dealMissWindow':
            g.act({'type': 'dealMiss' if action == A_DEALMISS else 'proceed'})
            if g.phase == 'redeal':
                return None, None, None, np.full(NUM_PLAYERS, self.REDEAL_PENALTY, dtype=np.float32), True
        elif ph == 'floor':
            self.pick.append(idx_card(action - A_DISC0))
            if len(self.pick) == FLOOR_SIZE_:
                g.act({'type': 'exchange', 'discard': list(self.pick)})
                self.pick = []
        elif ph == 'friend':
            if action == A_FRIEND_FIRST:
                g.act({'type': 'friend', 'mode': 'first'})
            elif action == A_FRIEND_NONE:
                g.act({'type': 'friend', 'mode': 'none'})
            else:
                g.act({'type': 'friend', 'mode': 'card',
                       'card': idx_card(action - A_FRIEND0)})
        elif ph == 'play':
            if self.alloc_flag is not None:
                _seat = g.current_player
                _card = (JOKER if action in (A_PLAY_JOKER,) or
                         (A_PLAY_JOKER_SUIT0 <= action < A_PLAY_JOKER_SUIT0 + 4)
                         else (g.joker_call_card if action == A_PLAY_JOKERCALL
                               else idx_card(action - A_PLAY0)))
                try:
                    self.alloc_flag = (_seat, alloc_waste(g, _seat, _card))
                except Exception:
                    self.alloc_flag = (_seat, False)
            if action == A_PLAY_JOKER:
                g.act({'type': 'play', 'card': JOKER})
            elif A_PLAY_JOKER_SUIT0 <= action < A_PLAY_JOKER_SUIT0 + 4:
                g.act({'type': 'play', 'card': JOKER,
                       'jokerSuit': SUITS[action - A_PLAY_JOKER_SUIT0]})
            elif action == A_PLAY_JOKERCALL:
                g.act({'type': 'play', 'card': g.joker_call_card, 'jokerCall': True})
            else:
                g.act({'type': 'play', 'card': idx_card(action - A_PLAY0)})

        if g.phase == 'done':
            rew = np.array(g.result['prizes'], dtype=np.float32) / self.PRIZE_SCALE
            return None, None, None, rew, True
        obs, mask, p = self._out()
        return obs, mask, p, None, False


FLOOR_SIZE_ = 3

# ---------------- 자가 검증 ----------------
if __name__ == '__main__':
    rng = np.random.default_rng(0)
    env = MightyEnv(seed=123456)
    total = np.zeros(5)
    games = steps = 0
    import time
    t0 = time.time()
    for _ in range(300):
        obs, mask, p = env.reset()
        while True:
            assert obs.shape == (OBS_DIM,) and mask.shape == (ACTION_DIM,)
            assert mask.any(), 'empty mask'
            a = rng.choice(np.flatnonzero(mask))
            obs, mask, p, rew, done = env.step(int(a))
            steps += 1
            if done:
                assert abs(rew.sum()) < 1e-6 or np.allclose(rew, MightyEnv.REDEAL_PENALTY), 'not zero-sum'
                total += rew
                games += 1
                break
    dt = time.time() - t0
    print(f'OBS_DIM={OBS_DIM} ACTION_DIM={ACTION_DIM}')
    print(f'{games} games / {steps} decisions / {dt:.2f}s '
          f'({games/dt:.0f} games/s, {steps/dt:.0f} steps/s, 랜덤정책·단일코어)')
    print('zero-sum ok, cumulative:', total.round(3))
