#!/usr/bin/env bash
# weaklead 증류 — 앵커 v16e, KL만 스윕한다(8-4).
#
# 에폭은 늘리지 않는다: KL 2.0에서 4에폭 13.6% vs 12에폭 13.9%로 안 움직인다.
# **KL이 총 이동량 예산이다.** 다만 예산을 쓰려면 옵티마 스텝이 있어야 한다 —
# 라벨 2,733건에 mb 1024·lr 1e-4면 8에폭이 24스텝이라 KL 0.3이든 1.5든 똑같이
# 안 움직였다(2026-08-17 실측, 교사 일치 64%에서 정체). mb 256·lr 3e-4로 80스텝을
# 주면 같은 KL·같은 에폭에서 78.5%까지 간다. **라벨이 적을수록 mb를 줄여라.**
# 과교정(교사값 초과)도 실패이므로 판정은 후회 감소만이 아니라 페어드 상금까지 본다.
set -uo pipefail
cd "$(dirname "$0")/../../training"

for kl in ${@:-0.7 1.0 1.5}; do
  tag=$(echo "$kl" | tr -d '.'); tag=v17s$tag
  echo "[$(date +%H:%M)] 증류 KL=$kl → ckpt_$tag"
  python3 distill_search.py --labels '../training/wl_labels_*.jsonl' \
      --resume ckpt_v16e/latest.pt --ckpt "ckpt_$tag" \
      --kl "$kl" --ce 1.0 --epochs 8 --mb 256 --lr 3e-4 --cls-weight 1.0 --weight-by-gain \
      2>&1 | tee "../docs/wl-distill-$tag.log"
  python3 export_onnx.py --ckpt "ckpt_$tag/latest.pt" \
      --out "../web/model/mighty_master_$tag.onnx" 2>&1 | tail -3
done
echo "[$(date +%H:%M)] 완료"
ls -la ../web/model/mighty_master_v17s*.onnx
