import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

// Use the existing TypeScript compiler; no test runner or runtime dependency.
async function loadSource(path) {
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  const code = ts.transpile(source, { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 })
    .replaceAll('from "content-collections"', `from ${JSON.stringify(new URL("../.content-collections/generated/index.js", import.meta.url).href)}`);
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
assert.equal(groupArchivePosts(ordered, "en")[0].label, "September 2026");
assert.equal(groupArchivePosts(ordered, "zh")[0].label, "2026年9月");
const { normalizeLocale, messages } = await loadSource("../src/lib/i18n.ts");
assert.equal(normalizeLocale("zh"), "zh");
for (const value of [undefined, "", "en", "fr", "<script>"]) assert.equal(normalizeLocale(value), "en");
assert.deepEqual(Object.keys(messages.en), Object.keys(messages.zh));
for (const dictionary of Object.values(messages)) assert.ok(Object.values(dictionary).every((value) => value.length > 0));

const { default: allPosts } = await loadSource("../.content-collections/generated/allPosts.js");
const posts = allPosts.filter((post) => !post.draft);
assert.equal(new Set(allPosts.map((post) => `${post.slug}:${post.language}`)).size, allPosts.length);
for (const post of posts) {
  assert.ok(post.title && post.description && post.date);
  assert.ok(post.category === undefined || typeof post.category === "string");
  assert.ok(post.readingMinutes >= 1 && post.mdx);
  const compiled = post.mdx.replace(/\\u([0-9a-f]{4})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  for (const heading of post.toc) assert.ok(compiled.includes(heading.id));
  if (post.cover?.startsWith("/")) await readFile(new URL(`../public${post.cover}`, import.meta.url));
}
console.log(`Content checks passed (${posts.length} published, ${allPosts.length - posts.length} drafts).`);

const { allProjects } = await import("../.content-collections/generated/index.js");
const { getProjects } = await loadSource("../src/lib/projects.ts");
const originalOrder = allProjects.map((project) => project.slug);
assert.ok(allPosts.every((post) => post._meta.directory === "."), "Blog files belong directly in content/blog/");
for (const locale of ["en", "zh"]) {
  const projects = getProjects(locale);
  assert.equal(projects.length, allProjects.filter((project) => !project.draft).length);
  assert.deepEqual(getProjects(locale, true), projects.filter((project) => project.featured));
  for (const project of projects) {
    assert.equal(project.description, allProjects.find((entry) => entry.slug === project.slug).description[locale]);
    if (project.image?.startsWith("/")) await readFile(new URL(`../public${project.image}`, import.meta.url));
  }
}
// Adding a record requires no import list; drafts remain hidden, even if featured.
const example = { slug: "test-new-project", name: "Test", description: { en: "English", zh: "中文" }, featured: true, draft: false, order: -1000 };
allProjects.push(example, { ...example, slug: "test-hidden-project", draft: true, order: -2000 });
assert.equal(getProjects("en")[0].slug, example.slug);
assert.equal(getProjects("zh", true)[0].description, "中文");
assert.ok(!getProjects("en").some((project) => project.slug === "test-hidden-project"));
allProjects.splice(-2);
assert.deepEqual(allProjects.map((project) => project.slug), originalOrder, "Sorting must not mutate generated data");
console.log(`Project checks passed (${allProjects.length} project files).`);

const { parsePostFilename, selectPostTranslations } = await loadSource("../src/lib/blog-language.ts");
assert.deepEqual(parsePostFilename("my-note.en.mdx"), { slug: "my-note", language: "en" });
assert.deepEqual(parsePostFilename("my-note.zh.md"), { slug: "my-note", language: "zh" });
assert.deepEqual(parsePostFilename("old-note.md"), { slug: "old-note", language: "zh" });
assert.deepEqual(parsePostFilename("old-note", "en"), { slug: "old-note", language: "en" });
for (const path of ["folder/note.en", "bad.name", "UPPER", "note.fr", "note.en.mdx.example"]) assert.throws(() => parsePostFilename(path));
assert.throws(() => parsePostFilename("note.en", "zh"));
const bilingual = [
  { slug: "paired", language: "zh", draft: false, date: "2026-09-15", title: "中文标题", mdx: "中文正文", toc: ["中文目录"] },
  { slug: "paired", language: "en", draft: false, date: "2026-09-15", title: "English title", mdx: "English body", toc: ["English TOC"] },
  { slug: "only-zh", language: "zh", draft: false, date: "2026-09-14", title: "只有中文" },
  { slug: "only-zh", language: "en", draft: true, date: "2026-09-14", title: "Unpublished translation" },
  { slug: "only-en", language: "en", draft: false, date: "2026-09-13", title: "Only English" },
  { slug: "hidden", language: "zh", draft: true, date: "2026-09-16", title: "Hidden" },
];
for (const locale of ["en", "zh"]) {
  const selected = selectPostTranslations(bilingual, locale);
  assert.equal(selected.length, 3, "Translations count as a single article; drafts stay hidden");
  assert.equal(selected[0], bilingual.find((post) => post.slug === "paired" && post.language === locale), "Select title, body and TOC together");
  assert.equal(selected[1].language, "zh", "A draft translation cannot replace its published original");
  assert.equal(selected[2].language, "en", "Fall back to the available language");
  assert.deepEqual(selectPostTranslations([...bilingual].reverse(), locale), selected, "File discovery order must not affect language selection");
}
console.log("Bilingual post checks passed (pairing, fallback, drafts, unique lists).");
