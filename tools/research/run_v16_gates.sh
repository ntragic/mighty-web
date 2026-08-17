#!/usr/bin/env bash
# v16 증류 후보의 일반 기력 관문.
#
# 클래스 지표(키카드 소비율)는 v16e·v16f 둘 다 교사값에 붙었다. 문제는 KL을 풀어
# 얻은 것이라 앵커가 지키던 나머지가 흔들렸을 수 있다는 점이다. h2h로 그것만 본다.
# 3,000판은 **선별**이다 — 큰 손실을 잡는 용도이고, 채택 확정은 9,000판이다
# (작은 표본이 판정을 세 번 뒤집은 전례가 있다).
set -uo pipefail
cd "$(dirname "$0")/../.."

N=${1:-3000}
D=docs
: > $D/v16-gates.txt
for m in v16e v16f v16d; do
  echo "[$(date +%H:%M)] $m vs v13 · ${N}판" | tee -a $D/v16-gates.txt
  node tools/research/model_h2h.js "web/model/mighty_master_$m.onnx" \
       web/model/mighty_master_v13.onnx "$N" 2>&1 | tail -4 | tee -a $D/v16-gates.txt
done
echo "[$(date +%H:%M)] 완료" | tee -a $D/v16-gates.txt
