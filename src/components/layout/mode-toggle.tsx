"use client";
import { useLanguage } from "@/components/layout/language-provider";

import { Button } from "@/components/ui/button";
import { MoonIcon, SunIcon } from "@radix-ui/react-icons";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

export function ModeToggle({ className }: { className?: string }) {
  const { t } = useLanguage();
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <Button
      type="button"
      variant="link"
      size="icon"
      className={cn(className)}
      aria-label={t.toggleTheme}
      title={t.theme}
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      <SunIcon className="hidden h-full w-full dark:block" />
      <MoonIcon className="h-full w-full dark:hidden" />
    </Button>
  );
}
