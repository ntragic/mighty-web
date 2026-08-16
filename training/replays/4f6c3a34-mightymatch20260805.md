# 마이티 복기 — 1판 (seed 65778082)

- 버전: v2.1.1 · 난이도: master · 딜러: 효창
- 기록 시각: 2026-08-05T08:36:24.281Z
- 공약: **14♦** · 주공: **영동** · 프렌드: ♠A (정원)

## 딜 직후 손패
- 영동: ♥4 ♦9 ♥9 ♦6 ♦A ♠10 ♠7 ♥A ♦Q ♣10
- 김세: ♣7 ♥10 ♠4 ♣2 ♦5 조커 ♦8 ♥7 ♥5 ♥Q
- 병직: ♦2 ♦4 ♣Q ♠Q ♠2 ♠8 ♣4 ♠3 ♥J ♦3
- 효창: ♦10 ♦7 ♠J ♦K ♣5 ♥2 ♣A ♠5 ♣9 ♣8
- 정원: ♣3 ♥8 ♠9 ♦J ♣K ♠K ♥K ♣J ♠A ♥3
- 바닥패: ♠6 ♥6 ♣6

## 비딩
- 정원: 패스
- 영동: 14♦
- 김세: 패스
- 병직: 패스
- 효창: 패스
- 바닥패 교환: 묻은 카드 ♣6 ♣10 ♠7

## 트릭
| # | 영동 | 김세 | 병직 | 효창 | 정원 | 승자 | 점수 |
|---|---|---|---|---|---|---|---|
| 1 | **♥A** | ♥7 | ♥J | ♥2 | ♥8 | 영동 | 2 |
| 2 | **♦A** | ♦8 | ♦4 | ♦7 | ♦J | 영동 | 2 |
| 3 | **♦6** | ♦5 | ♦2 | ♦10 | ♣3 | 효창 | 1 |
| 4 | ♠10 | 조커 | ♠2 | **♠5** | ♠K | 김세 | 2 |
| 5 | ♦Q | **♣7** | ♣Q | ♣9 | ♣K | 영동 | 3 |
| 6 | **♥9** | ♥Q | ♠Q | ♣5 | ♠A | 정원 | 3 |
| 7 | ♥4 | ♥5 | ♣4 | ♣8 | **♥K** | 정원 | 1 |
| 8 | ♠6 | ♠4 | ♠8 | ♠J | **♠9** | 효창 | 1 |
| 9 | ♦9 | ♣2 | ♠3 | **♣A** | ♣J | 영동 | 2 |
| 10 | **♥6** | ♥10 | ♦3 | ♦K | ♥3 | 효창 | 2 |

## 결과
- 여당 14 / 야당 6 (바닥패 1)
- 여당 승 · 점수 500 → 상금 500
- 배분: 영동 +1000 · 김세 -500 · 병직 -500 · 효창 -500 · 정원 +500

## AI 하이라이트 (마스터 기준)
- 트릭 2 [손해] ♦A → ♥6 · 기대상금 +617 · 승률 7/24 → 12/24

## 재현용 원본
```json
{
 "seed": 65778082,
 "dealer": 3,
 "version": "v2.1.1",
 "tier": "master",
 "cfg": {
  "minBid": 14,
  "noGirudaBidDiscount": 0,
  "allowBidRevise": true,
  "girudaChangeCost": 2,
  "toNoGirudaChangeCost": 1,
  "dealMissEnabled": true,
  "dealMissThreshold": 0.5,
  "jokerCallEnabled": true,
  "jokerCallBaseSuit": "C",
  "jokerCallAltSuit": "H",
  "jokerCallMightyProtect": true,
  "firstTrickJokerNoGiruda": true,
  "firstTrickNoJokerCall": true,
  "firstTrickJokerWeak": true,
  "lastTrickJokerWeak": true,
  "firstTrickNoGirudaLead": true,
  "scoring": {
   "perBid": 300,
   "perDiff": 200,
   "noGirudaMult": 2,
   "cap": 2000,
   "noGirudaCap": 3000,
   "declarerShare": 2,
   "selfDeclarerShare": 4,
   "friendShare": 1
  },
  "discardPointsTo": "declarer",
  "seed": 65778082
 },
 "actions": [
  {
   "p": 4,
   "ph": "bidding",
   "a": {
    "type": "pass"
   }
  },
  {
   "p": 0,
   "ph": "bidding",
   "a": {
    "type": "bid",
    "count": 14,
    "giruda": "D"
   }
  },
  {
   "p": 1,
   "ph": "bidding",
   "a": {
    "type": "pass"
   }
  },
  {
   "p": 2,
   "ph": "bidding",
   "a": {
    "type": "pass"
   }
  },
  {
   "p": 3,
   "ph": "bidding",
   "a": {
    "type": "pass"
   }
  },
  {
   "p": 0,
   "ph": "floor",
   "a": {
    "type": "exchange",
    "discard": [
     {
      "suit": "C",
      "rank": 6
     },
     {
      "suit": "C",
      "rank": 10
     },
     {
      "suit": "S",
      "rank": 7
     }
    ]
   }
  },
  {
   "p": 0,
   "ph": "friend",
   "a": {
    "type": "friend",
    "mode": "card",
    "card": {
     "suit": "S",
     "rank": 14
    }
   }
  },
  {
   "p": 1,
   "ph": "dealMissWindow",
   "a": {
    "type": "proceed"
   }
  },
  {
   "p": 0,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 14
    }
   }
  },
  {
   "p": 1,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 7
    }
   }
  },
  {
   "p": 2,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 11
    }
   }
  },
  {
   "p": 3,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 2
    }
   }
  },
  {
   "p": 4,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 8
    }
   }
  },
  {
   "p": 0,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "D",
     "rank": 14
    }
   }
  },
  {
   "p": 1,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "D",
     "rank": 8
    }
   }
  },
  {
   "p": 2,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "D",
     "rank": 4
    }
   }
  },
  {
   "p": 3,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "D",
     "rank": 7
    }
   }
  },
  {
   "p": 4,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "D",
     "rank": 11
    }
   }
  },
  {
   "p": 0,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "D",
     "rank": 6
    }
   }
  },
  {
   "p": 1,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "D",
     "rank": 5
    }
   }
  },
  {
   "p": 2,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "D",
     "rank": 2
    }
   }
  },
  {
   "p": 3,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "D",
     "rank": 10
    }
   }
  },
  {
   "p": 4,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 3
    }
   }
  },
  {
   "p": 3,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "S",
     "rank": 5
    }
   }
  },
  {
   "p": 4,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "S",
     "rank": 13
    }
   }
  },
  {
   "p": 0,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "S",
     "rank": 10
    }
   }
  },
  {
   "p": 1,
   "ph": "play",
   "a": {
    "type": "play",
    "card": "JOKER"
   }
  },
  {
   "p": 2,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "S",
     "rank": 2
    }
   }
  },
  {
   "p": 1,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 7
    }
   }
  },
  {
   "p": 2,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 12
    }
   }
  },
  {
   "p": 3,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 9
    }
   }
  },
  {
   "p": 4,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 13
    }
   }
  },
  {
   "p": 0,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "D",
     "rank": 12
    }
   }
  },
  {
   "p": 0,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 9
    }
   }
  },
  {
   "p": 1,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 12
    }
   }
  },
  {
   "p": 2,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "S",
     "rank": 12
    }
   }
  },
  {
   "p": 3,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 5
    }
   }
  },
  {
   "p": 4,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "S",
     "rank": 14
    }
   }
  },
  {
   "p": 4,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 13
    }
   }
  },
  {
   "p": 0,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 4
    }
   }
  },
  {
   "p": 1,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 5
    }
   }
  },
  {
   "p": 2,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 4
    }
   }
  },
  {
   "p": 3,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 8
    }
   }
  },
  {
   "p": 4,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "S",
     "rank": 9
    }
   }
  },
  {
   "p": 0,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "S",
     "rank": 6
    }
   }
  },
  {
   "p": 1,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "S",
     "rank": 4
    }
   }
  },
  {
   "p": 2,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "S",
     "rank": 8
    }
   }
  },
  {
   "p": 3,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "S",
     "rank": 11
    }
   }
  },
  {
   "p": 3,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 14
    }
   }
  },
  {
   "p": 4,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 11
    }
   }
  },
  {
   "p": 0,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "D",
     "rank": 9
    }
   }
  },
  {
   "p": 1,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 2
    }
   }
  },
  {
   "p": 2,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "S",
     "rank": 3
    }
   }
  },
  {
   "p": 0,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 6
    }
   }
  },
  {
   "p": 1,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 10
    }
   }
  },
  {
   "p": 2,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "D",
     "rank": 3
    }
   }
  },
  {
   "p": 3,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "D",
     "rank": 13
    }
   }
  },
  {
   "p": 4,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 3
    }
   }
  }
 ]
}
```

---

# 마이티 복기 — 2판 (seed 1008183046)

- 버전: v2.1.1 · 난이도: master · 딜러: 정원
- 기록 시각: 2026-08-05T08:37:50.238Z
- 공약: **15♥** · 주공: **병직** · 프렌드: ♠A (효창)

## 딜 직후 손패
- 영동: ♣2 ♥9 ♣7 ♣4 ♦A ♠Q ♥7 ♠K ♦8 ♣10
- 김세: ♣8 ♠2 ♣Q ♣J ♣A ♠10 ♥8 ♠7 ♠3 ♠5
- 병직: ♥Q ♥K ♥5 조커 ♣K ♣6 ♣5 ♠J ♦2 ♥A
- 효창: ♦7 ♦K ♥2 ♣3 ♦4 ♥6 ♠A ♠9 ♥J ♥4
- 정원: ♥10 ♠4 ♣9 ♦10 ♦5 ♦6 ♦J ♥3 ♠8 ♠6
- 바닥패: ♦3 ♦Q ♦9

## 비딩
- 영동: 14♣
- 김세: 패스
- 병직: 15♥
- 효창: 패스
- 정원: 패스
- 영동: 패스
- 바닥패 교환: 묻은 카드 ♦Q ♠J ♦3

## 트릭
| # | 영동 | 김세 | 병직 | 효창 | 정원 | 승자 | 점수 |
|---|---|---|---|---|---|---|---|
| 1 | ♣10 | ♣J | **♣6** | ♣3 | ♣9 | 김세 | 2 |
| 2 | ♠Q | **♠5** | ♣5 | ♠9 | ♠6 | 영동 | 1 |
| 3 | **♠K** | ♠7 | ♦2 | ♠A | ♠8 | 효창 | 2 |
| 4 | ♥7 | ♥8 | ♥Q | **♥4** | ♥10 | 병직 | 2 |
| 5 | ♥9 | ♠2 | **조커(♥)** | ♥6 | ♥3 | 병직 | 0 |
| 6 | ♦A | ♠10 | **♦9** | ♦K | ♦10 | 영동 | 4 |
| 7 | **♣2** | ♣A | ♣K | ♦4 | ♦J | 김세 | 3 |
| 8 | ♣4 | **♣Q** | ♥5 | ♦7 | ♦6 | 병직 | 1 |
| 9 | ♣7 | ♠3 | **♥A** | ♥J | ♦5 | 병직 | 2 |
| 10 | ♦8 | ♣8 | **♥K** | ♥2 | ♠4 | 병직 | 1 |

