#!/usr/bin/env bash
# v4 학습 (CPU 전용) — GPU·ollama를 전혀 건드리지 않는다.
#  · 크래시 시 최신 체크포인트에서 자동 재개 (25 업데이트마다 저장 → 손실 상한 1분치)
#  · 강제입찰 커리큘럼은 확률 1→0 감쇠, 감쇠 후 마스크는 실제 룰과 완전 일치
set -uo pipefail
cd "$(dirname "$0")"
PY=/home/sparkadmin/torch-env/bin/python
STAMP=$(date +%Y%m%d_%H%M%S)
LOG="train_v4_${STAMP}.log"
CKPT=${CKPT_DIR:-ckpt_v4}
UPDATES=${UPDATES:-2500}
ANNEAL=${ANNEAL:-1500}
MAX_RETRY=20
export CUDA_VISIBLE_DEVICES=""

mkdir -p "$CKPT"
for ((try=1; try<=MAX_RETRY; try++)); do
  RESUME=""
  [ -f "$CKPT/latest.pt" ] && RESUME="--resume $CKPT/latest.pt"
  echo "[run] attempt $try $(date +%H:%M:%S) $RESUME" | tee -a "$LOG"
  "$PY" -u train_ppo.py --partners --workers ${WORKERS:-6} --envs ${ENVS:-288} \
      --steps 16384 --updates "$UPDATES" --hidden ${HID:-512} --depth ${DEP:-3} \
      --lr 2e-4 --force-bid-anneal "$ANNEAL" --ckpt "$CKPT" $RESUME 2>&1 | tee -a "$LOG"
  rc=${PIPESTATUS[0]}
  if [ "$rc" = "0" ]; then echo "[done] rc=0" | tee -a "$LOG"; break; fi
  echo "[crash] rc=$rc — 30초 후 체크포인트에서 재개" | tee -a "$LOG"
  sleep 30
done
tar czf "mighty_ppo_v4_${STAMP}.tar.gz" "$CKPT/latest.pt" "$LOG"
echo "result package: $PWD/mighty_ppo_v4_${STAMP}.tar.gz" | tee -a "$LOG"
