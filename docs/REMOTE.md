# 원격 작업 가이드

이 프로젝트는 세 곳에서 작업할 수 있다. 어디서 열든 `CLAUDE.md`가 함께 읽히므로
Claude Code가 프로젝트 규칙(빌드 절차, 버전·CHANGELOG 동기화, 파리티 검증)을 알고 시작한다.

| 위치 | 용도 |
|---|---|
| 맥 로컬 | 게임 개발·테스트·배포 zip 생성 |
| DGX Spark (`ai11`) | GPU 학습, 대량 시뮬레이션 |
| 모바일 (Claude 앱) | 원격에서 작업 지시·확인 |

---

## 1. 맥에서 시작

```bash
cd ~/projects/mighty        # 압축을 푼 위치
npm install
claude                      # Claude Code 실행
```

Claude Code가 `CLAUDE.md`를 자동으로 읽는다. 바로 이렇게 지시하면 된다.

```
> npm test 돌려보고 현재 상태 확인해줘
> 복기 화면에서 트릭 번호가 안 보이는 문제 고쳐줘
> v1.2.3으로 올리고 릴리스해줘
```

---

## 2. DGX Spark에서 작업 (학습·대량 시뮬레이션)

Tailscale로 연결된 상태에서:

```bash
ssh sparkadmin@ai11          # 또는 Tailscale IP
cd ~/mighty
claude
```

Spark에서 하면 좋은 일:

- **PPO 재학습** — `training/` 참고, 지침은 `docs/HANDOFF.md`
- **대량 시뮬레이션** — 진화 학습(`tools/mighty-evolve.js`)이나 수천 판 벤치마크는
  코어가 많은 쪽이 훨씬 빠르다
- **파리티 검증** — `npm run parity`

주의: `onnxruntime-node`는 aarch64 빌드가 필요하다. 설치가 막히면 벤치마크류는 맥에서
돌리고 Spark는 학습 전용으로 쓴다.

---

## 3. 모바일에서 원격 지시

Claude 앱에서 Claude Code 세션에 접속해 원격으로 작업을 시킬 수 있다.
맥이나 Spark에서 세션을 띄워 두면 밖에서도 진행 상황을 보고 지시할 수 있다.

이럴 때 유용하다.

- 베타 테스터 제보를 받았을 때 → 재현 시나리오를 먼저 만들어 두라고 지시
- 학습을 걸어 두고 중간 지표 확인
- 짧은 수정 + 릴리스

---

## 4. 게임을 다른 기기에서 테스트

```bash
npm run serve
```

`0.0.0.0`으로 열리므로 같은 Tailscale 망의 폰·태블릿에서 바로 접속된다.

```
http://<맥의 Tailscale IP>:8080
```

모바일 레이아웃과 터치 조작을 확인할 때 이 방법이 가장 빠르다. itch.io에 올리기 전
이걸로 먼저 본다.

---

## 5. 새 학습 모델을 받았을 때

```bash
cp ~/Downloads/mighty_master_v5.onnx web/model/
# src/ui.js 의 MASTER_MODEL 경로 확인

node tools/accept-v4.js 900 advanced   # 수용 기준
npm run bench                          # 티어 서열 회귀
npm run profile                        # 성향 변화 확인
```

수용 기준(판당 +150 이상, 주공 승률 70% 이상, 주공 비율 20~35%)을 통과하면 버전을
올리고 CHANGELOG를 쓴 뒤 `npm run release`.

---

## 6. 버전 관리

git 저장소로 쓰는 것을 권한다.

```bash
git init && git add -A && git commit -m "마이티 v1.2.2"
```

`.gitignore`가 `node_modules/`와 `dist/`를 제외한다. **모델 파일(16MB)과 ort 번들(13MB)은
포함되어 있다** — 이게 있어야 어디서 클론하든 바로 돌아간다. 저장소 용량이 부담되면
Git LFS를 쓰거나 `web/model/`, `web/ort/`를 제외하고 별도로 옮긴다
(없으면 마스터 티어만 비활성화되고 게임은 정상 동작한다).