## 결과
- 여당 10 / 야당 10 (바닥패 2)
- 야당 승 · 점수 -1600 → 상금 -1600
- 배분: 영동 +1600 · 김세 +1600 · 병직 -3200 · 효창 -1600 · 정원 +1600

## 재현용 원본
```json
{
 "seed": 1008183046,
 "dealer": 4,
 "version": "v2.1.1",
 "tier": "master",
 "cfg": {
  "minBid": 14,
  "noGirudaBidDiscount": 0,
  "allowBidRevise": true,
  "girudaChangeCost": 2,
  "toNoGirudaChangeCost": 1,
  "dealMissEnabled": true,
  "dealMissThreshold": 0.5,
  "jokerCallEnabled": true,
  "jokerCallBaseSuit": "C",
  "jokerCallAltSuit": "H",
  "jokerCallMightyProtect": true,
  "firstTrickJokerNoGiruda": true,
  "firstTrickNoJokerCall": true,
  "firstTrickJokerWeak": true,
  "lastTrickJokerWeak": true,
  "firstTrickNoGirudaLead": true,
  "scoring": {
   "perBid": 300,
   "perDiff": 200,
   "noGirudaMult": 2,
   "cap": 2000,
   "noGirudaCap": 3000,
   "declarerShare": 2,
   "selfDeclarerShare": 4,
   "friendShare": 1
  },
  "discardPointsTo": "declarer",
  "seed": 1008183046
 },
 "actions": [
  {
   "p": 0,
   "ph": "bidding",
   "a": {
    "type": "bid",
    "count": 14,
    "giruda": "C"
   }
  },
  {
   "p": 1,
   "ph": "bidding",
   "a": {
    "type": "pass"
   }
  },
  {
   "p": 2,
   "ph": "bidding",
   "a": {
    "type": "bid",
    "count": 15,
    "giruda": "H"
   }
  },
  {
   "p": 3,
   "ph": "bidding",
   "a": {
    "type": "pass"
   }
  },
  {
   "p": 4,
   "ph": "bidding",
   "a": {
    "type": "pass"
   }
  },
  {
   "p": 0,
   "ph": "bidding",
   "a": {
    "type": "pass"
   }
  },
  {
   "p": 2,
   "ph": "floor",
   "a": {
    "type": "exchange",
    "discard": [
     {
      "suit": "D",
      "rank": 12
     },
     {
      "suit": "S",
      "rank": 11
     },
     {
      "suit": "D",
      "rank": 3
     }
    ]
   }
  },
  {
   "p": 2,
   "ph": "friend",
   "a": {
    "type": "friend",
    "mode": "card",
    "card": {
     "suit": "S",
     "rank": 14
    }
   }
  },
  {
   "p": 2,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 6
    }
   }
  },
  {
   "p": 3,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 3
    }
   }
  },
  {
   "p": 4,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 9
    }
   }
  },
  {
   "p": 0,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 10
    }
   }
  },
  {
   "p": 1,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 11
    }
   }
  },
  {
   "p": 1,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "S",
     "rank": 5
    }
   }
  },
  {
   "p": 2,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 5
    }
   }
  },
  {
   "p": 3,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "S",
     "rank": 9
    }
   }
  },
  {
   "p": 4,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "S",
     "rank": 6
    }
   }
  },
  {
   "p": 0,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "S",
     "rank": 12
    }
   }
  },
  {
   "p": 0,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "S",
     "rank": 13
    }
   }
  },
  {
   "p": 1,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "S",
     "rank": 7
    }
   }
  },
  {
   "p": 2,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "D",
     "rank": 2
    }
   }
  },
  {
   "p": 3,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "S",
     "rank": 14
    }
   }
  },
  {
   "p": 4,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "S",
     "rank": 8
    }
   }
  },
  {
   "p": 3,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 4
    }
   }
  },
  {
   "p": 4,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 10
    }
   }
  },
  {
   "p": 0,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 7
    }
   }
  },
  {
   "p": 1,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 8
    }
   }
  },
  {
   "p": 2,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 12
    }
   }
  },
  {
   "p": 2,
   "ph": "play",
   "a": {
    "type": "play",
    "card": "JOKER",
    "jokerSuit": "H"
   }
  },
  {
   "p": 3,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 6
    }
   }
  },
  {
   "p": 4,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 3
    }
   }
  },
  {
   "p": 0,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 9
    }
   }
  },
  {
   "p": 1,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "S",
     "rank": 2
    }
   }
  },
  {
   "p": 2,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "D",
     "rank": 9
    }
   }
  },
  {
   "p": 3,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "D",
     "rank": 13
    }
   }
  },
  {
   "p": 4,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "D",
     "rank": 10
    }
   }
  },
  {
   "p": 0,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "D",
     "rank": 14
    }
   }
  },
  {
   "p": 1,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "S",
     "rank": 10
    }
   }
  },
  {
   "p": 0,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 2
    }
   }
  },
  {
   "p": 1,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 14
    }
   }
  },
  {
   "p": 2,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 13
    }
   }
  },
  {
   "p": 3,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "D",
     "rank": 4
    }
   }
  },
  {
   "p": 4,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "D",
     "rank": 11
    }
   }
  },
  {
   "p": 1,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 12
    }
   }
  },
  {
   "p": 2,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 5
    }
   }
  },
  {
   "p": 3,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "D",
     "rank": 7
    }
   }
  },
  {
   "p": 4,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "D",
     "rank": 6
    }
   }
  },
  {
   "p": 0,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 4
    }
   }
  },
  {
   "p": 2,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 14
    }
   }
  },
  {
   "p": 3,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 11
    }
   }
  },
  {
   "p": 4,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "D",
     "rank": 5
    }
   }
  },
  {
   "p": 0,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 7
    }
   }
  },
  {
   "p": 1,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "S",
     "rank": 3
    }
   }
  },
  {
   "p": 2,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 13
    }
   }
  },
  {
   "p": 3,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 2
    }
   }
  },
  {
   "p": 4,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "S",
     "rank": 4
    }
   }
  },
  {
   "p": 0,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "D",
     "rank": 8
    }
   }
  },
  {
   "p": 1,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 8
    }
   }
  }
 ]
}
```

---

# 마이티 복기 — 3판 (seed 910514803)

- 버전: v2.1.1 · 난이도: master · 딜러: 효창
- 기록 시각: 2026-08-05T08:38:46.424Z
- 공약: **14♦** · 주공: **영동** · 프렌드: ♠A (효창)

## 딜 직후 손패
- 영동: ♠2 ♦10 ♠7 ♦5 ♦9 ♣4 ♠J ♦K ♥4 ♦6
- 김세: ♣5 ♣6 ♦2 ♥9 ♠8 ♠6 ♠4 ♣8 ♠K ♥3
- 병직: ♦7 ♣2 ♦8 ♣3 ♥8 ♥10 ♠3 ♥J ♣J ♦3
- 효창: ♦J ♥K ♥2 ♥Q ♣9 ♠A ♠10 ♦4 ♣10 조커
- 정원: ♥5 ♣K ♠Q ♣Q ♦A ♦Q ♠9 ♥6 ♠5 ♣7
- 바닥패: ♣A ♥7 ♥A

## 비딩
- 정원: 패스
- 영동: 14♦
- 김세: 패스
- 병직: 패스
- 효창: 패스
- 바닥패 교환: 묻은 카드 ♣4 ♥7 ♥4

## 트릭
| # | 영동 | 김세 | 병직 | 효창 | 정원 | 승자 | 점수 |
|---|---|---|---|---|---|---|---|
| 1 | **♣A** | ♣6 | ♣2 | ♣10 | ♣7 | 영동 | 2 |
| 2 | **♦K** | ♦2 | ♦8 | ♦J | ♦A | 정원 | 3 |
| 3 | ♠2 | ♠6 | ♠3 | ♠10 | **♠5** | 효창 | 1 |
| 4 | ♥A | ♥9 | ♥8 | **♥Q** | ♥5 | 영동 | 2 |
| 5 | **♦9** | ♠4 | ♦3 | ♦4 | ♦Q | 정원 | 1 |
| 6 | ♠J | ♠K | ♣J | 조커 | **♠9** | 효창 | 3 |
| 7 | ♦10 | ♣8 | ♣3 | **♣9** | ♣K | 영동 | 2 |
| 8 | **♦5** | ♥3 | ♦7 | ♥2 | ♠Q | 병직 | 1 |
| 9 | ♠7 | ♠8 | **♥J** | ♠A | ♥6 | 효창 | 2 |
| 10 | ♦6 | ♣5 | ♥10 | **♥K** | ♣Q | 영동 | 3 |

## 결과
- 여당 15 / 야당 5
- 여당 승 · 점수 700 → 상금 700
- 배분: 영동 +1400 · 김세 -700 · 병직 -700 · 효창 +700 · 정원 -700

