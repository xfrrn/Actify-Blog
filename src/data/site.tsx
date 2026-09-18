import { Icons } from "@/components/icons/social";
import { HomeIcon, FolderGit2, NotebookIcon, Hammer, BookOpen, Compass } from "lucide-react";
import type { ReactNode } from "react";
import type { Locale } from "@/lib/i18n";

// Fill in your public contact details here. Empty links are not rendered.
const github = "https://github.com/xfrrn";
const email = "actify_top@foxmail.com";

const chineseData = {
  name: "Actify",
  initials: "A",
  url: "https://actify.cc",
  roles: ["创业者", "论文 maker", "出海 SEO 践行者"],
  description: "大学在读，也在创业。喜欢做些小工具，最近在学习和实践出海 SEO。",
  summary: "我是 Actify，一名正在创业的在读大学生，也是论文 maker、出海 SEO 践行者。喜欢做些小工具，把自己的想法动手做出来。\n\n这里记录我的学习、生活和工作，也放一些作品和博客。希望通过这些记录，认识同样在做工具、写论文或尝试出海的朋友。",
  avatarUrl: `${github}.png?size=256`,
  now: {
    updatedAt: "2026-09-15",
    items: [
      { label: "最近的工具", title: "Obsidian PDF 划词翻译", description: "在 Obsidian 里阅读 PDF 时，选中单词或段落就能翻译，支持接入自己的模型。", icon: Hammer },
      { label: "正在学", title: "出海 SEO", description: "学习如何让海外用户通过搜索找到自己做的工具，并在实际做站的过程中尝试。", icon: Compass },
      { label: "正在整理", title: "个人网站与博客", description: "整理做过的小工具，重写个人介绍，给之后的学习和生活记录留一个地方。", icon: BookOpen },
    ],
  },
  blog: {
    description: "学习笔记、生活片段，以及做工具、写论文和实践出海 SEO 的记录。",
  },
  navbar: [
    { href: "/", icon: HomeIcon, label: "首页" },
    { href: "/projects", icon: FolderGit2, label: "作品" },
    { href: "/blog", icon: NotebookIcon, label: "博客" },
  ],
  contact: {
    email,
    description: "如果你也在做小工具、写论文、尝试出海，或者只是想交流学习和生活，欢迎来信聊聊。",
    social: {
      GitHub: { name: "xfrrn", url: github, icon: Icons.github, navbar: true },
      Email: { name: email, url: email ? `mailto:${email}` : "", icon: Icons.email, navbar: false },
      X: { name: "@SudoActify", url: "https://x.com/SudoActify", icon: Icons.x, navbar: true },
    },
  },
  // Leave unconfirmed experience empty; the existing sections appear when populated.
  work: [] as {
    company: string; href: string; badges: string[]; location: string;
    title: string; logoUrl: string; start: string; end?: string; description: string;
  }[],
  education: [] as {
    school: string; href: string; degree: string; logoUrl: string; start: string; end: string;
  }[],
  hackathons: [] as {
    title: string; dates: string; location: string; description: string; image: string;
    links: { title: string; href: string; icon: ReactNode }[];
  }[],
} as const;

export const DATA = {
  ...chineseData,
  roles: ["Entrepreneur", "Paper maker", "Global SEO practitioner"],
  description: "University student and entrepreneur. I build small tools and explore SEO for a global audience.",
  summary: "I'm Actify, a university student building a business, writing papers, and putting global SEO into practice. I enjoy making small tools and turning ideas into something people can use.\n\nThis is where I document my learning, life, and work, share projects, and write. I'd like to meet others building tools, writing papers, or reaching users around the world.",
  now: {
    ...chineseData.now,
    items: [
      { label: "Current tool", title: "Obsidian PDF translation", description: "Translate selected words and paragraphs while reading PDFs in Obsidian, using your own model provider.", icon: Hammer },
      { label: "Learning", title: "SEO for a global audience", description: "Learning how people discover tools through search, and trying what I learn on real websites.", icon: Compass },
      { label: "Putting together", title: "My website and blog", description: "Collecting the tools I've built, rewriting my introduction, and making room for notes on learning and life.", icon: BookOpen },
    ],
  },
  blog: { description: "Notes on learning, everyday life, building tools, writing papers, and practicing global SEO." },
  navbar: chineseData.navbar.map((item) => ({ ...item, label: ({ "/": "Home", "/projects": "Projects", "/blog": "Blog" })[item.href] })),
  contact: { ...chineseData.contact, description: "If you're building tools, writing papers, exploring global markets, or just want to talk about learning and life, get in touch." },
};

export function getSiteData(locale: Locale) {
  return locale === "zh" ? chineseData : DATA;
}
