import Navbar from "@/components/layout/navbar";
import Script from "next/script";
import { FlickeringGrid } from "@/components/magicui/flickering-grid";

export const dynamic = "force-dynamic";
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  const domain = process.env.PLAUSIBLE_DOMAIN;
  const origin = process.env.PLAUSIBLE_ORIGIN;
  const production = process.env.NODE_ENV === "production";
  if (production && Boolean(domain) !== Boolean(origin)) {
    throw new Error("PLAUSIBLE_DOMAIN and PLAUSIBLE_ORIGIN must be configured together.");
  }

  return <>
    {production && domain && origin && <Script
      id="plausible-analytics"
      src={`${origin.replace(/\/$/, "")}/js/script.exclusions.js`}
      data-domain={domain}
      data-exclude="/admin,/admin/**"
      strategy="afterInteractive"
      defer
    />}
    <div className="absolute inset-x-0 top-0 h-[100px] overflow-hidden z-0">
      <FlickeringGrid className="h-full w-full" squareSize={2} gridGap={2} style={{ maskImage: "linear-gradient(to bottom, black, transparent)", WebkitMaskImage: "linear-gradient(to bottom, black, transparent)" }} />
    </div>
    <div id="main-content" className="relative z-10 min-w-0 max-w-2xl mx-auto py-12 pb-28 sm:py-24 px-6">{children}</div>
    <Navbar />
  </>;
}