## 재현용 원본
```json
{
 "seed": 910514803,
 "dealer": 3,
 "version": "v2.1.1",
 "tier": "master",
 "cfg": {
  "minBid": 14,
  "noGirudaBidDiscount": 0,
  "allowBidRevise": true,
  "girudaChangeCost": 2,
  "toNoGirudaChangeCost": 1,
  "dealMissEnabled": true,
  "dealMissThreshold": 0.5,
  "jokerCallEnabled": true,
  "jokerCallBaseSuit": "C",
  "jokerCallAltSuit": "H",
  "jokerCallMightyProtect": true,
  "firstTrickJokerNoGiruda": true,
  "firstTrickNoJokerCall": true,
  "firstTrickJokerWeak": true,
  "lastTrickJokerWeak": true,
  "firstTrickNoGirudaLead": true,
  "scoring": {
   "perBid": 300,
   "perDiff": 200,
   "noGirudaMult": 2,
   "cap": 2000,
   "noGirudaCap": 3000,
   "declarerShare": 2,
   "selfDeclarerShare": 4,
   "friendShare": 1
  },
  "discardPointsTo": "declarer",
  "seed": 910514803
 },
 "actions": [
  {
   "p": 4,
   "ph": "bidding",
   "a": {
    "type": "pass"
   }
  },
  {
   "p": 0,
   "ph": "bidding",
   "a": {
    "type": "bid",
    "count": 14,
    "giruda": "D"
   }
  },
  {
   "p": 1,
   "ph": "bidding",
   "a": {
    "type": "pass"
   }
  },
  {
   "p": 2,
   "ph": "bidding",
   "a": {
    "type": "pass"
   }
  },
  {
   "p": 3,
   "ph": "bidding",
   "a": {
    "type": "pass"
   }
  },
  {
   "p": 0,
   "ph": "floor",
   "a": {
    "type": "exchange",
    "discard": [
     {
      "suit": "C",
      "rank": 4
     },
     {
      "suit": "H",
      "rank": 7
     },
     {
      "suit": "H",
      "rank": 4
     }
    ]
   }
  },
  {
   "p": 0,
   "ph": "friend",
   "a": {
    "type": "friend",
    "mode": "card",
    "card": {
     "suit": "S",
     "rank": 14
    }
   }
  },
  {
   "p": 0,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 14
    }
   }
  },
  {
   "p": 1,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 6
    }
   }
  },
  {
   "p": 2,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 2
    }
   }
  },
  {
   "p": 3,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 10
    }
   }
  },
  {
   "p": 4,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 7
    }
   }
  },
  {
   "p": 0,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "D",
     "rank": 13
    }
   }
  },
  {
   "p": 1,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "D",
     "rank": 2
    }
   }
  },
  {
   "p": 2,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "D",
     "rank": 8
    }
   }
  },
  {
   "p": 3,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "D",
     "rank": 11
    }
   }
  },
  {
   "p": 4,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "D",
     "rank": 14
    }
   }
  },
  {
   "p": 4,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "S",
     "rank": 5
    }
   }
  },
  {
   "p": 0,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "S",
     "rank": 2
    }
   }
  },
  {
   "p": 1,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "S",
     "rank": 6
    }
   }
  },
  {
   "p": 2,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "S",
     "rank": 3
    }
   }
  },
  {
   "p": 3,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "S",
     "rank": 10
    }
   }
  },
  {
   "p": 3,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 12
    }
   }
  },
  {
   "p": 4,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 5
    }
   }
  },
  {
   "p": 0,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 14
    }
   }
  },
  {
   "p": 1,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 9
    }
   }
  },
  {
   "p": 2,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 8
    }
   }
  },
  {
   "p": 0,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "D",
     "rank": 9
    }
   }
  },
  {
   "p": 1,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "S",
     "rank": 4
    }
   }
  },
  {
   "p": 2,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "D",
     "rank": 3
    }
   }
  },
  {
   "p": 3,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "D",
     "rank": 4
    }
   }
  },
  {
   "p": 4,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "D",
     "rank": 12
    }
   }
  },
  {
   "p": 4,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "S",
     "rank": 9
    }
   }
  },
  {
   "p": 0,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "S",
     "rank": 11
    }
   }
  },
  {
   "p": 1,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "S",
     "rank": 13
    }
   }
  },
  {
   "p": 2,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 11
    }
   }
  },
  {
   "p": 3,
   "ph": "play",
   "a": {
    "type": "play",
    "card": "JOKER"
   }
  },
  {
   "p": 3,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 9
    }
   }
  },
  {
   "p": 4,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 13
    }
   }
  },
  {
   "p": 0,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "D",
     "rank": 10
    }
   }
  },
  {
   "p": 1,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 8
    }
   }
  },
  {
   "p": 2,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 3
    }
   }
  },
  {
   "p": 0,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "D",
     "rank": 5
    }
   }
  },
  {
   "p": 1,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 3
    }
   }
  },
  {
   "p": 2,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "D",
     "rank": 7
    }
   }
  },
  {
   "p": 3,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 2
    }
   }
  },
  {
   "p": 4,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "S",
     "rank": 12
    }
   }
  },
  {
   "p": 2,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 11
    }
   }
  },
  {
   "p": 3,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "S",
     "rank": 14
    }
   }
  },
  {
   "p": 4,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 6
    }
   }
  },
  {
   "p": 0,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "S",
     "rank": 7
    }
   }
  },
  {
   "p": 1,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "S",
     "rank": 8
    }
   }
  },
  {
   "p": 3,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 13
    }
   }
  },
  {
   "p": 4,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 12
    }
   }
  },
  {
   "p": 0,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "D",
     "rank": 6
    }
   }
  },
  {
   "p": 1,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 5
    }
   }
  },
  {
   "p": 2,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 10
    }
   }
  }
 ]
}
```

---

# 마이티 복기 — 4판 (seed 890888772)

- 버전: v2.1.1 · 난이도: master · 딜러: 효창
- 기록 시각: 2026-08-05T08:39:46.418Z
- 공약: **16♣** · 주공: **영동** · 프렌드: ♠A (효창)

## 딜 직후 손패
- 영동: ♠6 ♣9 ♦4 조커 ♣4 ♣3 ♥Q ♣A ♦A ♣8
- 김세: ♦K ♠5 ♥7 ♦5 ♦6 ♥A ♣5 ♥J ♥2 ♥3
- 병직: ♦8 ♠2 ♣6 ♠10 ♦9 ♠Q ♠4 ♠7 ♥K ♦10
- 효창: ♥5 ♥10 ♥8 ♣2 ♥6 ♠A ♥9 ♦7 ♣K ♥4
- 정원: ♠9 ♣J ♦3 ♣10 ♣7 ♣Q ♦2 ♦Q ♠K ♠3
- 바닥패: ♠J ♦J ♠8

## 비딩
- 정원: 패스
- 영동: 14♣
- 김세: 패스
- 병직: 패스
- 효창: 15♥
- 영동: 16♣
- 효창: 패스
- 바닥패 교환: 묻은 카드 ♥Q ♦J ♦4

## 트릭
| # | 영동 | 김세 | 병직 | 효창 | 정원 | 승자 | 점수 |
|---|---|---|---|---|---|---|---|
| 1 | **♠J** | ♠5 | ♠Q | ♠A | ♠3 | 효창 | 3 |
| 2 | ♣3 | ♥2 | ♥K | **♥8** | ♦Q | 영동 | 2 |
| 3 | **♣A** | ♣5 | ♣6 | ♣K | ♣7 | 영동 | 2 |
| 4 | **조커(♣)** | ♦5 | ♠2 | ♣2 | ♣J | 영동 | 1 |
| 5 | **♣9** | ♥7 | ♦9 | ♥10 | ♣Q | 정원 | 2 |
| 6 | ♠6 | ♥J | ♠10 | ♥4 | **♠K** | 정원 | 3 |
| 7 | ♦A | ♦6 | ♦8 | ♦7 | **♦3** | 영동 | 1 |
| 8 | **♣8** | ♥3 | ♦10 | ♥9 | ♣10 | 정원 | 2 |
| 9 | ♣4 | ♦K | ♠7 | ♥6 | **♦2** | 영동 | 1 |
| 10 | **♠8** | ♥A | ♠4 | ♥5 | ♠9 | 정원 | 1 |

## 결과
- 여당 12 / 야당 8 (바닥패 2)
- 야당 승 · 점수 -1700 → 상금 -1700
- 배분: 영동 -3400 · 김세 +1700 · 병직 +1700 · 효창 -1700 · 정원 +1700

## AI 하이라이트 (마스터 기준)
- 트릭 3 [손해] ♣A → ♣9 · 기대상금 +783 · 승률 0/24 → 2/24
- 트릭 1 [손해] ♠J → ♠8 · 기대상금 +358 · 승률 1/24 → 3/24
- 트릭 4 [손해] 조커(C) → ♣9 · 기대상금 +325 · 승률 0/24 → 0/24

## 재현용 원본
```json
{
 "seed": 890888772,
 "dealer": 3,
 "version": "v2.1.1",
 "tier": "master",
 "cfg": {
  "minBid": 14,
  "noGirudaBidDiscount": 0,
  "allowBidRevise": true,
  "girudaChangeCost": 2,
  "toNoGirudaChangeCost": 1,
  "dealMissEnabled": true,
  "dealMissThreshold": 0.5,
  "jokerCallEnabled": true,
  "jokerCallBaseSuit": "C",
  "jokerCallAltSuit": "H",
  "jokerCallMightyProtect": true,
  "firstTrickJokerNoGiruda": true,
  "firstTrickNoJokerCall": true,
  "firstTrickJokerWeak": true,
  "lastTrickJokerWeak": true,
  "firstTrickNoGirudaLead": true,
  "scoring": {
   "perBid": 300,
   "perDiff": 200,
   "noGirudaMult": 2,
   "cap": 2000,
   "noGirudaCap": 3000,
   "declarerShare": 2,
   "selfDeclarerShare": 4,
   "friendShare": 1
  },
  "discardPointsTo": "declarer",
  "seed": 890888772
 },
 "actions": [
  {
   "p": 4,
   "ph": "bidding",
   "a": {
    "type": "pass"
   }
  },
  {
   "p": 0,
   "ph": "bidding",
   "a": {
    "type": "bid",
    "count": 14,
    "giruda": "C"
   }
  },
  {
   "p": 1,
   "ph": "bidding",
   "a": {
    "type": "pass"
   }
  },
  {
   "p": 2,
   "ph": "bidding",
   "a": {
    "type": "pass"
   }
  },
  {
   "p": 3,
   "ph": "bidding",
   "a": {
    "type": "bid",
    "count": 15,
    "giruda": "H"
   }
  },
  {
   "p": 0,
   "ph": "bidding",
   "a": {
    "type": "bid",
    "count": 16,
    "giruda": "C"
   }
  },
  {
   "p": 3,
   "ph": "bidding",
   "a": {
    "type": "pass"
   }
  },
  {
   "p": 0,
   "ph": "floor",
   "a": {
    "type": "exchange",
    "discard": [
     {
      "suit": "H",
      "rank": 12
     },
     {
      "suit": "D",
      "rank": 11
     },
     {
      "suit": "D",
      "rank": 4
     }
    ]
   }
  },
  {
   "p": 0,
   "ph": "friend",
   "a": {
    "type": "friend",
    "mode": "card",
    "card": {
     "suit": "S",
     "rank": 14
    }
   }
  },
  {
   "p": 0,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "S",
     "rank": 11
    }
   }
  },
  {
   "p": 1,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "S",
     "rank": 5
    }
   }
  },
  {
   "p": 2,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "S",
     "rank": 12
    }
   }
  },
  {
   "p": 3,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "S",
     "rank": 14
    }
   }
  },
  {
   "p": 4,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "S",
     "rank": 3
    }
   }
  },
  {
   "p": 3,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 8
    }
   }
  },
  {
   "p": 4,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "D",
     "rank": 12
    }
   }
  },
  {
   "p": 0,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 3
    }
   }
  },
  {
   "p": 1,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 2
    }
   }
  },
  {
   "p": 2,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 13
    }
   }
  },
  {
   "p": 0,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 14
    }
   }
  },
  {
   "p": 1,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 5
    }
   }
  },
  {
   "p": 2,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 6
    }
   }
  },
  {
   "p": 3,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 13
    }
   }
  },
  {
   "p": 4,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 7
    }
   }
  },
  {
   "p": 0,
   "ph": "play",
   "a": {
    "type": "play",
    "card": "JOKER",
    "jokerSuit": "C"
   }
  },
  {
   "p": 1,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "D",
     "rank": 5
    }
   }
  },
  {
   "p": 2,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "S",
     "rank": 2
    }
   }
  },
  {
   "p": 3,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 2
    }
   }
  },
  {
   "p": 4,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 11
    }
   }
  },
  {
   "p": 0,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 9
    }
   }
  },
  {
   "p": 1,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 7
    }
   }
  },
  {
   "p": 2,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "D",
     "rank": 9
    }
   }
  },
  {
   "p": 3,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 10
    }
   }
  },
  {
   "p": 4,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 12
    }
   }
  },
  {
   "p": 4,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "S",
     "rank": 13
    }
   }
  },
  {
   "p": 0,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "S",
     "rank": 6
    }
   }
  },
  {
   "p": 1,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 11
    }
   }
  },
  {
   "p": 2,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "S",
     "rank": 10
    }
   }
  },
  {
   "p": 3,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 4
    }
   }
  },
  {
   "p": 4,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "D",
     "rank": 3
    }
   }
  },
  {
   "p": 0,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "D",
     "rank": 14
    }
   }
  },
  {
   "p": 1,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "D",
     "rank": 6
    }
   }
  },
  {
   "p": 2,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "D",
     "rank": 8
    }
   }
  },
  {
   "p": 3,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "D",
     "rank": 7
    }
   }
  },
  {
   "p": 0,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 8
    }
   }
  },
  {
   "p": 1,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 3
    }
   }
  },
  {
   "p": 2,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "D",
     "rank": 10
    }
   }
  },
  {
   "p": 3,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 9
    }
   }
  },
  {
   "p": 4,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 10
    }
   }
  },
  {
   "p": 4,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "D",
     "rank": 2
    }
   }
  },
  {
   "p": 0,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 4
    }
   }
  },
  {
   "p": 1,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "D",
     "rank": 13
    }
   }
  },
  {
   "p": 2,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "S",
     "rank": 7
    }
   }
  },
  {
   "p": 3,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 6
    }
   }
  },
  {
   "p": 0,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "S",
     "rank": 8
    }
   }
  },
  {
   "p": 1,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 14
    }
   }
  },
  {
   "p": 2,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "S",
     "rank": 4
    }
   }
  },
  {
   "p": 3,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 5
    }
   }
  },
  {
   "p": 4,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "S",
     "rank": 9
    }
   }
  }
 ]
}
```

