#!/usr/bin/env bash
# 티어 배치용 실측 — 각 세대가 규칙기반 두 티어 상대로 판당 얼마를 버는가.
#
# 사다리(ladder-*.txt)는 NN끼리의 서열만 준다. 중급 티어에 NN을 넣으려면
# "그 NN이 중급 휴리스틱보다 얼마나 센가"를 알아야 한다 — 자칫 중급이 고급보다
# 어려워진다. accept-v4.js의 상대 티어 인자(argv[3])로 두 조건을 각각 잰다.
#
# 순차 실행 — 동시 실행은 메모리 압박으로 죽는다.
set -uo pipefail
cd "$(dirname "$0")/../.."

D=docs
N=${1:-1500}

for m in v4 v5 v6b v7 v8 v13; do
  for opp in intermediate advanced; do
    echo "[$(date +%H:%M)] $m vs ${opp}x4 ($N판)"
    MODEL=$PWD/web/model/mighty_master_$m.onnx \
      node tools/accept-v4.js $N $opp > $D/place-$m-$opp.txt 2>&1
    grep -E "판당 상금|주공 승률|주공 비율" $D/place-$m-$opp.txt | head -3
  done
done
echo "[$(date +%H:%M)] 티어 배치 실측 완료"
