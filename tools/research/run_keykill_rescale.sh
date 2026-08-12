#!/usr/bin/env bash
# 스케일 수정 후 keykill 재측정 — "조커콜 가치가 깊이 3에서 1,155 과소평가"의
# 진짜 폭을 다시 낸다. 종전 측정은 깊이 0(종료 상금 /1000)과 깊이 3(가치 헤드
# /2000)을 섞어 비교해 2배 편향이 있었다.
set -uo pipefail
cd "$(dirname "$0")/../.."

MODEL=$PWD/web/model/mighty_master_v13.onnx SEED_BASE=41000000 KIND=jcall \
  node tools/research/keykill_probe.js 900 64 > docs/keykill-rescale.txt 2>&1
tail -20 docs/keykill-rescale.txt
echo "재측정 완료"
