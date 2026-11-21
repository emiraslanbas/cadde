#!/bin/bash
# İkon PNG'lerini SVG kaynaklarından üretir. Playwright'ın headless Chromium'u gerekir:
#   npx playwright install chromium-headless-shell
# Kullanım: assets/icon-src/render.sh
set -euo pipefail
cd "$(dirname "$0")"
CHROME="${CHROME:-$(find ~/Library/Caches/ms-playwright -name chrome-headless-shell -type f | head -1)}"
OUT=../images

render() { # kaynak.svg hedef.png
  "$CHROME" --headless --disable-gpu --hide-scrollbars --default-background-color=00000000 \
    --window-size=1024,1024 --screenshot="$OUT/$2" "file://$PWD/$1" >/dev/null 2>&1
}

render icon.svg icon.png
render android-background.svg android-icon-background.png
render android-foreground.svg android-icon-foreground.png
render android-monochrome.svg android-icon-monochrome.png
render splash-icon.svg splash-icon.png
render favicon.svg favicon.png
sips -z 48 48 "$OUT/favicon.png" >/dev/null

# App Store ikonunda alfa kanalı olmamalı: JPEG'e çevirip geri PNG yaparak düzleştir
TMP="$(mktemp -t cadde-icon).jpg"
sips -s format jpeg -s formatOptions best "$OUT/icon.png" --out "$TMP" >/dev/null
sips -s format png "$TMP" --out "$OUT/icon.png" >/dev/null
rm -f "$TMP"
