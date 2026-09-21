/* eslint-disable @next/next/no-img-element */
import BlurFade from "@/components/magicui/blur-fade";
import BlurFadeText from "@/components/magicui/blur-fade-text";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getLanguage } from "@/lib/server-language";
import Link from "next/link";
import Markdown from "react-markdown";
import ContactSection from "@/components/home/contact-section";
import FeedbackSection from "@/components/home/feedback-section";
import HackathonsSection from "@/components/home/hackathons-section";
import ProjectsSection from "@/components/projects/projects-section";
import WorkSection from "@/components/home/work-section";
import { ArrowUpRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Metadata } from "next";
import { getPosts } from "@/lib/posts";
import { PostList } from "@/components/blog/post-list";
import { formatDate } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const { data: DATA } = await getLanguage();
  return {
    title: { absolute: `${DATA.name} — ${DATA.roles.join(" / ")}` },
    alternates: { canonical: "/", types: { "application/rss+xml": `${DATA.url}/rss.xml` } },
  };
}

const BLUR_FADE_DELAY = 0.04;

export default async function Page() {
  const { data: DATA, t, locale } = await getLanguage();
  const posts = await getPosts(locale);
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebSite", "@id": `${DATA.url}/#website`, url: `${DATA.url}/`, name: DATA.name, description: DATA.description, author: { "@id": `${DATA.url}/#person` } },
      { "@type": "Person", "@id": `${DATA.url}/#person`, url: `${DATA.url}/`, name: DATA.name, sameAs: [DATA.contact.social.GitHub.url, DATA.contact.social.X.url] },
    ],
  };
  return (
    <main className="min-h-dvh flex flex-col gap-14 relative">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <section id="hero">
        <div className="mx-auto w-full max-w-2xl space-y-8">
          <div className="gap-2 gap-y-6 flex flex-col md:flex-row justify-between">
            <div className="gap-2 flex flex-col order-2 md:order-1">
              <BlurFade delay={BLUR_FADE_DELAY} yOffset={8}>
                <h1 className="text-3xl font-semibold tracking-tighter sm:text-4xl lg:text-5xl">{t.hello} {DATA.name}</h1>
              </BlurFade>
              <BlurFade delay={BLUR_FADE_DELAY * 2}>
                <p className="text-sm font-medium">{DATA.roles.join(" / ")}</p>
              </BlurFade>
              <BlurFadeText
                className="text-muted-foreground max-w-[600px] md:text-lg lg:text-xl"
                delay={BLUR_FADE_DELAY}
                text={DATA.description}
              />
              <BlurFade delay={BLUR_FADE_DELAY * 3}>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
                  {Object.values(DATA.contact.social).filter((social) => social.url).map((social) => (
                    <Link key={social.name} href={social.url} target={social.url.startsWith("http") ? "_blank" : undefined} rel={social.url.startsWith("http") ? "noopener noreferrer" : undefined} className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
                      <social.icon className="size-4" />{social.name}
                    </Link>
                  ))}
                  <Link href="/blog" className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">{t.blog} <ArrowUpRight className="size-3.5" /></Link>
                </div>
              </BlurFade>
            </div>
            <BlurFade delay={BLUR_FADE_DELAY} className="order-1 md:order-2">
              <Avatar className="size-24 md:size-32 border rounded-full shadow-lg ring-4 ring-muted">
                {DATA.avatarUrl && <AvatarImage alt={DATA.name} src={DATA.avatarUrl} />}
                <AvatarFallback className="text-4xl font-semibold" aria-label={DATA.name}>{DATA.initials}</AvatarFallback>
              </Avatar>
            </BlurFade>
          </div>
        </div>
      </section>
      <section id="about">
        <div className="flex min-h-0 flex-col gap-y-4">
          <BlurFade delay={BLUR_FADE_DELAY * 3}>
            <h2 className="text-xl font-bold">{t.about}</h2>
          </BlurFade>
          <BlurFade delay={BLUR_FADE_DELAY * 4}>
            <div className="prose max-w-full text-pretty font-sans leading-relaxed text-muted-foreground dark:prose-invert">
              <Markdown>
                {DATA.summary}
              </Markdown>
            </div>
          </BlurFade>
        </div>
      </section>
      <section id="now" className="flex flex-col gap-4">
        <BlurFade delay={BLUR_FADE_DELAY * 5}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-xl font-bold">{t.now}</h2>
            <time dateTime={DATA.now.updatedAt} className="text-xs text-muted-foreground">{t.updated} {formatDate(DATA.now.updatedAt, locale)}</time>
          </div>
        </BlurFade>
        <div className="grid gap-3 sm:grid-cols-2">
          {DATA.now.items.map((item, index) => (
            <BlurFade key={item.label} delay={BLUR_FADE_DELAY * 6 + index * 0.05} className={index === 0 ? "sm:col-span-2" : ""}>
              <Card className="h-full border rounded-xl p-5 flex flex-col gap-3 hover:ring-2 hover:ring-muted transition-all duration-200">
                <CardHeader className="gap-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground"><item.icon className="size-4" />{item.label}</div>
                  <CardTitle className="text-base">{item.title}</CardTitle>
                </CardHeader>
                <CardContent className="leading-relaxed">{item.description}</CardContent>
              </Card>
            </BlurFade>
          ))}
        </div>
      </section>
      {DATA.work.length > 0 && <section id="work">
        <div className="flex min-h-0 flex-col gap-y-6">
          <BlurFade delay={BLUR_FADE_DELAY * 5}>
            <h2 className="text-xl font-bold">{t.experience}</h2>
          </BlurFade>
          <BlurFade delay={BLUR_FADE_DELAY * 6}>
            <WorkSection />
          </BlurFade>
        </div>
      </section>}
      {DATA.education.length > 0 && <section id="education">
        <div className="flex min-h-0 flex-col gap-y-6">
          <BlurFade delay={BLUR_FADE_DELAY * 7}>
            <h2 className="text-xl font-bold">{t.education}</h2>
          </BlurFade>
          <div className="flex flex-col gap-8">
            {DATA.education.map((education, index) => (
              <BlurFade
                key={education.school}
                delay={BLUR_FADE_DELAY * 8 + index * 0.05}
              >
                <Link
                  href={education.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-x-3 justify-between group"
                >
                  <div className="flex items-center gap-x-3 flex-1 min-w-0">
                    {education.logoUrl ? (
                      <img
                        src={education.logoUrl}
                        alt={education.school}
                        className="size-8 md:size-10 p-1 border rounded-full shadow ring-2 ring-border overflow-hidden object-contain flex-none"
                      />
                    ) : (
                      <div className="size-8 md:size-10 p-1 border rounded-full shadow ring-2 ring-border bg-muted flex-none" />
                    )}
                    <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                      <div className="font-semibold leading-none flex items-center gap-2">
                        {education.school}
                        <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" aria-hidden />
                      </div>
                      <div className="font-sans text-sm text-muted-foreground">
                        {education.degree}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs tabular-nums text-muted-foreground text-right flex-none">
                    <span>
                      {education.start} - {education.end}
                    </span>
                  </div>
                </Link>
              </BlurFade>
            ))}
          </div>
        </div>
      </section>}
      <div>
        <BlurFade delay={BLUR_FADE_DELAY * 11}>
          <ProjectsSection />
        </BlurFade>
      </div>
      {DATA.hackathons.length > 0 && <div>
        <BlurFade delay={BLUR_FADE_DELAY * 13}>
          <HackathonsSection />
        </BlurFade>
      </div>}
      <section id="writing" className="flex flex-col gap-6">
        <BlurFade delay={BLUR_FADE_DELAY * 14}>
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-xl font-bold">{t.writing}</h2>
            <Link href="/blog" className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4">{t.allPosts}</Link>
          </div>
        </BlurFade>
        <PostList locale={locale} posts={posts.slice(0, 3)} />
        {posts.length === 0 && <p className="text-sm text-muted-foreground">{t.noPosts}</p>}
      </section>
      <section id="contact">
        <BlurFade delay={BLUR_FADE_DELAY * 16}>
          <ContactSection />
        </BlurFade>
      </section>
      <FeedbackSection />
    </main>
  );
}
