#!/usr/bin/env bash
# Builds the ZIP to upload to the Chrome Web Store: dist/fxfullpage-<version>.zip
set -euo pipefail
cd "$(dirname "$0")/.."

version=$(python3 -c 'import json; print(json.load(open("manifest.json"))["version"])')
out="dist/fxfullpage-${version}.zip"
files=(manifest.json background.js capture-page.js db.js editor.html editor.css editor.js pdf.js icons _locales)

for f in "${files[@]}"; do [ -e "$f" ] || { echo "Missing file: $f" >&2; exit 1; }; done
python3 -c 'import json,glob; [json.load(open(f)) for f in ["manifest.json", *glob.glob("_locales/*/messages.json")]]'

mkdir -p dist
rm -f "$out"
zip -qr -X "$out" "${files[@]}"
echo "OK: $out ($(du -h "$out" | cut -f1))"
