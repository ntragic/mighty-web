#!/usr/bin/env bash
# 탐색 교사 라벨러 병렬 실행기 (ExIt 라운드용).
#   사용: bash tools/research/run_labelers.sh <출력접두> <모델경로> <판수> <프로세스수> <시드베이스>
# 예:   bash tools/research/run_labelers.sh r2_labels web/model/mighty_master_v13.onnx 1200 4 71000000
set -uo pipefail
cd "$(dirname "$0")/../.."

PREFIX=${1:-labels}
MODEL_PATH=${2:-web/model/mighty_master_v13.onnx}
GAMES=${3:-1200}
PROCS=${4:-4}
BASE=${5:-71000000}

for i in $(seq 1 "$PROCS"); do
  SB=$((BASE + i * 400000))
  MODEL="$PWD/$MODEL_PATH" \
  K=${K:-32} K_JC=${K_JC:-200} TOPM=${TOPM:-4} DEPTH=${DEPTH:-3} \
  SAMPLE=${SAMPLE:-0.35} JC_SAMPLE=${JC_SAMPLE:-1.0} MARGIN=${MARGIN:-0} \
  SEED_BASE=$SB \
    node tools/research/pimc_label.js "training/${PREFIX}_$i.jsonl" "$GAMES" \
    > "training/${PREFIX}_$i.log" 2>&1 &
done
wait
echo "라벨러 ${PROCS}개 완료"
wc -l training/${PREFIX}_*.jsonl | tail -2
