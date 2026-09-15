import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

// Use the existing TypeScript compiler; no test runner or runtime dependency.
async function loadSource(path) {
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  const code = ts.transpile(source, { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 });
  return import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);
}

const { remarkCodeMeta } = await loadSource("../src/lib/remark-code-meta.ts");
const { normalizePage, paginate } = await loadSource("../src/lib/pagination.ts");
const heading = (text, depth = 2) => ({ type: "heading", depth, children: [{ type: "text", value: text }] });
const tree = {
  type: "root",
  children: [
    heading("中文标题"), heading("中文标题", 3), heading("中文标题-2"), heading("!!!"),
    { type: "heading", depth: 2, children: [{ type: "text", value: "Use " }, { type: "inlineCode", value: "MDX" }] },
    { type: "code", value: "## Not a heading", meta: 'title="example.ts"' },
  ],
};
const metadata = { toc: [], readingMinutes: 1 };
remarkCodeMeta(metadata)(tree);
assert.deepEqual(metadata.toc.map((entry) => entry.id), [
  "section-中文标题", "section-中文标题-2", "section-中文标题-2-2", "section-heading", "section-use-mdx",
]);
assert.equal(tree.children[0].data.hProperties.id, metadata.toc[0].id);
assert.equal(tree.children.at(-1).data.hProperties["data-title"], "example.ts");
assert.equal(metadata.readingMinutes, 1);
remarkCodeMeta(metadata)({ type: "root", children: [{ type: "text", value: "中".repeat(601) }] });
assert.equal(metadata.readingMinutes, 3);
remarkCodeMeta(metadata)({ type: "root", children: [{ type: "text", value: "word ".repeat(401) }] });
assert.equal(metadata.readingMinutes, 3);
for (const value of [undefined, "bad", "2junk", "1.5", 0, -1, NaN, Infinity]) {
  assert.equal(normalizePage(value, 3), 1);
}
assert.equal(normalizePage("999", 3), 3);
assert.equal(normalizePage("1", 0), 1);
const result = paginate([1, 2, 3, 4, 5, 6], { page: 2, pageSize: 5 });
assert.deepEqual(result.items, [6]);
assert.equal(result.pagination.hasPreviousPage, true);
assert.equal(result.pagination.hasNextPage, false);
assert.deepEqual(paginate([], { page: 1, pageSize: 5 }).items, []);

const { filterArchivePosts, getArchiveCategories, groupArchivePosts } = await loadSource("../src/lib/blog-archive.ts");
const archive = [
  { slug: "old", date: "2025-12-31", category: "折腾记录" },
  { slug: "life", date: "2026-01-01", category: "生活随记" },
  { slug: "plugin", date: "2026-09-15", category: "折腾记录" },
  { slug: "draft", date: "2026-09-16", category: "隐藏分类", draft: true },
  { slug: "another", date: "2026-09-15", category: "折腾记录" },
];
const ordered = filterArchivePosts(archive);
assert.deepEqual(ordered.map((post) => post.slug), ["another", "plugin", "life", "old"]);
assert.equal(archive[0].slug, "old", "Filtering must not reorder the input");
assert.deepEqual(filterArchivePosts(archive, "折腾记录").map((post) => post.slug), ["another", "plugin", "old"]);
assert.equal(filterArchivePosts(archive, "生活随记").length, 1);
const uncategorized = { slug: "uncategorized", date: "2026-09-15" };
assert.equal(filterArchivePosts([uncategorized]).length, 1);
assert.deepEqual(getArchiveCategories([]), []);
assert.deepEqual(getArchiveCategories([uncategorized, { ...uncategorized, category: "" }]), []);
assert.deepEqual(Object.fromEntries(getArchiveCategories(archive).map(({ name, count }) => [name, count])), { "折腾记录": 3, "生活随记": 1 });
assert.deepEqual(getArchiveCategories([{ ...uncategorized, category: "自定义 / C++ & 笔记" }]), [{ name: "自定义 / C++ & 笔记", count: 1 }]);
assert.equal(filterArchivePosts(archive, "隐藏分类").length, 0);
assert.equal(filterArchivePosts(archive, "missing").length, 0);
assert.deepEqual(groupArchivePosts(ordered).map(({ id, posts }) => [id, posts.length]), [
  ["month-2026-09", 2], ["month-2026-01", 1], ["month-2025-12", 1],
]);
assert.deepEqual(groupArchivePosts([]), []);

const { default: allPosts } = await loadSource("../.content-collections/generated/allPosts.js");
const posts = allPosts.filter((post) => !post.draft);
assert.equal(new Set(allPosts.map((post) => post.slug)).size, allPosts.length);
for (const post of posts) {
  assert.ok(post.title && post.description && post.date);
  assert.ok(post.category === undefined || typeof post.category === "string");
  assert.ok(post.readingMinutes >= 1 && post.mdx);
  const compiled = post.mdx.replace(/\\u([0-9a-f]{4})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  for (const heading of post.toc) assert.ok(compiled.includes(heading.id));
  if (post.cover?.startsWith("/")) await readFile(new URL(`../public${post.cover}`, import.meta.url));
}
console.log(`Content checks passed (${posts.length} published, ${allPosts.length - posts.length} drafts).`);
