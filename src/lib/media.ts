import sharp from "sharp";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import { database, dataDirectory } from "./cms-db.ts";
import { CmsError } from "./cms-store.ts";
import type { Media } from "./cms-types.ts";
import { mediaStorage, writeR2Image } from "./r2.ts";

export async function uploadImage(bytes: Buffer, name: string, mime: string) {
  if (!bytes.length || bytes.length > 10 * 1024 * 1024) throw new CmsError(400, "图片不能为空，且不能超过 10MB。");
  const storage = mediaStorage();
  const types = { jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif" };
  let output: Buffer, width: number, height: number, format: keyof typeof types;
  try {
    const decoder = sharp(bytes, { animated: true, limitInputPixels: 25000000 });
    const metadata = await decoder.metadata();
    format = metadata.format as keyof typeof types;
    if (!(format in types) || types[format] !== mime || (metadata.pages || 1) > 100) throw new Error("Invalid format");
    width = metadata.width!; height = metadata.pageHeight || metadata.height!;
    output = await decoder.toFormat(format).toBuffer();
    if (output.length > 10 * 1024 * 1024) throw new Error("Image too large");
  } catch { throw new CmsError(400, "请选择有效的 JPEG、PNG、WebP 或 GIF 图片（最大 10MB，动画最多 100 帧）。"); }
  const id = randomUUID();
  const filename = `${id}.${format === "jpeg" ? "jpg" : format}`;
  const db = await database();
  const path = storage === "local" ? join(dataDirectory(), "uploads", filename) : "";
  let url = `/media/${filename}`;
  if (storage === "r2") url = await writeR2Image(filename, types[format], output);
  else { await mkdir(join(dataDirectory(), "uploads"), { recursive: true, mode: 0o700 }); await writeFile(path, output, { flag: "wx", mode: 0o600 }); }
  const media: Media = { id, filename, storage, name: name.slice(0, 255), mime: types[format], size: output.length, width, height, created_at: new Date().toISOString(), url };
  try {
    await db.query("INSERT INTO media(id,filename,name,mime,size,width,height,created_at,storage,url) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)",
      [id, filename, media.name, media.mime, media.size, width, height, media.created_at, storage, url]);
  } catch (error) {
    if (storage === "local") await unlink(path);
    // A rare failed DB insert may leave an unreferenced R2 object; never delete a possibly referenced upload.
    throw error;
  }
  return media;
}
export async function listMedia(page = 1) {
  const db = await database();
  const { rows } = await db.query<Media>("SELECT * FROM media ORDER BY created_at DESC, id DESC LIMIT 24 OFFSET $1", [(page - 1) * 24]);
  return { items: rows.map((row) => ({ ...row, url: row.url || `/media/${row.filename}` })), total: (await db.query<{ n: number }>("SELECT count(*)::int AS n FROM media")).rows[0].n };
}