---

# 마이티 복기 — 5판 (seed 1105856148)

- 버전: v2.1.1 · 난이도: master · 딜러: 효창
- 기록 시각: 2026-08-05T08:41:53.312Z
- 공약: **14♥** · 주공: **영동** · 프렌드: ♠A (병직)

## 딜 직후 손패
- 영동: ♠8 ♦K ♣3 ♦8 ♥6 ♥Q ♥J ♠9 ♥3 ♥5
- 김세: ♠J ♥9 ♣Q ♦2 ♣8 조커 ♠6 ♣9 ♥4 ♦3
- 병직: ♠K ♠3 ♥A ♣7 ♠A ♣6 ♦5 ♣A ♥2 ♠5
- 효창: ♦9 ♠10 ♠2 ♥10 ♣2 ♦7 ♠Q ♦Q ♥K ♠7
- 정원: ♣4 ♠4 ♦J ♥7 ♣10 ♦10 ♥8 ♣J ♦6 ♦A
- 바닥패: ♣K ♣5 ♦4

## 비딩
- 정원: 패스
- 영동: 14♥
- 김세: 패스
- 병직: 패스
- 효창: 패스
- 바닥패 교환: 묻은 카드 ♣5 ♠8 ♠9

## 트릭
| # | 영동 | 김세 | 병직 | 효창 | 정원 | 승자 | 점수 |
|---|---|---|---|---|---|---|---|
| 1 | **♦8** | ♦2 | ♦5 | ♦Q | ♦J | 효창 | 2 |
| 2 | ♦K | ♦3 | ♣7 | **♦7** | ♦10 | 영동 | 2 |
| 3 | **♣3!** | 조커 | ♣A | ♣2 | ♣J | 병직 | 2 |
| 4 | ♥3 | ♠6 | **♠3** | ♠2 | ♠4 | 영동 | 0 |
| 5 | **♥Q** | ♥4 | ♥2 | ♥10 | ♥7 | 영동 | 2 |
| 6 | **♥J** | ♥9 | ♥A | ♥K | ♥8 | 병직 | 3 |
| 7 | ♣K | ♣8 | **♣6** | ♠7 | ♣4 | 영동 | 1 |
| 8 | **♦4** | ♣Q | ♠A | ♦9 | ♦6 | 병직 | 2 |
| 9 | ♥5 | ♠J | **♠5** | ♠10 | ♦A | 영동 | 3 |
| 10 | **♥6** | ♣9 | ♠K | ♠Q | ♣10 | 영동 | 3 |

## 결과
- 여당 18 / 야당 2
- 여당 승 · 점수 1300 → 상금 1300
- 배분: 영동 +2600 · 김세 -1300 · 병직 +1300 · 효창 -1300 · 정원 -1300

## 재현용 원본
```json
{
 "seed": 1105856148,
 "dealer": 3,
 "version": "v2.1.1",
 "tier": "master",
 "cfg": {
  "minBid": 14,
  "noGirudaBidDiscount": 0,
  "allowBidRevise": true,
  "girudaChangeCost": 2,
  "toNoGirudaChangeCost": 1,
  "dealMissEnabled": true,
  "dealMissThreshold": 0.5,
  "jokerCallEnabled": true,
  "jokerCallBaseSuit": "C",
  "jokerCallAltSuit": "H",
  "jokerCallMightyProtect": true,
  "firstTrickJokerNoGiruda": true,
  "firstTrickNoJokerCall": true,
  "firstTrickJokerWeak": true,
  "lastTrickJokerWeak": true,
  "firstTrickNoGirudaLead": true,
  "scoring": {
   "perBid": 300,
   "perDiff": 200,
   "noGirudaMult": 2,
   "cap": 2000,
   "noGirudaCap": 3000,
   "declarerShare": 2,
   "selfDeclarerShare": 4,
   "friendShare": 1
  },
  "discardPointsTo": "declarer",
  "seed": 1105856148
 },
 "actions": [
  {
   "p": 4,
   "ph": "bidding",
   "a": {
    "type": "pass"
   }
  },
  {
   "p": 0,
   "ph": "bidding",
   "a": {
    "type": "bid",
    "count": 14,
    "giruda": "H"
   }
  },
  {
   "p": 1,
   "ph": "bidding",
   "a": {
    "type": "pass"
   }
  },
  {
   "p": 2,
   "ph": "bidding",
   "a": {
    "type": "pass"
   }
  },
  {
   "p": 3,
   "ph": "bidding",
   "a": {
    "type": "pass"
   }
  },
  {
   "p": 0,
   "ph": "floor",
   "a": {
    "type": "exchange",
    "discard": [
     {
      "suit": "C",
      "rank": 5
     },
     {
      "suit": "S",
      "rank": 8
     },
     {
      "suit": "S",
      "rank": 9
     }
    ]
   }
  },
  {
   "p": 0,
   "ph": "friend",
   "a": {
    "type": "friend",
    "mode": "card",
    "card": {
     "suit": "S",
     "rank": 14
    }
   }
  },
  {
   "p": 0,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "D",
     "rank": 8
    }
   }
  },
  {
   "p": 1,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "D",
     "rank": 2
    }
   }
  },
  {
   "p": 2,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "D",
     "rank": 5
    }
   }
  },
  {
   "p": 3,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "D",
     "rank": 12
    }
   }
  },
  {
   "p": 4,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "D",
     "rank": 11
    }
   }
  },
  {
   "p": 3,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "D",
     "rank": 7
    }
   }
  },
  {
   "p": 4,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "D",
     "rank": 10
    }
   }
  },
  {
   "p": 0,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "D",
     "rank": 13
    }
   }
  },
  {
   "p": 1,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "D",
     "rank": 3
    }
   }
  },
  {
   "p": 2,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 7
    }
   }
  },
  {
   "p": 0,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 3
    },
    "jokerCall": true
   }
  },
  {
   "p": 1,
   "ph": "play",
   "a": {
    "type": "play",
    "card": "JOKER"
   }
  },
  {
   "p": 2,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 14
    }
   }
  },
  {
   "p": 3,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 2
    }
   }
  },
  {
   "p": 4,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 11
    }
   }
  },
  {
   "p": 2,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "S",
     "rank": 3
    }
   }
  },
  {
   "p": 3,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "S",
     "rank": 2
    }
   }
  },
  {
   "p": 4,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "S",
     "rank": 4
    }
   }
  },
  {
   "p": 0,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 3
    }
   }
  },
  {
   "p": 1,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "S",
     "rank": 6
    }
   }
  },
  {
   "p": 0,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 12
    }
   }
  },
  {
   "p": 1,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 4
    }
   }
  },
  {
   "p": 2,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 2
    }
   }
  },
  {
   "p": 3,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 10
    }
   }
  },
  {
   "p": 4,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 7
    }
   }
  },
  {
   "p": 0,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 11
    }
   }
  },
  {
   "p": 1,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 9
    }
   }
  },
  {
   "p": 2,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 14
    }
   }
  },
  {
   "p": 3,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 13
    }
   }
  },
  {
   "p": 4,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 8
    }
   }
  },
  {
   "p": 2,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 6
    }
   }
  },
  {
   "p": 3,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "S",
     "rank": 7
    }
   }
  },
  {
   "p": 4,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 4
    }
   }
  },
  {
   "p": 0,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 13
    }
   }
  },
  {
   "p": 1,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 8
    }
   }
  },
  {
   "p": 0,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "D",
     "rank": 4
    }
   }
  },
  {
   "p": 1,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 12
    }
   }
  },
  {
   "p": 2,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "S",
     "rank": 14
    }
   }
  },
  {
   "p": 3,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "D",
     "rank": 9
    }
   }
  },
  {
   "p": 4,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "D",
     "rank": 6
    }
   }
  },
  {
   "p": 2,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "S",
     "rank": 5
    }
   }
  },
  {
   "p": 3,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "S",
     "rank": 10
    }
   }
  },
  {
   "p": 4,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "D",
     "rank": 14
    }
   }
  },
  {
   "p": 0,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 5
    }
   }
  },
  {
   "p": 1,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "S",
     "rank": 11
    }
   }
  },
  {
   "p": 0,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 6
    }
   }
  },
  {
   "p": 1,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 9
    }
   }
  },
  {
   "p": 2,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "S",
     "rank": 13
    }
   }
  },
  {
   "p": 3,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "S",
     "rank": 12
    }
   }
  },
  {
   "p": 4,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 10
    }
   }
  }
 ]
}
```

---

# 마이티 복기 — 6판 (seed 1828731177)

