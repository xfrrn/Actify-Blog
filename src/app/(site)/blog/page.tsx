import type { Metadata } from "next";
import Link from "next/link";
import { getPosts } from "@/lib/posts";
import { filterArchivePosts, getArchiveCategories, groupArchivePosts } from "@/lib/blog-archive";
import { ArchiveTimeline } from "@/components/blog/archive-timeline";
import { PostList } from "@/components/blog/post-list";
import { getLanguage } from "@/lib/server-language";
import { CategoryFilter } from "@/components/blog/category-filter";

type BlogSearchParams = Promise<{ category?: string | string[] }>;
const first = (value: string | string[] | undefined) => ((Array.isArray(value) ? value[0] : value) ?? "").trim();

export async function generateMetadata({ searchParams }: { searchParams: BlogSearchParams }): Promise<Metadata> {
  const { data: DATA, t, locale } = await getLanguage();
  const params = await searchParams;
  return {
    title: t.blog,
    description: DATA.blog.description,
    alternates: { canonical: "/blog", types: { "application/rss+xml": `${DATA.url}/rss.xml` } },
    openGraph: { title: `${t.blog} | ${DATA.name}`, description: DATA.blog.description, url: "/blog", locale: locale === "zh" ? "zh_CN" : "en_US", images: ["/blog/opengraph-image"] },
    twitter: { card: "summary_large_image", title: `${t.blog} | ${DATA.name}`, description: DATA.blog.description, images: ["/blog/opengraph-image"] },
    ...(first(params.category) ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function BlogPage({ searchParams }: { searchParams: BlogSearchParams }) {
  const { data: DATA, t, locale } = await getLanguage();
  const params = await searchParams;
  const category = first(params.category);
  const posts = await getPosts(locale);
  const filtered = filterArchivePosts(posts, category);
  // ponytail: render the whole archive; split by year if its size slows the initial load.
  const groups = groupArchivePosts(filtered, locale);
  const categories = getArchiveCategories(posts);

  return (
    <main id="blog">
      <header className="mb-8">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h1 className="text-3xl font-semibold tracking-tight">{t.blog}</h1>
          <a href="/rss.xml" className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground">RSS</a>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">{DATA.blog.description}</p>
      </header>

      <div className="mb-6 flex flex-col gap-2 border-y py-5">
        <p className="text-xs font-medium text-muted-foreground">{t.category}</p>
        <CategoryFilter key={category} categories={categories} selected={category} total={posts.length} />
      </div>

      <div className="mb-6 flex items-center justify-between gap-3 text-sm text-muted-foreground">
        <p role="status">{filtered.length} {locale === "en" && filtered.length === 1 ? "post" : t.posts}{category && ` · ${category}`}</p>
        {category && <Link href="/blog" className="shrink-0 underline underline-offset-4 hover:text-foreground">{t.clear}</Link>}
      </div>

      <ArchiveTimeline key={category} months={groups.map(({ id, label, posts }) => ({ id, label, count: posts.length }))}>
        {groups.length ? (
          <div className="space-y-12 border-l pl-5 sm:pl-6">
            {groups.map((group) => (
              <section key={group.id} id={group.id} aria-labelledby={`${group.id}-heading`} className="relative scroll-mt-28 sm:scroll-mt-12">
                <span aria-hidden className="absolute -left-[1.5625rem] top-2 size-2 rounded-full bg-foreground sm:-left-[1.8125rem]" />
                <h2 id={`${group.id}-heading`} className="mb-6 text-lg font-semibold tabular-nums">{group.label}</h2>
                <PostList locale={locale} posts={group.posts} numbered={false} />
              </section>
            ))}
          </div>
        ) : (
          <div className="border-l py-8 pl-5 sm:pl-6">
            <h2 className="mb-2 text-base font-medium">{category ? t.emptyCategory : t.firstPost}</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">{category ? t.clearHint : t.emptyHint}</p>
          </div>
        )}
      </ArchiveTimeline>
    </main>
  );
}
