import { defineCollection, defineConfig } from "@content-collections/core";
import { compileMDX } from "@content-collections/mdx";
import remarkGfm from "remark-gfm";
import { z } from "zod";
import { remarkCodeMeta, type PostContentMetadata } from "./src/lib/remark-code-meta";
import { parsePostFilename } from "./src/lib/blog-language";

const posts = defineCollection({
  name: "posts",
  directory: "content/blog",
  include: "*.{md,mdx}",
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
    language: z.enum(["en", "zh"]).optional(),
    // Keep the original template's frontmatter valid.
    publishedAt: z.iso.date().optional(),
    summary: z.string().min(1).optional(),
    image: z.string().optional(),
    content: z.string(),
  }).refine((post) => post.date || post.publishedAt, "Add date (YYYY-MM-DD)")
    .refine((post) => post.description || post.summary, "Add description"),
  transform: async (document, context) => {
    const { slug, language } = parsePostFilename(document._meta.path, document.language);
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
      language,
      date: (document.date ?? document.publishedAt)!,
      description: (document.description ?? document.summary)!,
      cover: document.cover ?? document.image,
    };
  },
  onSuccess: (posts) => {
    if (new Set(posts.map((post) => `${post.slug}:${post.language}`)).size !== posts.length) {
      throw new Error("Each blog slug can have only one file per language, across .md and .mdx files.");
    }
  },
});

const projects = defineCollection({
  name: "projects",
  directory: "content/projects",
  include: "*.md",
  schema: z.object({
    name: z.string().min(1),
    description: z.object({ en: z.string().min(1), zh: z.string().min(1) }),
    technologies: z.array(z.string().min(1)).default([]),
    dates: z.string().optional(),
    image: z.string().optional(),
    video: z.string().optional(),
    github: z.string().optional(),
    demo: z.string().optional(),
    status: z.enum(["Building", "Live", "Archived"]).optional(),
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),
    order: z.number().int().default(100),
    content: z.string(),
  }),
  transform: (document) => ({
    ...document,
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use a lowercase, hyphenated project filename")
      .parse(document._meta.path.replace(/\.md$/, "")),
  }),
});

export default defineConfig({ collections: [posts, projects] });