- 버전: v2.1.1 · 난이도: master · 딜러: 병직
- 기록 시각: 2026-08-05T08:43:02.979Z
- 공약: **15♣** · 주공: **영동** · 프렌드: ♠A (김세)

## 딜 직후 손패
- 영동: ♦A ♠6 ♣2 ♣6 ♥7 ♣Q ♥Q ♣K ♦Q ♠2
- 김세: ♠A ♣7 ♦3 ♦10 ♣8 ♣J ♠4 ♠7 ♠5 ♠9
- 병직: ♦4 ♥6 ♦K ♥10 ♣10 ♥K ♠8 ♠3 ♣3 ♥4
- 효창: ♥2 ♠K 조커 ♥J ♦8 ♥A ♥8 ♠10 ♦6 ♦2
- 정원: ♠J ♦J ♣A ♦7 ♦9 ♦5 ♠Q ♥3 ♣5 ♥5
- 바닥패: ♣9 ♥9 ♣4

## 비딩
- 효창: 14♥
- 정원: 패스
- 영동: 15♣
- 김세: 패스
- 병직: 패스
- 효창: 패스
- 바닥패 교환: 묻은 카드 ♠2 ♠6 ♦Q

## 트릭
| # | 영동 | 김세 | 병직 | 효창 | 정원 | 승자 | 점수 |
|---|---|---|---|---|---|---|---|
| 1 | **♦A** | ♦10 | ♦4 | ♦6 | ♦9 | 영동 | 2 |
| 2 | **♣K** | ♣8 | ♣3 | ♥A | ♣A | 정원 | 3 |
| 3 | ♥Q | ♠A | ♥6 | 조커 | **♥3!** | 김세 | 2 |
| 4 | ♣2 | **♦3** | ♦K | ♦8 | ♦J | 영동 | 2 |
| 5 | **♣Q** | ♣J | ♣10 | ♥2 | ♣5 | 영동 | 3 |
| 6 | **♥9** | ♠7 | ♥K | ♥J | ♥5 | 병직 | 2 |
| 7 | ♣6 | ♠5 | **♠3** | ♠K | ♠J | 영동 | 2 |
| 8 | **♥7** | ♣7 | ♥4 | ♥8 | ♦7 | 김세 | 0 |
| 9 | ♣4 | **♠4** | ♠8 | ♠10 | ♠Q | 영동 | 2 |
| 10 | **♣9** | ♠9 | ♥10 | ♦2 | ♦5 | 영동 | 1 |

## 결과
- 여당 15 / 야당 5 (바닥패 1)
- 여당 승 · 점수 800 → 상금 800
- 배분: 영동 +1600 · 김세 +800 · 병직 -800 · 효창 -800 · 정원 -800

## AI 하이라이트 (마스터 기준)
- 트릭 2 [손해] ♣K → ♥9 · 기대상금 +2000 · 승률 0/24 → 11/24
- 트릭 3 [손해] ♥Q → ♥7 · 기대상금 +683 · 승률 8/24 → 11/24
- 트릭 1 [손해] ♦A → ♥7 · 기대상금 +600 · 승률 5/24 → 8/24

## 재현용 원본
```json
{
 "seed": 1828731177,
 "dealer": 2,
 "version": "v2.1.1",
 "tier": "master",
 "cfg": {
  "minBid": 14,
  "noGirudaBidDiscount": 0,
  "allowBidRevise": true,
  "girudaChangeCost": 2,
  "toNoGirudaChangeCost": 1,
  "dealMissEnabled": true,
  "dealMissThreshold": 0.5,
  "jokerCallEnabled": true,
  "jokerCallBaseSuit": "C",
  "jokerCallAltSuit": "H",
  "jokerCallMightyProtect": true,
  "firstTrickJokerNoGiruda": true,
  "firstTrickNoJokerCall": true,
  "firstTrickJokerWeak": true,
  "lastTrickJokerWeak": true,
  "firstTrickNoGirudaLead": true,
  "scoring": {
   "perBid": 300,
   "perDiff": 200,
   "noGirudaMult": 2,
   "cap": 2000,
   "noGirudaCap": 3000,
   "declarerShare": 2,
   "selfDeclarerShare": 4,
   "friendShare": 1
  },
  "discardPointsTo": "declarer",
  "seed": 1828731177
 },
 "actions": [
  {
   "p": 3,
   "ph": "bidding",
   "a": {
    "type": "bid",
    "count": 14,
    "giruda": "H"
   }
  },
  {
   "p": 4,
   "ph": "bidding",
   "a": {
    "type": "pass"
   }
  },
  {
   "p": 0,
   "ph": "bidding",
   "a": {
    "type": "bid",
    "count": 15,
    "giruda": "C"
   }
  },
  {
   "p": 1,
   "ph": "bidding",
   "a": {
    "type": "pass"
   }
  },
  {
   "p": 2,
   "ph": "bidding",
   "a": {
    "type": "pass"
   }
  },
  {
   "p": 3,
   "ph": "bidding",
   "a": {
    "type": "pass"
   }
  },
  {
   "p": 0,
   "ph": "floor",
   "a": {
    "type": "exchange",
    "discard": [
     {
      "suit": "S",
      "rank": 2
     },
     {
      "suit": "S",
      "rank": 6
     },
     {
      "suit": "D",
      "rank": 12
     }
    ]
   }
  },
  {
   "p": 0,
   "ph": "friend",
   "a": {
    "type": "friend",
    "mode": "card",
    "card": {
     "suit": "S",
     "rank": 14
    }
   }
  },
  {
   "p": 0,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "D",
     "rank": 14
    }
   }
  },
  {
   "p": 1,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "D",
     "rank": 10
    }
   }
  },
  {
   "p": 2,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "D",
     "rank": 4
    }
   }
  },
  {
   "p": 3,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "D",
     "rank": 6
    }
   }
  },
  {
   "p": 4,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "D",
     "rank": 9
    }
   }
  },
  {
   "p": 0,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 13
    }
   }
  },
  {
   "p": 1,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 8
    }
   }
  },
  {
   "p": 2,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 3
    }
   }
  },
  {
   "p": 3,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 14
    }
   }
  },
  {
   "p": 4,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 14
    }
   }
  },
  {
   "p": 4,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 3
    },
    "jokerCall": true
   }
  },
  {
   "p": 0,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 12
    }
   }
  },
  {
   "p": 1,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "S",
     "rank": 14
    }
   }
  },
  {
   "p": 2,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 6
    }
   }
  },
  {
   "p": 3,
   "ph": "play",
   "a": {
    "type": "play",
    "card": "JOKER"
   }
  },
  {
   "p": 1,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "D",
     "rank": 3
    }
   }
  },
  {
   "p": 2,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "D",
     "rank": 13
    }
   }
  },
  {
   "p": 3,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "D",
     "rank": 8
    }
   }
  },
  {
   "p": 4,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "D",
     "rank": 11
    }
   }
  },
  {
   "p": 0,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 2
    }
   }
  },
  {
   "p": 0,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 12
    }
   }
  },
  {
   "p": 1,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 11
    }
   }
  },
  {
   "p": 2,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 10
    }
   }
  },
  {
   "p": 3,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 2
    }
   }
  },
  {
   "p": 4,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 5
    }
   }
  },
  {
   "p": 0,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 9
    }
   }
  },
  {
   "p": 1,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "S",
     "rank": 7
    }
   }
  },
  {
   "p": 2,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 13
    }
   }
  },
  {
   "p": 3,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 11
    }
   }
  },
  {
   "p": 4,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 5
    }
   }
  },
  {
   "p": 2,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "S",
     "rank": 3
    }
   }
  },
  {
   "p": 3,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "S",
     "rank": 13
    }
   }
  },
  {
   "p": 4,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "S",
     "rank": 11
    }
   }
  },
  {
   "p": 0,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 6
    }
   }
  },
  {
   "p": 1,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "S",
     "rank": 5
    }
   }
  },
  {
   "p": 0,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 7
    }
   }
  },
  {
   "p": 1,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 7
    }
   }
  },
  {
   "p": 2,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 4
    }
   }
  },
  {
   "p": 3,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 8
    }
   }
  },
  {
   "p": 4,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "D",
     "rank": 7
    }
   }
  },
  {
   "p": 1,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "S",
     "rank": 4
    }
   }
  },
  {
   "p": 2,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "S",
     "rank": 8
    }
   }
  },
  {
   "p": 3,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "S",
     "rank": 10
    }
   }
  },
  {
   "p": 4,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "S",
     "rank": 12
    }
   }
  },
  {
   "p": 0,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 4
    }
   }
  },
  {
   "p": 0,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 9
    }
   }
  },
  {
   "p": 1,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "S",
     "rank": 9
    }
   }
  },
  {
   "p": 2,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 10
    }
   }
  },
  {
   "p": 3,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "D",
     "rank": 2
    }
   }
  },
  {
   "p": 4,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "D",
     "rank": 5
    }
   }
  }
 ]
}
```

---

# 마이티 복기 — 7판 (seed 1601382149)

- 버전: v2.1.1 · 난이도: master · 딜러: 김세
- 기록 시각: 2026-08-05T08:44:42.898Z
- 공약: **14♣** · 주공: **효창** · 프렌드: 조커 (정원)

## 딜 직후 손패
- 영동: ♦4 ♠2 ♦J ♦10 ♠4 ♣7 ♠9 ♣5 ♣3 ♥5
- 김세: ♠K ♦K ♥3 ♥8 ♦9 ♦7 ♣2 ♦A ♥K ♥6
- 병직: ♣9 ♣4 ♦2 ♠7 ♣K ♥Q ♠8 ♥10 ♦6 ♣J
- 효창: ♦3 ♣A ♣8 ♣6 ♥A ♣Q ♦8 ♥9 ♠10 ♥2
- 정원: ♠3 조커 ♠J ♣10 ♥4 ♦5 ♥J ♠5 ♠6 ♥7
- 바닥패: ♦Q ♠Q ♠A

## 비딩
- 병직: 패스
- 효창: 14♣
- 정원: 패스
- 영동: 패스
- 김세: 패스
- 바닥패 교환: 묻은 카드 ♦Q ♦3 ♠10

## 트릭
| # | 영동 | 김세 | 병직 | 효창 | 정원 | 승자 | 점수 |
|---|---|---|---|---|---|---|---|
| 1 | ♥5 | ♥6 | ♥10 | **♥A** | ♥7 | 효창 | 2 |
| 2 | ♣3 | ♣2 | ♣J | **♣6** | ♣10 | 병직 | 2 |
| 3 | ♦4 | ♦7 | **♦6** | ♦8 | 조커 | 정원 | 0 |
| 4 | ♦J | ♦A | ♦2 | ♥2 | **♦5** | 김세 | 2 |
| 5 | ♦10 | **♦K** | ♠8 | ♥9 | ♠3 | 김세 | 2 |
| 6 | ♠2 | **♥3!** | ♥Q | ♣8 | ♥J | 효창 | 2 |
| 7 | ♣5 | ♦9 | ♣4 | **♣A** | ♠J | 효창 | 2 |
| 8 | ♠4 | ♠K | ♠7 | **♠A** | ♠6 | 효창 | 2 |
| 9 | ♠9 | ♥8 | ♣9 | **♠Q** | ♠5 | 병직 | 1 |
| 10 | ♣7 | ♥K | **♣K** | ♣Q | ♥4 | 병직 | 3 |

