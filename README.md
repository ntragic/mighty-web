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

## itch.io 접속 및 게임 시작 (업로드·테스트 안내)

- 배포 파일 생성: 항상 `npm run release`를 사용해 검사→빌드→테스트→패키징된 zip(dist/)을 생성하세요. `dist/mighty-itch-vX.Y.Z.zip` 파일을 itch.io에 업로드합니다.
- itch.io 업로드 설정 권장:
  - Kind of project: HTML
  - Upload: ZIP 파일 (위의 dist zip)
  - "This file will be played in the browser" 체크
  - Display size: 1000×700 권장
  - Mobile friendly: 체크(모바일 대응 여부에 따라)
  - Visibility: 테스트 단계에서는 Restricted(비공개)로 둡니다. 공개 전에는 Public으로 변경하세요.
  - 기존 빌드 교체 시 동일한 upload 삭제 후 새 zip 업로드하면 URL이 유지됩니다.
- 로컬에서 플레이/테스트:
  - 빠른 확인: `npm run build` → `web/index.html`을 브라우저로 열기(마스터 AI는 동작 안 함)
  - 전체 검증(권장): `npm install` → `npm run serve` → http://localhost:8080 열기 (마스터 모델 로드 가능)
  - 브라우저 콘솔에서 에러(특히 fetch/onnx/ort 에러)를 확인하세요.
- 모델 파일 포함 여부: `web/model/`의 ONNX 모델과 `web/ort/`(onnxruntime-web 로컬 번들)이 zip에 포함되어 있어야 합니다. CDN 의존을 없애려면 `ort/` 번들을 포함하십시오.
- 접근성/언어: 시작 화면에서 한국어/English 전환을 확인하고, 복기·내보내기·설정 화면이 한글·영문 모두 정상 노출되는지 확인하세요.

## 공개 전 점검 체크리스트

다음 항목을 확인한 후에 repository를 Public으로 전환하거나 itch.io에 Public으로 올리세요.

- 버전·릴리스
  - `src/ui.js`의 `APP_VERSION`과 `APP_BUILD`를 올리고, `docs/CHANGELOG.md`에 `### vX.Y.Z` 항목을 추가했는지 확인합니다. 릴리스 스크립트가 이를 검사합니다.
  - 릴리스는 `npm run release`로 진행해 빌드 검사(`tools/build.mjs --check`)를 통과하세요.

- 테스트·검증
  - `npm test`가 모두 통과하는지 확인합니다.
  - AI 관련 변경이 있을 경우 `npm run bench`로 티어 서열(마스터 > 고급 > 중급)이 유지되는지 검사합니다.
  - JS ↔ Python 룰 일치성이 중요한 변경(엔진 수정) 시 `node tools/dump-traces.js 400` → `cd training && python parity_test.py`로 400/400 일치 확인.

- 보안·정보
  - 저장소에 개인 토큰·비밀번호·API 키·개인 정보가 포함되어 있지 않은지 `git status`·`git grep`으로 확인합니다.
  - 서드파티 모델(ONNX)과 번들의 라이선스·배포 허용 여부를 확인합니다. 모델에 공개 제한이 있으면 공개 전 제거 또는 별도 배포 정책을 수립하세요.

- 파일·크기
  - 대용량 바이너리(특히 모델)가 GitHub에 직접 들어가면 리포지토리 용량 문제를 일으킬 수 있습니다. 필요하면 Git LFS 사용 또는 릴리스 zip에만 포함하세요.
  - `dist/`에 포함될 파일이 `web/index.html`, `web/model/`, `web/ort/` 등 필요한 런타임 리소스를 모두 포함하는지 확인합니다.

- 코드·문서
  - `web/index.html`을 직접 편집하지 않았는지 확인(항상 `src/` 수정→빌드 원칙).
  - `docs/CHANGELOG.md`, `docs/GLOSSARY.md` 등 문서가 최신화되어 있는지 확인.
  - 라이선스 문구(README의 "라이선스" 섹션)가 현재 배포 취지와 일치하는지 검토.

- 사용자 데이터·프라이버시
  - A/B 설문 및 로컬 조사 기능은 서버 전송이 없음을 README(또는 개인정보 고지)에 명시하세요. 수집된 응답은 로컬 저장·사용자 복사만 됩니다.

- 배포 설정
  - itch.io에서 Visibility(Restricted/Public), Viewport, Mobile friendly 등 설정을 확인합니다.
  - 업로드한 ZIP로 실제 플레이(브라우저) 테스트를 한 번 더 시행합니다.

- 기타
  - package.json의 `repository`, `homepage` 필드가 맞는지 확인하면 사용자가 바로 데모/문서로 접근하기 쉽습니다.
  - 필요하다면 `docs/`에 "HOWTO: make repo public" 가이드를 추가해 내부 절차(버전 태그·릴리스 노트·팀 알림)를 표준화하세요.

---

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
