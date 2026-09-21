import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import { remarkCodeMeta, type PostContentMetadata } from "./remark-code-meta.ts";

export function markdownMetadata(content: string) {
  const metadata: PostContentMetadata = { toc: [], readingMinutes: 1 };
  const processor = unified().use(remarkParse).use(remarkGfm).use(remarkCodeMeta, metadata);
  processor.runSync(processor.parse(content));
  return metadata;
}
