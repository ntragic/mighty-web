#!/usr/bin/env bash
# 증류 체크포인트 → 배포용 단일 파일 ONNX. 토치가 .onnx.data로 쪼개면
# export_onnx.py가 되읽어 합친다(배포는 단일 파일 전제).
set -uo pipefail
cd "$(dirname "$0")/../../training"

for t in "$@"; do
  python3 export_onnx.py --ckpt "ckpt_$t/latest.pt" \
      --out "../web/model/mighty_master_$t.onnx" 2>&1 | tail -3
done
ls -la ../web/model/mighty_master_v17*.onnx
