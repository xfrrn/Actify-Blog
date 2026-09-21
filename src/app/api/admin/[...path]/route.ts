import { z } from "zod";
import { json, apiError, checkOrigin, readBytes, readJson } from "@/lib/admin-http";
import { requireSession, login, logout, requestToken, sessionCookie, sessionSeconds, clientIp } from "@/lib/admin-auth";
import { allContent, createContent, getContent, updateContent, CmsError } from "@/lib/cms-store";
import { database } from "@/lib/cms-db";
import { listMedia, uploadImage } from "@/lib/media";
import type { PostData, ProjectData } from "@/lib/cms-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ path: string[] }> };
const edit = z.object({ version: z.number().int().positive(), action: z.enum(["save", "publish", "unpublish", "trash", "restore"]), slug: z.string().optional(), data: z.unknown().optional(), locale: z.enum(["en", "zh"]).optional() });
const pageNumber = (params: URLSearchParams) => Math.max(1, Math.min(100000, Number.parseInt(params.get("page") || "1", 10) || 1));
function cookie(token: string, age: number) {
  return `${sessionCookie}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${process.env.NODE_ENV === "production" ? "; Secure" : ""}`;
}
async function handle(request: Request, context: Context) {
  try {
    const { path } = await context.params;
    const [section, id] = path;
    if (path.length > 2) throw new CmsError(404, "接口不存在。");
    const method = request.method;
    if (method !== "GET") checkOrigin(request);
    if (section === "login" && method === "POST" && !id) {
      const { password } = z.object({ password: z.string().min(1).max(256) }).parse(await readJson(request, 4096));
      const token = await login(password, clientIp(request));
      const response = json({ ok: true }); response.headers.set("Set-Cookie", cookie(token, sessionSeconds)); return response;
    }
    requireSession(request);
    if (section === "logout" && method === "POST" && !id) {
      logout(requestToken(request)); const response = json({ ok: true }); response.headers.set("Set-Cookie", cookie("", 0)); return response;
    }
    const params = new URL(request.url).searchParams;
    const page = pageNumber(params);
    if (section === "session" && method === "GET" && !id) return json({ pending: (database().prepare("SELECT count(*) AS n FROM feedback WHERE status='pending'").get() as { n: number }).n });
    if (section === "media" && !id) {
      if (method === "GET") return json(listMedia(page));
      if (method === "POST") {
        let name = "image";
        try { name = decodeURIComponent(request.headers.get("x-filename") || name); } catch { throw new CmsError(400, "文件名无效。"); }
        return json(await uploadImage(await readBytes(request, 10 * 1024 * 1024), name, request.headers.get("content-type") || ""), 201);
      }
    }
    if (section === "feedback" && !id) {
      if (method === "GET") {
        const status = z.enum(["pending", "published", "hidden"]).parse(params.get("status") || "pending");
        return json({ items: database().prepare("SELECT * FROM feedback WHERE status=? ORDER BY id DESC LIMIT 20 OFFSET ?").all(status, (page - 1) * 20), total: (database().prepare("SELECT count(*) AS n FROM feedback WHERE status=?").get(status) as { n: number }).n });
      }
      if (method === "PATCH") {
        const body = z.object({ id: z.number().int().positive(), status: z.enum(["published", "hidden"]) }).parse(await readJson(request));
        if (!database().prepare("UPDATE feedback SET status=? WHERE id=?").run(body.status, body.id).changes) throw new CmsError(404, "反馈不存在。");
        return json({ ok: true });
      }
    }
    if (section === "posts" || section === "projects") {
      const kind = section;
      if (method === "GET" && id) return json(getContent(kind, id));
      if (method === "POST" && !id) return json(createContent(kind), 201);
      if (method === "PATCH" && id) return json(updateContent(kind, id, edit.parse(await readJson(request))));
      if (method === "GET") {
        const entries = allContent(kind);
        const query = (params.get("q") || "").toLocaleLowerCase();
        const status = params.get("status") || "all";
        const locale = params.get("locale");
        const category = params.get("category");
        const categories = [...new Set(kind === "posts" ? entries.flatMap((entry) => !entry.deletedAt ? Object.values(entry.data as PostData).map((translation) => translation.category).filter(Boolean) : []) : [])].sort();
        const filtered = entries.filter((entry) => {
          if (status === "trash" ? !entry.deletedAt : entry.deletedAt) return false;
          if (kind === "posts") return Object.entries(entry.data as PostData).some(([lang, post]) => {
            const published = (entry.published as PostData | null)?.[lang as "zh" | "en"];
            return (!locale || lang === locale) && (!category || post.category === category) && post.title.toLocaleLowerCase().includes(query)
              && (status !== "published" || !!published) && (status !== "draft" || JSON.stringify(post) !== JSON.stringify(published));
          });
          if (status === "published" && !entry.published) return false;
          if (status === "draft" && JSON.stringify(entry.data) === JSON.stringify(entry.published)) return false;
          return (entry.data as ProjectData).name.toLocaleLowerCase().includes(query);
        });
        return json({ items: filtered.slice((page - 1) * 20, page * 20), total: filtered.length, categories });
      }
    }
    throw new CmsError(404, "接口不存在。");
  } catch (error) { return apiError(error); }
}
export { handle as GET, handle as POST, handle as PATCH };
