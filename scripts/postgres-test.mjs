import { Client } from "pg";
import { randomUUID } from "node:crypto";
import { closeDatabase } from "../src/lib/cms-db.ts";

// Tests only touch databases created by this helper, never the configured blog.
export async function testDatabase() {
  for (const file of [".env.local", ".env"]) {
    try { process.loadEnvFile(file); } catch (error) { if (error.code !== "ENOENT") throw error; }
  }
  const base = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
  if (!base) throw new Error("Set TEST_DATABASE_URL or DATABASE_URL to a PostgreSQL role with CREATEDB for integration checks.");
  const admin = new Client({ connectionString: base, connectionTimeoutMillis: 5000 });
  await admin.connect();
  const created = new Set();
  async function next() {
    await closeDatabase();
    const name = `actify_test_${randomUUID().replaceAll("-", "")}`;
    await admin.query(`CREATE DATABASE "${name}" TEMPLATE template0`);
    created.add(name);
    const url = new URL(base); url.pathname = `/${name}`;
    process.env.DATABASE_URL = url.href;
    return url.href;
  }
  async function cleanup() {
    await closeDatabase();
    try {
      for (const name of created) await admin.query(`DROP DATABASE "${name}" WITH (FORCE)`);
    } finally { await admin.end(); }
  }
  try { await next(); } catch (error) { await cleanup(); throw error; }
  return { next, cleanup };
}
