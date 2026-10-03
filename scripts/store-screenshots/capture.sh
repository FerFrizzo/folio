#!/usr/bin/env bash
# Captures raw store screenshots with Maestro. Needs the Release app installed on
# a booted simulator/emulator and the demo account seeded (seed-demo.ts).
# Usage: capture.sh [ios|android-phone|android-tablet] [device-id]
set -euo pipefail
cd "$(dirname "$0")/../.."

TARGET="${1:-ios}"
OUT="assets/screenshots/raw/$TARGET"
mkdir -p "$OUT"
rm -f "$OUT"/*.png

if [ "$TARGET" = "ios" ]; then
  DEVICE="${2:-$(xcrun simctl list devices booted | grep -oE '[0-9A-F-]{36}' | head -1)}"
  xcrun simctl status_bar "$DEVICE" override \
    --time "9:41" --dataNetwork wifi --wifiMode active --wifiBars 3 \
    --cellularMode active --cellularBars 4 --batteryState charged --batteryLevel 100
else
  DEVICE="${2:-$(adb devices | awk 'NR>1 && $2=="device" {print $1; exit}')}"
  adb -s "$DEVICE" shell settings put global sysui_demo_allowed 1
  demo() { adb -s "$DEVICE" shell am broadcast -a com.android.systemui.demo -e command "$@" >/dev/null; }
  demo enter
  demo clock -e hhmm 0941
  demo battery -e level 100 -e plugged false
  demo network -e wifi show -e level 4
  demo network -e mobile hide
  demo notifications -e visible false
fi

EMAIL=$(node -p 'require("./secrets/demo-account.json").email')
PASSWORD=$(node -p 'require("./secrets/demo-account.json").password')

maestro --device "$DEVICE" test \
  -e EMAIL="$EMAIL" -e PASSWORD="$PASSWORD" -e DEVICE_CLASS="$TARGET" --test-output-dir "$OUT" \
  scripts/store-screenshots/capture.yaml

latest=$(ls -td "$OUT"/20*/ | head -1)
mv -f "$latest"capture/takeScreenshot/*.png "$OUT"/
rm -rf "$OUT"/20*/
