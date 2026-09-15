import Link from "next/link";
import { FlickeringGrid } from "@/components/magicui/flickering-grid";
import { DATA } from "@/data/resume";

export default function ContactSection() {
  return (
    <div className="border rounded-xl p-6 sm:p-10 relative">
      <div className="absolute -top-4 border bg-primary z-10 rounded-xl px-4 py-1 left-1/2 -translate-x-1/2">
        <span className="text-background text-sm font-medium">Contact</span>
      </div>
      <div className="absolute inset-0 top-0 left-0 right-0 h-1/2 rounded-xl overflow-hidden">
        <FlickeringGrid
          className="h-full w-full"
          squareSize={2}
          gridGap={2}
          style={{
            maskImage: "linear-gradient(to bottom, black, transparent)",
            WebkitMaskImage: "linear-gradient(to bottom, black, transparent)",
          }}
        />
      </div>
      <div className="relative flex flex-col items-center gap-4 text-center">
        <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">
          Get in Touch
        </h2>
        <p className="mx-auto max-w-lg text-muted-foreground text-balance">
          {DATA.contact.description}
        </p>
        <div className="flex flex-wrap justify-center gap-4 text-sm">
          {Object.values(DATA.contact.social).filter((social) => social.url).map((social) => (
            <Link key={social.name} href={social.url} target={social.url.startsWith("http") ? "_blank" : undefined} rel={social.url.startsWith("http") ? "noopener noreferrer" : undefined} className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground underline underline-offset-4">
              <social.icon className="size-4" />{social.name}
            </Link>
          ))}
          <Link href="/blog" className="text-muted-foreground hover:text-foreground underline underline-offset-4">Read my notes</Link>
        </div>
      </div>
    </div>
  );
}
