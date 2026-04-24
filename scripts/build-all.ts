#!/usr/bin/env bun

/**
 * Build every sandbox (vite build). Useful as a sanity check.
 */

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "..");
const SANDBOXES_DIR = join(ROOT, "sandboxes");

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
    const result = spawnSync("bun", ["run", "build"], {
      cwd: join(SANDBOXES_DIR, slug),
      stdio: "inherit",
    });
    if (result.status !== 0) failed.push(slug);
  }

  console.log("");
  if (failed.length) {
    console.error(`Failed: ${failed.join(", ")}`);
    process.exit(1);
  }
  console.log(`Built ${slugs.length} sandbox(es).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
