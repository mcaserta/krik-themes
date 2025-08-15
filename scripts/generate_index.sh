#!/usr/bin/env bash
set -euo pipefail

OUT_DIR="${1:-_site}"
THEMES_FILE="${2:-.themes.txt}"

mkdir -p "$OUT_DIR"
INDEX="$OUT_DIR/index.html"

{
cat <<'HTML'
<!doctype html>
<html lang="en">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Krik Themes</title>
<style>
  :root { color-scheme: light dark; }
  body { font: 16px/1.5 system-ui, -apple-system, Segoe UI, Roboto, sans-serif; margin: 2rem; }
  h1 { margin-bottom: 1rem; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill,minmax(260px,1fr)); gap: 1rem; }
  .card { border: 1px solid #ddd; border-radius: 8px; padding: 1rem; background: Canvas; color: CanvasText; }
  .card a { text-decoration: none; color: LinkText; font-weight: 600; }
  .thumb { width: 100%; height: 140px; background: #f4f4f4; border-radius: 6px; display:flex; align-items:center; justify-content:center; color:#888; margin-bottom: .75rem; }
</style>
<h1>Krik Theme Demos</h1>
<div class="grid">
HTML

while IFS= read -r theme; do
  [[ -z "$theme" ]] && continue
  cat <<HTML
  <div class="card">
    <div class="thumb">Preview</div>
    <div><a href="./$theme/">$theme</a></div>
  </div>
HTML

done < "$THEMES_FILE"

cat <<'HTML'
</div>
</html>
HTML
} > "$INDEX"
