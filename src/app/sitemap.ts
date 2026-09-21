import type { MetadataRoute } from "next";
import { DATA } from "@/data/site";
import { getPosts } from "@/lib/posts";

export const dynamic = "force-dynamic";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    ...["", "/projects", "/blog"].map((path) => ({ url: `${DATA.url}${path}` })),
    ...getPosts().map((post) => ({
      url: `${DATA.url}/blog/${post.slug}`,
      lastModified: post.updatedAt || post.date,
    })),
  ];
}
