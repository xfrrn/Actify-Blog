import { cache } from "react";
import { cookies } from "next/headers";
import { languageCookie, messages, normalizeLocale } from "@/lib/i18n";
import { getSiteData } from "@/data/site";

export const getLanguage = cache(async () => {
  const locale = normalizeLocale((await cookies()).get(languageCookie)?.value);
  return { locale, t: messages[locale], data: getSiteData(locale) };
});
