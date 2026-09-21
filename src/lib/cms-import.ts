import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import matter from "gray-matter";
import { z } from "zod";
import { transaction } from "./cms-db.ts";
import { allContent } from "./cms-store.ts";
import { emptyTranslation, emptyProject, postSchema, projectSchema, slugSchema } from "./cms-types.ts";
import { parsePostFilename } from "./blog-language.ts";

const stringDate = (value: unknown) => value instanceof Date ? value.toISOString().slice(0, 10) : typeof value === "string" ? value : "";
export async function importRepository(root: string) {
  return transaction(async (db) => {
    await db.query("LOCK TABLE content, imports IN SHARE ROW EXCLUSIVE MODE");
    let imported = 0;
    for (const [kind, folder] of [["posts", "blog"], ["projects", "projects"]] as const) {
      for (const filename of readdirSync(join(root, "content", folder)).filter((name) => /\.(md|mdx)$/.test(name)).sort()) {
        const source = `${kind}:${filename}`;
        if ((await db.query("SELECT source FROM imports WHERE source=$1", [source])).rowCount) continue;
        const parsed = matter(readFileSync(join(root, "content", folder, filename), "utf8"));
        const raw = parsed.data;
        const now = new Date().toISOString();
        if (kind === "posts") {
          const { slug, language } = parsePostFilename(filename, raw.language);
          const entry = (await allContent("posts", db)).find((item) => item.slug === slug);
          if (!entry || (entry.version === 1 && !entry.data[language])) {
            const translation = { ...emptyTranslation(), ...raw, date: stringDate(raw.date || raw.publishedAt), updatedAt: stringDate(raw.updatedAt), description: raw.description || raw.summary || "", cover: raw.cover || raw.image || "", content: parsed.content };
            const data = postSchema.parse({ ...entry?.data, [language]: translation });
            const published = raw.draft ? entry?.published || null : { ...entry?.published, [language]: data[language] };
            if (entry) await db.query("UPDATE content SET data=$1, published=$2, locked=$3 WHERE id=$4", [JSON.stringify(data), published ? JSON.stringify(published) : null, !!published, entry.id]);
            else await db.query("INSERT INTO content(id,kind,slug,data,published,locked,updated_at) VALUES ($1,'posts',$2,$3,$4,$5,$6)",
              [randomUUID(), slug, JSON.stringify(data), published ? JSON.stringify(published) : null, !!published, now]);
            imported++;
          }
        } else {
          const slug = slugSchema.parse(filename.replace(/\.(md|mdx)$/, ""));
          if (!(await db.query("SELECT id FROM content WHERE kind='projects' AND slug=$1", [slug])).rowCount) {
            const data = projectSchema.parse({ ...emptyProject(), ...raw });
            await db.query("INSERT INTO content(id,kind,slug,data,published,locked,updated_at) VALUES ($1,'projects',$2,$3,$4,$5,$6)",
              [randomUUID(), slug, JSON.stringify(data), raw.draft ? null : JSON.stringify(data), !raw.draft, now]);
            imported++;
          }
        }
        await db.query("INSERT INTO imports(source,imported_at) VALUES ($1,$2)", [source, now]);
      }
    }
    return imported;
  });
}

const feedbackSchema = z.object({ id: z.number().int().positive(), pain_point: z.string().min(1).max(2000), search_query: z.string().max(200).default(""), locale: z.enum(["zh", "en"]), status: z.enum(["pending", "published", "hidden"]), created_at: z.string().min(1).max(64) });
export async function importFeedback(input: unknown) {
  const rows = Array.isArray(input) ? input.flatMap((row) => row && typeof row === "object" && "results" in row ? row.results : [row]) : [];
  const items = z.array(feedbackSchema).parse(rows);
  return transaction(async (db) => {
    await db.query("LOCK TABLE feedback, imports IN SHARE ROW EXCLUSIVE MODE");
    await db.query("SELECT setval(pg_get_serial_sequence('feedback','id'), COALESCE(MAX(id),0)+1, false) FROM feedback");
    let imported = 0;
    for (const item of items) {
      const source = `d1-feedback:${item.id}`;
      if ((await db.query("SELECT source FROM imports WHERE source=$1", [source])).rowCount) continue;
      const existing = (await db.query("SELECT id FROM feedback WHERE id=$1", [item.id])).rowCount;
      await db.query("INSERT INTO feedback(id,pain_point,search_query,locale,status,created_at) VALUES (COALESCE($1,nextval(pg_get_serial_sequence('feedback','id'))),$2,$3,$4,$5,$6)",
        [existing ? null : item.id, item.pain_point, item.search_query, item.locale, item.status, item.created_at]);
      await db.query("SELECT setval(pg_get_serial_sequence('feedback','id'), COALESCE(MAX(id),0)+1, false) FROM feedback");
      await db.query("INSERT INTO imports(source,imported_at) VALUES ($1,$2)", [source, new Date().toISOString()]);
      imported++;
    }
    return imported;
  });
}
