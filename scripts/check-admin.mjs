import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import { setTimeout as delay } from "node:timers/promises";
import sharp from "sharp";
import { importRepository } from "../src/lib/cms-import.ts";
import { setPassword } from "../src/lib/admin-auth.ts";
import { database, closeDatabase } from "../src/lib/cms-db.ts";
import { emptyTranslation } from "../src/lib/cms-types.ts";

process.env.DATA_DIR = await mkdtemp(join(tmpdir(), "actify-http-test-"));
process.env.MEDIA_STORAGE = "local";
importRepository(process.cwd());
const password = "isolated-http-check-password";
await setPassword(password);
const socket = createServer(); await new Promise((resolve) => socket.listen(0, "127.0.0.1", resolve));
const port = socket.address().port; await new Promise((resolve) => socket.close(resolve));
const origin = `http://127.0.0.1:${port}`;
let output = "", cookie = "";
const start = () => {
const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(port)], {
  windowsHide: true, stdio: ["ignore", "pipe", "pipe"],
  env: { ...process.env, NODE_ENV: "production", SITE_ORIGIN: origin, TRUST_PROXY: "0" },
});
child.stdout.on("data", (data) => { output += data; }); child.stderr.on("data", (data) => { output += data; });
return child;
};
let server = start();
const request = (path, method = "GET", body, auth = true, headers = {}) => fetch(origin + path, {
  method, redirect: "manual", headers: { Origin: origin, ...(auth && cookie ? { Cookie: cookie } : {}), ...(body === undefined ? {} : { "Content-Type": "application/json" }), ...headers },
  ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(20000),
});
const json = async (response, status = 200) => { assert.equal(response.status, status, await response.clone().text()); return response.json(); };
async function ready() {
  for (let i = 0; i < 100; i++) {
    if (server.exitCode !== null) throw new Error(output);
    try { if ((await request("/admin/login")).ok) return; } catch {}
    if (i === 99) throw new Error(`Server startup timed out\n${output}`);
    await delay(200);
  }
}
try {
  await ready();
  assert.equal((await request("/api/admin/posts", "GET", undefined, false)).status, 401);
  assert.match((await request("/admin/posts", "GET", undefined, false)).headers.get("location"), /\/admin\/login/);
  assert.equal((await request("/api/admin/login", "POST", { password: "wrong" }, false)).status, 401);
  assert.equal((await request("/api/admin/login", "POST", { password }, false, { Origin: "https://attacker.invalid" })).status, 403);
  const login = await request("/api/admin/login", "POST", { password }, false); assert.equal(login.status, 200);
  const setCookie = login.headers.get("set-cookie"); assert.match(setCookie, /HttpOnly/); assert.match(setCookie, /Secure/); assert.match(setCookie, /SameSite=Strict/);
  cookie = setCookie.split(";")[0];
  assert.equal((await request("/admin/posts")).status, 200);
  const initial = await json(await request("/api/admin/posts")); assert.equal(initial.total, 6);
  const publicPage = await request("/blog/a-file-based-bilingual-blog"); assert.equal(publicPage.status, 200);
  assert.match(await publicPage.text(), /section-一篇文章从一个文件开始/);
  let entry = await json(await request("/api/admin/posts", "POST"), 201);
  const edit = async (action, rest = {}, status = 200) => json(await request(`/api/admin/posts/${entry.id}`, "PATCH", { version: entry.version, action, ...rest }), status);
  const draft = { ...emptyTranslation(), title: "HTTP 发布测试", description: "动态内容检查", content: '## 实际正文\n\n草稿正文一\n\n<script>alert("bad")</script>\n\n[unsafe](javascript:alert(1))' };
  entry = await edit("save", { slug: "http-publish-check", data: { zh: draft } });
  assert.equal((await request("/blog/http-publish-check")).status, 404);
  assert.equal((await request(`/admin/posts/${entry.id}/preview`, "GET", undefined, false)).status, 307);
  assert.match(await (await request(`/admin/posts/${entry.id}/preview`)).text(), /草稿正文一/);
  entry = await edit("publish", { locale: "zh" });
  let body = await (await request("/blog/http-publish-check")).text();
  assert.match(body, /草稿正文一/); assert.doesNotMatch(body.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, ""), /<script|href="javascript:/);
  assert.match(await (await request("/rss.xml")).text(), /HTTP 发布测试/);
  assert.match(await (await request("/sitemap.xml")).text(), /http-publish-check/);
  assert.equal((await request("/blog/http-publish-check/opengraph-image")).status, 200);
  const oldVersion = entry.version;
  entry = await edit("save", { slug: entry.slug, data: { zh: { ...draft, content: "新正文二" }, en: { ...draft, title: "English published title", content: "English body" } } });
  assert.match(await (await request("/blog/http-publish-check")).text(), /草稿正文一/);
  assert.equal((await request(`/api/admin/posts/${entry.id}`, "PATCH", { version: oldVersion, action: "publish", locale: "zh" })).status, 409);
  entry = await edit("publish", { locale: "en" });
  body = await (await request("/blog/http-publish-check", "GET", undefined, false, { Cookie: "site-language=en" })).text(); assert.match(body, /English body/);
  body = await (await request("/blog/http-publish-check", "GET", undefined, false, { Cookie: "site-language=zh" })).text(); assert.match(body, /草稿正文一/);
  entry = await edit("unpublish", { locale: "en" });
  assert.match(await (await request("/blog/http-publish-check")).text(), /草稿正文一/);
  entry = await edit("publish", { locale: "zh" }); assert.match(await (await request("/blog/http-publish-check")).text(), /新正文二/);
  entry = await edit("trash"); assert.equal((await request("/blog/http-publish-check")).status, 404);
  entry = await edit("restore"); assert.equal((await request("/blog/http-publish-check")).status, 404);
  entry = await edit("publish", { locale: "zh" });
  assert.equal((await request(`/api/admin/posts/${entry.id}`, "PATCH", { version: entry.version, action: "trash" }, true, { Origin: "https://other.invalid" })).status, 403);
  const image = await sharp({ create: { width: 4, height: 3, channels: 3, background: "white" } }).png().toBuffer();
  const media = await json(await fetch(`${origin}/api/admin/media`, { method: "POST", headers: { Origin: origin, Cookie: cookie, "Content-Type": "image/png", "X-Filename": "test.png" }, body: image }), 201);
  const imageResponse = await request(media.url); assert.equal(imageResponse.status, 200); assert.match(imageResponse.headers.get("cache-control"), /immutable/);
  assert.equal((await request("/api/admin/media", "POST", {}, false)).status, 401);
  const r2Filename = "22222222-2222-4222-8222-222222222222.png";
  const r2Url = `https://images.example.com/media/${r2Filename}`;
  database().prepare("INSERT INTO media(id,filename,name,mime,size,width,height,created_at,storage,url) VALUES ('r2-link',?,'r2.png','image/png',20,1,1,?,'r2',?)").run(r2Filename, new Date().toISOString(), r2Url);
  const r2Redirect = await request(`/media/${r2Filename}`);
  assert.equal(r2Redirect.status, 302); assert.equal(r2Redirect.headers.get("location"), r2Url);
  assert.ok((await json(await request("/api/admin/media"))).items.some((item) => item.url === r2Url));
  let project = await json(await request("/api/admin/projects", "POST"), 201);
  const projectChange = async (action, data) => project = await json(await request(`/api/admin/projects/${project.id}`, "PATCH", { action, version: project.version, slug: "http-project", data }));
  await projectChange("save", { ...project.data, name: "HTTP project", description: { zh: "动态作品中文简介", en: "Live project summary" }, image: media.url, featured: true });
  assert.doesNotMatch(await (await request("/projects")).text(), /id="http-project"/);
  await projectChange("publish");
  assert.match(await (await request("/")).text(), /id="http-project"/);
  assert.match(await (await request("/projects")).text(), new RegExp(media.filename));
  await projectChange("save", { ...project.data, name: "Unpublished project change", featured: false });
  assert.doesNotMatch(await (await request("/projects")).text(), /Unpublished project change/);
  await projectChange("publish");
  assert.doesNotMatch(await (await request("/")).text(), /id="http-project"/);
  assert.match(await (await request("/projects")).text(), /Unpublished project change/);
  await projectChange("unpublish");
  assert.doesNotMatch(await (await request("/projects")).text(), /id="http-project"/);
  assert.equal((await fetch(`${origin}/api/admin/media`, { method: "POST", headers: { Origin: origin, Cookie: cookie, "Content-Type": "image/png" }, body: '<svg onload="alert(1)"/>' })).status, 400);
  const feedback = { painPoint: "测试反馈内容足够长 <script>bad</script>", searchQuery: "PRIVATE-SEARCH-MARKER", locale: "zh", website: "" };
  assert.equal((await request("/api/feedback", "POST", feedback, false)).status, 201);
  const queue = await json(await request("/api/admin/feedback")); const item = queue.items[0];
  assert.ok(item); assert.doesNotMatch(await (await request("/")).text(), /测试反馈内容足够长/);
  await json(await request("/api/admin/feedback", "PATCH", { id: item.id, status: "published" }));
  const home = await (await request("/")).text(); assert.match(home, /测试反馈内容足够长/); assert.doesNotMatch(home, /PRIVATE-SEARCH-MARKER/);
  await json(await request("/api/admin/feedback", "PATCH", { id: item.id, status: "hidden" }));
  assert.doesNotMatch(await (await request("/")).text(), /测试反馈内容足够长/);
  for (let i = 0; i < 2; i++) assert.equal((await request("/api/feedback", "POST", feedback, false)).status, 201);
  assert.equal((await request("/api/feedback", "POST", feedback, false)).status, 429);
  assert.equal((await request("/api/feedback", "POST", { ...feedback, painPoint: "short" }, false)).status, 400);
  for (let i = 0; i < 15; i++) await json(await request("/api/admin/posts", "POST"), 201);
  const firstPage = await json(await request("/api/admin/posts"));
  const secondPage = await json(await request("/api/admin/posts?page=2"));
  assert.equal(firstPage.total, 22); assert.equal(firstPage.items.length, 20); assert.equal(secondPage.items.length, 2);
  assert.equal(new Set([...firstPage.items, ...secondPage.items].map((item) => item.id)).size, 22);
  const search = await json(await request("/api/admin/posts?q=HTTP&status=published&locale=zh")); assert.deepEqual(search.items.map((item) => item.id), [entry.id]);
  for (const path of ["/", "/blog", "/projects", "/rss.xml", "/sitemap.xml", "/admin/posts", `/admin/posts/${entry.id}/preview`, "/api/admin/posts", "/blog/http-publish-check/opengraph-image"]) {
    assert.match((await request(path)).headers.get("cache-control") || "", /no-store|private/, `${path} must bypass shared caches`);
  }
  const exited = once(server, "exit"); server.kill(); await exited;
  closeDatabase(); server = start(); await ready();
  assert.match(await (await request("/blog/http-publish-check")).text(), /新正文二/);
  assert.deepEqual(Buffer.from(await (await request(media.url)).arrayBuffer()), Buffer.from(await imageResponse.arrayBuffer()));
  assert.equal((await request(`/api/admin/posts/${entry.id}`)).status, 200, "Session and content survive process restart");
  const siteCheck = spawn(process.execPath, ["scripts/check-site.mjs", origin], { windowsHide: true, stdio: "inherit", env: process.env });
  assert.equal((await once(siteCheck, "exit"))[0], 0, "Published site regression checks");
  assert.equal((await request("/api/admin/logout", "POST")).status, 200);
  assert.equal((await request("/api/admin/posts")).status, 401);
  assert.equal(database().prepare("SELECT slug FROM content WHERE id=?").get(entry.id).slug, "http-publish-check");
  console.log("Production HTTP checks passed: auth, origin checks, live publication, draft isolation, translations, RSS/sitemap/share images, projects, uploads, moderation, pagination, cache headers and restart persistence.");
} catch (error) { console.error(output.slice(-6000)); throw error; }
finally { server.kill(); closeDatabase(); }
