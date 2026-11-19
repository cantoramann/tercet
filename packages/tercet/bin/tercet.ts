#!/usr/bin/env node
/**
 * Move poems between storage locations.
 *
 *   tercet list [location]
 *   tercet copy <from> <to> [--overwrite] [--dry-run]
 *
 * Locations:
 *   ./poems, /srv/poems, fs:poems    a folder on disk
 *   s3://bucket/prefix               an S3 bucket (region and endpoint from env)
 *   fs, s3                           a driver configured by env (TERCET_*)
 *
 * Run it from a site folder: it reads .env.local and .env, and the content
 * folder set in next.config (withTercet({ contentDir })) becomes the default `fs`.
 */
import { existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { defaultCodec } from "../src/poems/codec/index.js";
import { slugOf } from "../src/poems/keys.js";
import { BlobExistsError, drivers, isValidKey, resolveDriverName, storeFromLocation } from "../src/storage/index.js";

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    all: { type: "boolean", default: false },
    overwrite: { type: "boolean", default: false },
    "dry-run": { type: "boolean", default: false },
    help: { type: "boolean", short: "h", default: false },
  },
});

const usage = `Usage:
  tercet list [location] [--all]
  tercet copy <from> <to> [--overwrite] [--dry-run] [--all]

--all copies every file as-is instead of only parsed .md/.mdx poems
(for sites with a custom file format).

Locations: a folder (./poems), s3://bucket/prefix, or a driver (${Object.keys(drivers).join(", ")}).
Examples:
  tercet list
  tercet copy s3://my-bucket/poems ./backup
  tercet copy ./content/poems s3 --dry-run`;

function fail(message: string): never {
  console.error(`${message}\n\n${usage}`);
  process.exit(1);
}

/** .env.local, then .env, like Next.js. Existing variables are never overwritten. */
function loadEnvFiles() {
  for (const name of [".env.local", ".env"]) {
    if (existsSync(name)) process.loadEnvFile(name);
  }
}

/** Pick up `contentDir` from the site's next.config, so the folder is defined once. */
async function loadSiteContentDir() {
  if (process.env.TERCET_FS_DIR) return;
  for (const name of ["next.config.ts", "next.config.mjs", "next.config.js"]) {
    const file = path.resolve(name);
    if (!existsSync(file)) continue;
    try {
      const mod = await import(pathToFileURL(file).href);
      const exported = mod.default ?? mod;
      const config = typeof exported === "function" ? await exported("phase-production-server", { defaultConfig: {} }) : exported;
      const dir = config?.env?.TERCET_FS_DIR;
      if (typeof dir === "string" && dir) process.env.TERCET_FS_DIR = dir;
    } catch (error) {
      console.error(
        `warning: could not read contentDir from ${name} (${error instanceof Error ? error.message : error}).\n` +
          "         Using content/poems. Pass a folder path or set TERCET_FS_DIR. Loading next.config.ts needs Node 22.18+ or Bun.",
      );
    }
    return;
  }
}

const selected = (key: string) => (values.all ? isValidKey(key) : slugOf(defaultCodec, key) !== null);
const open = (location: string) => storeFromLocation(location, process.env);

async function list(location: string) {
  const store = open(location);
  const keys = (await store.list()).filter(selected).sort();
  for (const key of keys) console.log(key);
  console.error(`${keys.length} poems in ${location} (${store.driver})`);
}

async function copy(fromLocation: string, toLocation: string) {
  const from = open(fromLocation);
  const to = open(toLocation);
  const keys = (await from.list()).filter(selected).sort();
  const counts = { copied: 0, skipped: 0, failed: 0 };

  for (const key of keys) {
    try {
      const body = await from.read(key);
      if (body === null) continue;
      if (!values.all) defaultCodec.decode(key, body); // refuse to export something we could not read back
      if (!values["dry-run"]) await to.write(key, body, { overwrite: values.overwrite });
      counts.copied++;
      console.log(`${values["dry-run"] ? "would copy" : "copied"}  ${key}`);
    } catch (error) {
      if (error instanceof BlobExistsError) {
        counts.skipped++;
        console.log(`exists    ${key}`);
      } else {
        counts.failed++;
        console.error(`failed    ${key}:`, error instanceof Error ? error.message : error);
      }
    }
  }

  console.error(
    `${fromLocation} → ${toLocation}: ${counts.copied} copied, ${counts.skipped} already there` +
      `${counts.skipped && !values.overwrite ? " (use --overwrite to replace)" : ""}, ${counts.failed} failed`,
  );
  if (counts.failed) process.exit(1);
}

try {
  loadEnvFiles();
  await loadSiteContentDir();
  const [command, ...rest] = positionals;
  if (values.help) console.log(usage);
  else if (command === "list") await list(rest[0] ?? resolveDriverName(process.env));
  else if (command === "copy") {
    const [from, to] = rest;
    if (!from || !to) fail("copy needs a source and a destination.");
    await copy(from, to);
  } else fail(`Unknown command "${command ?? ""}".`);
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}
