#!/usr/bin/env bun

/**
 * Build every sandbox and assemble a single static site under `dist/`.
 *
 *   dist/
 *     index.html        ← landing page (cards linking to each sandbox)
 *     styles.css
 *     <slug>/           ← each sandbox's production build
 *
 * Sandboxes are built with a relative base (`--base=./`) so their assets
 * resolve correctly when served from a `/<slug>/` subpath. Browse the result
 * with `bun run serve`.
 */

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { cp, mkdir, readdir, rm } from "node:fs/promises";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "..");
const SANDBOXES_DIR = join(ROOT, "sandboxes");
const LANDING_DIR = join(ROOT, "landing");
const DIST_DIR = join(ROOT, "dist");

async function main() {
  if (!existsSync(SANDBOXES_DIR)) {
    console.log("No sandboxes to build.");
    return;
  }

  const slugs = (await readdir(SANDBOXES_DIR, { withFileTypes: true }))
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();

  const failed: string[] = [];
  for (const slug of slugs) {
    console.log(`\n━━━ building ${slug} ━━━`);
    const result = spawnSync("bun", ["run", "build", "--", "--base=./"], {
      cwd: join(SANDBOXES_DIR, slug),
      stdio: "inherit",
    });
    if (result.status !== 0) failed.push(slug);
  }

  if (failed.length) {
    console.error(`\nFailed: ${failed.join(", ")}`);
    process.exit(1);
  }

  console.log("\n━━━ assembling dist/ ━━━");
  await rm(DIST_DIR, { recursive: true, force: true });
  await mkdir(DIST_DIR, { recursive: true });

  for (const slug of slugs) {
    const src = join(SANDBOXES_DIR, slug, "dist");
    if (!existsSync(src)) {
      console.error(`Missing build output for ${slug} (expected ${src})`);
      process.exit(1);
    }
    await cp(src, join(DIST_DIR, slug), { recursive: true });
  }

  await cp(LANDING_DIR, DIST_DIR, { recursive: true });

  console.log(`\nAssembled ${slugs.length} sandbox(es) + landing page into dist/.`);
  console.log("Browse it with: bun run serve");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
