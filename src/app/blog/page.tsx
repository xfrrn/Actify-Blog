import BlurFade from "@/components/magicui/blur-fade";
import { posts } from "@/lib/posts";
import Link from "next/link";
import type { Metadata } from "next";
import { paginate, normalizePage } from "@/lib/pagination";
import { PostList } from "@/components/blog/post-list";
import { DATA } from "@/data/site";

const blogMetadata: Metadata = {
  title: "Blog",
  description: DATA.blog.description,
  openGraph: { title: `Blog | ${DATA.name}`, description: DATA.blog.description, url: "/blog" },
  twitter: { card: "summary_large_image", title: `Blog | ${DATA.name}`, description: DATA.blog.description },
};

const PAGE_SIZE = 5;
const BLUR_FADE_DELAY = 0.04;

type BlogSearchParams = Promise<{ page?: string | string[] }>;

function getPage(page: string | string[] | undefined) {
  return normalizePage(Array.isArray(page) ? page[0] : page, Math.ceil(posts.length / PAGE_SIZE));
}

export async function generateMetadata({ searchParams }: { searchParams: BlogSearchParams }): Promise<Metadata> {
  const page = getPage((await searchParams).page);
  const canonical = page > 1 ? `/blog?page=${page}` : "/blog";
  return {
    ...blogMetadata,
    alternates: { canonical, types: { "application/rss+xml": `${DATA.url}/rss.xml` } },
    openGraph: { ...blogMetadata.openGraph, url: canonical },
  };
}

export default async function BlogPage({ searchParams }: {
  searchParams: BlogSearchParams;
}) {
  const { page: pageParam } = await searchParams;
  const currentPage = getPage(pageParam);
  const { items: paginatedPosts, pagination } = paginate(posts, { page: currentPage, pageSize: PAGE_SIZE });

  return (
    <main id="blog">
      <BlurFade delay={BLUR_FADE_DELAY}>
        <div className="flex items-center justify-between gap-3 mb-2">
          <h1 className="text-2xl font-semibold tracking-tight">Blog <span className="ml-1 bg-card border border-border rounded-md px-2 py-1 text-muted-foreground text-sm">{posts.length} posts</span></h1>
          <a href="/rss.xml" className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4">RSS</a>
        </div>
        <p className="text-sm text-muted-foreground mb-8">{DATA.blog.description}</p>
      </BlurFade>

      {paginatedPosts.length > 0 ? (
        <>
          <PostList posts={paginatedPosts} startIndex={(pagination.page - 1) * PAGE_SIZE} />
          {pagination.totalPages > 1 && (
            <BlurFade delay={BLUR_FADE_DELAY * 4}>
              <nav aria-label="Blog pagination" className="flex gap-3 flex-wrap items-center justify-between mt-8">
                <div className="text-sm text-muted-foreground">Page {pagination.page} of {pagination.totalPages}</div>
                <div className="flex gap-2 sm:justify-end">
                  {pagination.hasPreviousPage ? (
                    <Link href={pagination.page === 2 ? "/blog" : `/blog?page=${pagination.page - 1}`} className="h-8 w-fit px-2 flex items-center justify-center text-sm border border-border rounded-lg hover:bg-accent/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">Previous</Link>
                  ) : (
                    <span aria-disabled="true" className="h-8 w-fit px-2 flex items-center justify-center text-sm border border-border rounded-lg opacity-50">Previous</span>
                  )}
                  {pagination.hasNextPage ? (
                    <Link href={`/blog?page=${pagination.page + 1}`} className="h-8 w-fit px-2 flex items-center justify-center text-sm border border-border rounded-lg hover:bg-accent/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">Next</Link>
                  ) : (
                    <span aria-disabled="true" className="h-8 w-fit px-2 flex items-center justify-center text-sm border border-border rounded-lg opacity-50">Next</span>
                  )}
                </div>
              </nav>
            </BlurFade>
          )}
        </>
      ) : (
        <BlurFade delay={BLUR_FADE_DELAY * 2}>
          <div className="py-12 px-4 border border-border rounded-xl text-muted-foreground text-center">No blog posts yet. Check back soon!</div>
        </BlurFade>
      )}
    </main>
  );
}
