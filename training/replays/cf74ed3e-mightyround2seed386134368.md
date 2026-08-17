# 마이티 복기 — 2판 (seed 386134368)

- 버전: v2.10.5 · 난이도: master · 딜러: 영동
- 기록 시각: 2026-08-14T11:00:47.438Z
- 공약: **20♦** · 주공: **영동** · 프렌드: 조커 (병직)

## 딜 직후 손패
- 영동: ♠A ♦J ♦A ♦8 ♣K ♦9 ♥9 ♥6 ♥10 ♦10
- 김세: ♠Q ♣6 ♠10 ♣J ♣9 ♠8 ♣10 ♠6 ♠7 ♠9
- 병직: ♥5 ♣7 ♥J ♦4 ♥7 ♥4 조커 ♥K ♥A ♠5
- 효창: ♣2 ♦5 ♠2 ♥2 ♠J ♠4 ♦K ♥Q ♣4 ♠3
- 정원: ♣8 ♣Q ♦Q ♠K ♦2 ♦3 ♥8 ♣5 ♣3 ♦7
- 바닥패: ♥3 ♣A ♦6

## 비딩
- 영동: 15♦
- 김세: 패스
- 병직: 16♥
- 효창: 패스
- 정원: 패스
- 영동: 17♦
- 병직: 19♥
- 영동: 20♦
- 병직: 패스
- 바닥패 교환: 묻은 카드 ♥3 ♥6 ♥10

## 트릭
| # | 영동 | 김세 | 병직 | 효창 | 정원 | 승자 | 점수 |
|---|---|---|---|---|---|---|---|
| 1 | **♣A** | ♣10 | ♣7 | ♣4 | ♣5 | 영동 | 2 |
| 2 | **♦A** | ♣6 | ♦4 | ♦5 | ♦3 | 영동 | 1 |
| 3 | **♦6** | ♣J | ♥4 | ♦K | ♦Q | 효창 | 3 |
| 4 | ♠A | ♠6 | ♠5 | **♠2** | ♠K | 영동 | 2 |
| 5 | **♦J** | ♠9 | ♥J | ♠4 | ♦2 | 영동 | 2 |
| 6 | **♦10** | ♣9 | ♥K | ♥2 | ♦7 | 영동 | 2 |
| 7 | **♦9** | ♠7 | ♥7 | ♣2 | ♣8 | 영동 | 0 |
| 8 | **♣K** | ♠8 | ♥5 | ♠3 | ♣3 | 영동 | 1 |
| 9 | **♥9** | ♠10 | 조커 | ♥Q | ♥8 | 병직 | 2 |
| 10 | ♦8 | ♠Q | **♥A** | ♠J | ♣Q | 영동 | 4 |

## 결과
- 여당 17 / 야당 3 (바닥패 1)
- 야당 승 · 점수 -2700 → 상금 -2000
- 배분: 영동 -4000 · 김세 +2000 · 병직 -2000 · 효창 +2000 · 정원 +2000

## 재현용 원본
```json
{
 "seed": 386134368,
 "dealer": 0,
 "version": "v2.10.5",
 "tier": "master",
 "cfg": {
  "minBid": 14,
  "noGirudaBidDiscount": 0,
  "bidStartsAtDealer": true,
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
  "seed": 386134368
 },
 "actions": [
  {
   "p": 0,
   "ph": "bidding",
   "a": {
    "type": "bid",
    "count": 15,
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
    "type": "bid",
    "count": 16,
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
    "type": "bid",
    "count": 17,
    "giruda": "D"
   }
  },
  {
   "p": 2,
   "ph": "bidding",
   "a": {
    "type": "bid",
    "count": 19,
    "giruda": "H"
   }
  },
  {
   "p": 0,
   "ph": "bidding",
   "a": {
    "type": "bid",
    "count": 20,
    "giruda": "D"
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
   "p": 0,
   "ph": "floor",
   "a": {
    "type": "exchange",
    "discard": [
     {
      "suit": "H",
      "rank": 3
     },
     {
      "suit": "H",
      "rank": 6
     },
     {
      "suit": "H",
      "rank": 10
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
    "card": "JOKER"
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
     "suit": "S",
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
     "suit": "S",
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
     "rank": 12
    }
   }
  }
 ]
}
```