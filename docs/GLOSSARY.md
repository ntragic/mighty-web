# 마이티 웹 게임 — 한/영 용어집 (확정)

v0.12.0에서 구현 완료된 확정 용어집입니다. 코드의 `I18N_EN` 사전이 이 문서를 그대로 따릅니다.

- 대상 버전: v0.14.0 (구현 완료)
- 추출 문자열: UI 약 180종 (엔진 내부 식별자는 변경 없음 — `giruda`, `yeodang` 등 코드 키는 그대로)
- 번역 기준: **트릭테이킹 카드게임의 영어 표준 용어 우선**, 마이티 고유 개념은 음차 대신 의미 번역

---

## 1. 핵심 게임 용어

| 한국어 | 영어 (제안) | 비고 |
|---|---|---|
| 마이티 | **Mighty** | 게임명·카드명 동일 |
| 기루다 / 으뜸무늬 | **Trump** | 브리지·휘스트 표준어. 음차 "Giruda"는 비영어권 학습 부담 |
| 노기루다 | **No Trump (NT)** | 브리지 표준. UI 축약은 `NT` |
| 공약 | **Bid** (동사) / **Contract** (확정된 것) | 비딩 중 = bid, 확정 후 = contract |
| 목표 (점수) | **Target** | 공약 숫자 = 필요 점수 |
| 주공 | **Declarer** | 브리지 표준 |
| 프렌드 | **Friend** | 마이티 고유 개념. Partner는 브리지의 고정 파트너와 혼동 |
| 여당 | **Attackers** | 확정 (C안) |
| 야당 | **Defenders** | 확정 (C안) |
| 트릭 | **Trick** | 표준 |
| 초구 | **First trick** | "초구 프렌드" = First-trick friend |
| 바닥패 | **Kitty** | 확정 (A안) |
| 묻다 (카드를) | **Bury** | "3장 묻기" = Bury 3 cards |
| 딜미스 | **Misdeal** | 영어 카드게임 표준어 |
| 조커콜 | **Joker Call** | 마이티 고유. 그대로 |
| 세팅 (전승 확정) | **Claim** | 브리지 표준 (남은 트릭 전부 승리 선언) |
| 런 (20점 전승) | **Run** | 마이티 관용어 유지 |
| 백런 (0점) | **Back Run** | 상동 |
| 노프렌드 | **No Friend** | |
| 셀프 (주공이 프렌드 카드 보유) | **Solo** | "주공 보유·셀프" = Held by declarer (solo) |
| 점수카드 | **Point card** | 10·J·Q·K·A |
| 상금 | **Prize** | 리그 정산 금액 |
| 판 / 라운드 | **Round** | UI 일관성 위해 Round로 통일 (Hand/Deal 대신) |
| 매치 | **Match** | 여러 라운드의 묶음 |
| 딜러 | **Dealer** | |
| 소진 (카드가 다 나옴) | **Gone** / **Out of play** | 치트시트에서는 짧게 `Gone` |
| 미출현 | **Unseen** | 아직 안 나온 카드 |
| 밖의 (카드) | **Outstanding** | 내 손·출현 카드를 제외한 나머지 |

### 1-1. 여당 / 야당 — 확정: C안 (Attackers / Defenders)

| 안 | 여당 | 야당 | 장점 | 단점 |
|---|---|---|---|---|
| **A (권장)** | Declarer's team | Defenders | 브리지 표준, 직관적 | "여당"의 정치 비유 뉘앙스 사라짐 |
| B | Government | Opposition | 원어 뉘앙스 보존 | 카드게임 영어권에 없는 표현, 정치 오해 |
| C | Attackers | Defenders | 대칭적·짧음 | 마이티에서 야당도 공격적으로 플레이 |

> HUD 표기는 `Attackers 12 / Defenders 8` 형태로 구현되었습니다.

### 1-2. 바닥패 — 확정: A안 (Kitty)

| 안 | 영어 | 비고 |
|---|---|---|
| **A (권장)** | **Kitty** | 카드게임 표준어(딜 후 남긴 여분 패). 한국어판에서 "키티"를 "바닥패"로 바꿨지만, 영어권에서는 Kitty가 자연스러움 |
| B | Floor cards | 한국어 "바닥"의 직역. 영어권에 없는 표현 |
| C | Talon | 유럽 카드게임 용어. 미국권에는 덜 친숙 |

---

## 2. 페르소나 · 난이도

| 한국어 | 영어 | 비고 |
|---|---|---|
| 승부사 | **Gambler** | 비딩 공격성 높음 |
| 밸런스 | **Balanced** | 표준 |
| 신중파 | **Cautious** | 비딩 보수적 |
| 팀플레이어 / 독불장군 | Team Player / Lone Wolf | v0.14에서 미사용 (하위호환용으로만 잔존) |
| 중급 / 고급 / 마스터 | **Intermediate / Advanced / Master** | 난이도 3티어 (v0.14 재편) |
| 빠름 / 보통 / 느림 | **Fast / Normal / Slow** | 컴퓨터 속도 |

