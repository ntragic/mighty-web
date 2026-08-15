#!/usr/bin/env bash
# 혼합 구성 난이도 — 좌석 일부만 NN으로 채워 중간 난이도를 만든다.
# 1차 측정에서 규칙기반(-3~-8)과 NN 테이블(-211~-278) 사이가 비었다.
# table_difficulty.js는 spec을 좌석 1~4에 순환 배정한다.
set -uo pipefail
cd "$(dirname "$0")/../.."

D=docs
N=${1:-3000}

run() {
  echo "[$(date +%H:%M)] $1"
  node tools/research/table_difficulty.js "$1" "$N" 2>&1 | tail -2 | tee -a $D/difficulty2.txt
}

: > $D/difficulty2.txt
run v5,advanced,advanced,advanced   # NN 1좌석
run v5,advanced                     # NN 2좌석 (교대)
run v5,v5,v5,advanced               # NN 3좌석
run v8,v6b                          # 고급 후보 — 구세대 NN 2종 교대
run v7,v8,v6b,v5                    # 고급 후보 — 구세대 4종
echo "[$(date +%H:%M)] 혼합 난이도 완료"
