#!/usr/bin/env bash
# release.sh — 검사 → 빌드 → 테스트 → 배포 zip
#   버전은 src/ui.js 의 APP_VERSION 하나가 소스다.
#   CHANGELOG 에 해당 버전 항목이 없으면 빌드를 중단한다.
set -euo pipefail
cd "$(dirname "$0")/.."

VER=$(grep -o "const APP_VERSION = 'v[0-9.]*'" src/ui.js | grep -o "v[0-9.]*")
[ -z "$VER" ] && { echo "APP_VERSION 을 찾을 수 없다"; exit 1; }
BUILD=$(grep -o "const APP_BUILD = '[^']*'" src/ui.js | sed "s/.*= '//; s/'$//")
echo "빌드 버전: $VER ($BUILD)"

grep -q "^### $VER" docs/CHANGELOG.md \
  || { echo "실패: docs/CHANGELOG.md 에 '### $VER' 항목이 없다"; exit 1; }
grep -q "현재 버전\*\*: $VER" docs/CHANGELOG.md \
  || { echo "실패: CHANGELOG 헤더의 현재 버전이 $VER 가 아니다"; exit 1; }
echo "CHANGELOG 동기화 확인"

node tools/build.mjs
npm test && echo "전체 테스트 통과"

# 배포에 넣을 모델은 빌드 결과가 실제로 참조하는 것만 고른다.
# web/model에는 연구·비교용 세대가 함께 있어(v4·v7·v9·v11b·v12·v14…) 통째로
# 담으면 zip이 90MB를 넘는다. 참조 목록은 index.html에서 뽑으므로 src/ui.js의
# TIER_PLAN이 그대로 단일 소스가 된다.
MODELS=$(grep -o 'mighty_master_[0-9a-z]*\.onnx' web/index.html | sort -u)
[ -z "$MODELS" ] && { echo "실패: index.html이 참조하는 모델을 찾지 못했다"; exit 1; }
for m in $MODELS; do
  [ -f "web/model/$m" ] || { echo "실패: 참조 모델이 없다 — web/model/$m"; exit 1; }
done
echo "배포 모델: $(echo $MODELS | tr ' ' ' ')"
UNUSED=$(cd web/model && ls *.onnx 2>/dev/null | grep -vxF "$MODELS" | tr '\n' ' ')
[ -n "$UNUSED" ] && echo "번들 제외(연구용 보관): $UNUSED"

mkdir -p dist
ZIP="$(pwd)/dist/mighty-itch-$VER.zip"
rm -f "$ZIP"
cp docs/CHANGELOG.md web/CHANGELOG.md
MODEL_PATHS=$(for m in $MODELS; do echo "model/$m"; done)
( cd web && zip -qr "$ZIP" index.html CHANGELOG.md ort $MODEL_PATHS )
rm -f web/CHANGELOG.md

echo "완료 → dist/mighty-itch-$VER.zip ($(du -h "$ZIP" | cut -f1))"
unzip -l "$ZIP" | tail -3
