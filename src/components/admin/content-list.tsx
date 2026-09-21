"use client";
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, ArrowUpRight, FileText, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Kind, ContentRecord, PostData, ProjectData } from "@/lib/cms-types";
import { adminApi, jsonBody, message } from "./api";

export function Pagination({ page, total, pageSize = 20, onChange }: { page: number; total: number; pageSize?: number; onChange: (page: number) => void }) {
  return <div className="mt-6 flex items-center justify-between text-xs text-muted-foreground">
    <span>共 {total} 条 · 第 {page} / {Math.max(1, Math.ceil(total / pageSize))} 页</span>
    <div className="flex gap-2"><Button variant="outline" size="sm" aria-label="上一页" disabled={page <= 1} onClick={() => onChange(page - 1)}><ChevronLeft className="size-4" /></Button><Button variant="outline" size="sm" aria-label="下一页" disabled={page * pageSize >= total} onClick={() => onChange(page + 1)}><ChevronRight className="size-4" /></Button></div>
  </div>;
}
export function ContentList({ kind }: { kind: Kind }) {
  const router = useRouter();
  const [result, setResult] = useState<{ items: ContentRecord[]; total: number; categories: string[] }>({ items: [], total: 0, categories: [] });
  const [q, setQ] = useState(""); const [status, setStatus] = useState("all");
  const [category, setCategory] = useState(""); const [locale, setLocale] = useState("");
  const [page, setPage] = useState(1); const [error, setError] = useState("");
  const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false);
  const request = useRef(0);
  const cancelLoad = useCallback(() => { ++request.current; }, []);
  const query = new URLSearchParams({ q, status, category, locale, page: String(page) }).toString();
  const load = useCallback(async () => {
    const sequence = ++request.current;
    setLoading(true);
    try { const value = await adminApi<typeof result>(`${kind}?${query}`); if (sequence === request.current) { setResult(value); setError(""); } }
    catch (error) { if (sequence === request.current) setError(message(error)); } finally { if (sequence === request.current) setLoading(false); }
  }, [kind, query]);
  useEffect(() => { const timer = setTimeout(() => void load(), 200); return () => { cancelLoad(); clearTimeout(timer); }; }, [load, cancelLoad]);
  async function create() {
    setBusy(true); try { const entry = await adminApi<ContentRecord>(kind, { method: "POST" }); router.push(`/admin/${kind}/${entry.id}`); }
    catch (error) { setError(message(error)); setBusy(false); }
  }
  async function change(entry: ContentRecord, action: "trash" | "restore") {
    if (action === "trash" && !confirm("移入回收站后将从网站撤下，之后可以恢复为草稿。确定继续吗？")) return;
    setBusy(true);
    try { await adminApi(`${kind}/${entry.id}`, jsonBody({ version: entry.version, action })); await load(); }
    catch (error) { setError(message(error)); } finally { setBusy(false); }
  }
  const title = kind === "posts" ? "文章" : "作品";
  return <div className="admin-page">
    <div className="flex items-start justify-between gap-4"><div><h1 className="admin-title">{title}</h1><p className="admin-muted mt-2">{kind === "posts" ? "记录想法，慢慢写，把完成的内容分享出去。" : "整理你做过的工具，让作品自己说话。"}</p></div><Button onClick={create} disabled={busy} className="shrink-0 gap-1.5"><Plus className="size-4" />新建{title}</Button></div>
    <fieldset disabled={busy} className="mt-9 flex flex-wrap items-center gap-3 border-y py-4"><legend className="sr-only">筛选内容</legend>
      <div className="relative min-w-[180px] flex-1"><Search className="absolute left-3 top-3 size-4 text-muted-foreground" /><input aria-label={`搜索${title}`} value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder={`搜索${title}标题…`} className="admin-input pl-9" /></div>
      <select aria-label="发布状态" className="admin-input w-auto" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}><option value="all">全部状态</option><option value="draft">草稿</option><option value="published">已发布</option><option value="trash">回收站</option></select>
      {kind === "posts" && <><select aria-label="分类" className="admin-input w-auto max-w-[180px]" value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }}><option value="">全部分类</option>{result.categories.map((name) => <option key={name}>{name}</option>)}</select><select aria-label="语言" className="admin-input w-auto" value={locale} onChange={(e) => { setLocale(e.target.value); setPage(1); }}><option value="">全部语言</option><option value="zh">中文</option><option value="en">English</option></select></>}
    </fieldset>
    {error && <p role="alert" className="mt-5 text-sm text-destructive">{error} <button className="underline" onClick={load}>重试</button> <a className="underline" href="/admin/login" target="_blank" rel="noreferrer">重新登录</a></p>}
    <div aria-busy={loading} className="divide-y">
      {result.items.map((entry) => {
        const post = entry.data as PostData, project = entry.data as ProjectData;
        const name = kind === "posts" ? post.zh?.title || post.en?.title || "未命名文章" : project.name || "未命名作品";
        return <div key={entry.id} className="group flex flex-col items-start gap-4 py-6 sm:flex-row sm:flex-wrap sm:items-center">
          {kind === "projects" && <div className="flex h-14 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted">{project.image ? <img alt="" src={project.image} className="size-full object-cover" /> : <FileText className="size-5 text-muted-foreground" />}</div>}
          <div className="min-w-0 w-full flex-1 sm:w-auto sm:basis-[220px]"><Link href={`/admin/${kind}/${entry.id}`} className="text-base font-medium tracking-tight break-words hover:underline underline-offset-4">{name}</Link><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {kind === "posts" ? (["zh", "en"] as const).map((lang) => <span key={lang}>{lang === "zh" ? "中文" : "EN"} · {(entry.published as PostData)?.[lang] ? "已发布" : post[lang] ? "草稿" : "未创建"}</span>) : <><span>{entry.published ? "已公开" : "草稿"}</span>{project.featured && <span>首页精选</span>}</>}
            <time dateTime={entry.updatedAt}>{new Date(entry.updatedAt).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}</time>
          </div></div>
          <div className="flex items-center gap-3 text-xs"><Link href={`/admin/${kind}/${entry.id}`} className="hover:underline">编辑</Link>{entry.published && <a href={kind === "posts" ? `/blog/${entry.slug}` : `/projects#${entry.slug}`} target="_blank" rel="noreferrer" aria-label={`查看${name}`}><ArrowUpRight className="size-4" /></a>}<button disabled={busy} className="text-muted-foreground hover:text-foreground disabled:opacity-50" onClick={() => change(entry, entry.deletedAt ? "restore" : "trash")}>{entry.deletedAt ? "恢复为草稿" : "移入回收站"}</button></div>
        </div>;
      })}
    </div>
    {!result.items.length && !error && <div className="py-20 text-center"><FileText className="mx-auto mb-4 size-7 text-muted-foreground" /><p className="text-sm">{loading ? "正在读取…" : status === "trash" ? "回收站是空的。" : "没有找到内容。"}</p><p className="mt-2 text-xs text-muted-foreground">{!loading && "试试其他筛选条件，或开始一篇新的记录。"}</p></div>}
    <Pagination page={page} total={result.total} onChange={setPage} />
  </div>;
}
