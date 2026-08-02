#!/usr/bin/env bash
# v4 GPU 학습 러너 — GPU가 열리는 시점에 한 줄로 실행하는 용도.
#
#   ./run_v4_gpu.sh                     즉시 실행
#   WAIT_LOAD=8 ./run_v4_gpu.sh         부하가 8 아래로 떨어질 때까지 기다렸다 실행
#   WAIT_UNTIL=22:00 ./run_v4_gpu.sh    지정 시각까지 기다렸다 실행
#   GO_FILE=/tmp/mighty_go ./run_v4_gpu.sh   그 파일이 생기면 실행
#
# 하는 일: 사전점검 → ollama 언로드 → 학습(크래시 자동재개) → ollama 복원
#          → ONNX 내보내기 → 수용 기준 실측까지 자동.
set -uo pipefail
cd "$(dirname "$0")"
PY=/home/sparkadmin/torch-env/bin/python

CKPT=${CKPT_DIR:-ckpt_v4g}
UPDATES=${UPDATES:-5000}
ANNEAL=${ANNEAL:-1500}
HID=${HID:-1024}; DEP=${DEP:-4}
WORKERS=${WORKERS:-10}; ENVS=${ENVS:-480}; STEPS=${STEPS:-32768}
MAX_RETRY=${MAX_RETRY:-20}
MIN_FREE_GB=${MIN_FREE_GB:-20}
STAMP=$(date +%Y%m%d_%H%M%S)
LOG="train_v4g_${STAMP}.log"
SUM="v4g_summary_${STAMP}.txt"

log() { echo "$*" | tee -a "$LOG"; }

# ---------- 0) 대기 조건 ----------
if [ -n "${WAIT_UNTIL:-}" ]; then
  # "22:00" 같은 시각도, "2026-08-01 09:00" 같은 전체 일시도 받는다
  case "$WAIT_UNTIL" in
    *[-\ ]*) target=$(date -d "$WAIT_UNTIL" +%s 2>/dev/null || echo 0) ;;
    *) target=$(date -d "today $WAIT_UNTIL" +%s 2>/dev/null || echo 0)
       [ "$target" -lt "$(date +%s)" ] && target=$(date -d "tomorrow $WAIT_UNTIL" +%s) ;;
  esac
  [ "$target" = "0" ] && { log "[abort] WAIT_UNTIL 해석 실패: $WAIT_UNTIL"; exit 1; }
  log "[wait] $(date -d "@$target" '+%m/%d %H:%M')까지 대기"
  while [ "$(date +%s)" -lt "$target" ]; do sleep 60; done
fi
if [ -n "${GO_FILE:-}" ]; then
  log "[wait] ${GO_FILE} 생성 대기"
  while [ ! -e "$GO_FILE" ]; do sleep 60; done
fi
if [ -n "${WAIT_LOAD:-}" ]; then
  # 마감(WAIT_DEADLINE)을 넘기면 포기한다 — 업무시간에 뒤늦게 시작해
  # ollama를 언로드하는 사고를 막기 위함
  DL=0
  [ -n "${WAIT_DEADLINE:-}" ] && DL=$(date -d "$WAIT_DEADLINE" +%s 2>/dev/null || echo 0)
  log "[wait] 부하 ${WAIT_LOAD} 이하 대기${WAIT_DEADLINE:+ (마감 $WAIT_DEADLINE)}"
  while :; do
    cur=$(awk '{print int($1)}' /proc/loadavg)
    [ "$cur" -le "${WAIT_LOAD%.*}" ] && break
    if [ "$DL" != "0" ] && [ "$(date +%s)" -ge "$DL" ]; then
      log "[abort] 마감까지 부하가 안 내려갔다 (현재 $cur). 실행하지 않음."; exit 2
    fi
    sleep 120
  done
  log "[wait] 부하 $(awk '{print $1}' /proc/loadavg) — 진행"
fi

# ---------- 1) 사전 점검 ----------
if pgrep -f "train_ppo[.]py --partners" >/dev/null; then
  log "[abort] 다른 학습이 실행 중이다. 먼저 끝내거나 종료할 것."; exit 1
fi
nvidia-smi -L >/dev/null 2>&1 || { log "[abort] nvidia-smi 사용 불가"; exit 1; }
"$PY" -c "import torch;assert torch.cuda.is_available()" 2>/dev/null || {
  log "[abort] torch에서 CUDA를 못 본다"; exit 1; }
