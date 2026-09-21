"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { ArrowUpRight, LogOut } from "lucide-react";
import { ModeToggle } from "@/components/layout/mode-toggle";
import { Button } from "@/components/ui/button";
import { adminApi, message } from "./api";

const DirtyContext = createContext({ dirty: false, setDirty: (_value: boolean) => {} });
export const useUnsavedChanges = () => useContext(DirtyContext);
export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [dirty, setDirty] = useState(false);
  const [pending, setPending] = useState(0);
  const [error, setError] = useState("");
  const isLogin = pathname === "/admin/login";
  useEffect(() => {
    if (isLogin) return;
    const refresh = () => { void adminApi<{ pending: number }>("session").then((value) => setPending(value.pending)).catch(() => {}); };
    refresh(); window.addEventListener("actify-feedback", refresh);
    return () => window.removeEventListener("actify-feedback", refresh);
  }, [pathname, isLogin]);
  useEffect(() => {
    if (!dirty) return;
    const unload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    const click = (event: MouseEvent) => {
      const anchor = (event.target as Element)?.closest("a[href]") as HTMLAnchorElement | null;
      if (anchor && anchor.target !== "_blank" && anchor.href !== location.href && !window.confirm("还有未保存的修改，确定离开吗？")) { event.preventDefault(); event.stopPropagation(); }
    };
    window.addEventListener("beforeunload", unload); document.addEventListener("click", click, true);
    return () => { window.removeEventListener("beforeunload", unload); document.removeEventListener("click", click, true); };
  }, [dirty]);
  async function signOut() {
    if (dirty && !window.confirm("还有未保存的修改，确定退出吗？")) return;
    try { await adminApi("logout", { method: "POST" }); setDirty(false); router.push("/admin/login"); router.refresh(); }
    catch (error) { setError(message(error)); }
  }
  return <DirtyContext.Provider value={{ dirty, setDirty }}>
    <header className="border-b bg-background">
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-x-8 gap-y-3 px-5 pt-5 sm:px-8">
        <Link href="/admin" className="pb-4 text-sm font-semibold tracking-tight">Actify <span className="ml-1 font-normal text-muted-foreground">/ 内容管理</span></Link>
        {!isLogin && <nav aria-label="后台导航" className="order-3 flex w-full gap-7 text-sm sm:order-none sm:w-auto">
          {[["posts", "文章"], ["projects", "作品"], ["feedback", "反馈"], ["media", "素材"]].map(([slug, label]) => <Link key={slug} href={`/admin/${slug}`} aria-current={pathname.startsWith(`/admin/${slug}`) ? "page" : undefined} className={`border-b-2 pb-4 transition-colors ${pathname.startsWith(`/admin/${slug}`) ? "border-foreground font-medium" : "border-transparent text-muted-foreground hover:text-foreground"}`}>{label}{slug === "feedback" && pending > 0 && <span className="ml-1.5 font-mono text-xs">{pending}</span>}</Link>)}
        </nav>}
        <div className="ml-auto flex items-center gap-1 pb-4">
          <a href="/" target="_blank" rel="noreferrer" className="mr-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">查看网站<ArrowUpRight className="size-3" /></a>
          <ModeToggle />
          {!isLogin && <Button variant="ghost" size="icon" aria-label="退出登录" onClick={signOut}><LogOut className="size-4" /></Button>}
        </div>
      </div>
    </header>
    {error && <p role="alert" className="mx-auto max-w-[960px] px-5 pt-4 text-sm text-destructive">{error}</p>}
    <main id="main-content" className="min-w-0">{children}</main>
  </DirtyContext.Provider>;
}
