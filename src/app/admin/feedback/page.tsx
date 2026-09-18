import type { Metadata } from "next";
import FeedbackAdmin from "@/components/home/feedback-admin";

export const metadata: Metadata = {
  title: "反馈审核",
  robots: { index: false, follow: false },
};

export default function FeedbackAdminPage() {
  return (
    <main lang="zh-CN">
      <h1 className="text-2xl font-bold">反馈审核</h1>
      <p className="mt-3 text-sm text-muted-foreground">看看大家遇到了什么麻烦。确认没有隐私信息后，再选择公开。</p>
      <FeedbackAdmin />
    </main>
  );
}
