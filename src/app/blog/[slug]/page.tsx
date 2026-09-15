/* eslint-disable @next/next/no-img-element */
import { posts, getPost } from "@/lib/posts";
import { formatDate } from "@/lib/utils";
import { DATA } from "@/data/site";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MDXContent } from "@content-collections/mdx/react";
import { mdxComponents } from "@/mdx-components";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export async function generateStaticParams() {
  return posts.map((post) => ({
    slug: post.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{
    slug: string;
  }>;
}): Promise<Metadata | undefined> {
  const { slug } = await params;
  const post = getPost(slug);

  if (!post) {
    return undefined;
  }

  const { title, description } = post;
  const image = new URL(post.cover || `/blog/${slug}/opengraph-image`, DATA.url).href;

  return {
    title,
    description,
    authors: [{ name: post.author || DATA.name, url: DATA.url }],
    keywords: post.tags,
    alternates: { canonical: `/blog/${slug}`, types: { "application/rss+xml": `${DATA.url}/rss.xml` } },
    openGraph: {
      title,
      description,
      type: "article",
      publishedTime: new Date(post.date).toISOString(),
      modifiedTime: new Date(post.updatedAt || post.date).toISOString(),
      authors: [post.author || DATA.name],
      tags: post.tags,
      section: post.category,
      url: `${DATA.url}/blog/${slug}`,
      images: [{ url: image, alt: post.coverAlt || title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export default async function Blog({
  params,
}: {
  params: Promise<{
    slug: string;
  }>;
}) {
  const { slug } = await params;
  const sortedPosts = posts;
  const currentIndex = sortedPosts.findIndex(
    (p) => p.slug === slug
  );
  const post = sortedPosts[currentIndex];

  if (!post) {
    notFound();
  }

  const previousPost = currentIndex > 0 ? sortedPosts[currentIndex - 1] : null;
  const nextPost = currentIndex < sortedPosts.length - 1 ? sortedPosts[currentIndex + 1] : null;

  const getSlug = (post: (typeof sortedPosts)[0]) =>
    post.slug;

  const jsonLdContent = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    datePublished: post.date,
    dateModified: post.updatedAt || post.date,
    description: post.description,
    image: new URL(post.cover || `/blog/${slug}/opengraph-image`, DATA.url).href,
    url: `${DATA.url}/blog/${slug}`,
    author: {
      "@type": "Person",
      name: post.author || DATA.name,
      url: DATA.url,
    },
    mainEntityOfPage: `${DATA.url}/blog/${slug}`,
    articleSection: post.category,
    keywords: post.tags.join(", "),
    timeRequired: `PT${post.readingMinutes}M`,
  }).replace(/</g, "\\u003c");

  return (
    <main id="blog" className="min-w-0">
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: jsonLdContent,
        }}
      />
      <div className="flex justify-start gap-4 items-center">
        <Link href="/blog" className="text-sm text-muted-foreground hover:text-foreground transition-colors border border-border rounded-lg px-2 py-1 inline-flex items-center gap-1 mb-6 group" aria-label="Back to Blog">
          <ChevronLeft className="size-3 group-hover:-translate-x-px transition-transform" />
          Back to Blog
        </Link>
      </div>
      <div className="flex flex-col gap-4">
        <h1 className="title font-semibold text-3xl md:text-4xl tracking-tighter leading-tight wrap-anywhere">
          {post.title}
        </h1>
        <p className="text-muted-foreground leading-relaxed wrap-anywhere">{post.description}</p>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <span>{post.author || DATA.name}</span>
          <time dateTime={post.date}>{formatDate(post.date)}</time>
          <span>{post.readingMinutes} min read</span>
          <span>{post.category}</span>
          {post.updatedAt && post.updatedAt !== post.date && <span>Updated <time dateTime={post.updatedAt}>{formatDate(post.updatedAt)}</time></span>}
        </div>
        <div className="flex flex-wrap gap-1.5">{post.tags.map((tag) => <Badge key={tag} variant="secondary">{tag}</Badge>)}</div>
      </div>
      {post.cover && <img src={post.cover} alt={post.coverAlt || post.title} className="mt-6 w-full h-auto rounded-xl border" />}
      {post.toc.length > 0 && (
        <details open className="mt-8 border border-border rounded-xl p-4 text-sm">
          <summary className="cursor-pointer font-medium">On this page</summary>
          <nav aria-label="Table of contents" className="mt-3">
            <ul className="space-y-2">
              {post.toc.map((heading) => (
                <li key={heading.id} className={heading.depth === 3 ? "pl-4" : ""}>
                  <a href={`#${heading.id}`} className="text-muted-foreground hover:text-foreground underline-offset-4 hover:underline wrap-anywhere">{heading.title}</a>
                </li>
              ))}
            </ul>
          </nav>
        </details>
      )}
      <div className="my-6 flex w-full items-center">
        <div
          className="flex-1 h-px bg-border"
          style={{
            maskImage:
              "linear-gradient(90deg, transparent, black 8%, black 92%, transparent)",
            WebkitMaskImage:
              "linear-gradient(90deg, transparent, black 8%, black 92%, transparent)",
          }}
        />
      </div>
      <article className="prose min-w-0 max-w-full text-pretty font-sans leading-relaxed text-foreground/90 dark:prose-invert wrap-anywhere">
        <MDXContent code={post.mdx} components={mdxComponents} />
      </article>

      <nav aria-label="Adjacent articles" className="mt-12 pt-8 max-w-2xl">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          {previousPost ? (
            <Link
              href={`/blog/${getSlug(previousPost)}`}
              className="group flex-1 flex flex-col gap-1 p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors"
            >
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <ChevronLeft className="size-3" />
                Previous
              </span>
              <span className="text-sm font-medium group-hover:text-foreground transition-colors whitespace-normal wrap-break-word">
                {previousPost.title}
              </span>
            </Link>
          ) : (
            <div className="hidden sm:block flex-1" />
          )}

          {nextPost ? (
            <Link
              href={`/blog/${getSlug(nextPost)}`}
              className="group flex-1 flex flex-col gap-1 p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors text-right"
            >
              <span className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
                Next
                <ChevronRight className="size-3" />
              </span>
              <span className="text-sm font-medium group-hover:text-foreground transition-colors whitespace-normal wrap-break-word">
                {nextPost.title}
              </span>
            </Link>
          ) : (
            <div className="hidden sm:block flex-1" />
          )}
        </div>
      </nav>
    </main>
  );
}
