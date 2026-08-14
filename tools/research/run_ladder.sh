#!/usr/bin/env bash
# 세대별 기력 사다리 — 공통 상대(v8)·공통 시드로 전 세대를 줄세운다.
#
# 기존 수치는 상대가 제각각(v6b 기준·v9 기준·v13 기준)이라 서로 비교가 안 된다.
# 난이도 티어에 어느 세대를 넣을지 정하려면 한 자에 올려야 한다.
# v9·v11ctl·v11b는 2026-08-12 재검에서 같은 조건으로 이미 쟀다(docs/futaux-h2h-v8*.txt).
#
# 순차 실행 — 동시 실행은 메모리 압박으로 죽는다.
set -uo pipefail
cd "$(dirname "$0")/../.."

M=web/model
D=docs
N=${1:-9000}
SB=${SEED_BASE:-52000000}          # 재검 배치와 같은 시드 — 기존 3개와 직접 비교된다

for m in v13 v12 v7 v6b v5 v4; do
  echo "[$(date +%H:%M)] $m vs v8 ($N판)"
  SEED_BASE=$SB node tools/research/model_h2h.js \
    $M/mighty_master_$m.onnx $M/mighty_master_v8.onnx $N > $D/ladder-$m.txt 2>&1
  tail -3 $D/ladder-$m.txt
done
echo "[$(date +%H:%M)] 사다리 완료"
