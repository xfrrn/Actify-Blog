import { defineCollection, defineConfig } from "@content-collections/core";
import { compileMDX } from "@content-collections/mdx";
import remarkGfm from "remark-gfm";
import { z } from "zod";
import { remarkCodeMeta, type PostContentMetadata } from "./src/lib/remark-code-meta";

const posts = defineCollection({
  name: "posts",
  directory: "content",
  include: "**/*.{md,mdx}",
  schema: z.object({
    title: z.string().min(1),
    description: z.string().min(1).optional(),
    date: z.iso.date().optional(),
    tags: z.array(z.string().min(1)).default([]),
    category: z.string().trim().optional(),
    cover: z.string().optional(),
    coverAlt: z.string().optional(),
    draft: z.boolean().default(false),
    updatedAt: z.iso.date().optional(),
    author: z.string().optional(),
    // Keep the original template's frontmatter valid.
    publishedAt: z.iso.date().optional(),
    summary: z.string().min(1).optional(),
    image: z.string().optional(),
    content: z.string(),
  }).refine((post) => post.date || post.publishedAt, "Add date (YYYY-MM-DD)")
    .refine((post) => post.description || post.summary, "Add description"),
  transform: async (document, context) => {
    const slug = document._meta.path.replace(/\.(md|mdx)$/, "");
    z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use a lowercase, hyphenated filename directly in content/").parse(slug);
    const compiled = await context.cache(document, async (document) => {
      const metadata: PostContentMetadata = { toc: [], readingMinutes: 1 };
      // Cache MDX and its derived metadata together, including on subsequent builds.
      const mdx = document.draft ? "" : await compileMDX(
        { cache: async (input, compute) => compute(input) },
        document,
        { remarkPlugins: [remarkGfm, [remarkCodeMeta, metadata]] },
      );
      return { mdx, ...metadata };
    });
    return {
      ...document,
      ...compiled,
      slug,
      date: (document.date ?? document.publishedAt)!,
      description: (document.description ?? document.summary)!,
      cover: document.cover ?? document.image,
    };
  },
  onSuccess: (posts) => {
    if (new Set(posts.map((post) => post.slug)).size !== posts.length) {
      throw new Error("Blog filenames must have unique slugs across .md and .mdx files.");
    }
  },
});

export default defineConfig({ collections: [posts] });
