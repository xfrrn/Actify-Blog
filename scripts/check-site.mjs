import assert from "node:assert/strict";

// Run against a running production server: node scripts/check-site.mjs http://localhost:3000
const origin = process.argv[2] || "http://localhost:3000";
const post = "/blog/mdx-writing-guide";

for (const path of ["/", "/projects", "/blog", post, "/rss.xml", "/sitemap.xml", "/robots.txt"]) {
  const response = await fetch(new URL(path, origin));
  assert.equal(response.status, 200, path);
  assert.ok((await response.text()).length > 0, path);
}

for (const path of ["/opengraph-image", "/blog/opengraph-image", `${post}/opengraph-image`]) {
  const response = await fetch(new URL(path, origin));
  assert.equal(response.status, 200, path);
  assert.match(response.headers.get("content-type") || "", /^image\/png/, path);
  const png = Buffer.from(await response.arrayBuffer());
  assert.equal(png.subarray(0, 8).toString("hex"), "89504e470d0a1a0a", path);
  assert.equal(png.readUInt32BE(16), 1200, path);
  assert.equal(png.readUInt32BE(20), 630, path);
}

for (const path of ["/blog/nonexistent-structure-check", "/blog/nonexistent-structure-check/opengraph-image"]) {
  assert.equal((await fetch(new URL(path, origin))).status, 404, path);
}
console.log("Site checks passed (pages, feeds, share images and missing posts).");
