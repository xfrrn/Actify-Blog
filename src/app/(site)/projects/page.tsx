import type { Metadata } from "next";
import BlurFade from "@/components/magicui/blur-fade";
import ProjectsSection from "@/components/projects/projects-section";
import { getLanguage } from "@/lib/server-language";

export async function generateMetadata(): Promise<Metadata> {
  const { data: DATA, t, locale } = await getLanguage();
  return {
    title: t.projects,
    description: t.projectsDescription,
    alternates: { canonical: "/projects", types: { "application/rss+xml": `${DATA.url}/rss.xml` } },
    openGraph: {
      title: `${t.projects} | ${DATA.name}`,
      description: t.projectsDescription,
      url: "/projects",
      type: "website",
      siteName: DATA.name,
      locale: locale === "zh" ? "zh_CN" : "en_US",
      images: [{ url: "/opengraph-image", alt: DATA.name }],
    },
    twitter: { card: "summary_large_image", title: `${t.projects} | ${DATA.name}`, description: t.projectsDescription, images: ["/opengraph-image"] },
  };
}

export default function ProjectsPage() {
  return <main><BlurFade delay={0.04}><ProjectsSection featuredOnly={false} /></BlurFade></main>;
}
