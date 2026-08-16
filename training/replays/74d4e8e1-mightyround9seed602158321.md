# 마이티 복기 — 9판 (seed 602158321)

- 버전: v2.3.0 · 난이도: master · 딜러: 병직
- 기록 시각: 2026-08-08T02:52:59.617Z
- 공약: **14♣** · 주공: **정원** · 프렌드: ♠A (김세)

## 딜 직후 손패
- 영동: ♥J ♦J ♣6 ♥3 ♦10 ♥2 ♠8 ♣J ♥9 ♦Q
- 김세: ♠4 ♠A ♠Q ♥4 ♦2 ♦5 ♥Q ♦4 ♠6 ♥7
- 병직: ♦9 ♣K ♠9 ♠7 ♥6 ♦8 ♣4 ♠10 ♠J ♣10
- 효창: ♥8 ♥5 ♥10 ♥K ♦6 ♣2 ♣Q ♣3 ♣9 ♣5
- 정원: ♥A ♠2 ♣A ♦3 ♦K ♣7 조커 ♣8 ♠3 ♠K
- 바닥패: ♦7 ♠5 ♦A

## 비딩
- 병직: 패스
- 효창: 패스
- 정원: 14♣
- 영동: 패스
- 김세: 패스
- 바닥패 교환: 묻은 카드 ♦3 ♠3 ♦7

## 트릭
| # | 영동 | 김세 | 병직 | 효창 | 정원 | 승자 | 점수 |
|---|---|---|---|---|---|---|---|
| 1 | ♥2 | ♥Q | ♥6 | ♥5 | **♥A** | 정원 | 2 |
| 2 | ♣6 | ♦2 | ♣4 | ♣2 | **♣A** | 정원 | 1 |
| 3 | ♠8 | ♠4 | ♠J | ♦6 | **♠K** | 정원 | 2 |
| 4 | ♣J | ♥4 | ♣K | ♣3 | **♣8** | 병직 | 2 |
| 5 | ♦10 | ♠Q | **♠9** | ♥10 | ♠2 | 김세 | 3 |
| 6 | ♦J | **♦5** | ♦9 | ♥8 | ♦K | 정원 | 2 |
| 7 | ♦Q | ♠A | ♦8 | ♣5 | **♦A** | 김세 | 3 |
| 8 | ♥J | **♦4** | ♠10 | ♣Q | ♠5 | 효창 | 3 |
| 9 | ♥9 | ♥7 | ♠7 | **♥K** | ♣7 | 정원 | 1 |
| 10 | ♥3 | ♠6 | ♣10 | ♣9 | **조커(♥)** | 병직 | 1 |

## 결과
- 여당 14 / 야당 6
- 여당 승 · 점수 500 → 상금 500
- 배분: 영동 -500 · 김세 +500 · 병직 -500 · 효창 -500 · 정원 +1000

## 재현용 원본
```json
{
 "seed": 602158321,
 "dealer": 2,
 "version": "v2.3.0",
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
  "seed": 602158321
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
   "p": 4,
   "ph": "floor",
   "a": {
    "type": "exchange",
    "discard": [
     {
      "suit": "D",
      "rank": 3
     },
     {
      "suit": "S",
      "rank": 3
     },
     {
      "suit": "D",
      "rank": 7
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
     "suit": "H",
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
     "suit": "S",
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
     "suit": "D",
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
    "card": "JOKER",
    "jokerSuit": "H"
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
     "suit": "C",
     "rank": 9
    }
   }
  }
 ]
}
```