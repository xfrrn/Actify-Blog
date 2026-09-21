"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { Feedback, FeedbackStatus } from "@/lib/feedback";
import { adminApi, jsonBody, message } from "./api";
import { Pagination } from "./content-list";

export function FeedbackList() {
  const [status, setStatus] = useState<FeedbackStatus>("pending"), [page, setPage] = useState(1);
  const [result, setResult] = useState<{ items: Feedback[]; total: number }>({ items: [], total: 0 });
  const [error, setError] = useState(""), [busy, setBusy] = useState(false);
  const request = useRef(0);
  const cancelLoad = useCallback(() => { ++request.current; }, []);
  const load = useCallback(async () => {
    const sequence = ++request.current;
    try { const value = await adminApi<typeof result>(`feedback?status=${status}&page=${page}`); if (sequence === request.current) { setResult(value); setError(""); } }
    catch (error) { if (sequence === request.current) setError(message(error)); }
  }, [status, page]);
  useEffect(() => { void load(); return cancelLoad; }, [load, cancelLoad]);
  async function moderate(id: number, next: "published" | "hidden") {
    setBusy(true);
    try { await adminApi("feedback", jsonBody({ id, status: next })); await load(); window.dispatchEvent(new Event("actify-feedback")); }
    catch (error) { setError(message(error)); } finally { setBusy(false); }
  }
  return <div className="admin-page"><h1 className="admin-title">读者反馈</h1><p className="admin-muted mt-2">看看大家遇到了什么麻烦。确认没有隐私信息后，再选择公开。</p>
    <div className="mt-9 flex gap-6 border-b">{([["pending", "待审核"], ["published", "已公开"], ["hidden", "不公开"]] as const).map(([value, label]) => <button key={value} disabled={busy} aria-pressed={status === value} className={`border-b-2 pb-4 text-sm ${status === value ? "border-foreground font-medium" : "border-transparent text-muted-foreground"}`} onClick={() => { setStatus(value); setPage(1); }}>{label}</button>)}</div>
    {error && <p role="alert" className="mt-4 text-sm text-destructive">{error} <button onClick={load} className="underline">重试</button> <a href="/admin/login" target="_blank" rel="noreferrer" className="underline">重新登录</a></p>}
    <ul className="divide-y">{result.items.map((item) => <li key={item.id} className="space-y-4 py-7"><p className="text-xs text-muted-foreground">#{item.id} · {item.created_at} UTC · {item.locale === "zh" ? "中文" : "English"}</p><p className="whitespace-pre-wrap break-words text-sm leading-7">{item.pain_point}</p>{item.search_query && <p className="rounded-lg bg-muted/50 px-3 py-2 text-xs leading-relaxed text-muted-foreground">搜索词：{item.search_query}</p>}<div className="flex gap-2">{status !== "published" && <Button size="sm" disabled={busy} onClick={() => moderate(item.id, "published")}>公开到首页</Button>}{status !== "hidden" && <Button size="sm" variant="outline" disabled={busy} onClick={() => moderate(item.id, "hidden")}>{status === "published" ? "撤下" : "不公开"}</Button>}</div></li>)}</ul>
    {!result.items.length && <p className="py-20 text-center text-sm text-muted-foreground">这里暂时没有反馈。</p>}<Pagination page={page} total={result.total} onChange={setPage} />
  </div>;
}
