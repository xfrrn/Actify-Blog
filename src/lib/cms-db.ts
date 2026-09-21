import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { resolve, join } from "node:path";

export function dataDirectory() {
  if (!process.env.DATA_DIR && process.env.NODE_ENV === "production") throw new Error("Set DATA_DIR to a persistent directory outside the deployment.");
  return resolve(/* turbopackIgnore: true */ process.env.DATA_DIR || ".data");
}

const state = globalThis as typeof globalThis & { actifyDb?: DatabaseSync; actifyDbPath?: string };
export function database() {
  const directory = dataDirectory();
  const path = join(directory, "actify.sqlite");
  if (state.actifyDb && state.actifyDbPath === path) return state.actifyDb;
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  mkdirSync(join(directory, "uploads"), { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(path, { timeout: 5000 });
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS content (
      id TEXT PRIMARY KEY, kind TEXT NOT NULL CHECK(kind IN ('posts','projects')),
      slug TEXT NOT NULL, locked INTEGER NOT NULL DEFAULT 0, version INTEGER NOT NULL DEFAULT 1,
      data TEXT NOT NULL, published TEXT, deleted_at TEXT, updated_at TEXT NOT NULL,
      UNIQUE(kind, slug)
    );
    CREATE TABLE IF NOT EXISTS feedback (
      id INTEGER PRIMARY KEY, pain_point TEXT NOT NULL, search_query TEXT NOT NULL DEFAULT '',
      locale TEXT NOT NULL CHECK(locale IN ('en','zh')),
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','published','hidden')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS feedback_status_id ON feedback(status, id DESC);
    CREATE TABLE IF NOT EXISTS media (
      id TEXT PRIMARY KEY, filename TEXT NOT NULL UNIQUE, name TEXT NOT NULL, mime TEXT NOT NULL,
      size INTEGER NOT NULL, width INTEGER NOT NULL, height INTEGER NOT NULL, created_at TEXT NOT NULL,
      storage TEXT NOT NULL DEFAULT 'local', url TEXT NOT NULL DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS sessions (hash TEXT PRIMARY KEY, expires INTEGER NOT NULL, credential TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS rate_limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS imports (source TEXT PRIMARY KEY, imported_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
  `);
  db.exec("BEGIN IMMEDIATE");
  try {
    const columns = db.prepare("PRAGMA table_info(media)").all() as { name: string }[];
    if (!columns.some((column) => column.name === "storage")) db.exec("ALTER TABLE media ADD COLUMN storage TEXT NOT NULL DEFAULT 'local'");
    if (!columns.some((column) => column.name === "url")) db.exec("ALTER TABLE media ADD COLUMN url TEXT NOT NULL DEFAULT ''");
    db.exec("COMMIT");
  } catch (error) { db.exec("ROLLBACK"); db.close(); throw error; }
  state.actifyDb = db;
  state.actifyDbPath = path;
  return db;
}

export function transaction<T>(run: () => T): T {
  const db = database();
  db.exec("BEGIN IMMEDIATE");
  try { const value = run(); db.exec("COMMIT"); return value; }
  catch (error) { db.exec("ROLLBACK"); throw error; }
}

export function closeDatabase() {
  state.actifyDb?.close();
  delete state.actifyDb;
  delete state.actifyDbPath;
}
