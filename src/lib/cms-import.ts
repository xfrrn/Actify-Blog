import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import matter from "gray-matter";
import { z } from "zod";
import { database, transaction } from "./cms-db.ts";
import { allContent } from "./cms-store.ts";
import { emptyTranslation, emptyProject, postSchema, projectSchema, slugSchema } from "./cms-types.ts";
import { parsePostFilename } from "./blog-language.ts";

const stringDate = (value: unknown) => value instanceof Date ? value.toISOString().slice(0, 10) : typeof value === "string" ? value : "";
export function importRepository(root: string) {
  return transaction(() => {
    const db = database();
    let imported = 0;
    for (const [kind, folder] of [["posts", "blog"], ["projects", "projects"]] as const) {
      for (const filename of readdirSync(join(root, "content", folder)).filter((name) => /\.(md|mdx)$/.test(name)).sort()) {
        const source = `${kind}:${filename}`;
        if (db.prepare("SELECT source FROM imports WHERE source=?").get(source)) continue;
        const parsed = matter(readFileSync(join(root, "content", folder, filename), "utf8"));
        const raw = parsed.data;
        const now = new Date().toISOString();
        if (kind === "posts") {
          const { slug, language } = parsePostFilename(filename, raw.language);
          const entry = allContent("posts").find((item) => item.slug === slug);
          if (!entry || (entry.version === 1 && !entry.data[language])) {
            const translation = { ...emptyTranslation(), ...raw, date: stringDate(raw.date || raw.publishedAt), updatedAt: stringDate(raw.updatedAt), description: raw.description || raw.summary || "", cover: raw.cover || raw.image || "", content: parsed.content };
            const data = postSchema.parse({ ...entry?.data, [language]: translation });
            const published = raw.draft ? entry?.published || null : { ...entry?.published, [language]: data[language] };
            if (entry) db.prepare("UPDATE content SET data=?, published=?, locked=? WHERE id=?").run(JSON.stringify(data), published ? JSON.stringify(published) : null, Number(!!published), entry.id);
            else db.prepare("INSERT INTO content(id,kind,slug,data,published,locked,updated_at) VALUES (?,'posts',?,?,?,?,?)")
              .run(randomUUID(), slug, JSON.stringify(data), published ? JSON.stringify(published) : null, Number(!!published), now);
            imported++;
          }
        } else {
          const slug = slugSchema.parse(filename.replace(/\.(md|mdx)$/, ""));
          if (!db.prepare("SELECT id FROM content WHERE kind='projects' AND slug=?").get(slug)) {
            const data = projectSchema.parse({ ...emptyProject(), ...raw });
            db.prepare("INSERT INTO content(id,kind,slug,data,published,locked,updated_at) VALUES (?,'projects',?,?,?,?,?)")
              .run(randomUUID(), slug, JSON.stringify(data), raw.draft ? null : JSON.stringify(data), Number(!raw.draft), now);
            imported++;
          }
        }
        db.prepare("INSERT INTO imports(source,imported_at) VALUES (?,?)").run(source, now);
      }
    }
    return imported;
  });
}

const feedbackSchema = z.object({ id: z.number().int().positive(), pain_point: z.string().min(1).max(2000), search_query: z.string().max(200).default(""), locale: z.enum(["zh", "en"]), status: z.enum(["pending", "published", "hidden"]), created_at: z.string().min(1).max(64) });
export function importFeedback(input: unknown) {
  const rows = Array.isArray(input) ? input.flatMap((row) => row && typeof row === "object" && "results" in row ? row.results : [row]) : [];
  const items = z.array(feedbackSchema).parse(rows);
  return transaction(() => {
    let imported = 0;
    for (const item of items) {
      const source = `d1-feedback:${item.id}`;
      if (database().prepare("SELECT source FROM imports WHERE source=?").get(source)) continue;
      const existing = database().prepare("SELECT id FROM feedback WHERE id=?").get(item.id);
      database().prepare("INSERT INTO feedback(id,pain_point,search_query,locale,status,created_at) VALUES (?,?,?,?,?,?)")
        .run(existing ? null : item.id, item.pain_point, item.search_query, item.locale, item.status, item.created_at);
      database().prepare("INSERT INTO imports(source,imported_at) VALUES (?,?)").run(source, new Date().toISOString());
      imported++;
    }
    return imported;
  });
}
