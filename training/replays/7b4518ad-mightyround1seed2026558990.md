# 마이티 복기 — 1판 (seed 2026558990)

- 버전: v2.4.0 · 난이도: master · 딜러: 병직
- 기록 시각: 2026-08-08T03:15:56.632Z
- 공약: **17♣** · 주공: **정원** · 프렌드: ♠A (효창)

## 딜 직후 손패
- 영동: ♣2 ♠Q ♦A ♥K ♥A ♠8 ♦Q ♥9 ♣7 ♥3
- 김세: ♠6 ♣Q ♣3 ♣4 ♥4 ♦6 ♣6 ♠2 ♠5 ♥2
- 병직: ♥6 ♠4 ♠10 ♥10 ♣5 ♦4 ♣8 ♣J ♥5 ♦7
- 효창: ♥8 ♥Q ♦5 ♦8 ♦J ♠A ♦3 ♠J ♦2 ♥J
- 정원: ♠K ♠3 ♣10 ♣9 조커 ♠7 ♣A ♣K ♦9 ♦10
- 바닥패: ♦K ♥7 ♠9

## 비딩
- 병직: 패스
- 효창: 패스
- 정원: 14♣
- 영동: 15♥
- 김세: 패스
- 정원: 17♣
- 영동: 패스
- 바닥패 교환: 묻은 카드 ♠7 ♦K ♠3

## 트릭
| # | 영동 | 김세 | 병직 | 효창 | 정원 | 승자 | 점수 |
|---|---|---|---|---|---|---|---|
| 1 | ♦Q | ♦6 | ♦4 | ♦2 | **♦9** | 영동 | 1 |
| 2 | **♠Q** | ♠5 | ♠4 | ♠J | 조커 | 정원 | 2 |
| 3 | ♦A | ♠6 | ♦7 | ♦8 | **♦10** | 영동 | 2 |
| 4 | **♥K** | ♥4 | ♥5 | ♥Q | ♥7 | 영동 | 2 |
| 5 | **♠8** | ♠2 | ♠10 | ♠A | ♠9 | 효창 | 2 |
| 6 | ♥3 | ♥2 | ♥6 | **♥8** | ♣9 | 정원 | 0 |
| 7 | ♣2 | ♣3 | ♣5 | ♦J | **♣A** | 정원 | 2 |
| 8 | ♣7 | ♣4 | ♣8 | ♥J | **♣K** | 정원 | 2 |
| 9 | ♥A | ♣Q | ♥10 | ♦3 | **♠K** | 김세 | 4 |
| 10 | ♥9 | **♣6** | ♣J | ♦5 | ♣10 | 병직 | 2 |

## 결과
- 여당 9 / 야당 11 (바닥패 1)
- 야당 승 · 점수 -2800 → 상금 -2000
- 배분: 영동 +2000 · 김세 +2000 · 병직 +2000 · 효창 -2000 · 정원 -4000

## 재현용 원본
```json
{
 "seed": 2026558990,
 "dealer": 2,
 "version": "v2.4.0",
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
  "seed": 2026558990
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
    "type": "pass"
   }
  },
  {
   "p": 4,
   "ph": "bidding",
   "a": {
    "type": "bid",
    "count": 14,
    "giruda": "C"
   }
  },
  {
   "p": 0,
   "ph": "bidding",
   "a": {
    "type": "bid",
    "count": 15,
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
   "p": 4,
   "ph": "bidding",
   "a": {
    "type": "bid",
    "count": 17,
    "giruda": "C"
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
   "p": 4,
   "ph": "floor",
   "a": {
    "type": "exchange",
    "discard": [
     {
      "suit": "S",
      "rank": 7
     },
     {
      "suit": "D",
      "rank": 13
     },
     {
      "suit": "S",
      "rank": 3
     }
    ]
   }
  },
  {
   "p": 4,
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
     "suit": "D",
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
     "suit": "S",
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
     "rank": 11
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
   "p": 0,
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
     "suit": "H",
     "rank": 9
    }
   }
  }
 ]
}
```