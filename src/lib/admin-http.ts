import { ZodError } from "zod";
import { CmsError } from "./cms-store.ts";

export function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } });
}
export function apiError(error: unknown) {
  if (error instanceof CmsError) {
    const response = json({ error: error.message }, error.status);
    if (error.retryAfter) response.headers.set("Retry-After", String(error.retryAfter));
    return response;
  }
  if (error instanceof ZodError) return json({ error: error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("；") }, 400);
  console.error("CMS request failed", error instanceof Error ? error.message : "unknown error");
  return json({ error: "暂时无法完成操作，请稍后重试。" }, 500);
}
export function checkOrigin(request: Request) {
  const allowed = process.env.SITE_ORIGIN || new URL(request.url).origin;
  if (process.env.NODE_ENV === "production" && !process.env.SITE_ORIGIN) throw new CmsError(503, "服务器尚未配置 SITE_ORIGIN。");
  if (request.headers.get("origin") !== allowed) throw new CmsError(403, "请求来源不正确。");
}
export async function readBytes(request: Request, limit: number) {
  if (Number(request.headers.get("content-length") || 0) > limit) throw new CmsError(413, "内容超过大小限制。");
  const reader = request.body?.getReader();
  if (!reader) throw new CmsError(400, "请求内容为空。");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) { await reader.cancel(); throw new CmsError(413, "内容超过大小限制。"); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return Buffer.concat(chunks, size);
}
export async function readJson(request: Request, limit = 2 * 1024 * 1024) {
  checkOrigin(request);
  if (request.headers.get("content-type")?.split(";")[0] !== "application/json") throw new CmsError(415, "请使用 JSON 提交。");
  const bytes = await readBytes(request, limit);
  try { return JSON.parse(bytes.toString("utf8")); } catch { throw new CmsError(400, "请求格式不正确。"); }
}
