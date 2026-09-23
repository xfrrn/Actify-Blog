import { z } from "zod";
import { json, apiError, checkOrigin, readBytes, readJson } from "@/lib/admin-http";
import { requireSession, login, logout, requestToken, sessionCookie, sessionSeconds, clientIp, consumeLimit } from "@/lib/admin-auth";
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
      await consumeLimit(`login:${clientIp(request)}`, 10, 600);
      await consumeLimit("login:global", 100, 600);
      const { username, password } = z.object({ username: z.string().min(1).max(128), password: z.string().min(1).max(256) }).parse(await readJson(request, 4096));
      const token = await login(username, password);
      const response = json({ ok: true }); response.headers.set("Set-Cookie", cookie(token, sessionSeconds)); return response;
    }
    await requireSession(request);
    if (section === "logout" && method === "POST" && !id) {
      await logout(requestToken(request)); const response = json({ ok: true }); response.headers.set("Set-Cookie", cookie("", 0)); return response;
    }
    if (method !== "GET") await consumeLimit("admin:write", 120, 60);
    const params = new URL(request.url).searchParams;
    const page = pageNumber(params);
    if (section === "session" && method === "GET" && !id) return json({ pending: (await (await database()).query("SELECT count(*)::int AS n FROM feedback WHERE status='pending'")).rows[0].n });
    if (section === "media" && !id) {
      if (method === "GET") return json(await listMedia(page));
      if (method === "POST") {
        await consumeLimit("admin:upload", 20, 60);
        let name = "image";
        try { name = decodeURIComponent(request.headers.get("x-filename") || name); } catch { throw new CmsError(400, "文件名无效。"); }
        return json(await uploadImage(await readBytes(request, 10 * 1024 * 1024), name, request.headers.get("content-type") || ""), 201);
      }
    }
    if (section === "feedback" && !id) {
      if (method === "GET") {
        const status = z.enum(["pending", "published", "hidden"]).parse(params.get("status") || "pending");
        const db = await database();
        return json({ items: (await db.query("SELECT * FROM feedback WHERE status=$1 ORDER BY id DESC LIMIT 20 OFFSET $2", [status, (page - 1) * 20])).rows, total: (await db.query("SELECT count(*)::int AS n FROM feedback WHERE status=$1", [status])).rows[0].n });
      }
      if (method === "PATCH") {
        const body = z.object({ id: z.number().int().positive(), status: z.enum(["published", "hidden"]) }).parse(await readJson(request));
        if (!(await (await database()).query("UPDATE feedback SET status=$1 WHERE id=$2", [body.status, body.id])).rowCount) throw new CmsError(404, "反馈不存在。");
        return json({ ok: true });
      }
    }
    if (section === "posts" || section === "projects") {
      const kind = section;
      if (method === "GET" && id) return json(await getContent(kind, id));
      if (method === "POST" && !id) return json(await createContent(kind), 201);
      if (method === "PATCH" && id) return json(await updateContent(kind, id, edit.parse(await readJson(request))));
      if (method === "GET") {
        const entries = await allContent(kind);
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
