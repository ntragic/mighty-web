#!/usr/bin/env bash
# 기루다 보존 클래스 변형 비교 — 같은 시드로 순차 실행한다.
#
# 동시 실행하면 메모리 압박(ollama gpt-oss:120b가 64GB 상주)으로 죽는다.
# 순차로 돌려 안정성을 확보한다. 같은 SEED_BASE라 변형 간 비교는 공정하다.
#
# 사용: bash tools/research/run_trumpsave_variants.sh [판수]
set -uo pipefail
cd "$(dirname "$0")/../.."

N=${1:-30000}
MODEL_PATH=${MODEL_PATH:-web/model/mighty_master_v13.onnx}
SB=${SEED_BASE:-95000000}

run() {                     # run <라벨> <출력파일> <추가 env...>
  local label=$1 out=$2; shift 2
  echo "[$(date +%H:%M)] $label 시작 (판수 $N)"
  env MODEL="$PWD/$MODEL_PATH" RAWPOL=1 SEED_BASE="$SB" "$@" \
    node tools/research/trumpsave_cert.js "$N" > "$out" 2>&1
  echo "[$(date +%H:%M)] $label 완료"
  tail -4 "$out"
}

run "STRICT=1 (대체재가 점수카드가 아닐 때만)" docs/trumpsave-strict.txt LATE=3 STRICT=1
run "LATE=2 (남은 2장 이하)"                    docs/trumpsave-late2.txt  LATE=2
echo "변형 비교 완료"
