#!/usr/bin/env bash
# Builds store packages from the same source tree.
#
#   ./scripts/package.sh            # both browsers
#   ./scripts/package.sh chrome     # dist/chrome/  + dist/fxfullpage-chrome-<version>.zip
#   ./scripts/package.sh firefox    # dist/firefox/ + dist/fxfullpage-firefox-<version>.zip
#   ./scripts/package.sh edge       # dist/edge/    + dist/fxfullpage-edge-<version>.zip
#
# manifest.json is the Chrome manifest (and what "Load unpacked" uses during development).
# Edge uses the Chrome manifest unchanged; it only gets its own, clearly named package.
# The Firefox manifest is derived from it: event-page background script instead of a
# service worker, plus the Gecko-specific settings required by addons.mozilla.org.
set -euo pipefail
cd "$(dirname "$0")/.."

FILES=(background.js capture-page.js db.js editor.html editor.css editor.js pdf.js icons _locales)
GECKO_ID="fx-full-page-screenshot@fx-diff"
# 142 is the first version supporting data_collection_permissions on every platform.
# No "gecko_android" key: it would mark the add-on as Android-compatible on AMO.
GECKO_MIN_VERSION="142.0"

targets=("${@:-chrome firefox edge}")
read -r -a targets <<< "${targets[*]}"

for f in manifest.json "${FILES[@]}"; do [ -e "$f" ] || { echo "Missing file: $f" >&2; exit 1; }; done
python3 -c 'import json,glob; [json.load(open(f)) for f in ["manifest.json", *glob.glob("_locales/*/messages.json")]]'
version=$(python3 -c 'import json; print(json.load(open("manifest.json"))["version"])')

build() {
  local target=$1
  local dir="dist/${target}"
  local zip="dist/fxfullpage-${target}-${version}.zip"

  rm -rf "$dir" "$zip"
  mkdir -p "$dir"
  cp -r "${FILES[@]}" "$dir/"

  python3 - "$target" "$dir/manifest.json" "$GECKO_ID" "$GECKO_MIN_VERSION" <<'PY'
import json, sys
target, out, gecko_id, gecko_min = sys.argv[1:]
m = json.load(open("manifest.json"))
if target == "firefox":
    m["background"] = {"scripts": ["background.js"], "type": "module"}
    m["browser_specific_settings"] = {
        "gecko": {
            "id": gecko_id,
            "strict_min_version": gecko_min,
            "data_collection_permissions": {"required": ["none"]},
        },
    }
json.dump(m, open(out, "w"), ensure_ascii=False, indent=2)
open(out, "a").write("\n")
PY

  (cd "$dir" && zip -qr -X "../$(basename "$zip")" .)
  echo "OK: $zip ($(du -h "$zip" | cut -f1)) — unpacked build in $dir/"
}

for t in "${targets[@]}"; do
  case "$t" in
    chrome|firefox|edge) build "$t" ;;
    *) echo "Unknown target: $t (use chrome, firefox or edge)" >&2; exit 1 ;;
  esac
done
