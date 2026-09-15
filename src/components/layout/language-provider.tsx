"use client";

import { createContext, useContext, type ReactNode } from "react";
import { languageCookie, messages, type Locale } from "@/lib/i18n";

const LanguageContext = createContext<Locale>("en");
export function LanguageProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return <LanguageContext.Provider value={locale}>{children}</LanguageContext.Provider>;
}
export function useLanguage() {
  const locale = useContext(LanguageContext);
  return { locale, t: messages[locale] };
}
export function LanguageToggle() {
  const { locale } = useLanguage();
  const next = locale === "en" ? "zh" : "en";
  return <button type="button" lang={next === "zh" ? "zh-CN" : "en"}
    aria-label={next === "zh" ? "切换到中文" : "Switch to English"}
    className="size-9 shrink-0 rounded-full text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
    onClick={() => {
      document.cookie = `${languageCookie}=${next}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
      window.location.reload();
    }}>
    {next === "zh" ? "中文" : "EN"}
  </button>;
}
