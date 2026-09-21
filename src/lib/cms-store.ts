import { randomUUID } from "node:crypto";
import { database, transaction } from "./cms-db.ts";
import { postSchema, projectSchema, slugSchema, emptyProject, emptyTranslation } from "./cms-types.ts";
import type { ContentRecord, Kind, PostData, ProjectData } from "./cms-types.ts";

export class CmsError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}
type Row = { id: string; kind: Kind; slug: string; locked: number; version: number; data: string; published: string | null; deleted_at: string | null; updated_at: string };
function record<K extends Kind>(row: Row): ContentRecord<K> {
  return { id: row.id, kind: row.kind as K, slug: row.slug, locked: !!row.locked, version: row.version, data: JSON.parse(row.data), published: row.published ? JSON.parse(row.published) : null, deletedAt: row.deleted_at, updatedAt: row.updated_at };
}
export function getContent<K extends Kind>(kind: K, id: string): ContentRecord<K> {
  const row = database().prepare("SELECT * FROM content WHERE kind = ? AND id = ?").get(kind, id) as Row | undefined;
  if (!row) throw new CmsError(404, "内容不存在。");
  return record<K>(row);
}
export function allContent<K extends Kind>(kind: K): ContentRecord<K>[] {
  return (database().prepare("SELECT * FROM content WHERE kind = ? ORDER BY updated_at DESC, id DESC").all(kind) as Row[]).map(record<K>);
}
export function createContent<K extends Kind>(kind: K) {
  const id = randomUUID();
  database().prepare("INSERT INTO content(id, kind, slug, data, updated_at) VALUES (?, ?, ?, ?, ?)")
    .run(id, kind, `untitled-${id.slice(0, 8)}`, JSON.stringify(kind === "posts" ? { zh: emptyTranslation() } : emptyProject()), new Date().toISOString());
  return getContent(kind, id);
}
export function updateContent<K extends Kind>(kind: K, id: string, input: { version: number; action: string; slug?: string; data?: unknown; locale?: "zh" | "en" }) {
  return transaction(() => {
    const entry = getContent(kind, id);
    if (entry.version !== input.version) throw new CmsError(409, "此内容已在另一个页面更新。你的输入仍保留，请复制修改后重新载入。");
    if (entry.deletedAt && input.action !== "restore") throw new CmsError(409, "请先从回收站恢复内容。");
    let { slug, data, published, deletedAt, locked } = entry;
    if (input.action === "save") {
      slug = slugSchema.parse(input.slug);
      if (entry.locked && slug !== entry.slug) throw new CmsError(400, "首次发布后不能修改文章地址。");
      data = (kind === "posts" ? postSchema : projectSchema).parse(input.data) as typeof data;
      if (database().prepare("SELECT id FROM content WHERE kind = ? AND slug = ? AND id != ?").get(kind, slug, id)) throw new CmsError(409, "这个地址已被使用，请换一个。");
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
    database().prepare("UPDATE content SET slug=?, data=?, published=?, deleted_at=?, locked=?, version=version+1, updated_at=? WHERE id=?")
      .run(slug, JSON.stringify(data), published ? JSON.stringify(published) : null, deletedAt, Number(locked), new Date().toISOString(), id);
    return getContent(kind, id);
  });
}

export function publishedContent<K extends Kind>(kind: K) {
  return (database().prepare("SELECT * FROM content WHERE kind = ? AND deleted_at IS NULL AND published IS NOT NULL").all(kind) as Row[]).map(record<K>);
}
