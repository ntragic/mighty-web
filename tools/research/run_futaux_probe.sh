#!/usr/bin/env bash
# 예측 헤드(v11b) 재검 — 상성인가 절대 기력인가, 그리고 인간 체감 환산.
#
# 배경: v11b는 v9 상대 9,000판 h2h에서 −102.6±33.8로 기각됐다. 그 열세가
# v9와의 상성인지(다른 상대에게는 안 지는지), 상대 무관한 기력 하강인지 가른다.
#   1·2 — 상대를 v8로 바꾼 h2h. 대조군 v11ctl(헤드만 끈 형제)을 같은 시드로 병기.
#         v11b만 지면 헤드 탓, 둘 다 지면 추가 PPO 탓.
#   3·4 — policy_ab로 두 정책의 실제 선택을 같은 깊은 탐색에 올린다. 상대가
#         누구든 무관한 "그 수 자체가 나쁜가" 판정. 심판 정책을 양쪽으로 바꿔
#         두 번 재서 심판 편향을 배제한다.
#
# 순차 실행 — 동시 실행은 메모리 압박으로 죽는다(run_trumpsave_variants.sh와 같은 이유).
set -uo pipefail
cd "$(dirname "$0")/../.."

M=web/model
D=docs

echo "[$(date +%H:%M)] 1/4 h2h v11b vs v8 (다른 상대·9,000판)"
SEED_BASE=52000000 node tools/research/model_h2h.js \
  $M/mighty_master_v11b.onnx $M/mighty_master_v8.onnx 9000 > $D/futaux-h2h-v8.txt 2>&1
tail -4 $D/futaux-h2h-v8.txt

echo "[$(date +%H:%M)] 2/4 h2h v11ctl vs v8 (대조군·같은 시드)"
SEED_BASE=52000000 node tools/research/model_h2h.js \
  $M/mighty_master_v11ctl.onnx $M/mighty_master_v8.onnx 9000 > $D/futaux-h2h-v8-ctl.txt 2>&1
tail -4 $D/futaux-h2h-v8-ctl.txt

echo "[$(date +%H:%M)] 3/4 policy_ab v9 vs v11b (심판=v9)"
CLASS=all SEED_BASE=62000000 node tools/research/policy_ab.js \
  $M/mighty_master_v9.onnx $M/mighty_master_v11b.onnx 400 200 > $D/futaux-ab-v9judge.txt 2>&1
tail -4 $D/futaux-ab-v9judge.txt

echo "[$(date +%H:%M)] 4/4 policy_ab v11b vs v9 (심판=v11b · 역방향)"
CLASS=all SEED_BASE=62000000 node tools/research/policy_ab.js \
  $M/mighty_master_v11b.onnx $M/mighty_master_v9.onnx 400 200 > $D/futaux-ab-v11bjudge.txt 2>&1
tail -4 $D/futaux-ab-v11bjudge.txt

echo "[$(date +%H:%M)] 전부 완료"
