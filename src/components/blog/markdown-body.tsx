import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { remarkCodeMeta } from "@/lib/remark-code-meta";
import { mdxComponents } from "@/mdx-components";

export function MarkdownBody({ content }: { content: string }) {
  return <Markdown skipHtml remarkPlugins={[remarkGfm, remarkCodeMeta]} components={mdxComponents}>{content}</Markdown>;
}
