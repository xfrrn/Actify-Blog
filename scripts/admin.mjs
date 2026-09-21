import { mkdir, copyFile, readFile, writeFile, readdir, rename, stat, rmdir } from "node:fs/promises";
import { resolve, join } from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { emitKeypressEvents } from "node:readline";
import { pathToFileURL } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { Client } from "pg";
import { database, dataDirectory, closeDatabase, transaction } from "../src/lib/cms-db.ts";
import { importRepository, importFeedback } from "../src/lib/cms-import.ts";
import { setPassword } from "../src/lib/admin-auth.ts";
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
  if (manifest.version !== 2 || manifest.engine !== "postgresql" || !manifest.files?.["actify.dump"] || !manifest.files["media.json"]) throw new Error("Invalid PostgreSQL backup manifest. Use migrate-sqlite for old SQLite data.");
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

export async function importSqlite(source) {
  const { DatabaseSync } = await import("node:sqlite");
  const legacy = new DatabaseSync(resolve(source), { readOnly: true });
  try {
    legacy.exec("BEGIN");
    if (Object.values(legacy.prepare("PRAGMA integrity_check").get())[0] !== "ok") throw new Error("SQLite integrity check failed.");
    return await transaction(async (db) => {
      await db.query("LOCK TABLE content, feedback, media, imports, settings IN SHARE ROW EXCLUSIVE MODE");
      if ((await db.query("SELECT 1 FROM imports WHERE source='sqlite-migration'")).rowCount) return 0;
      for (const table of ["content", "feedback", "media", "imports", "settings"]) {
        if ((await db.query(`SELECT 1 FROM ${table} LIMIT 1`)).rowCount) throw new Error("SQLite migration requires an empty PostgreSQL CMS; existing data is never overwritten.");
      }
      let count = 0;
      // Migration is one transaction; source SQLite and existing upload files stay untouched.
      for (const row of legacy.prepare("SELECT * FROM content").all()) {
        await db.query("INSERT INTO content(id,kind,slug,locked,version,data,published,deleted_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)",
          [row.id, row.kind, row.slug, !!row.locked, row.version, row.data, row.published, row.deleted_at, row.updated_at]); count++;
      }
      for (const row of legacy.prepare("SELECT * FROM feedback").all()) {
        await db.query("INSERT INTO feedback(id,pain_point,search_query,locale,status,created_at) VALUES ($1,$2,$3,$4,$5,$6)", [row.id, row.pain_point, row.search_query, row.locale, row.status, row.created_at]); count++;
      }
      for (const row of legacy.prepare("SELECT * FROM media").all()) {
        if (!mediaFilename.test(row.filename)) throw new Error("Invalid legacy media filename.");
        const storage = row.storage || "local";
        if (storage === "local") await stat(join(dataDirectory(), "uploads", row.filename));
        await db.query("INSERT INTO media(id,filename,name,mime,size,width,height,created_at,storage,url) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)",
          [row.id, row.filename, row.name, row.mime, row.size, row.width, row.height, row.created_at, storage, row.url || `/media/${row.filename}`]); count++;
      }
      for (const row of legacy.prepare("SELECT * FROM imports").all()) await db.query("INSERT INTO imports(source,imported_at) VALUES ($1,$2)", [row.source, row.imported_at]);
      for (const row of legacy.prepare("SELECT * FROM settings").all()) await db.query("INSERT INTO settings(key,value) VALUES ($1,$2)", [row.key, row.value]);
      await db.query("SELECT setval(pg_get_serial_sequence('feedback','id'), COALESCE(MAX(id),0)+1, false) FROM feedback");
      await db.query("INSERT INTO imports(source,imported_at) VALUES ('sqlite-migration',$1)", [new Date().toISOString()]);
      return count;
    });
  } finally { legacy.close(); }
}
async function passwordInput(prompt) {
  process.stderr.write(prompt);
  emitKeypressEvents(process.stdin); process.stdin.setRawMode(true); process.stdin.resume();
  return new Promise((resolve, reject) => {
    let value = "";
    const finish = () => { process.stdin.off("keypress", keypress); process.stdin.setRawMode(false); process.stdin.pause(); process.stderr.write("\n"); };
    function keypress(text, key) {
      if (key?.ctrl && key.name === "c") { finish(); reject(new Error("Cancelled.")); }
      else if (key?.name === "return") { finish(); resolve(value); }
      else if (key?.name === "backspace") value = value.slice(0, -1);
      else if (!key?.ctrl && !key?.meta && text && !text.includes("\u001b")) value += text;
    }
    process.stdin.on("keypress", keypress);
  });
}
async function main() {
  const [command, argument] = process.argv.slice(2);
  if (command === "import") console.log(`Imported ${await importRepository(process.cwd())} content files. Existing edits were preserved.`);
  else if (command === "import-feedback" && argument) console.log(`Imported ${await importFeedback(JSON.parse(await readFile(argument, "utf8")))} feedback rows.`);
  else if (command === "migrate-sqlite" && argument) console.log(`Migrated ${await importSqlite(argument)} rows from SQLite. Source files were preserved.`);
  else if (command === "password") {
    let password = process.env.ADMIN_SETUP_PASSWORD;
    if (!password) {
      if (!process.stdin.isTTY) throw new Error("Use an interactive terminal, or supply ADMIN_SETUP_PASSWORD for setup only.");
      password = await passwordInput("New administrator password (12–256 characters; hidden): ");
      if (password !== await passwordInput("Confirm password: ")) throw new Error("Passwords do not match.");
    }
    await setPassword(password); delete process.env.ADMIN_SETUP_PASSWORD;
    console.log("Administrator password saved as a hash. All previous sessions revoked.");
  } else if (command === "backup" && argument) console.log(`Backup completed: ${await createBackup(argument)}`);
  else if (command === "restore" && argument) console.log(`Restored: ${await restoreBackup(argument, dataDirectory())}`);
  else throw new Error("Usage: node scripts/admin.mjs import | import-feedback <json> | migrate-sqlite <database-file> | password | backup <new-directory> | restore <backup-directory>");
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  for (const file of [".env.local", ".env"]) {
    try { process.loadEnvFile(file); } catch (error) { if (error.code !== "ENOENT") throw error; }
  }
  try { await main(); } catch (error) { console.error(error.message); process.exitCode = 1; } finally { await closeDatabase(); }
}