기본 플레이어 이름(서준·하린·도윤·유나)은 영어판에서 **Alex · Robin · Casey · Jordan**
(성별 중립·짧음)으로 제안합니다. 사용자가 언제든 변경 가능합니다.

### 2-1. 마스터 티어 관련 용어 (v0.11 신규)

| 한국어 | 영어 (제안) | 비고 |
|---|---|---|
| 마스터 | **Master** | 신경망 티어 |
| 마스터 AI 로딩 중… (최초 1회, 약 16MB) | Loading Master AI… (one-time, ~16 MB) | 지연 로딩 토스트 |
| 마스터 AI 준비 완료 | Master AI ready | |
| 마스터 AI 로드 실패 — 고수 전략으로 진행합니다 | Master AI unavailable — falling back to Expert | 폴백 안내 |
| 마스터 AI는 첫 사용 시 모델을 내려받습니다. | Master AI downloads its model on first use. | 설정 힌트 |
| 중수·고수는 진화 학습, 마스터는 신경망(16MB 다운로드) | Intermediate/Expert use evolved strategies; Master uses a neural network (16 MB) | 난이도 설명 |
| 신경망 | Neural network | |
| 진화 학습 | Evolutionary training | |
| 강화 학습 | Reinforcement learning | |

---

## 3. 설정 화면 — 제안 구조

현재 22개 항목이 한 화면에 나열되어 있어, 요청하신 대로 **3개 섹션(탭)**으로 분리합니다.

### 일반 / General
언어, 플레이어 이름, 난이도, 사운드, 컴퓨터 속도

| 한국어 | 영어 |
|---|---|
| 언어 | Language |
| 내 이름 | Your name |
| 컴퓨터 1~4 | Computer 1–4 |
| 난이도 | Difficulty |
| 중급 / 고급 / 마스터 | Intermediate / Advanced / Master |
| 사운드 | Sound |
| 사운드 테스트 | Test sounds |
| 컴퓨터 속도 | Computer speed |

### 게임플레이 / Gameplay
매치 진행 방식과 진행 편의 관련

| 한국어 | 영어 |
|---|---|
| 진행 방식 | Match format |
| 정해진 판수 / 목표 상금 / 무제한 | Fixed rounds / Prize target / Endless |
| 라운드 수 | Number of rounds |
| 목표 상금 | Prize target |
| 다음 딜러 | Next dealer |
| 프렌드 / 차례로 | Friend / Rotate |

### 룰 / Rules
게임 규칙 자체 (프리셋 포함)

| 한국어 | 영어 |
|---|---|
| 프리셋 | Preset |
| 마이티리그 룰 / 표준 룰 / 커스텀 | Mighty League / Standard / Custom |
| 비딩 | Bidding |
| 최소 공약 | Minimum bid |
| 노기루다 공약 할인 | No-trump bid discount |
| 바닥패 후 공약 수정 | Bid revision after kitty |
| 무늬 변경 비용 | Suit change cost |
| 노기루다 전환 비용 | Switch-to-NT cost |
| 딜 | Deal |
| 딜미스 | Misdeal |
| 딜미스 기준 | Misdeal threshold |
| 조커 · 마이티 | Joker & Mighty |
| 조커콜 카드 | Joker Call card |
| 기루다와 겹칠 때 | If it matches trump |
| 초구 조커콜 금지 | No Joker Call on first trick |
| 초구 조커 최약 | Joker weakest on first trick |
| 막트릭 조커 최약 | Joker weakest on last trick |
| 초구 기루다 선출 금지 | No trump lead on first trick |
| 스코어링 | Scoring |
| 공약 단가 | Per-bid rate |
| 초과·미달 단가 | Per-trick rate |
| 노기루다 배수 | No-trump multiplier |
| 상금 캡 | Prize cap |
| 노기루다 캡 | No-trump cap |
| 주공 배분 | Declarer share |
| 셀프(노프렌드) 배분 | Solo share |
| 프렌드 배분 | Friend share |
| 리그 룰로 초기화 | Reset to league rules |

> **언어 전환은 「일반」 섹션 최상단**에 배치하며, 섹션 탭 자체도 선택 언어로 즉시 전환됩니다.

---

## 4. 주요 화면 문구

