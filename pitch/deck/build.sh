#!/bin/sh
# Renders pitch/deck/index.html to pitch/deck.pdf and page PNGs in /tmp/kakwe-pages.
set -e
cd "$(dirname "$0")"
CHROME=${CHROME:-$(ls -d "$HOME"/.cache/ms-playwright/chromium-*/chrome-linux64/chrome "$HOME"/.cache/puppeteer/chrome/linux-*/chrome-linux64/chrome 2>/dev/null | tail -1)}
node dolls.mts 2>/dev/null
"$CHROME" --headless --no-sandbox --disable-gpu --allow-file-access-from-files --no-pdf-header-footer \
  --virtual-time-budget=8000 --print-to-pdf=../deck.pdf "file://$PWD/index.html" 2>/dev/null
rm -rf /tmp/kakwe-pages && mkdir -p /tmp/kakwe-pages
pdftoppm -r 48 -png ../deck.pdf /tmp/kakwe-pages/p
pdfinfo ../deck.pdf | grep -E 'Pages|Page size'
