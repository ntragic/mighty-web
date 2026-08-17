#!/usr/bin/env bash
# 여유 기준 개입 라벨 생성 (FORCE_BID 실패를 대체한다).
#
# 왜 공약 강제를 버렸나: 20을 강제하면 계약이 '빡빡'이 아니라 '가망 없음'이 되어
# 무슨 수를 둬도 같이 진다. 탐색이 수를 구분 못 해 개입 라벨 545건 중 이득>0.05가
# 4건, 정책 불일치 2.4%였다. 반면 정상 자가대전은 개입 국면의 30.5%가 이미
# 여유 0 이하다(371국면 실측). 강제할 필요가 없었다.
#
# 표적은 여유 0~2 — 빡빡하지만 달성 가능한 구간. 음수는 이미 깨진 계약이라 뺀다.
# 조커콜은 앞 배치에서 999건 모았으므로 JC_SAMPLE=0으로 끄고 표적에 계산을 몰아준다.
set -uo pipefail
cd "$(dirname "$0")/../.."

N=${1:-260}
MODEL=web/model/mighty_master_v13.onnx

echo "[$(date +%H:%M)] 여유 0~2 개입 라벨 생성 — 갈래당 $N 판"
for i in 1 2 3; do
  env MODEL=$MODEL SEED_BASE=$((90000000 + i * 1000000)) \
      CLASS_SAMPLE=1.0 K_CLASS=64 DEPTH_CLASS=0 TOPM=5 \
      SLACK_MIN=0 SLACK_MAX=2 JC_SAMPLE=0 \
      node tools/research/pimc_label.js "training/cls_labels_tightb$i.jsonl" "$N" \
      > "docs/retrain-tightb$i.log" 2>&1 &
done
wait
echo "[$(date +%H:%M)] 완료"
for i in 1 2 3; do tail -1 "docs/retrain-tightb$i.log"; done
wc -l training/cls_labels_tightb*.jsonl
