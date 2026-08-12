#!/usr/bin/env bash
# 예측 헤드 재검 2차 — 기준 셀 보강 + 가치 헤드 품질.
#
#  5 — v9 vs v8 (같은 상대·같은 시드). 1·2차의 v11b·v11ctl과 나란히 놓아야
#      "v9한테만 지는가(상성)"와 "누구한테나 약한가(절대)"가 갈린다.
#      기존 v9 vs v8은 305판 +91±179로 검정력이 없어 기준이 못 된다.
#  6~8 — 가치 헤드 캘리브레이션. pimc_label.js는 깊이 3에서 롤아웃을 자르고
#      가치 헤드로 말단을 평가한다(valueOf). 미래 예측 헤드가 정책은 망쳤어도
#      가치 추정을 개선했다면 탐색 말단 평가자로는 쓸 수 있다 — 그 판정.
set -uo pipefail
cd "$(dirname "$0")/../.."

M=web/model
D=docs

echo "[$(date +%H:%M)] 5/8 h2h v9 vs v8 (기준 셀·같은 시드)"
SEED_BASE=52000000 node tools/research/model_h2h.js \
  $M/mighty_master_v9.onnx $M/mighty_master_v8.onnx 9000 > $D/futaux-h2h-v8-v9.txt 2>&1
tail -4 $D/futaux-h2h-v8-v9.txt

for m in v9 v11ctl v11b; do
  echo "[$(date +%H:%M)] 가치 캘리브레이션 $m"
  MODEL=$PWD/$M/mighty_master_$m.onnx NGAME=600 \
    node tools/research/value_calib.js > $D/futaux-vcalib-$m.txt 2>&1
  cat $D/futaux-vcalib-$m.txt
done

echo "[$(date +%H:%M)] 2차 완료"
