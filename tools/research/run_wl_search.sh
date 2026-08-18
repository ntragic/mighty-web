#!/usr/bin/env bash
# 국면 한정 배포 탐색 — 설정별 품질·비용. 게이트는 저사양 기기 한 수 100ms 이하다
# (docs/LOOKAHEAD-PLAN.md 갈래 B). 서버 실측 ms에 브라우저 여유를 곱해 판단한다.
# 순차 실행이다 — 병렬로 돌리면 ms 측정이 오염된다.
set -uo pipefail
cd "$(dirname "$0")/../.."

D=docs/wl-search.txt
: > $D
for cfg in "16 2" "8 2" "8 1" "4 1"; do
  set -- $cfg
  echo "[$(date +%H:%M)] K_S=$1 DEPTH_S=$2" | tee -a $D
  MODEL=${MODEL:-v16e} K_S=$1 DEPTH_S=$2 K=64 PIMC_N=${PIMC_N:-300} \
    node tools/research/wl_search_probe.js ${DEALS:-900} 2>&1 | tail -6 | tee -a $D
done
echo "[$(date +%H:%M)] 완료" | tee -a $D
