#!/usr/bin/env node
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import url from 'node:url';
import puppeteer from 'puppeteer';

/**
 * Simple static file server for a given root directory.
 * Returns { server, port } once listening.
 */
async function startStaticServer(rootDirectory, preferredPort = 5520) {
  function getContentType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    switch (ext) {
      case '.html': return 'text/html; charset=utf-8';
      case '.css': return 'text/css; charset=utf-8';
      case '.js': return 'application/javascript; charset=utf-8';
      case '.json': return 'application/json; charset=utf-8';
      case '.png': return 'image/png';
      case '.jpg':
      case '.jpeg': return 'image/jpeg';
      case '.webp': return 'image/webp';
      case '.svg': return 'image/svg+xml';
      case '.ico': return 'image/x-icon';
      case '.woff': return 'font/woff';
      case '.woff2': return 'font/woff2';
      case '.ttf': return 'font/ttf';
      case '.otf': return 'font/otf';
      case '.map': return 'application/json';
      default: return 'application/octet-stream';
    }
  }

  const server = http.createServer(async (req, res) => {
    try {
      const reqUrl = new url.URL(req.url, `http://${req.headers.host}`);
      let relativePath = decodeURIComponent(reqUrl.pathname);
      // Prevent path traversal
      if (relativePath.includes('..')) {
        res.writeHead(400); res.end('Bad request'); return;
      }
      let filePath = path.join(rootDirectory, relativePath);
      let stats;
      try {
        stats = await fsp.stat(filePath);
      } catch {
        res.writeHead(404); res.end('Not found'); return;
      }
      if (stats.isDirectory()) {
        filePath = path.join(filePath, 'index.html');
      }
      const contentType = getContentType(filePath);
      const readStream = fs.createReadStream(filePath);
      readStream.on('error', () => { res.writeHead(404); res.end('Not found'); });
      res.writeHead(200, { 'Content-Type': contentType, 'Cache-Control': 'no-store' });
      readStream.pipe(res);
    } catch (err) {
      res.writeHead(500); res.end('Server error');
    }
  });

  // Try ports preferredPort..preferredPort+20
  const port = await new Promise((resolve, reject) => {
    let current = preferredPort;
    function tryListen() {
      server.once('error', (err) => {
        if (err.code === 'EADDRINUSE' && current < preferredPort + 20) {
          current += 1;
          server.close();
          server.listen(current, '127.0.0.1');
        } else {
          reject(err);
        }
      });
      server.once('listening', () => resolve(current));
      server.listen(current, '127.0.0.1');
    }
    tryListen();
  });

  return { server, port };
}

async function pathExists(p) {
  try { await fsp.stat(p); return true; } catch { return false; }
}

async function readThemesList(themesFilePath, siteRoot) {
  if (themesFilePath && await pathExists(themesFilePath)) {
    const raw = await fsp.readFile(themesFilePath, 'utf8');
    const list = raw.split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.startsWith('#'));
    if (list.length > 0) return list;
  }
  // Fallback: scan directories under siteRoot
  const entries = await fsp.readdir(siteRoot, { withFileTypes: true });
  const themes = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const name = entry.name;
    if (name.startsWith('_')) continue;
    const indexFile = path.join(siteRoot, name, 'index.html');
    if (await pathExists(indexFile)) {
      themes.push(name);
    }
  }
  return themes;
}

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    root: '_site',
    outDir: null, // default to <root>/_previews
    themesFile: '.themes.txt',
    viewportWidth: 1200,
    viewportHeight: 800,
    jpegQuality: 80,
    preferredPort: 5520,
    delayMs: 0,
  };
  for (let i = 0; i < args.length; i += 1) {
    const a = args[i];
    const next = args[i + 1];
    switch (a) {
      case '--root': opts.root = next; i += 1; break;
      case '--out': opts.outDir = next; i += 1; break;
      case '--themes': opts.themesFile = next; i += 1; break;
      case '--width': opts.viewportWidth = Number(next); i += 1; break;
      case '--height': opts.viewportHeight = Number(next); i += 1; break;
      case '--quality': opts.jpegQuality = Number(next); i += 1; break;
      case '--port': opts.preferredPort = Number(next); i += 1; break;
      case '--delay': opts.delayMs = Number(next); i += 1; break;
      default:
        // support positional: [root]
        if (!a.startsWith('--') && !opts._posConsumed) {
          opts.root = a; opts._posConsumed = true;
        }
        break;
    }
  }
  if (!opts.outDir) {
    opts.outDir = path.join(opts.root, '_previews');
  }
  return opts;
}

async function ensureDir(p) {
  await fsp.mkdir(p, { recursive: true });
}

async function main() {
  const opts = parseArgs();
  await ensureDir(opts.root);
  await ensureDir(opts.outDir);

  const themes = await readThemesList(opts.themesFile, opts.root);
  if (!themes || themes.length === 0) {
    console.error('No themes found. Ensure .themes.txt exists or _site contains theme directories.');
    process.exit(1);
  }

  const { server, port } = await startStaticServer(opts.root, opts.preferredPort);
  const baseUrl = `http://127.0.0.1:${port}`;

  const isCi = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
  const launchArgs = [];
  if (isCi) {
    launchArgs.push('--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage');
  }
  const browser = await puppeteer.launch({
    headless: true,
    args: launchArgs,
    defaultViewport: { width: opts.viewportWidth, height: opts.viewportHeight },
  });

  try {
    for (const theme of themes) {
      const page = await browser.newPage();
      const url = `${baseUrl}/${encodeURIComponent(theme)}/`;
      try {
        await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
        if (opts.delayMs > 0) {
          await page.waitForTimeout(opts.delayMs);
        }
        const outputPath = path.join(opts.outDir, `${theme}.jpg`);
        await page.screenshot({ path: outputPath, type: 'jpeg', quality: opts.jpegQuality, fullPage: false });
        // eslint-disable-next-line no-console
        console.log(`Captured preview for ${theme}: ${path.relative(process.cwd(), outputPath)}`);
      } catch (err) {
        console.warn(`Failed to capture preview for ${theme}: ${err.message}`);
      } finally {
        await page.close().catch(() => {});
      }
    }
  } finally {
    await browser.close().catch(() => {});
    await new Promise((resolve) => server.close(resolve));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
