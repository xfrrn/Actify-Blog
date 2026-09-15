import Link from "next/link";
import { ChevronRight } from "lucide-react";
import BlurFade from "@/components/magicui/blur-fade";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import type { posts as blogPosts } from "@/lib/posts";

import { messages, type Locale } from "@/lib/i18n";

// The original blog row, shared by the archive and Latest Writing.
export function PostList({ posts, startIndex = 0, numbered = true, locale = "en" }: { locale?: Locale; posts: typeof blogPosts; startIndex?: number; numbered?: boolean }) {
  const t = messages[locale];
  return (
    <div className="flex flex-col gap-6">
      {posts.map((post, index) => (
        <BlurFade delay={0.12 + index * 0.05} key={post.slug}>
          <Link href={`/blog/${post.slug}`} className="group flex items-start gap-x-2 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
            {numbered && <span className="mt-[5px] text-xs font-mono tabular-nums font-medium">{String(startIndex + index + 1).padStart(2, "0")}.</span>}
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <h3 className="text-lg font-medium tracking-tight wrap-anywhere">{post.title}<ChevronRight className="ml-1 inline-block size-4 text-muted-foreground opacity-0 -translate-x-2 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0" aria-hidden /></h3>
              <p className="text-sm leading-relaxed text-muted-foreground wrap-anywhere">{post.description}</p>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <time dateTime={post.date}>{formatDate(post.date, locale)}</time>
                <span>{post.readingMinutes} {t.minRead}</span>
                {post.category && <span>{post.category}</span>}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {post.tags.map((tag) => <Badge key={tag} variant="secondary" className="text-[11px]">{tag}</Badge>)}
              </div>
            </div>
          </Link>
        </BlurFade>
      ))}
    </div>
  );
}