| 한국어 | 영어 |
|---|---|
| 매치 시작 | Start Match |
| 룰 설정 | Settings |
| 5인 트릭테이킹의 정석, 마이티. | Mighty — the classic five-player trick-taking game. |
| 당신과 네 명의 컴퓨터 플레이어가 한 테이블에 앉습니다. | You and four computer players take a seat. |
| 공약을 선언하고, 프렌드를 찾고, 판을 지배하세요. | Bid, find your friend, and take the table. |
| 공약 선언 | Declare bid |
| 패스 | Pass |
| 공약 수정 | Revise bid |
| 3장 묻기 | Bury 3 cards |
| 프렌드 지정 | Choose friend |
| 마이티 프렌드 / 조커 프렌드 | Mighty friend / Joker friend |
| 기루다 A | Trump ace |
| 초구 프렌드 | First-trick friend |
| 직접 선택 | Pick a card |
| 조커 선출 — 요구할 무늬 | Leading the Joker — choose a suit |
| 다른 플레이어는 이 무늬를 따라야 합니다 | Other players must follow this suit |
| 조커콜 선언 / 그냥 내기 | Call the Joker / Play normally |
| 조커콜! 조커 보유자는 조커를 내야 합니다 | Joker Call! The Joker holder must play it. |
| 딜미스 선언 / 이 패로 진행 | Declare misdeal / Play this hand |
| 세팅 — 전승 확정 | Claim — all remaining tricks |
| 자동 진행 / 직접 플레이 | Auto-play / Play it out |
| N판 결과 | Round N result |
| 여당 승리 / 야당 승리 | Declarers win / Defenders win |
| 다음 판 / 최종 결과 보기 | Next round / Final results |
| 매치 종료 | Match complete |
| 새 매치 | New match |
| 이번 판 / 누적 | This round / Total |
| 진행 기록 | Game log |
| 기록 / 시트 | Log / Sheet |
| 룰 변경은 다음 판부터 적용됩니다 | Rule changes apply from the next round |

---

## 5. 치트시트 문구

| 한국어 | 영어 |
|---|---|
| 치트 시트 | Cheat sheet |
| 내 진영 | Your side |
| 여당 (주공) / 여당 (프렌드) / 여당 (숨은 프렌드) | Declarer / Friend (revealed) / Friend (hidden) |
| 야당 | Defender |
| 미정 (초구 프렌드) | Undecided (first-trick friend) |
| N점 확보 → 승리까지 M점 | N points — M more to win |
| 미확정 | Unassigned |
| 주요 카드 | Key cards |
| 기루다 현황 | Trump count |
| 미출현 N장 · 내 손 N장 · 밖 N장 | Unseen N · In hand N · Outstanding N |
| 밖의 상위 | Highest outstanding |
| 무늬별 잠재 탑카드 | Top card by suit |
| 트릭별 탑 카드 | Winning card by trick |
| 출현 카드·내 손 제외 기준 | Excludes played cards and your hand |
| 바닥패에 묻혀 있을 수 있음 | May be buried in the kitty |

---

## 6. 사운드 테스트 라벨

| 한국어 | 영어 |
|---|---|
| 셔플 / 딜 / 제출 | Shuffle / Deal / Play |
| 기루다 컷 / 기루다 등장 | Trump cut / First trump |
| 마이티 / 조커 / 조커콜 | Mighty / Joker / Joker Call |
| 수거 / 승리 / 패배 | Collect / Win / Lose |

---

## 7. 구현 방식 (참고)

- 문자열을 `I18N = { ko: {...}, en: {...} }` 사전으로 분리하고 `t('key')` 헬퍼로 치환
- 언어 설정은 기존 설정 저장소(`localStorage` / 아티팩트 저장소)에 함께 보관
- 최초 실행 시 브라우저 언어(`navigator.language`)로 기본값 자동 선택, 이후 수동 설정 우선
- 엔진 코드의 식별자(`giruda`, `yeodang`, `dealMiss` 등)는 **변경하지 않음** — 저장된 설정·학습 데이터·RL 인코딩과의 호환 유지
- 설정 3섹션 분할은 i18n과 같은 작업에서 함께 반영 (섹션명도 번역 대상이므로)

---

## 확정 결과 (v0.12.0 반영 완료)

| 항목 | 결정 |
|---|---|
| 여당 / 야당 | **Attackers / Defenders** (C안) |
| 바닥패 | **Kitty** (A안) |
| 세팅 | **Claim** |
| 영어 기본 이름 | **You · Alex · Robin · Casey · Jordan** |
| 설정 섹션 | 일반 / 게임플레이 / 룰 — 다음 딜러는 「게임플레이」에 배치 |

**추가 구현**: 언어·난이도는 시작 화면에서 게임 시작 전에 바로 선택할 수 있습니다.

### 향후 용어 추가 시
`mighty-game.html`의 `I18N_EN` 사전(단순 문구)과 `TF` 템플릿 함수(보간 문구)에 항목을 추가하고
이 문서를 함께 갱신합니다. 영어 모드에서 한글이 남는지 자동 스캔으로 확인할 수 있습니다.
