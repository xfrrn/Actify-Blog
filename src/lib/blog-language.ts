import type { Locale } from "./i18n";

export function selectPostTranslations<T extends { slug: string; language: Locale; draft: boolean; date: string }>(entries: T[], locale: Locale) {
  const selected = new Map<string, T>();
  for (const post of entries) {
    if (!post.draft && (!selected.has(post.slug) || post.language === locale)) selected.set(post.slug, post);
  }
  return [...selected.values()].sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug));
}