## 결과
- 여당 10 / 야당 10 (바닥패 2)
- 야당 승 · 점수 -1100 → 상금 -1100
- 배분: 영동 +1100 · 김세 +1100 · 병직 +1100 · 효창 -2200 · 정원 -1100

## 재현용 원본
```json
{
 "seed": 1601382149,
 "dealer": 1,
 "version": "v2.1.1",
 "tier": "master",
 "cfg": {
  "minBid": 14,
  "noGirudaBidDiscount": 0,
  "allowBidRevise": true,
  "girudaChangeCost": 2,
  "toNoGirudaChangeCost": 1,
  "dealMissEnabled": true,
  "dealMissThreshold": 0.5,
  "jokerCallEnabled": true,
  "jokerCallBaseSuit": "C",
  "jokerCallAltSuit": "H",
  "jokerCallMightyProtect": true,
  "firstTrickJokerNoGiruda": true,
  "firstTrickNoJokerCall": true,
  "firstTrickJokerWeak": true,
  "lastTrickJokerWeak": true,
  "firstTrickNoGirudaLead": true,
  "scoring": {
   "perBid": 300,
   "perDiff": 200,
   "noGirudaMult": 2,
   "cap": 2000,
   "noGirudaCap": 3000,
   "declarerShare": 2,
   "selfDeclarerShare": 4,
   "friendShare": 1
  },
  "discardPointsTo": "declarer",
  "seed": 1601382149
 },
 "actions": [
  {
   "p": 2,
   "ph": "bidding",
   "a": {
    "type": "pass"
   }
  },
  {
   "p": 3,
   "ph": "bidding",
   "a": {
    "type": "bid",
    "count": 14,
    "giruda": "C"
   }
  },
  {
   "p": 4,
   "ph": "bidding",
   "a": {
    "type": "pass"
   }
  },
  {
   "p": 0,
   "ph": "bidding",
   "a": {
    "type": "pass"
   }
  },
  {
   "p": 1,
   "ph": "bidding",
   "a": {
    "type": "pass"
   }
  },
  {
   "p": 3,
   "ph": "floor",
   "a": {
    "type": "exchange",
    "discard": [
     {
      "suit": "D",
      "rank": 12
     },
     {
      "suit": "D",
      "rank": 3
     },
     {
      "suit": "S",
      "rank": 10
     }
    ]
   }
  },
  {
   "p": 3,
   "ph": "friend",
   "a": {
    "type": "friend",
    "mode": "card",
    "card": "JOKER"
   }
  },
  {
   "p": 3,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 14
    }
   }
  },
  {
   "p": 4,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 7
    }
   }
  },
  {
   "p": 0,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 5
    }
   }
  },
  {
   "p": 1,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 6
    }
   }
  },
  {
   "p": 2,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 10
    }
   }
  },
  {
   "p": 3,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 6
    }
   }
  },
  {
   "p": 4,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 10
    }
   }
  },
  {
   "p": 0,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 3
    }
   }
  },
  {
   "p": 1,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 2
    }
   }
  },
  {
   "p": 2,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 11
    }
   }
  },
  {
   "p": 2,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "D",
     "rank": 6
    }
   }
  },
  {
   "p": 3,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "D",
     "rank": 8
    }
   }
  },
  {
   "p": 4,
   "ph": "play",
   "a": {
    "type": "play",
    "card": "JOKER"
   }
  },
  {
   "p": 0,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "D",
     "rank": 4
    }
   }
  },
  {
   "p": 1,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "D",
     "rank": 7
    }
   }
  },
  {
   "p": 4,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "D",
     "rank": 5
    }
   }
  },
  {
   "p": 0,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "D",
     "rank": 11
    }
   }
  },
  {
   "p": 1,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "D",
     "rank": 14
    }
   }
  },
  {
   "p": 2,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "D",
     "rank": 2
    }
   }
  },
  {
   "p": 3,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 2
    }
   }
  },
  {
   "p": 1,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "D",
     "rank": 13
    }
   }
  },
  {
   "p": 2,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "S",
     "rank": 8
    }
   }
  },
  {
   "p": 3,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 9
    }
   }
  },
  {
   "p": 4,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "S",
     "rank": 3
    }
   }
  },
  {
   "p": 0,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "D",
     "rank": 10
    }
   }
  },
  {
   "p": 1,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 3
    },
    "jokerCall": true
   }
  },
  {
   "p": 2,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 12
    }
   }
  },
  {
   "p": 3,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 8
    }
   }
  },
  {
   "p": 4,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 11
    }
   }
  },
  {
   "p": 0,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "S",
     "rank": 2
    }
   }
  },
  {
   "p": 3,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 14
    }
   }
  },
  {
   "p": 4,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "S",
     "rank": 11
    }
   }
  },
  {
   "p": 0,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 5
    }
   }
  },
  {
   "p": 1,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "D",
     "rank": 9
    }
   }
  },
  {
   "p": 2,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 4
    }
   }
  },
  {
   "p": 3,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "S",
     "rank": 14
    }
   }
  },
  {
   "p": 4,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "S",
     "rank": 6
    }
   }
  },
  {
   "p": 0,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "S",
     "rank": 4
    }
   }
  },
  {
   "p": 1,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "S",
     "rank": 13
    }
   }
  },
  {
   "p": 2,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "S",
     "rank": 7
    }
   }
  },
  {
   "p": 3,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "S",
     "rank": 12
    }
   }
  },
  {
   "p": 4,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "S",
     "rank": 5
    }
   }
  },
  {
   "p": 0,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "S",
     "rank": 9
    }
   }
  },
  {
   "p": 1,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 8
    }
   }
  },
  {
   "p": 2,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 9
    }
   }
  },
  {
   "p": 2,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 13
    }
   }
  },
  {
   "p": 3,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 12
    }
   }
  },
  {
   "p": 4,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 4
    }
   }
  },
  {
   "p": 0,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 7
    }
   }
  },
  {
   "p": 1,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 13
    }
   }
  }
 ]
}
```

---

# 마이티 복기 — 8판 (seed 1039202975)

- 버전: v2.1.1 · 난이도: master · 딜러: 정원
- 기록 시각: 2026-08-05T08:45:37.498Z
- 공약: **14♥** · 주공: **병직** · 프렌드: ♠A (정원)

## 딜 직후 손패
- 영동: ♥7 ♠4 ♦2 ♠2 ♦4 ♦J ♣9 ♣6 ♥2 ♣Q
- 김세: ♦6 ♦9 ♠9 ♦5 ♦Q ♦10 ♥Q ♥5 ♥4 ♠Q
- 병직: 조커 ♠5 ♠8 ♥6 ♠3 ♥10 ♥3 ♥A ♣J ♥8
- 효창: ♦K ♣5 ♣K ♣4 ♣3 ♦3 ♦8 ♣7 ♠6 ♦A
- 정원: ♠K ♣2 ♥9 ♠J ♠A ♣10 ♦7 ♥J ♣A ♠7
- 바닥패: ♥K ♣8 ♠10

## 비딩
- 영동: 패스
- 김세: 패스
- 병직: 14♥
- 효창: 패스
- 정원: 패스
- 바닥패 교환: 묻은 카드 ♠10 ♣8 ♠5

## 트릭
| # | 영동 | 김세 | 병직 | 효창 | 정원 | 승자 | 점수 |
|---|---|---|---|---|---|---|---|
| 1 | ♣Q | ♠9 | **♣J** | ♣4 | ♣A | 정원 | 3 |
| 2 | ♣9 | ♦Q | ♠3 | ♣K | **♣2** | 효창 | 2 |
| 3 | ♣6 | ♦10 | 조커 | **♣3!** | ♣10 | 정원 | 2 |
| 4 | ♠4 | ♠Q | ♠8 | ♠6 | **♠7** | 김세 | 1 |
| 5 | ♦2 | **♦5** | ♥3 | ♦K | ♦7 | 병직 | 1 |
| 6 | ♥2 | ♥Q | **♥8** | ♣7 | ♥9 | 김세 | 1 |
| 7 | ♦4 | **♦9** | ♥6 | ♦8 | ♠J | 병직 | 1 |
| 8 | ♥7 | ♥5 | **♥K** | ♣5 | ♥J | 병직 | 2 |
| 9 | ♠2 | ♥4 | **♥10** | ♦3 | ♠A | 정원 | 2 |
| 10 | ♦J | ♦6 | ♥A | ♦A | **♠K** | 병직 | 4 |

## 결과
- 여당 16 / 야당 4 (바닥패 1)
- 여당 승 · 점수 900 → 상금 900
- 배분: 영동 -900 · 김세 -900 · 병직 +1800 · 효창 -900 · 정원 +900

## AI 하이라이트 (마스터 기준)
- 트릭 1 [손해] ♣Q → ♣6 · 기대상금 +125 · 승률 2/24 → 2/24

