# Krik Themes Tooling

Tooling to build static demos for Krik themes, capture preview thumbnails with Puppeteer, and generate a browsable index page.

## Prerequisites

- Node.js 18+ and npm
- macOS/Linux shell environment
- Optional (for building demo sites):
  - `kk` (Krik CLI) binary
  - `krik-src` repository with themes under `krik-src/themes/<theme>`

## Install

```bash
npm install
```

## Inputs

- `.themes.txt` (optional): newline-separated list of theme directory names. Lines starting with `#` are ignored. Example:

```text
# themes to include in build and previews
clean
neon
sans
```

If `.themes.txt` is missing, the preview and index scripts will scan `_site/` for theme directories containing `index.html`.

## Build demo sites (optional)

If you have the `kk` CLI and `krik-src`, you can build demo sites for each theme. This populates `_site/<theme>/`.

```bash
./scripts/build_all.sh [.themes.txt] [krik-src] [./kk]
```

- Output: `_site/<theme>/` for each theme, synced from the demo build in `build/demo/_site/`.

## Generate previews and index

- Capture JPEG previews for each theme and generate `_site/index.html`:

```bash
npm run index
```

Equivalent to running:

```bash
npm run previews        # writes _site/_previews/<theme>.jpg
./scripts/generate_index.sh  # writes _site/index.html
```

### Preview capture options

`node scripts/capture_previews.mjs [--flags]`

- `--root <dir>`: site root to serve and scan (default: `_site`)
- `--out <dir>`: output directory for previews (default: `<root>/_previews`)
- `--themes <file>`: themes list file (default: `.themes.txt`)
- `--width <px>` / `--height <px>`: viewport size (default: 1200×800)
- `--quality <1-100>`: JPEG quality (default: 80)
- `--port <n>`: preferred local port (default: 5520; will try next ports if busy)
- `--delay <ms>`: extra delay after load before screenshot

Notes:
- In CI (`CI=true` or `GITHUB_ACTIONS=true`), Chromium is launched with `--no-sandbox` and related flags.

## Output layout

- `_site/<theme>/` — static site for each theme
- `_site/_previews/<theme>.jpg` — screenshot thumbnails
- `_site/index.html` — grid index linking to each theme, shows a fallback if a preview is missing

## Local preview

Open `_site/index.html` directly in your browser, or serve `_site/` with any static server (e.g. `npx serve _site`).

## Scripts

- `npm run previews` → `node scripts/capture_previews.mjs`
- `npm run index` → `node scripts/capture_previews.mjs && bash scripts/generate_index.sh`

## Notes

- `_site/` contents are generated and typically not committed.
