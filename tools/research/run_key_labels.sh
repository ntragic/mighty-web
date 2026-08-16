#!/usr/bin/env bash
# 프렌드 키카드(마이티·조커) 소비 국면 라벨 생성.
#
# 1차 545건에서 방향이 나왔다 — 교사 12.8% vs 정책 15.8%, 교정은 아끼는 쪽 28건
# 대 쓰는 쪽 12건. 탐색은 v13이 키카드를 너무 일찍 쓴다고 본다. 초반(T1~2)과
# 종반 직전(T7~8)에 몰린다. 확인 표본을 키운다.
#
# 공약 19·20은 BID_MAX=18로 뺀다 — 희소하고 계약이 이미 깨져 라벨이 퇴화한다.
set -uo pipefail
cd "$(dirname "$0")/../.."

N=${1:-300}
MODEL=web/model/mighty_master_v13.onnx

echo "[$(date +%H:%M)] 키카드 라벨 생성 — 갈래당 $N 판"
for i in 2 3 4; do
  env MODEL=$MODEL SEED_BASE=$((96000000 + i * 1000000)) \
      KEY_SAMPLE=1.0 CLASS_SAMPLE=0 JC_SAMPLE=0 \
      K_CLASS=64 DEPTH_CLASS=0 TOPM=5 BID_MAX=18 \
      node tools/research/pimc_label.js "training/key_labels_$i.jsonl" "$N" \
      > "docs/keyspend-label-$i.log" 2>&1 &
done
wait
echo "[$(date +%H:%M)] 완료"
for i in 2 3 4; do tail -1 "docs/keyspend-label-$i.log"; done
wc -l training/key_labels_*.jsonl
