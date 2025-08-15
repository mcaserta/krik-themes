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
  .thumb { width: 100%; height: 160px; background: #f4f4f4; border-radius: 6px; display:block; overflow:hidden; margin-bottom: .75rem; border: 1px solid #e5e5e5; }
  .thumb img { width: 100%; height: 100%; object-fit: cover; display:block; }
</style>
<h1>Krik Theme Demos</h1>
<div class="grid">
HTML

# Build a list of themes either from THEMES_FILE or by scanning OUT_DIR
themes=()
if [[ -f "$THEMES_FILE" ]]; then
  while IFS= read -r theme; do
    [[ -z "$theme" ]] && continue
    themes+=("$theme")
  done < "$THEMES_FILE"
else
  # scan directories under OUT_DIR that contain index.html, excluding ones starting with underscore
  while IFS= read -r entry; do
    name="$(basename "$entry")"
    [[ "$name" == _* ]] && continue
    if [[ -f "$OUT_DIR/$name/index.html" ]]; then
      themes+=("$name")
    fi
  done < <(find "$OUT_DIR" -mindepth 1 -maxdepth 1 -type d 2>/dev/null || true)
fi

for theme in "${themes[@]}"; do
  if [[ -f "$OUT_DIR/_previews/$theme.jpg" ]]; then
    cat <<HTML
  <div class="card">
    <a class="thumb" href="./$theme/" target="_blank">
      <img src="./_previews/$theme.jpg" alt="$theme preview" loading="lazy" />
    </a>
    <div><a href="./$theme/">$theme</a></div>
  </div>
HTML
  else
    cat <<HTML
  <div class="card">
    <a class="thumb" href="./$theme/" target="blank">Preview unavailable</a>
    <div><a href="./$theme/">$theme</a></div>
  </div>
HTML
  fi
done

cat <<'HTML'
</div>
</html>
HTML
} > "$INDEX"
