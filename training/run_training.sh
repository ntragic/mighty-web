#!/usr/bin/env bash
# 마이티 PPO 학습 전체 시퀀스: ollama 언로드 → 학습 → 결과 패키징 → ollama 복원
# 사용: ./run_training.sh                  (README 권장 파라미터)
#       ./run_training.sh --updates 100    (인자 주면 train_ppo.py에 그대로 전달)
set -euo pipefail
cd "$(dirname "$0")"
PY=/home/sparkadmin/torch-env/bin/python
STAMP=$(date +%Y%m%d_%H%M%S)
LOG="train_${STAMP}.log"

# 1) 로딩된 ollama 모델 기록 후 GPU에서 언로드 (ollama 서비스는 유지, sudo 불필요)
MODELS=$(ollama ps | tail -n +2 | awk '{print $1}')
# 이전 실행 중단 등으로 이미 언로드된 상태면 상주 3모델로 폴백
[ -z "$MODELS" ] && MODELS="gpt-oss:120b qwen2.5vl:7b bge-m3:latest"
echo "[unload] $MODELS"
for m in $MODELS; do ollama stop "$m"; done

# 학습이 죽거나 Ctrl-C여도 ollama 모델 복원 보장
restore() {
  echo "[restore] ollama models"
  for m in $MODELS; do
    curl -sf http://localhost:11434/api/generate -d "{\"model\":\"$m\"}" >/dev/null \
      || curl -sf http://localhost:11434/api/embed -d "{\"model\":\"$m\",\"input\":\"x\"}" >/dev/null \
      || echo "[warn] failed to reload $m"
  done
  ollama ps
}
trap restore EXIT

# 2) 본 학습 (기본: README 권장. 단일프로세스 ~4k steps/s 기준 약 11시간)
ARGS=("$@")
[ ${#ARGS[@]} -eq 0 ] && ARGS=(--envs 128 --steps 32768 --updates 5000 --hidden 1024 --depth 4 --lr 2e-4)
"$PY" train_ppo.py "${ARGS[@]}" 2>&1 | tee "$LOG"

# 3) 결과 패키징 (체크포인트 + 로그)
CKPT=ckpt
for ((i=0; i<${#ARGS[@]}; i++)); do
  [ "${ARGS[i]}" = "--ckpt" ] && CKPT="${ARGS[i+1]}"
done
tar czf "mighty_ppo_${STAMP}.tar.gz" "$CKPT/latest.pt" "$LOG"
echo "result package: $PWD/mighty_ppo_${STAMP}.tar.gz"
