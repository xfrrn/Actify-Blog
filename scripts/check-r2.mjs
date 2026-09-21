import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import sharp from "sharp";
import { database, closeDatabase } from "../src/lib/cms-db.ts";
import { uploadImage, listMedia } from "../src/lib/media.ts";
import { mediaStorage } from "../src/lib/r2.ts";
import { createBackup, restoreBackup } from "./admin.mjs";

const root = await mkdtemp(join(tmpdir(), "actify-r2-test-"));
process.env.DATA_DIR = join(root, "data");
process.env.MEDIA_STORAGE = "r2";
process.env.R2_ENDPOINT = "https://0123456789abcdef0123456789abcdef.r2.cloudflarestorage.com";
process.env.R2_BUCKET = "test-media";
process.env.R2_PUBLIC_URL = "https://images.example.com";
process.env.R2_ACCESS_KEY_ID = "test-access-key";
process.env.R2_SECRET_ACCESS_KEY = "test-secret-key";
const originalFetch = globalThis.fetch;
const objects = new Map();
let failure = 0, calls = 0;
globalThis.fetch = async (request, init) => {
  calls++;
  assert.equal(init.redirect, "error");
  const url = new URL(request.url);
  assert.equal(url.origin, process.env.R2_ENDPOINT);
  assert.match(url.pathname, /^\/test-media\/media\/[a-f0-9-]{36}\.png$/);
  assert.match(request.headers.get("authorization"), /^AWS4-HMAC-SHA256 Credential=test-access-key\/\d{8}\/auto\/s3\/aws4_request, SignedHeaders=.+, Signature=[a-f0-9]{64}$/);
  assert.ok(request.headers.has("x-amz-date"));
  if (failure) return new Response("upstream failure", { status: failure });
  if (request.method === "PUT") {
    assert.equal(request.headers.get("content-type"), "image/png");
    assert.match(request.headers.get("cache-control"), /immutable/);
    assert.equal(request.headers.get("if-none-match"), "*");
    if (objects.has(url.pathname)) return new Response(null, { status: 412 });
    objects.set(url.pathname, Buffer.from(await request.arrayBuffer()));
    return new Response(null, { status: 200 });
  }
  assert.equal(request.method, "GET");
  return objects.has(url.pathname) ? new Response(objects.get(url.pathname)) : new Response(null, { status: 404 });
};

try {
  // Open an actual pre-R2 schema to verify existing assets remain local and usable.
  await mkdir(join(process.env.DATA_DIR, "uploads"), { recursive: true });
  const legacy = new DatabaseSync(join(process.env.DATA_DIR, "actify.sqlite"));
  legacy.exec("CREATE TABLE media(id TEXT PRIMARY KEY, filename TEXT UNIQUE NOT NULL, name TEXT, mime TEXT, size INTEGER, width INTEGER, height INTEGER, created_at TEXT)");
  const png = await sharp({ create: { width: 8, height: 6, channels: 3, background: "white" } }).png().toBuffer();
  const oldFilename = "11111111-1111-4111-8111-111111111111.png";
  await writeFile(join(process.env.DATA_DIR, "uploads", oldFilename), png);
  legacy.prepare("INSERT INTO media VALUES ('legacy',?,'legacy.png','image/png',?,8,6,?)").run(oldFilename, png.length, new Date().toISOString());
  legacy.close();
  assert.equal(listMedia().items[0].storage, "local");
  assert.equal(listMedia().items[0].url, `/media/${oldFilename}`);

  const media = await uploadImage(png, "new.png", "image/png");
  assert.equal(media.storage, "r2");
  assert.equal(media.url, `https://images.example.com/media/${media.filename}`);
  assert.equal(listMedia().items.find((item) => item.id === media.id).url, media.url);
  assert.ok(objects.has(`/test-media/media/${media.filename}`));
  await assert.rejects(readFile(join(process.env.DATA_DIR, "uploads", media.filename)), { code: "ENOENT" });
  const beforeInvalid = calls;
  await assert.rejects(uploadImage(Buffer.from("<svg/>"), "fake.png", "image/png"));
  assert.equal(calls, beforeInvalid, "Invalid images never reach R2");

  failure = 403;
  await assert.rejects(uploadImage(png, "denied.png", "image/png"), /403/);
  assert.equal(listMedia().total, 2, "Failed R2 uploads do not create phantom media records");
  failure = 0;
  const secret = process.env.R2_SECRET_ACCESS_KEY;
  delete process.env.R2_SECRET_ACCESS_KEY;
  await assert.rejects(uploadImage(png, "missing-config.png", "image/png"), /配置/);
  process.env.R2_SECRET_ACCESS_KEY = secret;
  delete process.env.MEDIA_STORAGE;
  assert.equal(mediaStorage(), "r2", "Partial R2 setup never silently falls back to disk");

  const backup = await createBackup(join(root, "backup"));
  assert.equal((await readdir(join(backup, "uploads"))).length, 2);
  assert.deepEqual(await readFile(join(backup, "uploads", media.filename)), objects.get(`/test-media/media/${media.filename}`));
  assert.ok(!JSON.stringify(listMedia()).includes(secret), "Credentials never appear in media responses");
  await restoreBackup(backup, join(root, "restored-existing"));
  objects.clear();
  await restoreBackup(backup, join(root, "restored-missing"));
  assert.deepEqual(objects.get(`/test-media/media/${media.filename}`), await readFile(join(backup, "uploads", media.filename)));
  closeDatabase(); process.env.DATA_DIR = join(root, "restored-missing");
  assert.equal(listMedia().total, 2);
  assert.equal(listMedia().items.find((item) => item.id === media.id).url, media.url);
  assert.ok((await readFile(join(process.env.DATA_DIR, "uploads", oldFilename))).length);
  objects.set(`/test-media/media/${media.filename}`, Buffer.from("different"));
  await assert.rejects(restoreBackup(backup, join(root, "conflict")), /未覆盖/);
  assert.equal(objects.get(`/test-media/media/${media.filename}`).toString(), "different");
  assert.equal(database().prepare("SELECT count(*) AS n FROM media").get().n, 2);
  console.log("R2 checks passed: legacy schema, signed uploads, public links, validation, failure isolation, mixed backups, remote restore and overwrite protection (mocked S3 transport).");
} finally { globalThis.fetch = originalFetch; closeDatabase(); }
