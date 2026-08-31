# 마이티 (Mighty)

혼자 즐기는 5인 마이티 카드게임. 서버 없이 **단일 HTML 파일**로 돌아가고, AI는
규칙 기반 2티어 + 자가대전으로 학습한 신경망 1티어다.

스코어링은 「마이티리그 시즌6」 엑셀 수식을 그대로 옮겼다.

```
점수 = ((목표−13)×300×(승 ±1) + (승 ? (획득−목표+1)×200 : (획득−목표)×200)) × (노기루다 ? 2 : 1)
상금 = clamp(점수, ±2,000)   // 노기루다 ±3,000, 런(20점)은 캡 고정
배분 = 주공 ×2 (셀프 ×4) · 프렌드 ×1 · 야당 각 −1   // 완전 제로섬
```

## 시작하기

```bash
npm install          # jsdom, onnxruntime-node (테스트·벤치마크용)
npm run build        # src/ → web/index.html
npm run serve        # http://localhost:8080
npm test             # 엔진·AI 가드·A/B 설문·UI·복기 회귀 전체
```

브라우저에서 `web/index.html`을 파일로 직접 열어도 게임은 돌아가지만, **마스터 티어는
`npm run serve`로 띄워야** 모델을 불러올 수 있다 (`file://`에서는 fetch가 막힌다).

## 배포

```bash
npm run release      # dist/mighty-itch-vX.Y.Z.zip
```

itch.io에 업로드할 때: **Kind of project: HTML**, "This file will be played in the
browser" 체크, Viewport 1000×700, Mobile friendly 체크, Visibility는 Restricted.
업데이트는 기존 zip을 지우고 새 zip을 올리면 URL이 유지된다.

## 주요 명령

| 명령 | 하는 일 |
|---|---|
| `npm run build` | `src/` 모듈을 템플릿에 주입해 `web/index.html` 생성 |
| `npm run check` | 빌드 결과가 커밋된 `index.html`과 같은지 검사 |
| `npm test` | 엔진 단위 테스트 + jsdom UI 스모크 |
| `npm run bench` | 3티어 상호 대전 (마스터 > 고급 > 중급 확인) |
| `npm run accept` | 신규 모델 수용 기준 검증 |
| `npm run profile` | AI 성향 프로파일 (비딩·협력·타이밍) |
| `npm run league` | 혼합 티어 모의 리그 |
| `npm run parity` | JS ↔ Python 엔진 동작 일치 검증 |
| `npm run release` | 검사 → 빌드 → 테스트 → 배포 zip |

## 구조

`src/`를 고치고 `npm run build`로 `web/index.html`을 만든다.
**`web/index.html`을 직접 편집하지 마라** — 다음 빌드에 덮어써진다.

```
src/mighty-engine.js    게임 엔진 + 규칙 기반 AI. 룰의 기준 구현
src/mighty-master.js    신경망 관측 인코더 + 추론
src/mighty-ai.js        3티어 통합 진입점
src/ui.js               UI 드라이버 (i18n · 복기 · 되돌리기 · 내보내기)
web/index.template.html HTML/CSS 뼈대
training/               Python 엔진 포트 + PPO 학습 키트 (DGX Spark)
docs/                   CHANGELOG · GLOSSARY · HANDOFF · TRAINING-BRIEF
```

자세한 작업 규칙은 [`CLAUDE.md`](./CLAUDE.md), 원격 작업은
[`docs/REMOTE.md`](./docs/REMOTE.md)를 봐라.

## 기능

- 한국어 / English (설정 또는 시작 화면에서 전환)
- 난이도 3티어 — 중급 · 고급 · 마스터(신경망)
- 룰 설정 22종 + 프리셋 (마이티리그 룰 / 표준 룰)
- 치트 시트 — 진영별 필요 점수, 기루다 카운팅, 무늬별 잠재 탑카드
- **복기** — 전원 손패를 공개한 상태로 트릭 재생 (단축키 `R`)
- **되돌리기** — 비딩 1회 + 플레이 1회 (단축키 `Z`)
- **로그 내보내기** — 라운드/매치 단위 마크다운, 재현용 시드 포함
- **마스터 AI A/B 조사** — 매치 후 4문항, 로컬 저장·결과 복사(서버 전송 없음)
- 세팅(전승 확정) 자동 진행, 매치 결과 누적 상금 차트

## 라이선스

개인 프로젝트. 모델과 코드는 내부 사용을 전제로 한다.
