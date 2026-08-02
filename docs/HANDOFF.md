# 마이티 프로젝트 인수인계 (게임 측 → 학습 측)

**기준 버전**: 게임 v0.17.0 (2026-07-27)
**받는 쪽**: DGX Spark에서 학습을 돌리는 Claude Code
**한 줄 요약**: 룰 3건이 바뀌었고(합법수에 영향), 휴리스틱 파트너 코드도 갱신됐다.
**재학습 전에 아래 동기화를 먼저 끝낼 것.**

---

## 1. 지금 당장 해야 할 것

```bash
# 1) 룰 패치 반영 (§3) 후 검증
python verify_rule.py 3000        # PASS: 주공 창구 진입 0
node dump-traces.js 400
python parity_test.py             # 400/400

# 2) 휴리스틱 파트너 동기화 (§4)
#    학습에 휴리스틱 파트너를 섞는다면 mighty-engine.js를 최신본으로 교체

# 3) 재학습 (§5) → 수용 기준(§6) 통과 시 내보내기
```

---

## 2. 게임 측 버전 현황과 학습 영향

| 버전 | 변경 | 학습 영향 |
|---|---|---|
| v0.14.0 | AI 3티어 재편 (중급/고급/마스터), v3 모델 탑재 | 없음 |
| **v0.15.0** | **주공 딜미스 금지 (룰)** | **큼 — 합법수 변경. v3의 핵심 전략이 봉쇄됨** |
| v0.15.0 | 마스터 비딩을 휴리스틱에 위임 (임시) | 재학습 후 해제 대상 |
| **v0.16.0** | **조커콜 시 마이티 보호 허용 (룰)** | **있음 — 합법수 추가** |
| **v0.16.0** | **초구 조커로 기루다 지정 금지 (룰)** | **있음 — 합법수 축소** |
| v0.16.0 | 마스터 키카드 가드레일 (게임 측 후처리) | 없음 (재학습 후 제거 검토) |
| **v0.17.0** | **휴리스틱 키카드 낭비 방지 (전 티어)** | **파트너 정책 변경 — 동기화 필요** |

> 굵게 표시된 4건이 학습 환경에 반영되어야 한다.

---

## 3. 룰 패치 (합법수 변경 — 필수)

설정 키 이름을 게임 측과 동일하게 유지할 것.

```python
DEFAULT_CONFIG = {
    ...
    'declarerCanDealMiss': False,      # v0.15 주공 딜미스 금지
    'jokerCallMightyProtect': True,    # v0.16 조커콜 시 마이티 보호 허용
    'firstTrickJokerNoGiruda': True,   # v0.16 초구 조커 선으로 기루다 지정 금지
}
```

### 3-1. 주공 딜미스 금지 (v0.15) — 가장 중요

**왜**: 점수합 산정에서 조커가 −1점이라, 주공이 바닥패를 받은 뒤 **높은 카드를 일부러 묻으면**
자격이 생겨 불리한 판을 무효화할 수 있었다. **v3 모델은 주공 판의 23.5%에서 이를 사용**했다
(교환 전 점수합 4.33 → 교환 후 2.84). 상세 분석은 `TRAINING-BRIEF.md` 참조.

```python
# 창구 큐에서 주공 제외
allow_decl = self.config.get('declarerCanDealMiss', False)
self.dm_queue = [p for p in range(NUM_PLAYERS)
                 if self.config['dealMissEnabled'] and self.deal_miss_eligible(p)
                 and (allow_decl or p != self.declarer)]

# 안전장치
def _act_deal_miss_window(self, action):
    p = self.dm_queue[self.dm_idx]
    if action['type'] == 'dealMiss':
        if p == self.declarer and not self.config.get('declarerCanDealMiss', False):
            raise ValueError('declarer cannot declare a misdeal')
```

### 3-2. 조커콜 — 마이티 보호 (v0.16)

표준 룰: 조커 보유자가 마이티도 가지고 있으면 마이티를 내어 조커를 지킬 수 있다.

```python
if pl['jokerCallActive'] and any(is_joker(c) for c in hand):
    forced = [{'card': JOKER, 'forced': True}]
    if cfg.get('jokerCallMightyProtect', True):
        m = next((c for c in hand if (not is_joker(c)) and same(c, self.mighty_card)), None)
        if m is not None:
            forced.append({'card': m, 'protect': True})
    return forced
```

### 3-3. 초구 조커 선 — 기루다 지정 금지 (v0.16)

「초구 기루다 선출 금지」를 조커로 우회하는 경로를 막는다.

```python
ban_giruda = (cfg['firstTrickNoGirudaLead'] and cfg.get('firstTrickJokerNoGiruda', True)
              and pl['trickNo'] == 1 and g != 'N')
for s in SUITS:
    if ban_giruda and s == g:
        continue
    moves.append({'card': JOKER, 'jokerSuit': s})
```

> 행동 인코딩 자체는 그대로다(조커 무늬 4슬롯 유지). **마스크만** 바뀐다.
> 마스크가 룰을 정확히 반영하는지 반드시 확인할 것 — 마스크가 열려 있으면 정책이 다시 그 구멍을 학습한다.

---

## 4. 휴리스틱 파트너 동기화 (v0.17)

