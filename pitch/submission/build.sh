#!/bin/sh
# Builds Kakwe-AIBuilderCup-submission.pptx and .pdf from the contest template, plus page previews.
# Needs uv, headless Chromium, LibreOffice Impress, pdftoppm, and Google Sans Flex in ~/.local/share/fonts.
set -e
cd "$(dirname "$0")"
OUT=${OUT:-..}
uv run -q --with pillow python assets.py
uv run -q --with python-pptx --with pillow python build_pptx.py template.pptx "$OUT/Kakwe-AIBuilderCup-submission.pptx"
FONTCONFIG_FILE="$PWD/fonts.conf" soffice --headless --norestore -env:UserInstallation=file:///tmp/kakwe-lo \
  --convert-to pdf --outdir "$OUT" "$OUT/Kakwe-AIBuilderCup-submission.pptx" >/dev/null 2>&1
rm -rf /tmp/kakwe-sub && mkdir -p /tmp/kakwe-sub
pdftoppm -r 110 -png "$OUT/Kakwe-AIBuilderCup-submission.pdf" /tmp/kakwe-sub/p
pdfinfo "$OUT/Kakwe-AIBuilderCup-submission.pdf" | grep -E 'Pages|Page size'
