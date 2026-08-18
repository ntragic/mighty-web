#!/usr/bin/env bash
# 프렌드 개입 weaklead 국면 라벨 생성 (2026-08-17 표적 1번).
#
# 아군이 명목상 최강이지만 확정승이 아니고 뒤에 2명 이상 남은 국면에서 프렌드가
# 개입할 것인가. 후회 −52 ± 9 · 딜당 1.31회 → 판당 약 68 손실로, 현재 남은 표적
# 중 가장 크다. 비율(정책 29.7% vs 교사 31.3%)로는 정상으로 보였다 —
# 횟수는 맞고 국면이 틀리는 경우다.
#
# CLASS_ONLY=weaklead로 oppwin을 뺀다. 한 클래스만 움직이려면 KL 예산을 나눠 쓰면 안 된다.
# 공약 19·20은 BID_MAX=18로 뺀다 — 희소하고 계약이 이미 깨져 라벨이 퇴화한다.
set -uo pipefail
cd "$(dirname "$0")/../.."

# ORT_THREADS: 갈래를 병렬로 돌릴 때 필수다. 기본값이면 갈래마다 ORT가 코어를 다
# 물어 3갈래가 단일 실행보다 5배 느려진다(실측 5라벨/분 vs 32라벨/분).
# 2번째 인자는 웨이브 번호다. 갈래 번호와 시드가 같이 밀려 이어 붙일 수 있다
# (실측 수율 딜당 1.08건 — 2,000건을 채우려면 웨이브가 더 필요하다).
# SPLIT=1(기본)이면 결정화를 A/B로 갈라 고르기·검증을 분리한다. 생존율 40% —
# 옛 라벨의 60%는 노이즈로 뽑힌 정답이었다(2026-08-17 밤 실측).
N=${1:-250}
W=${2:-0}
PREFIX=${PREFIX:-wlq_labels_}
MODEL=web/model/mighty_master_v16e.onnx

echo "[$(date +%H:%M)] weaklead 라벨 생성 — 갈래당 $N 판 (웨이브 $W)"
for j in 1 2 3 4 5; do
  i=$((j + W * 5))
  env ORT_THREADS=3 MODEL=$MODEL SEED_BASE=$((63000000 + i * 1000000)) \
      CLASS_ONLY=weaklead CLASS_SAMPLE=1.0 KEY_SAMPLE=0 JC_SAMPLE=0 \
      K_CLASS=${K_CLASS:-128} DEPTH_CLASS=0 TOPM=5 BID_MAX=18 SPLIT=${SPLIT:-1} \
      node tools/research/pimc_label.js "training/$PREFIX$i.jsonl" "$N" \
      > "docs/wl-label-$i.log" 2>&1 &
done
wait
echo "[$(date +%H:%M)] 완료"
for j in 1 2 3 4 5; do tail -1 "docs/wl-label-$((j + W * 5)).log"; done
wc -l training/$PREFIX*.jsonl
