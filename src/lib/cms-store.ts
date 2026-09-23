import { randomUUID } from "node:crypto";
import { database, transaction } from "./cms-db.ts";
import { postSchema, projectSchema, slugSchema, emptyProject, emptyTranslation } from "./cms-types.ts";
import type { ContentRecord, Kind, PostData, ProjectData } from "./cms-types.ts";
import type { PoolClient } from "pg";

export class CmsError extends Error {
  status: number;
  retryAfter?: number;
  constructor(status: number, message: string, retryAfter?: number) { super(message); this.status = status; this.retryAfter = retryAfter; }
}
type Row = { id: string; kind: Kind; slug: string; locked: boolean; version: number; data: PostData | ProjectData; published: PostData | ProjectData | null; deleted_at: string | null; updated_at: string };
function record<K extends Kind>(row: Row): ContentRecord<K> {
  return { id: row.id, kind: row.kind as K, slug: row.slug, locked: row.locked, version: row.version, data: row.data as ContentRecord<K>["data"], published: row.published as ContentRecord<K>["published"], deletedAt: row.deleted_at, updatedAt: row.updated_at };
}
export async function getContent<K extends Kind>(kind: K, id: string): Promise<ContentRecord<K>> {
  const { rows: [row] } = await (await database()).query<Row>("SELECT * FROM content WHERE kind = $1 AND id = $2", [kind, id]);
  if (!row) throw new CmsError(404, "内容不存在。");
  return record<K>(row);
}
export async function allContent<K extends Kind>(kind: K, client?: PoolClient): Promise<ContentRecord<K>[]> {
  return (await (client || await database()).query<Row>("SELECT * FROM content WHERE kind = $1 ORDER BY updated_at DESC, id DESC", [kind])).rows.map(record<K>);
}
export async function createContent<K extends Kind>(kind: K) {
  const id = randomUUID();
  const result = await (await database()).query<Row>("INSERT INTO content(id, kind, slug, data, updated_at) VALUES ($1, $2, $3, $4, $5) RETURNING *",
    [id, kind, `untitled-${id.slice(0, 8)}`, JSON.stringify(kind === "posts" ? { zh: emptyTranslation() } : emptyProject()), new Date().toISOString()]);
  return record<K>(result.rows[0]);
}
export async function updateContent<K extends Kind>(kind: K, id: string, input: { version: number; action: string; slug?: string; data?: unknown; locale?: "zh" | "en" }) {
  try { return await transaction(async (db) => {
    const { rows: [row] } = await db.query<Row>("SELECT * FROM content WHERE kind=$1 AND id=$2 FOR UPDATE", [kind, id]);
    if (!row) throw new CmsError(404, "内容不存在。");
    const entry = record<K>(row);
    if (entry.version !== input.version) throw new CmsError(409, "此内容已在另一个页面更新。你的输入仍保留，请复制修改后重新载入。");
    if (entry.deletedAt && input.action !== "restore") throw new CmsError(409, "请先从回收站恢复内容。");
    let { slug, data, published, deletedAt, locked } = entry;
    if (input.action === "save") {
      slug = slugSchema.parse(input.slug);
      if (entry.locked && slug !== entry.slug) throw new CmsError(400, "首次发布后不能修改文章地址。");
      data = (kind === "posts" ? postSchema : projectSchema).parse(input.data) as typeof data;
    } else if (input.action === "publish") {
      if (kind === "posts") {
        const locale = input.locale;
        if (!locale) throw new CmsError(400, "请选择发布语言。");
        const draft = (data as PostData)[locale];
        if (!draft?.title.trim() || !draft.description.trim() || !draft.content.trim() || !draft.date) throw new CmsError(400, "发布前请填写标题、摘要、日期和正文。");
        published = { ...published, [locale]: draft } as typeof published;
      } else {
        const project = data as ProjectData;
        if (!project.name.trim() || !project.description.zh.trim() || !project.description.en.trim()) throw new CmsError(400, "请填写作品名称和中英文简介。");
        published = data;
      }
      locked = true;
    } else if (input.action === "unpublish") {
      if (kind === "posts") {
        if (!input.locale) throw new CmsError(400, "请选择撤回语言。");
        const translations = { ...(published as PostData | null) };
        delete translations[input.locale];
        published = (Object.keys(translations).length ? translations : null) as typeof published;
      } else published = null;
    } else if (input.action === "trash") {
      deletedAt = new Date().toISOString();
      published = null;
    } else if (input.action === "restore") {
      deletedAt = null; // Restoring never silently republishes withdrawn content.
    } else throw new CmsError(400, "不支持的操作。");
    const result = await db.query<Row>("UPDATE content SET slug=$1, data=$2, published=$3, deleted_at=$4, locked=$5, version=version+1, updated_at=$6 WHERE id=$7 RETURNING *",
      [slug, JSON.stringify(data), published ? JSON.stringify(published) : null, deletedAt, locked, new Date().toISOString(), id]);
    return record<K>(result.rows[0]);
  }); } catch (error) {
    if ((error as { code?: string }).code === "23505") throw new CmsError(409, "这个地址已被使用，请换一个。");
    throw error;
  }
}

export async function publishedContent<K extends Kind>(kind: K) {
  return (await (await database()).query<Row>("SELECT * FROM content WHERE kind = $1 AND deleted_at IS NULL AND published IS NOT NULL", [kind])).rows.map(record<K>);
}
