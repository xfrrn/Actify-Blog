import { publishedContent } from "./cms-store.ts";
import { selectPostTranslations } from "./blog-language.ts";
import { markdownMetadata } from "./markdown.ts";
import type { Locale } from "./i18n";

export async function getPosts(locale: Locale = "en") {
  const translations = (await publishedContent("posts")).flatMap((entry) =>
    Object.entries(entry.published!).map(([language, post]) => ({ ...post, slug: entry.slug, language: language as Locale, draft: false, ...markdownMetadata(post.content) })));
  return selectPostTranslations(translations, locale);
}
export type Post = Awaited<ReturnType<typeof getPosts>>[number];
export async function getPost(slug: string, locale: Locale = "en") {
  return (await getPosts(locale)).find((post) => post.slug === slug);
}