## 재현용 원본
```json
{
 "seed": 1039202975,
 "dealer": 4,
 "version": "v2.1.1",
 "tier": "master",
 "cfg": {
  "minBid": 14,
  "noGirudaBidDiscount": 0,
  "allowBidRevise": true,
  "girudaChangeCost": 2,
  "toNoGirudaChangeCost": 1,
  "dealMissEnabled": true,
  "dealMissThreshold": 0.5,
  "jokerCallEnabled": true,
  "jokerCallBaseSuit": "C",
  "jokerCallAltSuit": "H",
  "jokerCallMightyProtect": true,
  "firstTrickJokerNoGiruda": true,
  "firstTrickNoJokerCall": true,
  "firstTrickJokerWeak": true,
  "lastTrickJokerWeak": true,
  "firstTrickNoGirudaLead": true,
  "scoring": {
   "perBid": 300,
   "perDiff": 200,
   "noGirudaMult": 2,
   "cap": 2000,
   "noGirudaCap": 3000,
   "declarerShare": 2,
   "selfDeclarerShare": 4,
   "friendShare": 1
  },
  "discardPointsTo": "declarer",
  "seed": 1039202975
 },
 "actions": [
  {
   "p": 0,
   "ph": "bidding",
   "a": {
    "type": "pass"
   }
  },
  {
   "p": 1,
   "ph": "bidding",
   "a": {
    "type": "pass"
   }
  },
  {
   "p": 2,
   "ph": "bidding",
   "a": {
    "type": "bid",
    "count": 14,
    "giruda": "H"
   }
  },
  {
   "p": 3,
   "ph": "bidding",
   "a": {
    "type": "pass"
   }
  },
  {
   "p": 4,
   "ph": "bidding",
   "a": {
    "type": "pass"
   }
  },
  {
   "p": 2,
   "ph": "floor",
   "a": {
    "type": "exchange",
    "discard": [
     {
      "suit": "S",
      "rank": 10
     },
     {
      "suit": "C",
      "rank": 8
     },
     {
      "suit": "S",
      "rank": 5
     }
    ]
   }
  },
  {
   "p": 2,
   "ph": "friend",
   "a": {
    "type": "friend",
    "mode": "card",
    "card": {
     "suit": "S",
     "rank": 14
    }
   }
  },
  {
   "p": 2,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 11
    }
   }
  },
  {
   "p": 3,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 4
    }
   }
  },
  {
   "p": 4,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 14
    }
   }
  },
  {
   "p": 0,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 12
    }
   }
  },
  {
   "p": 1,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "S",
     "rank": 9
    }
   }
  },
  {
   "p": 4,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 2
    }
   }
  },
  {
   "p": 0,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 9
    }
   }
  },
  {
   "p": 1,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "D",
     "rank": 12
    }
   }
  },
  {
   "p": 2,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "S",
     "rank": 3
    }
   }
  },
  {
   "p": 3,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 13
    }
   }
  },
  {
   "p": 3,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 3
    },
    "jokerCall": true
   }
  },
  {
   "p": 4,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 10
    }
   }
  },
  {
   "p": 0,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 6
    }
   }
  },
  {
   "p": 1,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "D",
     "rank": 10
    }
   }
  },
  {
   "p": 2,
   "ph": "play",
   "a": {
    "type": "play",
    "card": "JOKER"
   }
  },
  {
   "p": 4,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "S",
     "rank": 7
    }
   }
  },
  {
   "p": 0,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "S",
     "rank": 4
    }
   }
  },
  {
   "p": 1,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "S",
     "rank": 12
    }
   }
  },
  {
   "p": 2,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "S",
     "rank": 8
    }
   }
  },
  {
   "p": 3,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "S",
     "rank": 6
    }
   }
  },
  {
   "p": 1,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "D",
     "rank": 5
    }
   }
  },
  {
   "p": 2,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 3
    }
   }
  },
  {
   "p": 3,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "D",
     "rank": 13
    }
   }
  },
  {
   "p": 4,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "D",
     "rank": 7
    }
   }
  },
  {
   "p": 0,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "D",
     "rank": 2
    }
   }
  },
  {
   "p": 2,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 8
    }
   }
  },
  {
   "p": 3,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 7
    }
   }
  },
  {
   "p": 4,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 9
    }
   }
  },
  {
   "p": 0,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 2
    }
   }
  },
  {
   "p": 1,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 12
    }
   }
  },
  {
   "p": 1,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "D",
     "rank": 9
    }
   }
  },
  {
   "p": 2,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 6
    }
   }
  },
  {
   "p": 3,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "D",
     "rank": 8
    }
   }
  },
  {
   "p": 4,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "S",
     "rank": 11
    }
   }
  },
  {
   "p": 0,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "D",
     "rank": 4
    }
   }
  },
  {
   "p": 2,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 13
    }
   }
  },
  {
   "p": 3,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 5
    }
   }
  },
  {
   "p": 4,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 11
    }
   }
  },
  {
   "p": 0,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 7
    }
   }
  },
  {
   "p": 1,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 5
    }
   }
  },
  {
   "p": 2,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 10
    }
   }
  },
  {
   "p": 3,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "D",
     "rank": 3
    }
   }
  },
  {
   "p": 4,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "S",
     "rank": 14
    }
   }
  },
  {
   "p": 0,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "S",
     "rank": 2
    }
   }
  },
  {
   "p": 1,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 4
    }
   }
  },
  {
   "p": 4,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "S",
     "rank": 13
    }
   }
  },
  {
   "p": 0,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "D",
     "rank": 11
    }
   }
  },
  {
   "p": 1,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "D",
     "rank": 6
    }
   }
  },
  {
   "p": 2,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 14
    }
   }
  },
  {
   "p": 3,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "D",
     "rank": 14
    }
   }
  }
 ]
}
```

---

# 마이티 복기 — 9판 (seed 1198760262)

- 버전: v2.1.1 · 난이도: master · 딜러: 정원
- 기록 시각: 2026-08-05T08:46:35.732Z
- 공약: **15♣** · 주공: **병직** · 프렌드: ♠A (효창)

## 딜 직후 손패
- 영동: ♦8 ♣2 ♠8 ♣K ♠10 ♦4 ♦5 ♥A ♥10 ♥8
- 김세: ♣J ♦7 ♦10 ♥5 ♣6 ♠7 ♦2 ♦A ♠6 ♦3
- 병직: ♥Q ♣9 ♣Q ♣7 ♣8 ♣A ♠Q 조커 ♥2 ♥J
- 효창: ♦K ♠A ♦9 ♥3 ♠K ♠3 ♥9 ♣3 ♣10 ♦Q
- 정원: ♥6 ♣5 ♣4 ♠J ♥K ♠4 ♠2 ♥4 ♠5 ♠9
- 바닥패: ♦J ♥7 ♦6

## 비딩
- 영동: 패스
- 김세: 패스
- 병직: 15♣
- 효창: 패스
- 정원: 패스
- 바닥패 교환: 묻은 카드 ♠Q ♥Q ♦J

## 트릭
| # | 영동 | 김세 | 병직 | 효창 | 정원 | 승자 | 점수 |
|---|---|---|---|---|---|---|---|
| 1 | ♥A | ♥5 | **♥2** | ♥9 | ♥K | 영동 | 2 |
| 2 | **♠10** | ♠7 | ♦6 | ♠K | ♠5 | 효창 | 2 |
| 3 | ♣K | ♣6 | ♣9 | **♣3** | ♣4 | 영동 | 1 |
| 4 | **♠8** | ♠6 | ♣8 | ♠3 | ♠9 | 병직 | 0 |
| 5 | ♥8 | ♦2 | **♥J** | ♠A | ♥6 | 효창 | 2 |
| 6 | ♥10 | ♦A | ♥7 | **♥3** | ♥4 | 영동 | 2 |
| 7 | **♦8** | ♦3 | ♣7 | ♦Q | ♠2 | 병직 | 1 |
| 8 | ♣2 | ♣J | **조커(♣)** | ♣10 | ♣5 | 병직 | 2 |
| 9 | ♦4 | ♦7 | **♣A** | ♦K | ♠4 | 병직 | 2 |
| 10 | ♦5 | ♦10 | **♣Q** | ♦9 | ♠J | 병직 | 3 |

## 결과
- 여당 15 / 야당 5 (바닥패 3)
- 여당 승 · 점수 800 → 상금 800
- 배분: 영동 -800 · 김세 -800 · 병직 +1600 · 효창 +800 · 정원 -800

## AI 하이라이트 (마스터 기준)
- 트릭 1 [손해] ♥A → ♥10 · 기대상금 +533 · 승률 4/24 → 10/24

## 재현용 원본
```json
{
 "seed": 1198760262,
 "dealer": 4,
 "version": "v2.1.1",
 "tier": "master",
 "cfg": {
  "minBid": 14,
  "noGirudaBidDiscount": 0,
  "allowBidRevise": true,
  "girudaChangeCost": 2,
  "toNoGirudaChangeCost": 1,
  "dealMissEnabled": true,
  "dealMissThreshold": 0.5,
  "jokerCallEnabled": true,
  "jokerCallBaseSuit": "C",
  "jokerCallAltSuit": "H",
  "jokerCallMightyProtect": true,
  "firstTrickJokerNoGiruda": true,
  "firstTrickNoJokerCall": true,
  "firstTrickJokerWeak": true,
  "lastTrickJokerWeak": true,
  "firstTrickNoGirudaLead": true,
  "scoring": {
   "perBid": 300,
   "perDiff": 200,
   "noGirudaMult": 2,
   "cap": 2000,
   "noGirudaCap": 3000,
   "declarerShare": 2,
   "selfDeclarerShare": 4,
   "friendShare": 1
  },
  "discardPointsTo": "declarer",
  "seed": 1198760262
 },
 "actions": [
  {
   "p": 0,
   "ph": "bidding",
   "a": {
    "type": "pass"
   }
  },
  {
   "p": 1,
   "ph": "bidding",
   "a": {
    "type": "pass"
   }
  },
  {
   "p": 2,
   "ph": "bidding",
   "a": {
    "type": "bid",
    "count": 15,
    "giruda": "C"
   }
  },
  {
   "p": 3,
   "ph": "bidding",
   "a": {
    "type": "pass"
   }
  },
  {
   "p": 4,
   "ph": "bidding",
   "a": {
    "type": "pass"
   }
  },
  {
   "p": 2,
   "ph": "floor",
   "a": {
    "type": "exchange",
    "discard": [
     {
      "suit": "S",
      "rank": 12
     },
     {
      "suit": "H",
      "rank": 12
     },
     {
      "suit": "D",
      "rank": 11
     }
    ]
   }
  },
  {
   "p": 2,
   "ph": "friend",
   "a": {
    "type": "friend",
    "mode": "card",
    "card": {
     "suit": "S",
     "rank": 14
    }
   }
  },
  {
   "p": 2,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 2
    }
   }
  },
  {
   "p": 3,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 9
    }
   }
  },
  {
   "p": 4,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 13
    }
   }
  },
  {
   "p": 0,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 14
    }
   }
  },
  {
   "p": 1,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 5
    }
   }
  },
  {
   "p": 0,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "S",
     "rank": 10
    }
   }
  },
  {
   "p": 1,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "S",
     "rank": 7
    }
   }
  },
  {
   "p": 2,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "D",
     "rank": 6
    }
   }
  },
  {
   "p": 3,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "S",
     "rank": 13
    }
   }
  },
  {
   "p": 4,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "S",
     "rank": 5
    }
   }
  },
  {
   "p": 3,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 3
    }
   }
  },
  {
   "p": 4,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 4
    }
   }
  },
  {
   "p": 0,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 13
    }
   }
  },
  {
   "p": 1,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 6
    }
   }
  },
  {
   "p": 2,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 9
    }
   }
  },
  {
   "p": 0,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "S",
     "rank": 8
    }
   }
  },
  {
   "p": 1,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "S",
     "rank": 6
    }
   }
  },
  {
   "p": 2,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 8
    }
   }
  },
  {
   "p": 3,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "S",
     "rank": 3
    }
   }
  },
  {
   "p": 4,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "S",
     "rank": 9
    }
   }
  },
  {
   "p": 2,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 11
    }
   }
  },
  {
   "p": 3,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "S",
     "rank": 14
    }
   }
  },
  {
   "p": 4,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 6
    }
   }
  },
  {
   "p": 0,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 8
    }
   }
  },
  {
   "p": 1,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "D",
     "rank": 2
    }
   }
  },
  {
   "p": 3,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 3
    }
   }
  },
  {
   "p": 4,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 4
    }
   }
  },
  {
   "p": 0,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 10
    }
   }
  },
  {
   "p": 1,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "D",
     "rank": 14
    }
   }
  },
  {
   "p": 2,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 7
    }
   }
  },
  {
   "p": 0,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "D",
     "rank": 8
    }
   }
  },
  {
   "p": 1,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "D",
     "rank": 3
    }
   }
  },
  {
   "p": 2,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 7
    }
   }
  },
  {
   "p": 3,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "D",
     "rank": 12
    }
   }
  },
  {
   "p": 4,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "S",
     "rank": 2
    }
   }
  },
  {
   "p": 2,
   "ph": "play",
   "a": {
    "type": "play",
    "card": "JOKER",
    "jokerSuit": "C"
   }
  },
  {
   "p": 3,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 10
    }
   }
  },
  {
   "p": 4,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 5
    }
   }
  },
  {
   "p": 0,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 2
    }
   }
  },
  {
   "p": 1,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 11
    }
   }
  },
  {
   "p": 2,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 14
    }
   }
  },
  {
   "p": 3,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "D",
     "rank": 13
    }
   }
  },
  {
   "p": 4,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "S",
     "rank": 4
    }
   }
  },
  {
   "p": 0,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "D",
     "rank": 4
    }
   }
  },
  {
   "p": 1,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "D",
     "rank": 7
    }
   }
  },
  {
   "p": 2,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 12
    }
   }
  },
  {
   "p": 3,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "D",
     "rank": 9
    }
   }
  },
  {
   "p": 4,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "S",
     "rank": 11
    }
   }
  },
  {
   "p": 0,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "D",
     "rank": 5
    }
   }
  },
  {
   "p": 1,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "D",
     "rank": 10
    }
   }
  }
 ]
}
```

