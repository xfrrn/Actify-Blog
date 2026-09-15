import assert from "node:assert/strict";
import allPosts from "../.content-collections/generated/allPosts.js";

// Run against a running production server: node scripts/check-site.mjs http://localhost:3000
const origin = process.argv[2] || "http://localhost:3000";
const posts = allPosts.filter((post) => !post.draft).map((post) => `/blog/${post.slug}`);
const drafts = allPosts.filter((post) => post.draft).map((post) => `/blog/${post.slug}`);

for (const path of ["/", "/projects", "/blog", "/blog?category=missing", ...posts, "/rss.xml", "/sitemap.xml", "/robots.txt"]) {
  const response = await fetch(new URL(path, origin));
  assert.equal(response.status, 200, path);
  const body = await response.text();
  assert.ok(body.length > 0, path);
  for (const draft of drafts) assert.ok(!body.includes(draft), `${path} must not list ${draft}`);
  if (path === "/" || path === "/projects") {
    assert.ok(body.includes("PDF Selection Translator"), `${path}: featured plugin`);
    assert.ok(body.includes("https://github.com/xfrrn/obsidian-pdf-selection-translator"), `${path}: plugin link`);
    assert.doesNotMatch(body, /<time[^>]*>\s*<\/time>/, `${path}: no empty project dates`);
  }
  if (path === "/projects") {
    assert.equal((body.match(/<div[^>]*data-project-cover=/g) || []).length, 4, "Every project has a cover");
    assert.ok(!body.includes("/blog?project="), "Projects do not define blog categories");
  }
  if (path.startsWith("/blog?")) {
    assert.ok(body.includes('aria-label="Post categories"'), "Category dropdown renders");
    assert.ok(!body.includes('name="project"') && !body.includes("关联项目"), "No project filter");
    assert.ok(body.includes('aria-label="Post timeline"'), "Timeline navigation renders");
    assert.ok(body.includes('content="noindex, follow"'), "Filtered views are not indexed");
  }
}

// Repeated requests must respect each visitor's language without cache leakage.
for (const locale of ["en", "zh", "en"]) {
  for (const [path, english, chinese] of [
    ["/", "About me", "关于我"],
    ["/projects", "All projects", "全部作品"],
    ["/blog?category=missing", "No posts in this category yet", "这个分类下还没有文章"],
    ["/missing-language-check", "Page not found", "找不到页面"],
  ]) {
    const response = await fetch(new URL(path, origin), { headers: { Cookie: `site-language=${locale}` } });
    assert.equal(response.status, path === "/missing-language-check" ? 404 : 200, path);
    const body = await response.text();
    assert.ok(body.includes(`<html lang="${locale === "zh" ? "zh-CN" : "en"}"`), `${path}: document language ${locale}`);
    assert.ok(body.includes(locale === "zh" ? chinese : english), `${path}: translated content ${locale}`);
    assert.ok(body.includes(`aria-label="${locale === "zh" ? "Switch to English" : "切换到中文"}"`), `${path}: switch control ${locale}`);
    assert.match(response.headers.get("cache-control") || "", /private|no-store/, `${path}: language responses aren't shared`);
  }
}

for (const path of ["/opengraph-image", "/blog/opengraph-image", ...posts.map((post) => `${post}/opengraph-image`)]) {
  const response = await fetch(new URL(path, origin));
  assert.equal(response.status, 200, path);
  assert.match(response.headers.get("content-type") || "", /^image\/png/, path);
  const png = Buffer.from(await response.arrayBuffer());
  assert.equal(png.subarray(0, 8).toString("hex"), "89504e470d0a1a0a", path);
  assert.equal(png.readUInt32BE(16), 1200, path);
  assert.equal(png.readUInt32BE(20), 630, path);
}

for (const path of ["/blog/nonexistent-structure-check", ...drafts]) {
  for (const suffix of ["", "/opengraph-image"]) {
    assert.equal((await fetch(new URL(path + suffix, origin))).status, 404, path + suffix);
  }
}
console.log("Site checks passed (English/Chinese pages, per-visitor language, projects, feeds, share images, drafts and missing posts).");
