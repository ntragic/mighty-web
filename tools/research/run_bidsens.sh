#!/usr/bin/env bash
# 공약 민감도 실측 — 전체 개입 국면과 '점수카드 걸린' 부분집합을 따로 본다.
# 동시 실행은 메모리를 넘겨서 순차로 돌린다.
set -uo pipefail
cd "$(dirname "$0")/../.."

D=docs
N=${1:-260}

: > $D/bidsens.txt
echo "[$(date +%H:%M)] 전체 개입 국면 ($N 딜)" | tee -a $D/bidsens.txt
node tools/research/bidsens_probe.js "$N" 2>&1 | tee -a $D/bidsens.txt

echo "" | tee -a $D/bidsens.txt
echo "[$(date +%H:%M)] 점수카드 걸린 트릭만 ($N 딜)" | tee -a $D/bidsens.txt
PTS_ONLY=1 SEED_BASE=47000000 node tools/research/bidsens_probe.js "$N" 2>&1 | tee -a $D/bidsens.txt
