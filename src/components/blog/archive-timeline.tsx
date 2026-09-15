"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function ArchiveTimeline({ months, children }: {
  months: { id: string; label: string; count: number }[];
  children: ReactNode;
}) {
  const [active, setActive] = useState<string | undefined>(months[0]?.id);
  const nav = useRef<HTMLElement>(null);

  useEffect(() => {
    const sections = months.map(({ id }) => document.getElementById(id)).filter((element) => element !== null);
    let frame = 0;
    function update() {
      const line = window.innerWidth < 640 ? (nav.current?.offsetHeight ?? 0) + 32 : 80;
      let current: string | undefined = sections[0]?.id;
      for (const section of sections) {
        if (section.getBoundingClientRect().top <= line) current = section.id;
      }
      if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2) {
        current = sections.at(-1)?.id;
      }
      setActive(current);
      frame = 0;
    }
    function schedule() {
      if (!frame) frame = requestAnimationFrame(update);
    }
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [months]);

  useEffect(() => {
    // Keep the active month visible within a long archive without moving the page.
    const link = nav.current?.querySelector<HTMLElement>('[aria-current="location"]');
    if (!link?.parentElement) return;
    const list = link.parentElement;
    if (window.innerWidth < 640) list.scrollLeft = link.offsetLeft - list.offsetLeft;
    else list.scrollTop = link.offsetTop - list.offsetTop - list.clientHeight / 2;
  }, [active]);

  return (
    <div className="grid items-start gap-8 sm:grid-cols-[7.5rem_minmax(0,1fr)] sm:gap-6">
      <nav ref={nav} aria-label="文章时间线" className="sticky top-0 z-20 min-w-0 bg-background py-3 sm:top-8 sm:py-0">
        <p className="mb-3 text-xs font-medium text-muted-foreground">按时间浏览</p>
        {months.length ? (
          <div className="relative flex overflow-x-auto border-b sm:max-h-[calc(100dvh-10rem)] sm:flex-col sm:overflow-x-hidden sm:overflow-y-auto sm:border-b-0 sm:border-l">
            {months.map((month) => (
              <a key={month.id} href={`#${month.id}`} aria-current={active === month.id ? "location" : undefined}
                className={cn("shrink-0 border-b-2 border-transparent px-3 py-2 text-xs tabular-nums transition-colors hover:text-foreground focus-visible:outline-offset-[-2px] sm:border-b-0 sm:border-l-2",
                  active === month.id ? "border-foreground font-semibold text-foreground" : "text-muted-foreground")}>
                {month.label}<span className="ml-2 text-muted-foreground">{month.count}</span>
              </a>
            ))}
          </div>
        ) : <p className="text-xs text-muted-foreground">暂无时间记录</p>}
      </nav>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
