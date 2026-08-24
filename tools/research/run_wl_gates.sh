#!/usr/bin/env bash
# weaklead 증류 후보 판정 — 8-4의 3단 관문을 순서대로 건다.
#
# 1차 선별은 한 번의 probe로 후보 전부를 잰다. lastseat_probe는 같은 국면·같은
# PIMC 교사값에 모든 MODELS를 대보므로 후보끼리 페어드가 된다. 국면 생성은
# GEN=v16e로 고정한다 — 배포 분포에서 재야 한다.
#
# 사용: run_wl_gates.sh screen v17a,v17b,v17c   (1차: 후회)
#       run_wl_gates.sh final  v17b             (2·3차: 페어드·수용·h2h)
set -uo pipefail
cd "$(dirname "$0")/../.."

MODE=${1:-screen}
CANDS=${2:?후보 모델 id (쉼표 구분, 예: v17a,v17b)}
D=docs

if [ "$MODE" = screen ]; then
  echo "[$(date +%H:%M)] 1차 후회 — CLASS=weaklead · $CANDS vs v16e"
  CLASS=weaklead MODELS="$CANDS,v16e" GEN=v16e PIMC_N=520 K=64 \
    node tools/research/lastseat_probe.js 900 2>&1 | tee $D/wl-screen.txt
  exit 0
fi

M=web/model/mighty_master_$CANDS.onnx
: > $D/wl-final-$CANDS.txt
echo "[$(date +%H:%M)] 2차 페어드(결정화 32벌) 3,000갈림" | tee -a $D/wl-final-$CANDS.txt
CLASS=weaklead K=32 node tools/research/key_paired.js "$M" web/model/mighty_master_v16e.onnx 3000 2>&1 \
  | tail -20 | tee -a $D/wl-final-$CANDS.txt

echo "" | tee -a $D/wl-final-$CANDS.txt
echo "[$(date +%H:%M)] 3차 수용 기준 3,000판" | tee -a $D/wl-final-$CANDS.txt
MODEL="$M" node tools/accept-v4.js 3000 advanced 2>&1 | tail -20 | tee -a $D/wl-final-$CANDS.txt

echo "" | tee -a $D/wl-final-$CANDS.txt
echo "[$(date +%H:%M)] h2h 9,000판 vs v16e" | tee -a $D/wl-final-$CANDS.txt
node tools/research/model_h2h.js "$M" web/model/mighty_master_v16e.onnx 9000 2>&1 \
  | tail -5 | tee -a $D/wl-final-$CANDS.txt
echo "[$(date +%H:%M)] 완료" | tee -a $D/wl-final-$CANDS.txt
