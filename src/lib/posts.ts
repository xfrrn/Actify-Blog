import { allPosts } from "content-collections";

export const posts = allPosts
  .filter((post) => !post.draft)
  .sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug));

export function getPost(slug: string) {
  return posts.find((post) => post.slug === slug);
}
