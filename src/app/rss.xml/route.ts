import { DATA } from "@/data/site";
import { posts } from "@/lib/posts";

export const dynamic = "force-static";

function escapeXml(value: string) {
  return value.replace(/[<>&"']/g, (character) => ({
    "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;",
  })[character]!);
}

export function GET() {
  const items = posts.map((post) => {
    const url = escapeXml(`${DATA.url}/blog/${post.slug}`);
    return `<item>
      <title>${escapeXml(post.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <description>${escapeXml(post.description)}</description>
      <pubDate>${new Date(post.date).toUTCString()}</pubDate>
      ${[...(post.category ? [post.category] : []), ...post.tags].map((tag) => `<category>${escapeXml(tag)}</category>`).join("")}
    </item>`;
  }).join("");

  return new Response(`<?xml version="1.0" encoding="UTF-8"?>
    <rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel>
      <title>${escapeXml(DATA.name)} — Blog</title>
      <link>${escapeXml(DATA.url)}/blog</link>
      <description>${escapeXml(DATA.blog.description)}</description>
      <atom:link href="${escapeXml(DATA.url)}/rss.xml" rel="self" type="application/rss+xml" />
      ${items}
    </channel></rss>`, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
