#!/usr/bin/env bash
# v16e 잔여 관문 — 수용 기준과 h2h 9,000판.
# 클래스 인증은 통과했다(발화 108딜, 여당 상금 +167.3 ± 64.4, 유의 우세).
# 남은 것은 "클래스 밖에서 아무것도 잃지 않았는가"다.
set -uo pipefail
cd "$(dirname "$0")/../.."

D=docs
: > $D/v16e-final.txt
echo "[$(date +%H:%M)] 수용 기준 3,000판" | tee -a $D/v16e-final.txt
MODEL=web/model/mighty_master_v16e.onnx node tools/accept-v4.js 3000 advanced 2>&1 \
  | tail -20 | tee -a $D/v16e-final.txt

echo "" | tee -a $D/v16e-final.txt
echo "[$(date +%H:%M)] h2h 9,000판 vs v13" | tee -a $D/v16e-final.txt
node tools/research/model_h2h.js web/model/mighty_master_v16e.onnx \
     web/model/mighty_master_v13.onnx 9000 2>&1 | tail -5 | tee -a $D/v16e-final.txt
echo "[$(date +%H:%M)] 완료" | tee -a $D/v16e-final.txt
