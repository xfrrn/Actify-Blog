import { publishedContent } from "./cms-store.ts";
import { selectPostTranslations } from "./blog-language.ts";
import { markdownMetadata } from "./markdown.ts";
import type { Locale } from "./i18n";

export function getPosts(locale: Locale = "en") {
  const translations = publishedContent("posts").flatMap((entry) =>
    Object.entries(entry.published!).map(([language, post]) => ({ ...post, slug: entry.slug, language: language as Locale, draft: false, ...markdownMetadata(post.content) })));
  return selectPostTranslations(translations, locale);
}
export type Post = ReturnType<typeof getPosts>[number];
export function getPost(slug: string, locale: Locale = "en") {
  return getPosts(locale).find((post) => post.slug === slug);
}
