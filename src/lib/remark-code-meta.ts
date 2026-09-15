export type PostContentMetadata = {
  toc: { id: string; title: string; depth: number }[];
  readingMinutes: number;
};

type MarkdownNode = {
  type: string;
  value?: string;
  alt?: string;
  depth?: number;
  meta?: string | null;
  data?: { hProperties?: Record<string, string> };
  children?: MarkdownNode[];
};

// Extend the existing code metadata walk to collect headings and reading time.
export function remarkCodeMeta(metadata?: PostContentMetadata) {
  return (tree: MarkdownNode) => {
    const ids = new Set<string>();
    const words: string[] = [];
    const headingText = (node: MarkdownNode): string =>
      node.value ?? node.alt ?? node.children?.map(headingText).join("") ?? "";

    const walk = (node: MarkdownNode) => {
      if (["text", "code", "inlineCode"].includes(node.type) && node.value) {
        words.push(node.value);
      }
      if (node.type === "heading" && node.depth && node.depth > 1) {
        const title = headingText(node);
        const base = "section-" + (title.normalize("NFKC").toLowerCase()
          .replace(/[^\p{L}\p{N}\s-]/gu, "").trim().replace(/\s+/g, "-") || "heading");
        let id = base;
        let suffix = 2;
        while (ids.has(id)) id = `${base}-${suffix++}`;
        ids.add(id);
        node.data ||= {};
        node.data.hProperties = { ...node.data.hProperties, id };
        if (node.depth <= 3) metadata?.toc.push({ id, title, depth: node.depth });
      }
      if (node.type === "code" && node.meta) {
        node.data ||= {};
        node.data.hProperties ||= {};
        node.data.hProperties["data-meta"] = node.meta;
        const title = node.meta.match(/title="([^"]+)"/)?.[1];
        if (title) node.data.hProperties["data-title"] = title;
      }
      node.children?.forEach(walk);
    };

    walk(tree);
    if (metadata) {
      const text = words.join(" ");
      const han = text.match(/\p{Script=Han}/gu)?.length ?? 0;
      const otherWords = text.replace(/\p{Script=Han}/gu, " ").match(/[\p{L}\p{N}]+/gu)?.length ?? 0;
      // ponytail: estimated at 300 Han characters / 200 words per minute; tune for your audience.
      metadata.readingMinutes = Math.max(1, Math.ceil(han / 300 + otherWords / 200));
    }
  };
}
