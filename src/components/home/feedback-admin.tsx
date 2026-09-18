"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import type { Feedback, FeedbackStatus } from "@/lib/feedback";

const labels = { pending: "待审核", published: "已公开", hidden: "不公开" };

function errorMessage(status: number) {
  return status === 401 ? "管理密码不对，请重新输入。" : status === 429 ? "尝试得有点频繁，请一分钟后再试。" : "暂时没能完成操作，请稍后重试。若一直如此，请检查数据库和管理密码配置。";
}

export default function FeedbackAdmin() {
  const [token, setToken] = useState("");
  const [items, setItems] = useState<Feedback[]>([]);
  const [status, setStatus] = useState<FeedbackStatus>("pending");
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function load(secret: string, filter: FeedbackStatus, before?: number) {
    setBusy(true);
    setMessage("");
    try {
      const query = new URLSearchParams({ status: filter, ...(before ? { before: String(before) } : {}) });
      const response = await fetch(`/api/feedback/admin?${query}`, {
        headers: { Authorization: `Bearer ${secret}` }, cache: "no-store", signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) throw new Error(errorMessage(response.status));
      const data: { items: Feedback[]; nextCursor: number | null } = await response.json();
      setToken(secret);
      setStatus(filter);
      setItems((previous) => before ? [...previous, ...data.items] : data.items);
      setNextCursor(data.nextCursor);
    } catch (error) {
      setMessage(error instanceof Error && error.name === "Error" ? error.message : "加载失败，请稍后再试。");
    } finally {
      setBusy(false);
    }
  }

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const secret = String(new FormData(form).get("password") || "").trim();
    await load(secret, "pending");
    form.reset();
  }

  async function moderate(id: number, next: "published" | "hidden") {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/feedback/admin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id, status: next }), signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) throw new Error(errorMessage(response.status));
      setItems((previous) => previous.filter((item) => item.id !== id));
      setMessage(next === "published" ? "已公开，会显示在首页底部。" : "已设为不公开，网页上不会展示。");
    } catch (error) {
      setMessage(error instanceof Error && error.name === "Error" ? error.message : "暂时无法确认操作结果，请刷新列表查看。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6" aria-busy={busy}>
      {!token ? (
        <form onSubmit={login} className="space-y-4">
          <label htmlFor="feedback-admin-password" className="block text-sm font-medium">管理密码</label>
          <input id="feedback-admin-password" name="password" type="password" autoComplete="current-password" required minLength={32} maxLength={256} disabled={busy}
            className="block w-full rounded-md border bg-background px-3 py-2.5 focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2" />
          <Button type="submit" disabled={busy}>{busy ? "正在打开…" : "打开审核列表"}</Button>
          <p className="text-xs text-muted-foreground">密码仅在当前页面使用，刷新或退出后需要重新输入。</p>
        </form>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            {(Object.keys(labels) as FeedbackStatus[]).map((filter) => (
              <Button key={filter} variant={filter === status ? "default" : "outline"} aria-pressed={filter === status} disabled={busy} onClick={() => load(token, filter)}>{labels[filter]}</Button>
            ))}
            <Button variant="ghost" disabled={busy} onClick={() => { setToken(""); setItems([]); setNextCursor(null); setMessage(""); }}>退出</Button>
          </div>
          {items.length === 0 && <p className="my-8 text-sm text-muted-foreground">这里暂时没有反馈。</p>}
          <ul className="mt-6 divide-y">
            {items.map((item) => (
              <li key={item.id} className="space-y-3 py-5 first:pt-0">
                <p className="text-xs text-muted-foreground">#{item.id} · {item.created_at} UTC · {item.locale === "zh" ? "中文" : "English"}</p>
                <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{item.pain_point}</p>
                {item.search_query && <p className="break-words text-sm text-muted-foreground">搜索词：{item.search_query}</p>}
                <div className="flex gap-2">
                  {status !== "published" && <Button disabled={busy} onClick={() => moderate(item.id, "published")}>公开</Button>}
                  {status !== "hidden" && <Button variant="outline" disabled={busy} onClick={() => moderate(item.id, "hidden")}>{status === "published" ? "撤下" : "不公开"}</Button>}
                </div>
              </li>
            ))}
          </ul>
          {nextCursor && <Button variant="outline" disabled={busy} onClick={() => load(token, status, nextCursor)}>再看一些</Button>}
        </>
      )}
      <p role="status" aria-live="polite" aria-atomic="true" className="mt-4 text-sm leading-relaxed">{busy ? "正在处理…" : message}</p>
    </div>
  );
}
