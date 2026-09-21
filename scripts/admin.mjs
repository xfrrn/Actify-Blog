import { backup, DatabaseSync } from "node:sqlite";
import { mkdir, copyFile, readFile, writeFile, readdir, rename, stat, unlink, rmdir } from "node:fs/promises";
import { resolve, join } from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { emitKeypressEvents } from "node:readline";
import { pathToFileURL } from "node:url";
import { database, dataDirectory, closeDatabase } from "../src/lib/cms-db.ts";
import { importRepository, importFeedback } from "../src/lib/cms-import.ts";
import { setPassword } from "../src/lib/admin-auth.ts";
import { readR2Image, writeR2Image } from "../src/lib/r2.ts";

const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
export async function createBackup(destination) {
  const output = resolve(destination);
  if (output === dataDirectory() || output.startsWith(dataDirectory() + "/") || output.startsWith(dataDirectory() + "\\")) throw new Error("Choose a backup directory outside DATA_DIR.");
  await mkdir(output, { recursive: false, mode: 0o700 });
  await mkdir(join(output, "uploads"), { mode: 0o700 });
  await backup(database(), join(output, "actify.sqlite"));
  const snapshot = new DatabaseSync(join(output, "actify.sqlite"), { readOnly: true });
  const rows = snapshot.prepare("SELECT filename,storage,url FROM media").all(); snapshot.close();
  const files = {};
  for (const { filename, storage, url } of rows) {
    const relative = `uploads/${filename}`;
    if (storage === "r2") await writeFile(join(output, relative), await readR2Image(filename, url), { mode: 0o600 });
    else await copyFile(join(dataDirectory(), relative), join(output, relative));
    files[relative] = hash(await readFile(join(output, relative)));
  }
  files["actify.sqlite"] = hash(await readFile(join(output, "actify.sqlite")));
  await writeFile(join(output, "manifest.json"), JSON.stringify({ version: 1, createdAt: new Date().toISOString(), files }, null, 2), { mode: 0o600 });
  return output;
}
export async function restoreBackup(source, destination) {
  const input = resolve(source), target = resolve(destination);
  const manifest = JSON.parse(await readFile(join(input, "manifest.json"), "utf8"));
  if (manifest.version !== 1 || !manifest.files?.["actify.sqlite"]) throw new Error("Invalid backup manifest.");
  for (const [name, checksum] of Object.entries(manifest.files)) {
    if (name !== "actify.sqlite" && !/^uploads\/[a-f0-9-]{36}\.(jpg|png|webp|gif)$/.test(name)) throw new Error("Invalid backup path.");
    if (hash(await readFile(join(input, name))) !== checksum) throw new Error(`Backup is incomplete or corrupted: ${name}`);
  }
  try { if ((await readdir(target)).length) throw new Error("Restore requires an empty DATA_DIR. Stop the app and use a new directory; the old data is never overwritten."); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
  const staging = `${target}.restore-${randomUUID()}`;
  await mkdir(join(staging, "uploads"), { recursive: true, mode: 0o700 });
  for (const name of Object.keys(manifest.files)) await copyFile(join(input, name), join(staging, name));
  const db = new DatabaseSync(join(staging, "actify.sqlite"));
  try {
    if (Object.values(db.prepare("PRAGMA integrity_check").get())[0] !== "ok") throw new Error("Database integrity check failed.");
    for (const { filename } of db.prepare("SELECT * FROM media").all()) {
      if (!manifest.files[`uploads/${filename}`]) throw new Error("Backup is missing a referenced upload.");
    }
    for (const media of db.prepare("SELECT * FROM media").all()) {
      if (media.storage !== "r2") continue;
      const path = join(staging, "uploads", media.filename);
      await writeR2Image(media.filename, media.mime, await readFile(path), media.url);
      await unlink(path);
    }
    db.exec("DELETE FROM sessions; DELETE FROM rate_limits; PRAGMA wal_checkpoint(TRUNCATE);");
  } finally { db.close(); }
  const targetExists = await stat(target).then(() => true).catch(() => false);
  if (targetExists) {
    // Move only into the verified empty directory; never overwrite a live database.
    for (const name of await readdir(staging)) await rename(join(staging, name), join(target, name));
    await rmdir(staging);
  } else await rename(staging, target);
  return target;
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
  if (command === "import") console.log(`Imported ${importRepository(process.cwd())} content files. Existing edits were preserved.`);
  else if (command === "import-feedback" && argument) console.log(`Imported ${importFeedback(JSON.parse(await readFile(argument, "utf8")))} feedback rows.`);
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
  else if (command === "restore" && argument) { closeDatabase(); console.log(`Restored: ${await restoreBackup(argument, dataDirectory())}`); }
  else throw new Error("Usage: node scripts/admin.mjs import | import-feedback <json> | password | backup <new-directory> | restore <backup-directory>");
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  for (const file of [".env.local", ".env"]) {
    try { process.loadEnvFile(file); } catch (error) { if (error.code !== "ENOENT") throw error; }
  }
  try { await main(); } catch (error) { console.error(error.message); process.exitCode = 1; } finally { closeDatabase(); }
}
