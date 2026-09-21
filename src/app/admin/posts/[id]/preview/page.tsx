/* eslint-disable @next/next/no-img-element */
import { requireAdminPage } from "@/lib/admin-page";
import { getContent, CmsError } from "@/lib/cms-store";
import { markdownMetadata } from "@/lib/markdown";
import { MarkdownBody } from "@/components/blog/markdown-body";
import { LanguageProvider } from "@/components/layout/language-provider";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function Preview({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ locale?: string }> }) {
  await requireAdminPage();
  const { id } = await params;
  const locale = (await searchParams).locale === "en" ? "en" : "zh";
  let entry;
  try { entry = getContent("posts", id); } catch (error) { if (error instanceof CmsError && error.status === 404) notFound(); throw error; }
  const post = entry.data[locale]; if (!post) notFound();
  const metadata = markdownMetadata(post.content);
  return <LanguageProvider locale={locale}><div className="mx-auto max-w-2xl px-6 py-12">
    <div className="mb-8 flex items-center justify-between gap-4 border-b pb-4 text-xs text-muted-foreground"><span>草稿预览 · 仅管理员可见 · 展示最近保存的内容</span><Link href={`/admin/posts/${id}`} className="shrink-0 underline">继续编辑</Link></div>
    <h1 lang={locale} className="text-3xl font-semibold leading-tight tracking-tighter md:text-4xl wrap-anywhere">{post.title || "未命名文章"}</h1><p className="mt-4 leading-relaxed text-muted-foreground">{post.description}</p><p className="mt-4 text-sm text-muted-foreground">{post.author || "Actify"} · {post.date} · {metadata.readingMinutes} 分钟阅读 {post.category && `· ${post.category}`}</p>
    <div className="mt-3 flex flex-wrap gap-2">{post.tags.map((tag) => <span key={tag} className="rounded-md border px-2 py-0.5 text-xs">{tag}</span>)}</div>
    {post.cover && <img src={post.cover} alt={post.coverAlt || post.title} className="mt-6 h-auto w-full rounded-xl border" />}
    {!!metadata.toc.length && <details open className="mt-8 rounded-xl border p-4 text-sm"><summary>目录</summary><ul className="mt-3 space-y-2">{metadata.toc.map((item) => <li key={item.id} className={item.depth === 3 ? "pl-4" : ""}><a href={`#${item.id}`} className="text-muted-foreground hover:underline">{item.title}</a></li>)}</ul></details>}
    <article lang={locale} className="prose mt-8 min-w-0 max-w-full border-t pt-8 text-pretty font-sans leading-relaxed text-foreground/90 dark:prose-invert wrap-anywhere"><MarkdownBody content={post.content} /></article>
  </div></LanguageProvider>;
}
