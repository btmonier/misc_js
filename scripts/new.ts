#!/usr/bin/env bun

/**
 * Scaffold a new sandbox from a template.
 *
 *   bun run new <slug> [--template vanilla]
 *
 * Copies `templates/<template>/` → `sandboxes/<slug>/`,
 * substitutes the `__NAME__` placeholder, then runs `bun install`
 * at the root so Bun registers the new workspace.
 */

import { existsSync } from "node:fs";
import { cp, readdir, readFile, writeFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { $ } from "bun";

const ROOT = resolve(import.meta.dir, "..");
const TEMPLATES_DIR = join(ROOT, "templates");
const SANDBOXES_DIR = join(ROOT, "sandboxes");

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

function usage(msg?: string): never {
  if (msg) console.error(`Error: ${msg}\n`);
  console.error("Usage: bun run new <slug> [--template <name>]");
  console.error("");
  console.error("  <slug>       lowercase name, kebab-case, e.g. fetch-streaming");
  console.error("  --template   template to copy (default: vanilla)");
  process.exit(msg ? 1 : 0);
}

function parseArgs(argv: string[]): { slug: string; template: string } {
  let slug: string | undefined;
  let template = "vanilla";

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === "--help" || a === "-h") usage();
    if (a === "--template" || a === "-t") {
      template = argv[++i] ?? usage("missing value for --template");
      continue;
    }
    if (a.startsWith("--template=")) {
      template = a.slice("--template=".length);
      continue;
    }
    if (a.startsWith("-")) usage(`unknown flag: ${a}`);
    if (slug) usage("only one slug allowed");
    slug = a;
  }

  if (!slug) usage("slug is required");
  if (!SLUG_RE.test(slug)) usage(`invalid slug "${slug}" — use lowercase kebab-case`);

  return { slug, template };
}

async function substitutePlaceholders(dir: string, name: string): Promise<void> {
  const entries = await readdir(dir, { withFileTypes: true, recursive: true });
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const path = join(entry.parentPath, entry.name);
    const before = await readFile(path, "utf8");
    if (!before.includes("__NAME__")) continue;
    const after = before.replaceAll("__NAME__", name);
    await writeFile(path, after);
  }
}

async function main() {
  const { slug, template } = parseArgs(process.argv.slice(2));

  const templateDir = join(TEMPLATES_DIR, template);
  const targetDir = join(SANDBOXES_DIR, slug);

  if (!existsSync(templateDir)) {
    const available = existsSync(TEMPLATES_DIR)
      ? (await readdir(TEMPLATES_DIR, { withFileTypes: true }))
          .filter((d) => d.isDirectory())
          .map((d) => d.name)
      : [];
    console.error(`Template "${template}" not found in ${relative(ROOT, TEMPLATES_DIR)}/`);
    if (available.length) console.error(`Available: ${available.join(", ")}`);
    process.exit(1);
  }

  if (existsSync(targetDir)) {
    console.error(`Sandbox already exists: ${relative(ROOT, targetDir)}`);
    process.exit(1);
  }

  console.log(`→ Creating sandbox "${slug}" from template "${template}"`);
  await cp(templateDir, targetDir, { recursive: true });
  await substitutePlaceholders(targetDir, slug);

  console.log("→ Linking workspace (bun install)");
  await $`bun install`.cwd(ROOT).quiet();

  console.log("");
  console.log(`  Created ${relative(ROOT, targetDir)}`);
  console.log("");
  console.log("  Start the dev server:");
  console.log(`    bun dev ${slug}`);
  console.log("");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
