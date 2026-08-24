#!/usr/bin/env bash
# 무늬 추론 수정(2026-08-20) 이후 라벨 재생성.
#
# 기존 라벨은 전부 편향된 결정화로 만들어졌다 — 마이티를 오프수트로 낸 좌석을
# "그 무늬 없음"으로 단정해, 주공이 기루다를 든 세계를 아예 상상하지 못했다.
# 그 상태의 교사가 고른 정답을 학습시키면 편향을 그대로 이식한다.
#
# 옛 라벨은 지우지 않고 남긴다(training/wl_labels_* · tl_labels_*). 새 라벨은
# 접두사로 구분한다 — wl2_labels_* · tl2_labels_*.
#
# 사용: run_relabel.sh <클래스> <갈래당 딜수> [웨이브]
#   클래스: weaklead | trumplead
set -uo pipefail
cd "$(dirname "$0")/../.."

CLS=${1:?클래스 (weaklead | trumplead)}
N=${2:-500}
W=${3:-0}
case "$CLS" in
  weaklead)  PREFIX=wl2_labels_ ;;
  trumplead) PREFIX=tl2_labels_ ;;
  *) echo "알 수 없는 클래스: $CLS"; exit 1 ;;
esac

echo "[$(date +%H:%M)] $CLS 라벨 재생성 — 갈래당 $N 판 (웨이브 $W · 접두사 $PREFIX)"
CLASS_ONLY=$CLS PREFIX=$PREFIX K_CLASS=96 SPLIT=1 \
  bash tools/research/run_wl_labels.sh "$N" "$W"
