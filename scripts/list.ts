#!/usr/bin/env bun

/**
 * List all sandboxes with a short description pulled from their README, if any.
 */

import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "..");
const SANDBOXES_DIR = join(ROOT, "sandboxes");

async function firstLine(path: string): Promise<string | undefined> {
  if (!existsSync(path)) return undefined;
  const content = await readFile(path, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) return trimmed;
  }
  return undefined;
}

async function main() {
  if (!existsSync(SANDBOXES_DIR)) {
    console.log("No sandboxes yet. Create one with: bun run new <slug>");
    return;
  }

  const entries = (await readdir(SANDBOXES_DIR, { withFileTypes: true }))
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();

  if (entries.length === 0) {
    console.log("No sandboxes yet. Create one with: bun run new <slug>");
    return;
  }

  const width = Math.max(...entries.map((s) => s.length));
  for (const slug of entries) {
    const desc = (await firstLine(join(SANDBOXES_DIR, slug, "README.md"))) ?? "";
    console.log(`  ${slug.padEnd(width)}  ${desc}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
