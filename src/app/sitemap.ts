import type { MetadataRoute } from "next";
import { DATA } from "@/data/resume";
import { posts } from "@/lib/posts";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    ...["", "/projects", "/blog"].map((path) => ({ url: `${DATA.url}${path}` })),
    ...posts.map((post) => ({
      url: `${DATA.url}/blog/${post.slug}`,
      lastModified: post.updatedAt || post.date,
    })),
  ];
}
