/* eslint-disable @next/next/no-img-element */
"use client";
import { useLanguage } from "@/components/layout/language-provider";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import Markdown from "react-markdown";

function ProjectImage({ src, alt }: { src?: string; alt: string }) {
  const { t } = useLanguage();
  const [imageError, setImageError] = useState(false);

  if (!src || imageError) {
    return (
      <div className="flex h-full flex-col justify-end gap-3 bg-muted p-6" role="img" aria-label={`${alt} ${t.cover}`}>
        <span className="text-xs uppercase tracking-widest text-muted-foreground">Actify / {t.projects}</span>
        <span className="max-w-full text-2xl font-semibold leading-tight tracking-tight text-foreground wrap-anywhere">{alt}</span>
      </div>
    );
  }

  return (
    <img
      ref={(element) => {
        if (element?.complete && element.naturalWidth === 0) setImageError(true);
      }}
      src={src}
      alt={alt}
      loading="lazy"
      className="h-full w-full object-cover"
      onError={() => setImageError(true)}
    />
  );
}

interface Props {
  title: string;
  headingLevel?: "h2" | "h3";
  slug?: string;
  status?: string;
  href?: string;
  description: string;
  dates?: string;
  tags: readonly string[];
  image?: string;
  video?: string;
  links?: readonly {
    icon: React.ReactNode;
    type: string;
    href: string;
  }[];
  className?: string;
}

export function ProjectCard({
  title,
  headingLevel: Heading = "h3",
  slug,
  status,
  href,
  description,
  dates,
  tags,
  image,
  video,
  links,
  className,
}: Props) {
  const { t } = useLanguage();
  const media = video ? (
    <video src={video} autoPlay loop muted playsInline className="h-full w-full object-cover" />
  ) : (
    <ProjectImage key={image} src={image} alt={title} />
  );
  return (
    <div
      id={slug}
      className={cn(
        "flex min-w-0 flex-col h-full border border-border rounded-xl overflow-hidden hover:ring-2 hover:ring-muted transition-all duration-200 scroll-mt-8",
        className
      )}
    >
      <div className="relative aspect-video shrink-0 overflow-hidden border-b bg-muted" data-project-cover>
        {href ? <Link
          href={href}
          target={href.startsWith("http") ? "_blank" : undefined}
          rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
          className="block h-full"
          aria-label={`${t.view} ${title}`}
        >
          {media}
        </Link> : media}
      </div>
      <div className="p-6 flex flex-col gap-3 flex-1">
        {links && links.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {links.map((link, idx) => (
              <Link
                href={link.href}
                key={idx}
                target={link.href.startsWith("http") ? "_blank" : undefined}
                rel={link.href.startsWith("http") ? "noopener noreferrer" : undefined}
                onClick={(e) => e.stopPropagation()}
              >
                <Badge
                  className="flex items-center gap-1.5 text-xs bg-black text-white hover:bg-black/90"
                  variant="default"
                >
                  {link.icon}
                  {link.type}
                </Badge>
              </Link>
            ))}
          </div>
        )}
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-1">
            <Heading className="font-semibold wrap-anywhere">{title}</Heading>
            {dates && <time className="text-xs text-muted-foreground">{dates}</time>}
            {status && <Badge variant="secondary" className="mt-1 w-fit text-[11px]">{status === "Building" ? t.building : status === "Live" ? t.live : status === "Archived" ? t.archived : status}</Badge>}
          </div>
          {href && <Link
            href={href}
            target={href.startsWith("http") ? "_blank" : undefined}
            rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
            className="text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
            aria-label={`${t.view} ${title}`}
          >
            <ArrowUpRight className="h-4 w-4" aria-hidden />
          </Link>}
        </div>
        <div className="text-xs flex-1 prose max-w-full text-pretty font-sans leading-relaxed text-muted-foreground dark:prose-invert">
          <Markdown>{description}</Markdown>
        </div>
        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-auto">
            {tags.map((tag) => (
              <Badge
                key={tag}
                className="text-[11px] font-medium border border-border h-6 w-fit px-2"
                variant="outline"
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
