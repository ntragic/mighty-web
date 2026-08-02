#!/usr/bin/env bash
# Phase 2 학습 실행기 — 파트너 다양화 + 중단 보호.
#  보호조치: (1) 시작 시 ollama 모델 언로드로 메모리 확보
#           (2) 크래시(외부 ollama 호출로 인한 OOM 포함) 시 최신 체크포인트에서 자동 재개
#           (3) 25 업데이트마다 저장되므로 재개 손실 상한은 25 업데이트(약 1분)
#           (4) 종료·중단 어느 경로로든 ollama 3모델 복원
set -uo pipefail
cd "$(dirname "$0")"
PY=/home/sparkadmin/torch-env/bin/python
STAMP=$(date +%Y%m%d_%H%M%S)
LOG="${LOG_PREFIX:-train_p2}_${STAMP}.log"
CKPT=${CKPT_DIR:-ckpt_p2}
UPDATES=5000
MAX_RETRY=30
export PYTORCH_CUDA_ALLOC_CONF=expandable_segments:True

MODELS=$(ollama ps | tail -n +2 | awk '{print $1}')
[ -z "$MODELS" ] && MODELS="gpt-oss:120b qwen2.5vl:7b bge-m3:latest"
echo "[unload] $MODELS" | tee -a "$LOG"
for m in $MODELS; do ollama stop "$m"; done

restore() {
  echo "[restore] ollama models" | tee -a "$LOG"
  for m in $MODELS; do
    curl -sf --max-time 600 http://localhost:11434/api/generate -d "{\"model\":\"$m\"}" >/dev/null \
      || curl -sf --max-time 600 http://localhost:11434/api/embed -d "{\"model\":\"$m\",\"input\":\"x\"}" >/dev/null \
      || echo "[warn] reload failed: $m" | tee -a "$LOG"
  done
  ollama ps | tee -a "$LOG"
}
trap restore EXIT

mkdir -p "$CKPT"
for ((try=1; try<=MAX_RETRY; try++)); do
  RESUME=""
  [ -f "$CKPT/latest.pt" ] && RESUME="--resume $CKPT/latest.pt"
  echo "[run] attempt $try $(date +%H:%M:%S) $RESUME" | tee -a "$LOG"
  "$PY" train_ppo.py --partners --workers ${WORKERS:-0} --envs ${ENVS:-128} \
      --steps 32768 --updates "$UPDATES" \
      --hidden 1024 --depth 4 --lr 2e-4 --feed ${FEED:-0} --ckpt "$CKPT" $RESUME 2>&1 | tee -a "$LOG"
  rc=${PIPESTATUS[0]}
  if [ "$rc" = "0" ]; then echo "[done] rc=0" | tee -a "$LOG"; break; fi
  echo "[crash] rc=$rc — 30초 후 체크포인트에서 재개" | tee -a "$LOG"
  pkill -f mirror-bridge.js 2>/dev/null
  pkill -f "from multiprocessing" 2>/dev/null
  sleep 30
done

tar czf "${LOG_PREFIX:-mighty_ppo_p2}_${STAMP}.tar.gz" "$CKPT/latest.pt" "$LOG"
echo "result package: $PWD/${LOG_PREFIX:-mighty_ppo_p2}_${STAMP}.tar.gz" | tee -a "$LOG"