---

# 마이티 복기 — 10판 (seed 606560198)

- 버전: v2.1.1 · 난이도: master · 딜러: 효창
- 기록 시각: 2026-08-05T08:47:45.915Z
- 공약: **14♠** · 주공: **영동** · 프렌드: ♦A (김세)

## 딜 직후 손패
- 영동: ♠4 ♥Q ♠A ♠K ♣9 조커 ♠5 ♥5 ♥9 ♥6
- 김세: ♣7 ♥K ♣J ♦K ♦A ♦9 ♠2 ♥7 ♥J ♠6
- 병직: ♦10 ♠3 ♠7 ♦6 ♠10 ♣2 ♠8 ♣8 ♠Q ♦2
- 효창: ♦7 ♦5 ♣A ♦8 ♥4 ♣10 ♣Q ♣K ♣4 ♥8
- 정원: ♦4 ♥A ♦3 ♥10 ♦Q ♣6 ♥2 ♠9 ♥3 ♣5
- 바닥패: ♠J ♣3 ♦J

## 비딩
- 정원: 패스
- 영동: 14♠
- 김세: 패스
- 병직: 패스
- 효창: 패스
- 바닥패 교환: 묻은 카드 ♣3 ♣9 ♦J

## 트릭
| # | 영동 | 김세 | 병직 | 효창 | 정원 | 승자 | 점수 |
|---|---|---|---|---|---|---|---|
| 1 | **♥Q** | ♦A | ♣8 | ♥8 | ♥3 | 김세 | 2 |
| 2 | ♥5 | **♦K** | ♦2 | ♦7 | ♦Q | 김세 | 2 |
| 3 | ♠4 | **♣7** | ♣2 | ♣K | ♣6 | 영동 | 1 |
| 4 | **♠A** | ♠6 | ♠3 | ♣4 | ♠9 | 영동 | 1 |
| 5 | **♠K** | ♠2 | ♠7 | ♦8 | ♥2 | 영동 | 1 |
| 6 | **조커(♠)** | ♥J | ♠8 | ♦5 | ♦4 | 영동 | 1 |
| 7 | **♥9** | ♥7 | ♦10 | ♥4 | ♥A | 정원 | 2 |
| 8 | ♠J | ♦9 | ♦6 | ♣Q | **♦3** | 영동 | 2 |
| 9 | **♥6** | ♥K | ♠Q | ♣10 | ♥10 | 병직 | 4 |
| 10 | ♠5 | ♣J | **♠10** | ♣A | ♣5 | 병직 | 3 |

## 결과
- 여당 11 / 야당 9 (바닥패 1)
- 야당 승 · 점수 -900 → 상금 -900
- 배분: 영동 -1800 · 김세 -900 · 병직 +900 · 효창 +900 · 정원 +900

## AI 하이라이트 (마스터 기준)
- 트릭 8 [결정적] ♠J → ♥6 · 기대상금 +2650 · 승률 0/24 → 21/24
- 트릭 6 [손해] 조커(S) → ♥6 · 기대상금 +1150 · 승률 13/24 → 22/24
- 트릭 5 [손해] ♠K → ♥6 · 기대상금 +642 · 승률 17/24 → 20/24
- 트릭 4 [손해] ♠A → ♥6 · 기대상금 +250 · 승률 18/24 → 19/24

## 재현용 원본
```json
{
 "seed": 606560198,
 "dealer": 3,
 "version": "v2.1.1",
 "tier": "master",
 "cfg": {
  "minBid": 14,
  "noGirudaBidDiscount": 0,
  "allowBidRevise": true,
  "girudaChangeCost": 2,
  "toNoGirudaChangeCost": 1,
  "dealMissEnabled": true,
  "dealMissThreshold": 0.5,
  "jokerCallEnabled": true,
  "jokerCallBaseSuit": "C",
  "jokerCallAltSuit": "H",
  "jokerCallMightyProtect": true,
  "firstTrickJokerNoGiruda": true,
  "firstTrickNoJokerCall": true,
  "firstTrickJokerWeak": true,
  "lastTrickJokerWeak": true,
  "firstTrickNoGirudaLead": true,
  "scoring": {
   "perBid": 300,
   "perDiff": 200,
   "noGirudaMult": 2,
   "cap": 2000,
   "noGirudaCap": 3000,
   "declarerShare": 2,
   "selfDeclarerShare": 4,
   "friendShare": 1
  },
  "discardPointsTo": "declarer",
  "seed": 606560198
 },
 "actions": [
  {
   "p": 4,
   "ph": "bidding",
   "a": {
    "type": "pass"
   }
  },
  {
   "p": 0,
   "ph": "bidding",
   "a": {
    "type": "bid",
    "count": 14,
    "giruda": "S"
   }
  },
  {
   "p": 1,
   "ph": "bidding",
   "a": {
    "type": "pass"
   }
  },
  {
   "p": 2,
   "ph": "bidding",
   "a": {
    "type": "pass"
   }
  },
  {
   "p": 3,
   "ph": "bidding",
   "a": {
    "type": "pass"
   }
  },
  {
   "p": 0,
   "ph": "floor",
   "a": {
    "type": "exchange",
    "discard": [
     {
      "suit": "C",
      "rank": 3
     },
     {
      "suit": "C",
      "rank": 9
     },
     {
      "suit": "D",
      "rank": 11
     }
    ]
   }
  },
  {
   "p": 0,
   "ph": "friend",
   "a": {
    "type": "friend",
    "mode": "card",
    "card": {
     "suit": "D",
     "rank": 14
    }
   }
  },
  {
   "p": 0,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 12
    }
   }
  },
  {
   "p": 1,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "D",
     "rank": 14
    }
   }
  },
  {
   "p": 2,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 8
    }
   }
  },
  {
   "p": 3,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 8
    }
   }
  },
  {
   "p": 4,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 3
    }
   }
  },
  {
   "p": 1,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "D",
     "rank": 13
    }
   }
  },
  {
   "p": 2,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "D",
     "rank": 2
    }
   }
  },
  {
   "p": 3,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "D",
     "rank": 7
    }
   }
  },
  {
   "p": 4,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "D",
     "rank": 12
    }
   }
  },
  {
   "p": 0,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 5
    }
   }
  },
  {
   "p": 1,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 7
    }
   }
  },
  {
   "p": 2,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 2
    }
   }
  },
  {
   "p": 3,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 13
    }
   }
  },
  {
   "p": 4,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 6
    }
   }
  },
  {
   "p": 0,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "S",
     "rank": 4
    }
   }
  },
  {
   "p": 0,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "S",
     "rank": 14
    }
   }
  },
  {
   "p": 1,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "S",
     "rank": 6
    }
   }
  },
  {
   "p": 2,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "S",
     "rank": 3
    }
   }
  },
  {
   "p": 3,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 4
    }
   }
  },
  {
   "p": 4,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "S",
     "rank": 9
    }
   }
  },
  {
   "p": 0,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "S",
     "rank": 13
    }
   }
  },
  {
   "p": 1,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "S",
     "rank": 2
    }
   }
  },
  {
   "p": 2,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "S",
     "rank": 7
    }
   }
  },
  {
   "p": 3,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "D",
     "rank": 8
    }
   }
  },
  {
   "p": 4,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 2
    }
   }
  },
  {
   "p": 0,
   "ph": "play",
   "a": {
    "type": "play",
    "card": "JOKER",
    "jokerSuit": "S"
   }
  },
  {
   "p": 1,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 11
    }
   }
  },
  {
   "p": 2,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "S",
     "rank": 8
    }
   }
  },
  {
   "p": 3,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "D",
     "rank": 5
    }
   }
  },
  {
   "p": 4,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "D",
     "rank": 4
    }
   }
  },
  {
   "p": 0,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 9
    }
   }
  },
  {
   "p": 1,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 7
    }
   }
  },
  {
   "p": 2,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "D",
     "rank": 10
    }
   }
  },
  {
   "p": 3,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 4
    }
   }
  },
  {
   "p": 4,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 14
    }
   }
  },
  {
   "p": 4,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "D",
     "rank": 3
    }
   }
  },
  {
   "p": 0,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "S",
     "rank": 11
    }
   }
  },
  {
   "p": 1,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "D",
     "rank": 9
    }
   }
  },
  {
   "p": 2,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "D",
     "rank": 6
    }
   }
  },
  {
   "p": 3,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 12
    }
   }
  },
  {
   "p": 0,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 6
    }
   }
  },
  {
   "p": 1,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 13
    }
   }
  },
  {
   "p": 2,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "S",
     "rank": 12
    }
   }
  },
  {
   "p": 3,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 10
    }
   }
  },
  {
   "p": 4,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "H",
     "rank": 10
    }
   }
  },
  {
   "p": 2,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "S",
     "rank": 10
    }
   }
  },
  {
   "p": 3,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 14
    }
   }
  },
  {
   "p": 4,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 5
    }
   }
  },
  {
   "p": 0,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "S",
     "rank": 5
    }
   }
  },
  {
   "p": 1,
   "ph": "play",
   "a": {
    "type": "play",
    "card": {
     "suit": "C",
     "rank": 11
    }
   }
  }
 ]
}
```