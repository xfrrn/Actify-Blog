import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { setTimeout } from "node:timers/promises";
import { getPlatformProxy } from "wrangler";

const origin = new URL(process.argv[2] || "http://localhost:3000");
assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname), "Run this check against a local server only");
const proxy = await getPlatformProxy({ configPath: "wrangler.jsonc", remoteBindings: false });
const secret = proxy.env.FEEDBACK_ADMIN_TOKEN;
const db = proxy.env.FEEDBACK_DB;
const marker = `feedback-check-${randomUUID()}`;
const ip = `192.0.2.${Math.floor(Math.random() * 250) + 1}`;
const data = { painPoint: `${marker} 读论文时切换翻译工具很麻烦 <script>alert('test')</script>`, searchQuery: `private-${marker}`, website: "", locale: "zh" };
const request = (path, method, body, authorized = false, headers = {}) => fetch(new URL(path, origin), {
  method,
  headers: { Origin: origin.origin, "Content-Type": "application/json", "CF-Connecting-IP": ip, ...(authorized ? { Authorization: `Bearer ${secret}` } : {}), ...headers },
  ...(body === undefined ? {} : { body: typeof body === "string" ? body : JSON.stringify(body) }),
});
const home = async () => (await fetch(origin)).text();

try {
  assert.ok(typeof secret === "string" && secret.length >= 32, "Set FEEDBACK_ADMIN_TOKEN in .dev.vars first");
  assert.equal((await request("/api/feedback/admin", "GET")).status, 401, "Private queue requires authentication");
  assert.equal((await request("/api/feedback/admin", "PATCH", { id: 1, status: "published" })).status, 401);
  for (const body of [null, [], "{", { ...data, painPoint: "          " }, { ...data, painPoint: "😀".repeat(5) }, { ...data, painPoint: 123 }, { ...data, painPoint: "x".repeat(2001) }, { ...data, painPoint: "bad\0" + data.painPoint }, { ...data, searchQuery: "x".repeat(201) }, { ...data, locale: "fr" }, { ...data, website: "spam.example" }]) {
    assert.equal((await request("/api/feedback", "POST", body)).status, 400, "Reject invalid submissions");
  }
  assert.equal((await request("/api/feedback", "POST", data, false, { Origin: "https://another.example" })).status, 403);
  assert.equal((await request("/api/feedback", "POST", data, false, { "Content-Type": "text/plain" })).status, 415);
  assert.equal((await request("/api/feedback", "POST", "x".repeat(16385))).status, 413);

  const saved = await request("/api/feedback", "POST", { ...data, status: "published" });
  assert.equal(saved.status, 201);
  assert.equal(saved.headers.get("cache-control"), "no-store");
  const { results } = await db.prepare("SELECT * FROM feedback WHERE pain_point = ?").bind(data.painPoint).all();
  assert.equal(results.length, 1, "Submission really reaches D1");
  const item = results[0];
  assert.equal(item.status, "pending", "Visitor cannot self-publish");
  assert.equal(item.search_query, data.searchQuery);
  assert.ok(!(await home()).includes(marker), "Pending feedback never reaches public HTML");
  const queue = await request("/api/feedback/admin", "GET", undefined, true);
  assert.equal(queue.status, 200);
  assert.ok((await queue.json()).items.some((entry) => entry.id === item.id));
  assert.equal((await request("/api/feedback/admin", "PATCH", { id: item.id, status: "invalid" }, true)).status, 400);
  assert.equal((await request("/api/feedback/admin", "PATCH", { id: item.id, status: "published" }, true)).status, 200);
  const published = await home();
  assert.ok(published.includes(marker), "Approved feedback is server-rendered");
  assert.ok(published.includes("&lt;script&gt;"), "User text is escaped");
  assert.ok(!published.includes("<script>alert('test')</script>"), "No executable user HTML");
  assert.ok(!published.includes(data.searchQuery), "Search terms stay private");
  assert.equal((await request("/api/feedback/admin", "PATCH", { id: item.id, status: "hidden" }, true)).status, 200);
  assert.ok(!(await home()).includes(marker), "Withdrawal removes public content");
  assert.equal((await request("/api/feedback/admin", "PATCH", { id: Number.MAX_SAFE_INTEGER, status: "hidden" }, true)).status, 404);
  // Use a fresh IP and avoid crossing the limiter's fixed minute boundary.
  const remaining = 60000 - Date.now() % 60000;
  if (remaining < 2000) await setTimeout(remaining + 100);
  const burstHeaders = { "CF-Connecting-IP": ip.replace("192.0.2.", "198.51.100.") };
  for (let i = 0; i < 3; i++) {
    assert.equal((await request("/api/feedback", "POST", { ...data, painPoint: `${marker} extra-${i}`, searchQuery: "" }, false, burstHeaders)).status, 201);
  }
  const limited = await request("/api/feedback", "POST", data, false, burstHeaders);
  assert.equal(limited.status, 429, "Fourth submission in one minute is throttled");
  assert.equal(limited.headers.get("retry-after"), "60");

  // Exercise the review queue's cursor without making extra public submissions.
  for (let i = 0; i < 22; i++) {
    await db.prepare("INSERT INTO feedback (pain_point, locale) VALUES (?, 'en')").bind(`${marker} pagination-${i}`).run();
  }
  const first = await (await request("/api/feedback/admin", "GET", undefined, true)).json();
  assert.equal(first.items.length, 20);
  assert.ok(first.nextCursor);
  const second = await (await request(`/api/feedback/admin?before=${first.nextCursor}`, "GET", undefined, true)).json();
  assert.ok(second.items.length > 0 && second.items.every((entry) => entry.id < first.nextCursor));
  const adminPage = await (await fetch(new URL("/admin/feedback", origin))).text();
  assert.ok(adminPage.includes('content="noindex, nofollow"'), "Admin page is not indexed");
  assert.ok(!adminPage.includes(secret) && !adminPage.includes(marker), "Admin HTML contains no secret or private feedback");
  console.log("Feedback checks passed: validation, durable storage, private queue, authorization, approval, HTML escaping, withdrawal, rate limit, and pagination.");
} finally {
  await db.prepare("DELETE FROM feedback WHERE instr(pain_point, ?) = 1").bind(marker).run();
  await proxy.dispose();
}
