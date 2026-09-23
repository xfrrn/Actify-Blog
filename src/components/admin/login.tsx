"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { adminApi, jsonBody, message } from "./api";

export function LoginForm() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const form = new FormData(event.currentTarget);
      await adminApi("login", jsonBody({ username: form.get("username"), password: form.get("password") }, "POST"));
      router.push("/admin/posts"); router.refresh();
    } catch (error) { setError(message(error)); }
    finally { setBusy(false); }
  }
  return <div className="mx-auto max-w-md px-6 py-20 sm:py-28">
    <h1 className="text-[28px] font-semibold tracking-tight">回到你的写作空间。</h1>
    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">写下新的记录，整理作品，看看读者的反馈。</p>
    <form onSubmit={submit} className="mt-10 space-y-5">
      <label className="admin-field">管理账号<input name="username" required maxLength={128} autoComplete="username" autoCapitalize="none" spellCheck={false} className="admin-input mt-2" /></label>
      <label className="admin-field">管理密码<input name="password" type="password" required maxLength={256} autoComplete="current-password" className="admin-input mt-2" /></label>
      <Button type="submit" className="h-11 w-full gap-2" disabled={busy}>{busy ? "正在登录…" : "进入后台"}<ArrowRight className="size-4" /></Button>
      {error && <p role="alert" className="text-sm leading-relaxed text-destructive">{error}</p>}
    </form>
  </div>;
}
