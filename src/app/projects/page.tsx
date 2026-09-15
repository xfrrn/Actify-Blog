import type { Metadata } from "next";
import BlurFade from "@/components/magicui/blur-fade";
import ProjectsSection from "@/components/projects/projects-section";
import { DATA } from "@/data/site";

export const metadata: Metadata = {
  title: "Projects",
  description: `Software, experiments, and independent products by ${DATA.name}.`,
  alternates: { canonical: "/projects", types: { "application/rss+xml": `${DATA.url}/rss.xml` } },
  openGraph: {
    title: `Projects | ${DATA.name}`,
    description: `Software, experiments, and independent products by ${DATA.name}.`,
    url: "/projects",
  },
};

export default function ProjectsPage() {
  return <main><BlurFade delay={0.04}><ProjectsSection featuredOnly={false} /></BlurFade></main>;
}
