# 마이티 복기 — 10판 (seed 746746024)

- 버전: v2.4.0 · 난이도: master · 딜러: 김세
- 기록 시각: 2026-08-08T05:51:39.661Z
- 공약: **15♦** · 주공: **영동** · 프렌드: ♠A (효창)

## 딜 직후 손패
- 영동: ♣6 ♥9 ♦A ♥K ♦4 ♥Q ♠Q ♦6 ♠6 ♦K
- 김세: ♥10 ♦3 ♣2 ♥4 ♠5 ♥3 조커 ♥5 ♠K ♥7
- 병직: ♣10 ♦2 ♦7 ♠7 ♠J ♠10 ♣J ♦Q ♥2 ♣Q
- 효창: ♣7 ♥A ♦8 ♠4 ♠9 ♦9 ♦5 ♣3 ♠A ♣K
- 정원: ♠3 ♣8 ♠8 ♣A ♣5 ♥J ♠2 ♥8 ♦10 ♦J
- 바닥패: ♣9 ♥6 ♣4

## 비딩
- 김세: 14♥
- 병직: 패스
- 효창: 패스
- 정원: 패스
- 영동: 15♦
- 김세: 패스
- 바닥패 교환: 묻은 카드 ♣4 ♣6 ♣9

## 트릭
| # | 영동 | 김세 | 병직 | 효창 | 정원 | 승자 | 점수 |
|---|---|---|---|---|---|---|---|
| 1 | **♠Q** | ♠K | ♠J | ♠A | ♠2 | 효창 | 4 |
| 2 | ♥6 | ♥4 | ♥2 | **♥A** | ♥8 | 효창 | 1 |
| 3 | ♦A | 조커 | ♦Q | **♦8** | ♦J | 김세 | 3 |
| 4 | ♥Q | **♥10** | ♣J | ♣3 | ♥J | 영동 | 4 |
| 5 | **♦K** | ♦3 | ♦2 | ♦5 | ♦10 | 영동 | 2 |
| 6 | **♦4** | ♥3 | ♦7 | ♦9 | ♠3 | 효창 | 0 |
| 7 | ♠6 | ♣2 | ♣10 | **♣7** | ♣A | 정원 | 2 |
| 8 | ♦6 | ♥7 | ♣Q | ♣K | **♣5** | 영동 | 2 |
| 9 | **♥9** | ♥5 | ♠7 | ♠4 | ♣8 | 영동 | 0 |
| 10 | **♥K** | ♠5 | ♠10 | ♠9 | ♠8 | 영동 | 2 |

## 결과
- 여당 15 / 야당 5
- 여당 승 · 점수 800 → 상금 800
- 배분: 영동 +1600 · 김세 -800 · 병직 -800 · 효창 +800 · 정원 -800

## 재현용 원본
```json
{
 "seed": 746746024,
 "dealer": 1,
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
  "seed": 746746024
 },
 "actions": [
  {
   "p": 1,
   "ph": "bidding",
   "a": {
    "type": "bid",
    "count": 14,
    "giruda": "H"
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
      "suit": "C",
      "rank": 6
     },
     {
      "suit": "C",
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
    "card": "JOKER"
   }
  },
  {
   "p": 2,
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
     "rank": 8
    }
   }
  }
 ]
}
```