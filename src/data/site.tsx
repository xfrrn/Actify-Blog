import { Icons } from "@/components/icons/social";
import { HomeIcon, FolderGit2, NotebookIcon, Hammer, BookOpen, Compass } from "lucide-react";
import type { ReactNode } from "react";

// Fill in your public contact details here. Empty links are not rendered.
const github = "https://github.com/xfrrn";
const email = "actify_top@foxmail.com";

export type Project = {
  name: string;
  slug: string;
  description: string;
  dates?: string;
  technologies: readonly string[];
  image?: string;
  video?: string;
  github?: string;
  demo?: string;
  status?: "Building" | "Live" | "Archived";
  featured: boolean;
};

export const DATA = {
  name: "Actify",
  initials: "A",
  url: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").origin,
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
      GitHub: { name: "GitHub", url: github, icon: Icons.github, navbar: true },
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
  projects: [
    // Descriptions and stacks are based on the linked public repositories.
    // Omit dates and release status until confirmed by the author.
    {
      name: "PDF Selection Translator",
      slug: "obsidian-pdf-selection-translator",
      description: "在 Obsidian 中阅读 PDF 时，选中单词或段落即可翻译。兼容内置 PDF 阅读器和 PDF++，支持自定义 OpenAI 兼容接口与模型。适用于桌面端带有可选文字的 PDF。",
      technologies: ["TypeScript", "Obsidian API", "CSS"],
      github: "https://github.com/xfrrn/obsidian-pdf-selection-translator",
      featured: true,
    },
    {
      name: "StarMind",
      slug: "starmind",
      description: "用自然语言搜索 GitHub 上收藏的仓库，借助 AI 生成标签和摘要，整理自己的 Star 列表。",
      technologies: ["React", "TypeScript", "Python", "FastAPI", "PostgreSQL", "pgvector"],
      github: "https://github.com/xfrrn/StarMind",
      featured: true,
    },
    {
      name: "Audigest",
      slug: "audigest",
      description: "把视频和播客里的内容转成文字，再整理成摘要与笔记。结合语音转录和大模型处理音视频内容。",
      technologies: ["Python", "FastAPI", "SQLModel", "FunASR", "OpenAI SDK"],
      github: "https://github.com/xfrrn/Audigest",
      featured: false,
    },
    {
      name: "Actify Portfolio",
      slug: "actify-portfolio",
      description: "你正在看的个人网站，基于 Magic UI Portfolio 模板修改。用来记录学习、生活和工作，写博客，也展示自己做过的东西。",
      technologies: ["Next.js", "TypeScript", "Tailwind CSS", "Magic UI", "MDX"],
      image: "/projects/actify-portfolio.png",
      github: "https://github.com/xfrrn/Actify-Blog",
      demo: "/",
      status: "Building",
      featured: false,
    },
  ] satisfies Project[] as Project[],
  hackathons: [] as {
    title: string; dates: string; location: string; description: string; image: string;
    links: { title: string; href: string; icon: ReactNode }[];
  }[],
} as const;
