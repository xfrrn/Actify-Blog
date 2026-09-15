import type { Locale } from "./i18n";

export function parsePostFilename(path: string, language?: Locale) {
  const match = /^([a-z0-9]+(?:-[a-z0-9]+)*)(?:\.(en|zh))?$/.exec(path.replace(/\.(md|mdx)$/, ""));
  if (!match) throw new Error("Use a filename such as my-note.zh.mdx or my-note.en.md in content/blog/");
  const suffix = match[2] as Locale | undefined;
  if (suffix && language && suffix !== language) throw new Error(`Filename language and language field disagree: ${path}`);
  return { slug: match[1], language: suffix ?? language ?? "zh" };
}

export function selectPostTranslations<T extends { slug: string; language: Locale; draft: boolean; date: string }>(entries: T[], locale: Locale) {
  const selected = new Map<string, T>();
  for (const post of entries) {
    if (!post.draft && (!selected.has(post.slug) || post.language === locale)) selected.set(post.slug, post);
  }
  return [...selected.values()].sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug));
}
