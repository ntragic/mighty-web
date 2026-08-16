#!/usr/bin/env bash
# 복기 기반 재학습 — 라벨 생성 단계.
#
# 복기 코퍼스(training/replays, 76판)가 알려준 것: 사람 판에는 자가대전이 한 판도
# 만들지 않는 공약 17·20이 실재한다. 다만 2판뿐이라 볼륨이 안 된다. 그래서 복기는
# 씨앗·검증셋으로 쓰고, 같은 분포를 FORCE_BID로 자가대전에서 강제 생성한다.
#
# 세 갈래를 병렬로 돌린다 (SEED_BASE를 갈라 겹치지 않게):
#   A 공약 20 강제 — 여유 0. 제보가 나온 바로 그 구간
#   B 공약 18 강제 — 여유 2
#   C 강제 없음    — 정상 계약에서의 개입. 극단 계약에만 치우치지 않게 섞는다
#
# 사용: bash tools/research/run_replay_retrain.sh [판수]
set -uo pipefail
cd "$(dirname "$0")/../.."

N=${1:-240}
MODEL=web/model/mighty_master_v13.onnx
COMMON="CLASS_SAMPLE=1.0 K_CLASS=64 DEPTH_CLASS=0 TOPM=5"

echo "[$(date +%H:%M)] 라벨 생성 시작 — 갈래당 $N 판"

env MODEL=$MODEL FORCE_BID=20 SEED_BASE=61000000 CLASS_SAMPLE=1.0 K_CLASS=64 \
    DEPTH_CLASS=0 TOPM=5 node tools/research/pimc_label.js training/cls_labels_b20.jsonl "$N" \
    > docs/retrain-b20.log 2>&1 &
P1=$!
env MODEL=$MODEL FORCE_BID=18 SEED_BASE=62000000 CLASS_SAMPLE=1.0 K_CLASS=64 \
    DEPTH_CLASS=0 TOPM=5 node tools/research/pimc_label.js training/cls_labels_b18.jsonl "$N" \
    > docs/retrain-b18.log 2>&1 &
P2=$!
env MODEL=$MODEL SEED_BASE=63000000 CLASS_SAMPLE=1.0 K_CLASS=64 \
    DEPTH_CLASS=0 TOPM=5 node tools/research/pimc_label.js training/cls_labels_norm.jsonl "$N" \
    > docs/retrain-norm.log 2>&1 &
P3=$!

wait $P1 $P2 $P3
echo "[$(date +%H:%M)] 라벨 생성 완료"
for f in b20 b18 norm; do
  echo "--- $f"; tail -1 docs/retrain-$f.log
done
wc -l training/cls_labels_*.jsonl training/replay_labels.jsonl 2>/dev/null
