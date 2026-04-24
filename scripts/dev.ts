#!/usr/bin/env bun

/**
 * Start a sandbox's Vite dev server.
 *
 *   bun dev <slug> [-- <extra vite args>]
 *
 * Accepts either the short slug ("fetch-streaming") or the full package name
 * ("@sandbox/fetch-streaming"). Forwards any extra args to `vite`.
 */

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "..");
const SANDBOXES_DIR = join(ROOT, "sandboxes");

async function listSandboxes(): Promise<string[]> {
  if (!existsSync(SANDBOXES_DIR)) return [];
  const entries = await readdir(SANDBOXES_DIR, { withFileTypes: true });
  return entries.filter((d) => d.isDirectory()).map((d) => d.name);
}

function usage(msg?: string): never {
  if (msg) console.error(`Error: ${msg}\n`);
  console.error("Usage: bun dev <slug> [-- <vite args>]");
  process.exit(msg ? 1 : 0);
}

async function main() {
  const args = process.argv.slice(2);
  const [raw, ...rest] = args;
  if (!raw || raw === "--help" || raw === "-h") {
    const available = await listSandboxes();
    if (available.length) console.error(`Available sandboxes: ${available.join(", ")}`);
    usage(raw ? undefined : "slug is required");
  }

  const slug = raw.replace(/^@sandbox\//, "");
  const dir = join(SANDBOXES_DIR, slug);

  if (!existsSync(dir)) {
    const available = await listSandboxes();
    console.error(`Sandbox not found: ${slug}`);
    if (available.length) console.error(`Available: ${available.join(", ")}`);
    process.exit(1);
  }

  const forwarded = rest[0] === "--" ? rest.slice(1) : rest;
  const child = spawn("bun", ["run", "dev", ...forwarded], {
    cwd: dir,
    stdio: "inherit",
  });
  child.on("exit", (code) => process.exit(code ?? 0));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
