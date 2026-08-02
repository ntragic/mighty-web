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
node tests/mighty-engine.test.js > /dev/null && echo "엔진 테스트 통과"
node tests/smoke.test.js > /dev/null 2>&1 && echo "UI 스모크 통과"
node tests/replay-resume.test.js > /dev/null 2>&1 && echo "복기 재개 테스트 통과"

mkdir -p dist
ZIP="$(pwd)/dist/mighty-itch-$VER.zip"
rm -f "$ZIP"
cp docs/CHANGELOG.md web/CHANGELOG.md
( cd web && zip -qr "$ZIP" index.html CHANGELOG.md model ort )
rm -f web/CHANGELOG.md

echo "완료 → dist/mighty-itch-$VER.zip"
unzip -l "$ZIP" | tail -4
