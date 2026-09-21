import { ThemeProvider } from "@/components/layout/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getLanguage } from "@/lib/server-language";
import { LanguageProvider } from "@/components/layout/language-provider";
import { cn } from "@/lib/utils";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-mono",
});

export async function generateMetadata(): Promise<Metadata> {
  const { data: DATA, locale } = await getLanguage();
  return {
    metadataBase: new URL(DATA.url),
    verification: { google: process.env.GOOGLE_SITE_VERIFICATION || undefined },
    title: {
      default: DATA.name,
      template: `%s | ${DATA.name}`,
    },
    description: DATA.description,
    authors: [{ name: DATA.name, url: DATA.url }],
    alternates: { types: { "application/rss+xml": `${DATA.url}/rss.xml` } },
    openGraph: {
      title: `${DATA.name}`,
      description: DATA.description,
      url: DATA.url,
      siteName: `${DATA.name}`,
      locale: locale === "zh" ? "zh_CN" : "en_US",
      type: "website",
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    twitter: {
      title: `${DATA.name}`,
      description: DATA.description,
      card: "summary_large_image",
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { locale, t } = await getLanguage();
  return (
    <html lang={locale === "zh" ? "zh-CN" : "en"} suppressHydrationWarning>
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased relative",
          geist.variable,
          geistMono.variable
        )}
      >
        <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-background focus:p-3">{t.skip}</a>
        <LanguageProvider locale={locale}>
          <ThemeProvider attribute="class" defaultTheme="light">
            <TooltipProvider delayDuration={0}>
              {children}
            </TooltipProvider>
          </ThemeProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
