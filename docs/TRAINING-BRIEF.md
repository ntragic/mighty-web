# 마스터 티어 재학습 지침 (학습 측 인수인계)

**받는 쪽**: DGX Spark에서 학습을 돌리는 Claude Code
**보내는 쪽**: 게임 클라이언트 측 (v0.15.0)
**요약**: 현재 배포 중인 `mighty_master_v3.onnx`는 **룰 구멍을 악용하도록 학습된 정책**이다.
구멍을 막았으니 **수정된 룰로 재학습**해야 한다. 아래 패치를 학습 환경에 먼저 적용하고,
수용 기준을 통과한 모델만 내보낼 것.

---

## 1. 무엇이 잘못되었나

### 증상

주공(공약 낙찰자)이 **딜미스를 선언해 불리한 판을 통째로 무효화**할 수 있었다.

딜미스 자격은 손패 점수합이 임계값(기본 0.5) 이하일 때 생긴다.

```
J·Q·K·A = +1점,  10 = +0.5점,  조커 = −1점
```

조커가 **음수**라는 점이 핵심이다. 주공은 바닥패 3장을 받은 뒤 3장을 묻는데,
**높은 카드를 일부러 묻으면** 손패 점수합이 임계값 아래로 떨어져 자격이 생긴다.
그 결과 "공약은 질렀는데 패가 나쁘면 무효화하고 다시 딜" 이 성립했다.

### 계측 결과 (게임 측 실측)

| 항목 | 값 |
|---|---|
| 휴리스틱 AI의 악용 빈도 | 20,000판 중 **0회** (룰을 몰라서 안 씀) |
| **v3 신경망의 악용 빈도** | **주공 판의 23.5%** |
| 주공 판 교환 전 평균 점수합 | 4.33 |
| 주공 판 교환 후 평균 점수합 | **2.84** (의도적으로 낮춤) |

즉 v3의 높은 성능은 상당 부분 **"나쁜 패는 무효화한다"**는 선택지에서 나왔다.

### 구멍을 막은 뒤 성능

| 구성 | 판당 상금 | 주공 승률 |
|---|---|---|
| 순수 v3 NN | **−255** | 55.6% |
| 비딩만 휴리스틱에 위임 | +174 | 78.8% |
| 고급 휴리스틱 단독 | −97 | 63.0% |

순수 v3는 **중급 휴리스틱보다도 약해졌다.** 탈출구를 전제로 공약을 과도하게 지르는
편향이 남아 있기 때문이다. 게임 측은 임시로 **비딩을 휴리스틱에 위임**해 배포 중이며,
재학습 모델이 오면 이 위임을 제거한다.

---

## 2. 반드시 적용할 룰 패치

게임 측 JS 엔진과 **동일하게** 적용한다. 설정 키 이름도 동일하게 유지할 것.

### 2-1. 설정에 플래그 추가

```python
DEFAULT_CONFIG = {
    ...
    'dealMissEnabled': True,
    'dealMissThreshold': 0.5,
    'declarerCanDealMiss': False,   # ← 추가: 주공은 딜미스 선언 불가
    ...
}
```

### 2-2. 딜미스 창구 큐에서 주공 제외

`_act_friend()` 안, 창구 큐를 만드는 부분:

```python
allow_decl = self.config.get('declarerCanDealMiss', False)
self.dm_queue = [p for p in range(NUM_PLAYERS)
                 if self.config['dealMissEnabled'] and self.deal_miss_eligible(p)
                 and (allow_decl or p != self.declarer)]
```

### 2-3. 엔진 레벨 거부 (안전장치)

```python
def _act_deal_miss_window(self, action):
    p = self.dm_queue[self.dm_idx]
    if action['type'] == 'dealMiss':
        if p == self.declarer and not self.config.get('declarerCanDealMiss', False):
            raise ValueError('declarer cannot declare a misdeal')
        ...
```

### 2-4. 행동 마스크 확인 (중요)

관측/행동 인코더에서 `dealMissWindow` 페이즈의 마스크가 **큐에서 제외된 주공에게
`A_DEALMISS`를 열어주지 않는지** 반드시 확인한다. 큐 자체에서 주공이 빠지므로
주공은 이 페이즈에서 행동 차례를 받지 않는 것이 정상이다.

> 마스크가 열려 있으면 정책이 다시 같은 구멍을 학습한다. 마스킹은 룰의 재현이지
> 보조 장치가 아니다.

---

## 3. 패치 검증 (학습 시작 전 필수)

### 3-1. 구조적 차단 확인

```python
from mighty_engine import MightyGame
bad = 0
for seed in range(4000):
    g = MightyGame({'seed': seed}); _ = g.rng(); g.start(seed % 5)
    ...  # 임의 정책으로 진행
    if g.phase == 'dealMissWindow' and g.declarer in g.dm_queue:
        bad += 1
assert bad == 0, '주공이 여전히 딜미스 창구에 들어간다'
```

**기대값: 0** (게임 측 JS/Python 양쪽에서 확인 완료)

### 3-2. JS ↔ Python 파리티

룰을 바꿨으므로 파리티를 **다시** 돌린다. 게임 측에서 새 트레이스를 받아 재생 대조:

```bash
node dump-traces.js 400      # 게임 측 JS 엔진에서 트레이스 생성
python parity_test.py        # 400/400 일치해야 함
```

관측 레이아웃을 손댔다면 `python parity_encode.py 200`도 함께.

---

## 4. 재학습 방침

### 4-1. 처음부터 학습 (권장)

v3 체크포인트에서 파인튜닝하면 **비딩 과대평가 편향이 오래 남는다.** 정책의 가치함수가
"나쁜 패는 무효화 가능"이라는 전제로 형성되어 있기 때문이다. 새 시드로 처음부터 돌리는 쪽을
권한다. 파인튜닝을 택한다면 비딩 관련 지표를 초반부터 집중 모니터링할 것.