학습에 휴리스틱 파트너를 섞고 있다면(AI-TIERS.md의 "자가대전 + 휴리스틱 파트너 혼합"),
파트너 정책이 배포본과 달라지지 않도록 `mighty-engine.js`를 최신본으로 교체한다.

**무엇이 바뀌었나**: 아군이 **확정으로** 이기고 있는 트릭에 마이티·조커를 버리는 낭비를
전 티어에서 차단했다. 이전에는 중급 티어에서 3.6% 발생했다.

원인은 마이티가 그 자체로 A(점수카드)여서, 마이티로 트릭을 가져가면 트릭 가치가 부풀려져
오버테이크 억제를 상쇄해 버리는 구조였다. 키카드 억제항이 고급 티어에만 걸려 있었다.

**학습 관점 시사점**: 같은 함정이 신경망에도 있을 수 있다. 보상은 최종 상금이라
"마이티로 점수 트릭을 먹었다"는 단기 신호가 과대평가되기 쉽다. §6의 행동 지표로 점검할 것.

---

## 5. 재학습 방침

### 5-1. 처음부터 학습 권장

v3 체크포인트에서 파인튜닝하면 **비딩 과대평가 편향이 오래 남는다.** 가치함수가
"나쁜 패는 무효화 가능"이라는 전제로 형성돼 있기 때문이다. 새 시드로 처음부터 돌리는 쪽을 권한다.

```bash
CKPT_DIR=ckpt_v4 LOG_PREFIX=v4 ./run_phase2.sh
```

### 5-2. 학습 중 모니터링 지표

| 지표 | 정의 | 정상 범위 |
|---|---|---|
| `declarer_rate` | 주공이 되는 비율 | 20~35% |
| `declarer_win_rate` | 주공일 때 여당 승률 | 65% 이상 |
| `misdeal_rate` | 딜미스 무효화 비율 | 안정적 (급증 시 이상) |
| `key_waste_rate` | **아군 확정승 트릭에 마이티·조커 투입 비율** | **1% 미만** |

`declarer_rate`가 40%를 넘으면서 `declarer_win_rate`가 60% 아래면 비딩이 망가진 것이다.

### 5-3. 보상은 그대로

좌석별 상금/2000 (제로섬) 유지. **보조 페널티를 넣지 말 것** — 룰로 이미 불가능하거나
정책이 스스로 배워야 할 판단이며, 인위적 항은 다른 편향을 만든다.

---

## 6. 내보내기 수용 기준

| # | 기준 | 임계값 |
|---|---|---|
| 1 | 주공 딜미스 발생 | 0 (구조적으로 불가능) |
| 2 | 파리티 (JS↔Python) | 400/400 |
| 3 | 관측 인코더 파리티 | 200게임 전량 일치 |
| 4 | ONNX argmax = torch argmax | 200/200 |
| 5 | **순수 NN**(비딩 위임 없이) vs 고급 휴리스틱 4인 | 판당 **+150 이상** |
| 6 | 위 대결 주공 승률 | **70% 이상** |
| 7 | 주공이 되는 비율 | 20~35% |
| 8 | **아군 확정승 트릭 키카드 낭비** | **1% 미만** |

5·6·7이 통과해야 게임 측에서 **비딩 위임을 해제**하고, 8이 통과해야 **키카드 가드레일을 제거**한다.

```bash
node bench_paired.js 1600 gambler balanced careful
node bench_metrics.js 1500 nn
```

---

## 7. 전달물

```
mighty_master_v4.onnx      # 모델
AI-TIERS.md                # 갱신 (v4 수치)
bench 결과 요약            # §6 표의 실측값
```

**반드시 명시할 것 2가지**

1. `비딩 위임 해제 가능` 여부 (수용 기준 5·6·7)
2. `키카드 가드레일 제거 가능` 여부 (수용 기준 8)

게임 측은 이 두 문장을 근거로 아래를 전환한다.

```js
MightyAI.createAgent({ tier:'master', bidWith:'nn' })   // 위임 해제
// keyCardGuard() 호출 제거                              // 가드레일 제거
```

---

## 8. 현재 게임 측 상태 (v0.17.0)

- 룰 3건 적용 완료 (JS 엔진 + Python 포트), 파리티 400/400
- 마스터 티어 = **v3 NN + 비딩 휴리스틱 위임 + 키카드 가드레일**
  → 판당 +332(중급 상대) / +365(고급 상대), 주공 승률 77~78%
- 3티어 서열: 마스터 > 고급(+13) > 중급
- 그 외 변경(세팅 판정 엄격화, UI/연출)은 관측·행동 공간과 무관

### 동봉 파일

| 파일 | 용도 |
|---|---|
| `HANDOFF.md` | **이 문서** — 최상위 인수인계 |
| `TRAINING-BRIEF.md` | 주공 딜미스 악용 상세 분석 |
| `verify_rule.py` | 룰 패치 검증 (학습 전 필수) |
| `mighty_engine.py` | 패치 반영된 Python 엔진 (참조 구현) |
| `mighty-engine.js` | 게임 측 JS 엔진 (룰의 기준 + 최신 휴리스틱) |
| `parity_test.py` / `dump-traces.js` | JS↔Python 파리티 |
