# 측정 도구 (research)

2026-07-26~07-31 세션에서 만든 진단·개입 실험 도구다. 게임 빌드에는 들어가지 않는다.
경로는 `src/`와 `web/model/`을 참조하며, onnxruntime는 프로젝트 devDependency를 쓴다
(`npm install` 필요). 다른 런타임을 쓰려면 `ORT_PATH`, 모델 교체는 `MODEL`로 덮는다.

| 도구 | 용도 |
|---|---|
| `bench_accept.js` | 수용 기준(판당 상금·주공 승률·주공 비율·키카드 낭비) |
| `bench_paired.js` | 같은 딜 좌석 교체 페어드 비교 |
| `bench_selfplay.js` | 5석 동일 에이전트 자체 대전 경향 (프렌드 공개 전/후 분리) |
| `bench_tier.js` / `bench_metrics.js` | 티어 서열 · 역할별 전략 지표 |
| `exp_trump.js` | 프렌드 기루다 리드 강제/억제 개입 |
| `exp_friendcall.js` | 프렌드 콜 분포 (낮은 카드·조커 콜 분해) |
| `exp_mightycall.js` | 마이티 미보유 조커 콜 개입 |
| `exp_friendmode.js` | 카드 콜 vs 초구 프렌드 비교 |
| `exp_bidding.js` / `exp_bidpass.js` | 입찰 패 구성별 성적 · 약패 강제 패스 개입 |
| `exp_confidence.js` | 단계별 결정 확신도(엔트로피) 진단 |
| `exp_signal*.js` / `exp_ablate_nn.js` | 신호 차단 · 특징 차단 |
| `test_friendfix.js` / `test_table.js` | 프렌드 콜 후처리 · 좌석 배정표 자체검증 |
| `metrics.js` | 위 벤치들이 공유하는 지표 관측기 |
| `mirror-bridge.js` / `bench-bridge.js` | Python 학습기와의 JS 엔진 브리지 |

**판단 원칙**: 조건부 지표가 낮은 구간을 결함으로 단정하지 마라. 정책이 그 구간을
스스로 만들기 때문이다. 실제 결함 여부는 같은 딜 페어드 개입 실험으로만 확정한다
(이 원칙으로 프렌드 점수 몰아주기·기루다 회피·기루다 3장 입찰 세 건이 오진으로 판명됐다).
