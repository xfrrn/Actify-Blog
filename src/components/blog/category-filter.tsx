"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function CategoryFilter({ categories, selected, total }: {
  categories: { name: string; count: number }[];
  selected: string;
  total: number;
}) {
  const details = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    function dismiss(event: PointerEvent) {
      if (details.current && !details.current.contains(event.target as Node)) details.current.open = false;
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape" && details.current?.open) {
        details.current.open = false;
        details.current.querySelector("summary")?.focus();
      }
    }
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", escape);
    };
  }, []);

  return (
    <details ref={details} className="group relative z-30 w-full sm:w-64"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false;
      }}>
      <summary aria-label={`分类：${selected || "全部文章"}`} className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl border bg-background px-4 py-2.5 text-sm transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
        <span className="truncate">{selected || "全部文章"}</span>
        <ChevronDown aria-hidden className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      <nav aria-label="文章分类" className="absolute left-0 top-full mt-2 max-h-72 w-full overflow-y-auto rounded-xl border bg-popover p-1.5 text-popover-foreground shadow-md">
        {[{ name: "", count: total }, ...categories].map(({ name, count }) => (
          <Link key={name} href={name ? `/blog?category=${encodeURIComponent(name)}` : "/blog"}
            aria-current={selected === name ? "page" : undefined}
            onClick={() => { if (details.current) details.current.open = false; }}
            className={cn("flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm hover:bg-accent focus-visible:bg-accent focus-visible:outline-none",
              selected === name && "bg-accent font-medium")}>
            <Check aria-hidden className={cn("size-4 shrink-0", selected !== name && "invisible")} />
            <span className="min-w-0 flex-1 break-words">{name || "全部文章"}</span>
            <span className="text-xs tabular-nums text-muted-foreground">{count}</span>
          </Link>
        ))}
      </nav>
    </details>
  );
}
