#!/usr/bin/env bun

/**
 * Serve the assembled static site in `dist/` (built by `bun run site`).
 *
 *   bun run serve [-- --port 5050]
 *
 * Directory paths (e.g. `/05-random-color-palette/`) resolve to their
 * `index.html`. Dependency-free; uses Bun's built-in HTTP server.
 */

import { existsSync } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "..");
const DIST_DIR = join(ROOT, "dist");

const PORT = Number(process.env.PORT) || 5050;

const CONTENT_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
};

if (!existsSync(DIST_DIR)) {
  console.error("dist/ not found. Build it first with: bun run site");
  process.exit(1);
}

function resolvePath(pathname: string): string | null {
  // Decode and strip query, then prevent path traversal outside dist/.
  const decoded = decodeURIComponent(pathname.split("?")[0]!);
  const rel = normalize(decoded).replace(/^(\.\.[/\\])+/, "");
  let target = join(DIST_DIR, rel);
  if (!target.startsWith(DIST_DIR)) return null;

  if (decoded.endsWith("/") || !extname(target)) {
    target = join(target, "index.html");
  }
  return existsSync(target) ? target : null;
}

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    const target = resolvePath(url.pathname);

    if (!target) {
      return new Response("Not found", { status: 404 });
    }

    const file = Bun.file(target);
    const type = CONTENT_TYPES[extname(target)] ?? "application/octet-stream";
    return new Response(file, { headers: { "Content-Type": type } });
  },
});

console.log(`Serving dist/ at http://localhost:${server.port}/`);