```bash
CKPT_DIR=ckpt_v4 LOG_PREFIX=v4 ./run_phase2.sh
```

### 4-2. 학습 중 반드시 볼 지표

기존 손실/보상 곡선 외에 아래를 로깅한다. **이 세 가지가 이번 문제의 조기 경보다.**

| 지표 | 정의 | 정상 범위 |
|---|---|---|
| `declarer_rate` | 에이전트가 주공이 되는 비율 | 20~35% (과도하면 과공격 비딩) |
| `declarer_win_rate` | 주공일 때 여당 승률 | 65% 이상 |
| `misdeal_rate` | 딜미스로 무효화된 판 비율 | 학습 전체에서 안정적, 급증 시 이상 |

`declarer_rate`가 40%를 넘으면서 `declarer_win_rate`가 60% 아래면 **비딩이 망가진 것**이다.

### 4-3. 보상은 그대로

보상은 기존과 동일하게 좌석별 상금/2000 (제로섬)을 유지한다. 룰 자체가 고쳐졌으므로
보상 설계를 바꿀 이유는 없다. **보조 페널티(예: 딜미스 억제항)를 넣지 말 것** —
룰로 이미 불가능하므로 중복이고, 다른 편향을 만든다.

---

## 5. 내보내기 전 수용 기준

아래를 **모두** 통과해야 게임 측에 전달한다.

| # | 기준 | 임계값 |
|---|---|---|
| 1 | 주공 딜미스 발생 | **0** (구조적으로 불가능) |
| 2 | 파리티 (JS↔Python) | 400/400 |
| 3 | 관측 인코더 파리티 | 200게임 전량 일치 |
| 4 | ONNX argmax = torch argmax | 200/200 |
| 5 | **순수 NN**(비딩 위임 없이) vs 고급 휴리스틱 4인 | 판당 **+150 이상** |
| 6 | 위 대결에서 주공 승률 | **70% 이상** |
| 7 | 주공이 되는 비율 | 20~35% |

5·6·7이 핵심이다. **비딩 위임 없이** 이 수치가 나와야 게임 측에서 하이브리드를 해제한다.

```bash
node bench_paired.js 1600 gambler balanced careful
node bench_metrics.js 1500 nn
```

---

## 6. 전달물

```
mighty_master_v4.onnx      # 모델
AI-TIERS.md                # 갱신 (v4 수치, 위임 해제 가능 여부 명시)
bench 결과 요약            # 위 표 5·6·7 실측값
```

전달 시 **"비딩 위임을 해제해도 되는가"**를 명시적으로 적어줄 것. 게임 측은 그 문장을
근거로 `createAgent({tier:'master', bidWith:'nn'})`로 전환한다.

---

## 6-1. v0.16.0 추가 룰 변경 (합법수에 영향 — 반드시 반영)

아래 2건은 **행동 마스크가 바뀌는 변경**이다. 학습 환경에 반드시 함께 반영할 것.

```python
DEFAULT_CONFIG = {
    ...
    'jokerCallMightyProtect': True,    # 조커콜 시 마이티로 조커 보호 허용
    'firstTrickJokerNoGiruda': True,   # 초구 조커 선으로 기루다 지정 금지
}
```

**(1) 조커콜 — 마이티 보호**: `legal_plays`의 조커콜 강제 분기에서, 마이티를 함께
보유하면 마이티도 합법수로 추가한다.

```python
if pl['jokerCallActive'] and any(is_joker(c) for c in hand):
    forced = [{'card': JOKER, 'forced': True}]
    if cfg.get('jokerCallMightyProtect', True):
        m = next((c for c in hand if (not is_joker(c)) and same(c, self.mighty_card)), None)
        if m is not None:
            forced.append({'card': m, 'protect': True})
    return forced
```

**(2) 초구 조커 선 — 기루다 지정 금지**: 리드 분기의 조커 무늬 생성에서 초구에
기루다를 제외한다.

```python
ban_giruda = (cfg['firstTrickNoGirudaLead'] and cfg.get('firstTrickJokerNoGiruda', True)
              and pl['trickNo'] == 1 and g != 'N')
for s in SUITS:
    if ban_giruda and s == g:
        continue
    moves.append({'card': JOKER, 'jokerSuit': s})
```

> 행동 인코딩은 그대로다(조커 선출 무늬 4종 슬롯 유지). 마스크만 좁아진다.
> 반영 후 `python parity_test.py`를 다시 통과해야 한다.

**(3) 학습 후 점검할 행동 지표**: 아군이 확정으로 이기는 트릭에 마이티·조커를 버리는
빈도. v3에서 드물게 관측됐고, 게임 측은 임시 가드레일로 막고 있다. 재학습 모델이
이 행동을 스스로 하지 않으면 가드레일도 제거할 수 있다.

---

## 7. 참고: 게임 측 현재 상태 (v0.16.0)

- 룰 패치 적용 완료 (JS 엔진 + Python 포트 양쪽), 20,000판 창구 진입 0 검증
- 마스터 티어는 **비딩만 휴리스틱(고급)에 위임**한 하이브리드로 배포 중
  → 판당 +331(중급 상대) / +368(고급 상대), 주공 승률 78.3%
- 위임 해제 스위치: `MightyAI.createAgent({ tier:'master', bidWith:'nn' })`
- v0.16.0의 조커 룰 2건은 **합법수(마스크)에 영향** → 6-1절 반영 필수
- 그 외 변경(세팅 판정 엄격화, 마지막 트릭 모달 생략 등)은 관측/행동 공간과 무관
