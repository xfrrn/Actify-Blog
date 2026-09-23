import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { database, closeDatabase } from "../src/lib/cms-db.ts";
import { uploadImage, listMedia } from "../src/lib/media.ts";
import { mediaStorage } from "../src/lib/r2.ts";
import { createBackup, restoreBackup } from "./admin.mjs";
import { testDatabase } from "./postgres-test.mjs";

const testDb = await testDatabase();
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
  // Existing local assets remain usable alongside newly uploaded R2 objects.
  await mkdir(join(process.env.DATA_DIR, "uploads"), { recursive: true });
  const png = await sharp({ create: { width: 8, height: 6, channels: 3, background: "white" } }).png().toBuffer();
  const oldFilename = "11111111-1111-4111-8111-111111111111.png";
  await writeFile(join(process.env.DATA_DIR, "uploads", oldFilename), png);
  await (await database()).query("INSERT INTO media(id,filename,name,mime,size,width,height,created_at) VALUES ('legacy',$1,'legacy.png','image/png',$2,8,6,$3)", [oldFilename, png.length, new Date().toISOString()]);
  assert.equal((await listMedia()).items[0].storage, "local");
  assert.equal((await listMedia()).items[0].url, `/media/${oldFilename}`);

  const media = await uploadImage(png, "new.png", "image/png");
  assert.equal(media.storage, "r2");
  assert.equal(media.url, `https://images.example.com/media/${media.filename}`);
  assert.equal((await listMedia()).items.find((item) => item.id === media.id).url, media.url);
  assert.ok(objects.has(`/test-media/media/${media.filename}`));
  await assert.rejects(readFile(join(process.env.DATA_DIR, "uploads", media.filename)), { code: "ENOENT" });
  const beforeInvalid = calls;
  await assert.rejects(uploadImage(Buffer.from("<svg/>"), "fake.png", "image/png"));
  assert.equal(calls, beforeInvalid, "Invalid images never reach R2");

  failure = 403;
  await assert.rejects(uploadImage(png, "denied.png", "image/png"), /403/);
  assert.equal((await listMedia()).total, 2, "Failed R2 uploads do not create phantom media records");
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
  assert.ok(!JSON.stringify(await listMedia()).includes(secret), "Credentials never appear in media responses");
  await testDb.next();
  await restoreBackup(backup, join(root, "restored-existing"));
  objects.clear();
  await testDb.next();
  await restoreBackup(backup, join(root, "restored-missing"));
  assert.deepEqual(objects.get(`/test-media/media/${media.filename}`), await readFile(join(backup, "uploads", media.filename)));
  await closeDatabase(); process.env.DATA_DIR = join(root, "restored-missing");
  assert.equal((await listMedia()).total, 2);
  assert.equal((await listMedia()).items.find((item) => item.id === media.id).url, media.url);
  assert.ok((await readFile(join(process.env.DATA_DIR, "uploads", oldFilename))).length);
  objects.set(`/test-media/media/${media.filename}`, Buffer.from("different"));
  await testDb.next();
  await assert.rejects(restoreBackup(backup, join(root, "conflict")), /未覆盖/);
  assert.equal(objects.get(`/test-media/media/${media.filename}`).toString(), "different");
  assert.equal((await (await database()).query("SELECT count(*)::int AS n FROM media")).rows[0].n, 0, "Failed restore must not import the database");
  delete process.env.DATA_DIR;
  process.env.NODE_ENV = "production";
  const r2Only = await uploadImage(png, "r2-only.png", "image/png");
  assert.equal(r2Only.storage, "r2");
  const r2OnlyBackup = await createBackup(join(root, "r2-only-backup"));
  assert.deepEqual(await readFile(join(r2OnlyBackup, "uploads", r2Only.filename)), objects.get(`/test-media/media/${r2Only.filename}`), "Production R2 upload and backup work without DATA_DIR");
  console.log("R2 checks passed: local assets, signed uploads, public links, validation, failure isolation, PostgreSQL backups, remote restore, overwrite protection and production without DATA_DIR (mocked S3 transport).");
} finally { globalThis.fetch = originalFetch; await testDb.cleanup(); }
