#!/usr/bin/env bash
# 티어 난이도 서열 — 사람 자리(고정 기준 좌석)가 각 구성 상대로 얼마를 버는가.
# 낮을수록 어렵다. 현행 두 티어를 먼저 재서 눈금을 만들고, NN 구성을 그 위에 얹는다.
set -uo pipefail
cd "$(dirname "$0")/../.."

D=docs
N=${1:-3000}

run() {
  echo "[$(date +%H:%M)] $1"
  node tools/research/table_difficulty.js "$1" "$N" 2>&1 | tail -2 | tee -a $D/difficulty.txt
}

: > $D/difficulty.txt
run intermediate          # 현행 중급 눈금
run advanced              # 현행 고급 눈금
run v5                    # 구세대 후보 (4MB)
run v6b
run v7
run v8
run v13,v11ctl            # 마스터 후보 A
run v13,v12               # 마스터 후보 B
echo "[$(date +%H:%M)] 난이도 서열 완료"
