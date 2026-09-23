import { mkdir, copyFile, readFile, writeFile, readdir, rename, stat, rmdir } from "node:fs/promises";
import { resolve, join } from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { Client } from "pg";
import { database, dataDirectory, closeDatabase } from "../src/lib/cms-db.ts";
import { readR2Image, writeR2Image } from "../src/lib/r2.ts";

const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const mediaFilename = /^[a-f0-9-]{36}\.(jpg|png|webp|gif)$/;
async function pgTool(tool, args) {
  const url = new URL(process.env.DATABASE_URL);
  const password = url.searchParams.get("password") ?? decodeURIComponent(url.password);
  url.password = ""; url.searchParams.delete("password");
  const binary = process.env.PG_BIN_DIR ? join(process.env.PG_BIN_DIR, `${tool}${process.platform === "win32" ? ".exe" : ""}`) : tool;
  // Keep credentials out of process arguments and command error messages.
  await promisify(execFile)(binary, ["--dbname", url.href, "--no-password", ...args], {
    windowsHide: true, maxBuffer: 8 * 1024 * 1024,
    env: { ...process.env, PGPASSWORD: password, PGCONNECT_TIMEOUT: "5" },
  });
}
export async function createBackup(destination) {
  const output = resolve(destination);
  if (output === dataDirectory() || output.startsWith(dataDirectory() + "/") || output.startsWith(dataDirectory() + "\\")) throw new Error("Choose a backup directory outside DATA_DIR.");
  await mkdir(output, { recursive: false, mode: 0o700 });
  await mkdir(join(output, "uploads"), { mode: 0o700 });
  const client = await (await database()).connect();
  let rows;
  try {
    await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    const { rows: [snapshot] } = await client.query("SELECT pg_export_snapshot() AS id");
    rows = (await client.query("SELECT * FROM media ORDER BY id")).rows;
    await pgTool("pg_dump", ["--format=custom", "--no-owner", "--no-acl", `--snapshot=${snapshot.id}`,
      "--exclude-table-data=public.sessions", "--exclude-table-data=public.rate_limits", "--file", join(output, "actify.dump")]);
    await client.query("COMMIT");
  } catch (error) { await client.query("ROLLBACK"); throw error; }
  finally { client.release(); }
  const files = {};
  for (const { filename, storage, url } of rows) {
    if (!mediaFilename.test(filename)) throw new Error("Invalid media filename.");
    const relative = `uploads/${filename}`;
    if (storage === "r2") await writeFile(join(output, relative), await readR2Image(filename, url), { mode: 0o600 });
    else await copyFile(join(dataDirectory(), relative), join(output, relative));
    files[relative] = hash(await readFile(join(output, relative)));
  }
  await writeFile(join(output, "media.json"), JSON.stringify(rows), { mode: 0o600 });
  for (const name of ["actify.dump", "media.json"]) files[name] = hash(await readFile(join(output, name)));
  await writeFile(join(output, "manifest.json"), JSON.stringify({ version: 2, engine: "postgresql", createdAt: new Date().toISOString(), files }, null, 2), { mode: 0o600 });
  return output;
}
export async function restoreBackup(source, destination) {
  const input = resolve(source), target = resolve(destination);
  const manifest = JSON.parse(await readFile(join(input, "manifest.json"), "utf8"));
  if (manifest.version !== 2 || manifest.engine !== "postgresql" || !manifest.files?.["actify.dump"] || !manifest.files["media.json"]) throw new Error("Invalid PostgreSQL backup manifest.");
  for (const [name, checksum] of Object.entries(manifest.files)) {
    if (!["actify.dump", "media.json"].includes(name) && !/^uploads\/[a-f0-9-]{36}\.(jpg|png|webp|gif)$/.test(name)) throw new Error("Invalid backup path.");
    if (hash(await readFile(join(input, name))) !== checksum) throw new Error(`Backup is incomplete or corrupted: ${name}`);
  }
  try { if ((await readdir(target)).length) throw new Error("Restore requires an empty DATA_DIR. Stop the app and use a new directory; the old data is never overwritten."); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
  const media = JSON.parse(await readFile(join(input, "media.json"), "utf8"));
  if (!Array.isArray(media) || media.some((row) => !mediaFilename.test(row.filename) || !["local", "r2"].includes(row.storage) || !manifest.files[`uploads/${row.filename}`])) throw new Error("Backup is missing a referenced upload.");
  await closeDatabase();
  const db = new Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000 });
  await db.connect();
  try {
    const existing = await db.query("SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname NOT IN ('pg_catalog','information_schema') AND n.nspname NOT LIKE 'pg_toast%' AND c.relkind IN ('r','p','v','m','S','f') LIMIT 1");
    if (existing.rowCount) throw new Error("Restore requires an empty PostgreSQL database; existing data is never overwritten.");
    const staging = `${target}.restore-${randomUUID()}`;
    await mkdir(join(staging, "uploads"), { recursive: true, mode: 0o700 });
    for (const row of media) {
      const path = join(input, "uploads", row.filename);
      if (row.storage === "r2") await writeR2Image(row.filename, row.mime, await readFile(path), row.url);
      else await copyFile(path, join(staging, "uploads", row.filename));
    }
    await pgTool("pg_restore", ["--single-transaction", "--no-owner", "--no-acl", "--exit-on-error", join(input, "actify.dump")]);
    await db.query("DELETE FROM sessions; DELETE FROM rate_limits");
    const targetExists = await stat(target).then(() => true).catch(() => false);
    if (targetExists) {
      if ((await readdir(target)).length) throw new Error("DATA_DIR changed during restore; staged images were preserved.");
      for (const name of await readdir(staging)) await rename(join(staging, name), join(target, name));
      await rmdir(staging);
    } else await rename(staging, target);
  } finally { await db.end(); }
  return target;
}

async function main() {
  const [command, argument] = process.argv.slice(2);
  if (command === "backup" && argument) console.log(`Backup completed: ${await createBackup(argument)}`);
  else if (command === "restore" && argument) console.log(`Restored: ${await restoreBackup(argument, dataDirectory())}`);
  else throw new Error("Usage: node scripts/admin.mjs backup <new-directory> | restore <backup-directory>");
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  for (const file of [".env.local", ".env"]) {
    try { process.loadEnvFile(file); } catch (error) { if (error.code !== "ENOENT") throw error; }
  }
  try { await main(); } catch (error) { console.error(error.message); process.exitCode = 1; } finally { await closeDatabase(); }
}
