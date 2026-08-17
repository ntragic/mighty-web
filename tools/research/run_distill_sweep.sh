#!/usr/bin/env bash
# 증류 강도 스윕 — T1 마이티 팔로우를 교사값(9.5%)까지 밀 수 있는지 본다.
#
# 1차 증류(KL 2.0 · 4에폭)가 19.4% → 13.6%로 초과분을 59% 줄였다. 더 밀려면
# KL(총 이동량 예산)을 낮추거나 에폭을 늘린다. 다만 **과교정도 실패다** —
# 교사값은 9.5%지 0%가 아니고, KL을 너무 풀면 일반 기력이 무너진다.
set -uo pipefail
cd "$(dirname "$0")/../.."/training

L="key_labels_*.jsonl cls_labels_tight*.jsonl replay_labels.jsonl"
run() {   # 이름 KL 에폭
  echo "[$(date +%H:%M)] $1 — KL $2 · ${3}에폭"
  python3 distill_search.py --labels $L --resume ckpt_v16/latest.pt \
    --ckpt "ckpt_$1" --kl "$2" --ce 1.0 --epochs "$3" \
    --cls-weight 1.0 --weight-by-gain 2>&1 | tail -3
}

run v16e 1.0 8
run v16f 0.5 8
run v16g 2.0 12

for m in v16e v16f v16g; do
  python3 export_onnx.py --ckpt "ckpt_$m/latest.pt" --out "../web/model/mighty_master_$m.onnx" 2>&1 | tail -1
  python3 - "$m" <<'PY'
import onnx, os, sys
p = f'../web/model/mighty_master_{sys.argv[1]}.onnx'
onnx.save(onnx.load(p), p, save_as_external_data=False)
if os.path.exists(p + '.data'):
    os.remove(p + '.data')
PY
done
echo "[$(date +%H:%M)] 스윕 완료"
