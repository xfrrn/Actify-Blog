import type { Metadata } from "next";
import BlurFade from "@/components/magicui/blur-fade";
import ProjectsSection from "@/components/projects/projects-section";
import { DATA } from "@/data/site";

export const metadata: Metadata = {
  title: "作品",
  description: `${DATA.name} 的小工具和个人项目：PDF 划词翻译、GitHub 收藏整理与音视频笔记。`,
  alternates: { canonical: "/projects", types: { "application/rss+xml": `${DATA.url}/rss.xml` } },
  openGraph: {
    title: `作品 | ${DATA.name}`,
    description: `${DATA.name} 的小工具和个人项目：PDF 划词翻译、GitHub 收藏整理与音视频笔记。`,
    url: "/projects",
  },
};

export default function ProjectsPage() {
  return <main><BlurFade delay={0.04}><ProjectsSection featuredOnly={false} /></BlurFade></main>;
}