log "[preflight] GPU OK / 목표 ${UPDATES}upd, 망 ${HID}x${DEP}, ${WORKERS}워커x$((ENVS/WORKERS))환경"

# ---------- 2) ollama 언로드 (통합 메모리 확보) ----------
MODELS=$(ollama ps | tail -n +2 | awk '{print $1}')
[ -z "$MODELS" ] && MODELS="gpt-oss:120b qwen2.5vl:7b bge-m3:latest"
log "[unload] $MODELS"
for m in $MODELS; do ollama stop "$m" >/dev/null 2>&1; done
sleep 5
FREE=$(free -g | awk '/^메모리|^Mem/{print $7}')
log "[preflight] 가용 메모리 ${FREE}GB (최소 ${MIN_FREE_GB}GB 필요)"

restore() {
  log "[restore] ollama 복원"
  for m in $MODELS; do
    curl -sf --max-time 900 http://localhost:11434/api/generate -d "{\"model\":\"$m\"}" >/dev/null \
      || curl -sf --max-time 900 http://localhost:11434/api/embed -d "{\"model\":\"$m\",\"input\":\"x\"}" >/dev/null \
      || log "[warn] 복원 실패: $m"
  done
  ollama ps | tee -a "$LOG"
}
trap restore EXIT

if [ "${FREE:-0}" -lt "$MIN_FREE_GB" ]; then
  log "[abort] 메모리 부족 — ollama 외 다른 프로세스가 점유 중이다"; exit 1
fi

# ---------- 3) 학습 (크래시 자동 재개) ----------
mkdir -p "$CKPT"
for ((try=1; try<=MAX_RETRY; try++)); do
  RESUME=""
  [ -f "$CKPT/latest.pt" ] && RESUME="--resume $CKPT/latest.pt"
  log "[run] attempt $try $(date +%H:%M:%S) $RESUME"
  "$PY" -u train_ppo.py --partners --workers "$WORKERS" --envs "$ENVS" \
      --steps "$STEPS" --updates "$UPDATES" --hidden "$HID" --depth "$DEP" \
      --lr 2e-4 --force-bid-anneal "$ANNEAL" --ckpt "$CKPT" $RESUME 2>&1 | tee -a "$LOG"
  rc=${PIPESTATUS[0]}
  [ "$rc" = "0" ] && { log "[done] rc=0"; break; }
  log "[crash] rc=$rc — 30초 후 재개"
  pkill -f "mirror-bridge[.]js" 2>/dev/null
  sleep 30
done
tar czf "mighty_ppo_v4g_${STAMP}.tar.gz" "$CKPT/latest.pt" "$LOG" 2>/dev/null

# ---------- 4) 내보내기 + 수용 기준 실측 ----------
log "[export] ONNX 변환"
"$PY" export_onnx.py --ckpt "$CKPT/latest.pt" --out mighty_master_v4.onnx 2>&1 | grep -E "^update|^hidden" | tee -a "$LOG"
"$PY" - <<'PYEOF' 2>&1 | tee -a "$LOG"
import onnx, os
p = 'mighty_master_v4.onnx'
onnx.save_model(onnx.load(p), p, save_as_external_data=False)
d = p + '.data'
if os.path.exists(d): os.remove(d)
print('onnx', round(os.path.getsize(p)/1e6, 1), 'MB')
PYEOF

{
  echo "=== v4 GPU 학습 결과 ($STAMP)"
  echo "설정: ${HID}x${DEP}, ${UPDATES}upd, anneal ${ANNEAL}, ${WORKERS}워커x$((ENVS/WORKERS))환경"
  echo "재개 횟수: $(grep -c '\[crash\]' "$LOG")"
  grep -E "^upd ${UPDATES} " "$LOG" | tail -1
  echo
  echo "--- 수용 기준 (핸드오프 §6)"
  MODEL=mighty_master_v4.onnx node bench_accept.js 1600 gambler balanced careful
  echo
  echo "--- 페어드 벤치 (참고)"
  MODEL=mighty_master_v4.onnx node bench_paired.js 1000 gambler balanced careful
  echo
  echo "--- 전략 지표 (참고)"
  MODEL=mighty_master_v4.onnx node bench_metrics.js 1500 nn
} 2>&1 | tee "$SUM"

log "[complete] 요약: $PWD/$SUM"
