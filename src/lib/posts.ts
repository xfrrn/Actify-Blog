import { allPosts } from "content-collections";
import { selectPostTranslations } from "./blog-language";
import type { Locale } from "./i18n";

export function getPosts(locale: Locale = "en") {
  return selectPostTranslations(allPosts, locale);
}

// Public feeds and the sitemap use one entry per article, preferring English.
export const posts = getPosts();

export function getPost(slug: string, locale: Locale = "en") {
  return getPosts(locale).find((post) => post.slug === slug);
}
