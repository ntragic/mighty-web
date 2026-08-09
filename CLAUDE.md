# 마이티 웹 게임 — 프로젝트 지침

혼자 즐기는 5인 마이티(Mighty) 카드게임. 서버 없이 **단일 HTML 파일**로 동작하며
itch.io에 정적 배포한다. AI는 규칙 기반 2티어 + 신경망 1티어.

- 현재 버전: **v1.2.2** (`src/ui.js`의 `APP_VERSION`이 단일 소스)
- 배포처: itch.io (비공개 테스트)
- 스코어링은 「마이티리그 시즌6」 엑셀 수식을 그대로 이식했다. **임의로 바꾸지 마라.**

---

## 자주 쓰는 명령

```bash
npm test            # 엔진 단위 테스트(59건) + UI 스모크
npm run build       # src/ → web/index.html 조립
npm run serve       # web/ 을 로컬 서버로 (http://localhost:8080)
npm run release     # 검사 → 빌드 → 테스트 → dist/mighty-itch-vX.Y.Z.zip
npm run bench       # 3티어 상호 대전 벤치마크
```

빌드 없이 `web/index.html`을 직접 고치지 마라. **항상 `src/`를 고치고 빌드**한다.
`npm run release`가 `tools/build.mjs --check`로 이 규칙을 강제한다.

---

## 구조

```
src/                     소스 (여기를 고친다)
  mighty-engine.js       게임 엔진 + 규칙 기반 AI(중급/고급). 룰의 기준 구현
  mighty-master.js       신경망 관측 인코더 + 추론 헬퍼
  mighty-ai.js           3티어 통합 진입점 (createAgent / createTable / loadMaster)
  ui.js                  게임 UI 드라이버 (i18n, 복기, 되돌리기, 내보내기 전부 여기)
web/
  index.template.html    HTML/CSS 뼈대 + 주입 플레이스홀더
  index.html             빌드 산출물 (직접 편집 금지)
  model/                 mighty_master_v4.onnx (16MB)
  ort/                   onnxruntime-web 로컬 번들 (13MB, CDN 의존 제거용)
tests/                   엔진 단위 테스트, jsdom 기반 UI 스모크
tools/                   빌드·릴리스·벤치마크·진화학습
training/                Python 엔진 포트 + PPO 학습 키트 (DGX Spark용)
docs/                    SESSION-HANDOFF(새 세션 첫 문서) · CHANGELOG · GLOSSARY
                         GUARDS(가드 정본) · MODELS(ONNX 레지스트리) · TRAINING-PLAN
```

---

## 작업 규칙

**1. 버전과 CHANGELOG는 한 몸이다.**
`src/ui.js`의 `APP_VERSION` / `APP_BUILD`를 올리면 `docs/CHANGELOG.md`에 `### vX.Y.Z`
항목을 반드시 추가한다. 릴리스 스크립트가 누락을 검사해 빌드를 중단시킨다.

**2. 변경 후에는 반드시 검증한다.**
`npm test`는 최소선이다. AI 로직을 건드렸으면 `npm run bench`로 티어 서열
(마스터 > 고급 > 중급)이 유지되는지 확인한다.

**3. 룰을 바꾸면 Python 포트도 함께 바꾼다.**
`src/mighty-engine.js`와 `training/mighty_engine.py`는 **동작이 일치해야 한다**
(mulberry32 RNG까지 비트 단위로 같다). 룰 변경 후:

```bash
node tools/dump-traces.js 400          # JS에서 트레이스 생성
cd training && python parity_test.py   # 400/400 일치해야 한다
```

불일치를 방치하면 학습된 모델이 실제 게임과 다른 규칙을 배운다.

**4. 사람 입력은 비동기 경합을 의심한다.**
조커 무늬 선택·조커콜 확인은 모달을 `await`한다. 그 사이 되돌리기나 새 라운드가
끼어들 수 있어, `stateGen` 세대 카운터로 무효화한다. 새 모달을 추가한다면 같은 패턴을
따르고, **게임 모달(`#modal`)과 내보내기 오버레이(`#expmodal`)를 섞지 마라** —
v1.2.2에서 이걸로 게임이 멈추는 버그가 있었다.

**5. UI 문자열은 한국어·영어 둘 다 넣는다.**
`ui.js`의 `I18N_EN` 사전(단순 문구)과 `TF` 템플릿 함수(보간 문구). 용어는
`docs/GLOSSARY.md`가 확정본이다 — 여당=Attackers, 야당=Defenders, 바닥패=Kitty,
기루다=Trump, 세팅=Claim.

---

## AI 티어

| 티어 | 구현 | 상대 성능 |
|---|---|---|
| `intermediate` 중급 | 규칙 기반 | 기준 |
| `advanced` 고급 | 규칙 기반 + 협력 추론 | 중급 상대 판당 +13 |
| `master` 마스터 | 신경망 v4 (관측 688차원) | 고급 상대 판당 +365 |

```js
const session = await MightyAI.loadMaster(ort, './model/mighty_master_v4.onnx');
const table = await MightyAI.createTable({ tiers: [...], rng, session, ort });
game.act(await table.agents[seat].act(game, seat));
```

성향(승부사/밸런스/신중파)은 **UI에 노출하지 않는다.** 매치 시작 시 좌석마다 무작위
배정되고 매치 내내 고정된다. 성향이 드러나면 상대 비딩을 읽을 수 있어 난이도가 흐려진다.

마스터 티어에는 **키카드 가드레일**이 걸려 있다 (`createAgent({keyGuard:false})`로 해제).
아군이 확정으로 이기는 트릭에 마이티·조커를 버리는 장면을 막는 용도이며, 승률 영향은
없고 가독성 목적이다.

---

## 알려진 제약

- **itch.io는 sandbox iframe이라 파일 다운로드가 막힌다.** 내보내기는 다운로드를
  시도하되 항상 복사 가능한 창을 함께 띄운다. 이 폴백을 제거하지 마라.
- 마스터 티어는 16MB 모델을 받아야 한다. 모델·ort가 없으면 자동으로 고급으로 폴백한다.
- **모델은 현재 룰셋(리그 룰)에 맞춰 학습됐다.** 관측에 룰 파라미터가 들어가지 않아
  최소공약이나 바닥패 귀속을 바꾸면 성능이 떨어진다 (바닥패 야당 귀속 시 판당 +514 → +287).
  다른 지역 룰을 정식 지원하려면 관측에 룰 블록을 넣고 도메인 랜덤화로 재학습해야 한다.

---

## GPU 학습 (DGX Spark)

`training/`에 Python 엔진 포트와 PPO 자가대전 키트가 있다. 학습 측에 넘길 지침은
`docs/HANDOFF.md`(최신)와 `docs/TRAINING-BRIEF.md`(딜미스 악용 상세 분석)에 있다.

새 모델을 받으면:

1. `web/model/`에 넣고 `src/ui.js`의 `MASTER_MODEL` 경로 확인
2. `node tools/accept-v4.js 900 advanced` — 수용 기준 확인
3. `npm run bench` — 티어 서열 회귀
4. 버전 올리고 CHANGELOG 작성 → `npm run release`

---

## 대화 톤

한국어로 답한다. 코드 주석과 커밋 메시지도 한국어를 쓴다.
추측보다 **실측**을 우선한다 — 이 프로젝트의 판단은 대부분 시뮬레이션 수치로 내렸다.
