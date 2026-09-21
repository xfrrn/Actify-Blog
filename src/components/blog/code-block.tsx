"use client";
import { useLanguage } from "@/components/layout/language-provider";

import { Children, isValidElement, useState, useEffect, type ComponentProps } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "../ui/button";
import { codeToHtml, bundledLanguages, type BundledLanguage } from "shiki/bundle/web";
import { cn } from "@/lib/utils";

type CodeBlockProps = ComponentProps<"pre">;

function extractLanguage(className?: string): string {
  if (!className) return "plaintext";
  const match = className.match(/language-([a-z0-9-]+)/i);
  return match ? match[1] : "plaintext";
}

export function CodeBlock({ children, ...props }: CodeBlockProps) {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const code = Children.toArray(children).find((child) => isValidElement(child));
  const codeProps = isValidElement<ComponentProps<"code"> & { "data-title"?: string }>(code) ? code.props : {};
  const codeText = Children.toArray(codeProps.children).join("");
  const className = codeProps.className || "";
  const title = codeProps["data-title"];
  const source = JSON.stringify([codeText, className]);
  const [highlighted, setHighlighted] = useState({ source: "", html: "" });
  const html = highlighted.source === source ? highlighted.html : "";

  useEffect(() => {
    let active = true;
    const lang = extractLanguage(className);
    void codeToHtml(codeText, {
      lang: lang in bundledLanguages ? lang as BundledLanguage : "text",
      themes: {
        light: "github-light",
        dark: "github-dark",
      },
      defaultColor: false,
    })
      .then((html) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");
        if (active) setHighlighted({
          source,
          html: doc.querySelector("code")?.innerHTML ?? "",
        });
      })
      .catch((error) => {
        console.error("Failed to highlight code:", error);
        if (active) setHighlighted({ source, html: "" });
      });
    return () => { active = false; };
  }, [codeText, className, source]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(codeText);
      setCopyError(false);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopyError(true);
    }
  };

  return (
    <div className="group relative my-6 min-w-0 rounded-xl overflow-hidden border border-border">
        {title && (
          <div className="p-3 text-xs font-medium border-b border-border rounded-t-xl bg-muted/50 text-foreground">
            {title}
          </div>
        )}

        <Button
          onClick={handleCopy}
          variant="outline"
          size="icon"
          className={cn("absolute z-10 size-8 text-primary cursor-pointer right-3 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 focus-visible:opacity-100 transition-opacity rounded-md border border-border shadow-none", title ? "top-13" : "top-3")}
          aria-label={copied ? t.copied : t.copy}
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
        </Button>
        <span role="status" className={copyError ? "block p-3 text-xs" : "sr-only"}>{copyError ? t.copyError : copied ? t.copied : ""}</span>
      <pre
        {...props}
        tabIndex={0}
        aria-label={title ? `${t.code}: ${title}` : t.code}
        className={cn("p-4! pr-14! m-0! overflow-x-auto", props.className)}
      >
        {html && (
            <code
              className={`shiki ${className}`}
              data-title={title || undefined}
              dangerouslySetInnerHTML={{ __html: html }}
            />
        )}

        {!html && children}
      </pre >
    </div >
  );
}
