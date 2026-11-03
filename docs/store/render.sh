#!/bin/sh
# Renders each frame of store.html to a PNG at its exact Chrome Web Store size (RGB, no alpha).
cd "$(dirname "$0")" || exit 1
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
shot() { # id file width height
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
    --window-size="$3,$4" --screenshot="$PWD/$2" "file://$PWD/store.html#$1" >/dev/null 2>&1
}
shot s1 screenshot-1.png 1280 800
shot s2 screenshot-2.png 1280 800
shot s3 screenshot-3.png 1280 800
shot tile tile-small.png 440 280
shot marquee tile-marquee.png 1400 560
file *.png
