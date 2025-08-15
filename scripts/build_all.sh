#!/usr/bin/env bash
set -euo pipefail

THEMES_FILE="${1:-.themes.txt}"
KRIK_SRC="${2:-krik-src}"
KK_BIN="${3:-./kk}"

OUT_DIR="_site"
DEMO_DIR="build/demo"
PUBLIC_DIR="_site" # Krik default output dir per src/cli/mod.rs

mkdir -p "$OUT_DIR" "$DEMO_DIR"

# Initialize demo content once
if [[ ! -d "$DEMO_DIR/$PUBLIC_DIR" ]]; then
  "$KK_BIN" init "$DEMO_DIR" || true
fi

while IFS= read -r theme; do
  [[ -z "$theme" ]] && continue
  echo "==> Building theme: $theme"

  # Build the site for this theme
  (cd "$DEMO_DIR" && "$KK_BIN" --theme "$theme")

  # Publish the built output under _site/<theme>/
  mkdir -p "$OUT_DIR/$theme"
  rsync -a --delete "$DEMO_DIR/$PUBLIC_DIR/" "$OUT_DIR/$theme/"
done < "$THEMES_FILE"
