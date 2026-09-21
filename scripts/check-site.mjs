import assert from "node:assert/strict";
import { allContent, publishedContent } from "../src/lib/cms-store.ts";
import { markdownMetadata } from "../src/lib/markdown.ts";
import { closeDatabase } from "../src/lib/cms-db.ts";
for (const file of [".env.local", ".env"]) {
  try { process.loadEnvFile(file); } catch (error) { if (error.code !== "ENOENT") throw error; }
}
const allPosts = (await allContent("posts")).flatMap((entry) => Object.entries(entry.data).map(([language, draft]) => {
  const post = entry.published?.[language] || draft;
  return { ...post, slug: entry.slug, language, draft: !!entry.deletedAt || !entry.published?.[language], ...markdownMetadata(post.content) };
}));
const allProjects = (await publishedContent("projects")).map((entry) => ({ ...entry.published, slug: entry.slug, draft: false }));
await closeDatabase();

// Run against a running production server: node scripts/check-site.mjs http://localhost:3000
const origin = process.argv[2] || "http://localhost:3000";
const posts = [...new Set(allPosts.filter((post) => !post.draft).map((post) => `/blog/${post.slug}`))];
const drafts = [...new Set(allPosts.filter((post) => post.draft).map((post) => `/blog/${post.slug}`))].filter((path) => !posts.includes(path));
const canonicalOrigin = "https://actify.cc";
const escapeHtml = (value) => value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/'/g, "&#x27;");
const meta = (html, name) => [...html.matchAll(/<meta\s[^>]*>/g)]
  .filter(([tag]) => tag.includes(`name="${name}"`) || tag.includes(`property="${name}"`))
  .map(([tag]) => /content="([^"]*)"/.exec(tag)?.[1]);

for (const path of ["/", "/projects", "/blog", "/blog?category=missing", ...posts, "/rss.xml", "/sitemap.xml", "/robots.txt"]) {
  const response = await fetch(new URL(path, origin), { redirect: "manual" });
  assert.equal(response.status, 200, path);
  const body = await response.text();
  assert.ok(body.length > 0, path);
  for (const draft of drafts) assert.ok(!body.includes(draft), `${path} must not list ${draft}`);
  if (path === "/robots.txt") {
    assert.match(body, /User-Agent: \*/i);
    assert.match(body, /^Allow: \/\s*$/m);
    assert.doesNotMatch(body, /^Disallow: \/\s*$/m);
    assert.ok(body.includes(`Sitemap: ${canonicalOrigin}/sitemap.xml`));
  } else if (path === "/sitemap.xml") {
    const urls = [...body.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]);
    assert.deepEqual(urls.sort(), ["", "/blog", "/projects", ...posts].map((path) => canonicalOrigin + path).sort());
  } else if (path !== "/rss.xml") {
    const pathname = new URL(path, origin).pathname;
    const canonical = `${canonicalOrigin}${pathname === "/" ? "" : pathname}`;
    const links = [...body.matchAll(/<link\s[^>]*rel="canonical"[^>]*>/g)].map(([tag]) => /href="([^"]*)"/.exec(tag)?.[1]);
    assert.deepEqual(links, [canonical], `${path}: one exact canonical`);
    assert.match(body, /<title>[^<]+<\/title>/, path);
    for (const name of ["description", "og:title", "og:description", "twitter:title", "twitter:description", "og:image", "twitter:image"]) {
      assert.ok(meta(body, name).some(Boolean), `${path}: ${name}`);
    }
    assert.deepEqual(meta(body, "og:url"), [canonical]);
    assert.deepEqual(meta(body, "twitter:card"), ["summary_large_image"]);
    assert.deepEqual(meta(body, "keywords"), [], "No meta keywords");
    if (!path.includes("?")) {
      for (const directive of [...meta(body, "robots"), ...meta(body, "googlebot"), response.headers.get("x-robots-tag") || ""]) {
        assert.doesNotMatch(directive, /noindex|nofollow/i, path);
      }
    }
    const html = body.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, "");
    assert.equal((html.match(/<h1\b/g) || []).length, 1, `${path}: one server-rendered H1`);
    for (const [img] of html.matchAll(/<img\b[^>]*>/g)) assert.match(img, /\balt="[^"]*"/, path);
    const schemas = [...body.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((match) => JSON.parse(match[1]));
    if (path === "/") {
      const graph = schemas.flatMap((schema) => schema["@graph"] || [schema]);
      for (const type of ["WebSite", "Person"]) assert.ok(graph.some((item) => item["@type"] === type && item.url === `${canonicalOrigin}/`));
    }
    if (posts.includes(path)) {
      const post = allPosts.find((post) => `/blog/${post.slug}` === path && !post.draft && post.language === "en")
        || allPosts.find((post) => `/blog/${post.slug}` === path && !post.draft);
      assert.deepEqual(meta(body, "description"), [escapeHtml(post.description)]);
      assert.deepEqual(meta(body, "og:title"), [escapeHtml(post.title)]);
      assert.deepEqual(meta(body, "twitter:title"), [escapeHtml(post.title)]);
      const article = /<article\b[^>]*>([\s\S]*?)<\/article>/.exec(html)?.[1];
      assert.ok(article?.replace(/<[^>]*>/g, "").trim(), `${path}: article body exists without client JS`);
      for (const heading of post.toc) assert.ok(article.includes(`id="${heading.id}"`), `${path}: SSR heading ${heading.id}`);
      const schema = schemas.find((schema) => schema["@type"] === "BlogPosting");
      assert.ok(schema, `${path}: BlogPosting`);
      assert.equal(schema.headline, post.title);
      assert.equal(schema.description, post.description);
      assert.equal(schema.url, canonical);
      assert.equal(schema.mainEntityOfPage, canonical);
    }
  }
  if (path === "/" || path === "/projects") {
    const visible = allProjects.filter((project) => !project.draft && (path === "/projects" || project.featured));
    assert.equal((body.match(/<div[^>]*data-project-cover=/g) || []).length, visible.length, `${path}: every visible project has a cover`);
    for (const project of allProjects) {
      assert.equal(body.includes(`id="${project.slug}"`), visible.includes(project), `${path}: project visibility ${project.slug}`);
    }
    assert.doesNotMatch(body, /<time[^>]*>\s*<\/time>/, `${path}: no empty project dates`);
  }
  if (path === "/projects") {
    assert.ok(!body.includes("/blog?project="), "Projects do not define blog categories");
    assert.equal((body.match(/<h2\b/g) || []).length, allProjects.filter((project) => !project.draft).length, "Project cards follow the page H1 with H2");
    assert.deepEqual(meta(body, "twitter:title"), meta(body, "og:title"));
    assert.deepEqual(meta(body, "twitter:description"), meta(body, "description"));
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
for (const path of ["/missing-seo-check", "/blog/nonexistent-structure-check", ...drafts]) {
  for (const userAgent of ["Mozilla/5.0", "Googlebot", "Twitterbot"]) {
    const response = await fetch(new URL(path, origin), { headers: { "User-Agent": userAgent }, redirect: "manual" });
    assert.equal(response.status, 404, `${path}: real 404 for ${userAgent}`);
    assert.ok(meta(await response.text(), "robots").some((value) => value.includes("noindex")), `${path}: 404 noindex`);
  }
}
console.log(`Site checks passed (SEO metadata, exact sitemap, robots, SSR, schemas, languages, projects, share images, ${posts.length} published posts, drafts and real 404s).`);
