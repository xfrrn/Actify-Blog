import type { Metadata } from "next";
import { LanguageProvider } from "@/components/layout/language-provider";
import { AdminShell } from "@/components/admin/shell";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const metadata: Metadata = {
  title: { default: "内容管理", template: "%s | Actify 内容管理" },
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <LanguageProvider locale="zh"><div lang="zh-CN"><AdminShell>{children}</AdminShell></div></LanguageProvider>;
}
