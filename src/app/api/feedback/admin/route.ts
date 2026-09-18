import { timingSafeEqual } from "node:crypto";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { feedbackResponse as reply, readFeedbackBody, type Feedback } from "@/lib/feedback";

async function authorize(request: Request) {
  const { env } = await getCloudflareContext({ async: true });
  if (!env.FEEDBACK_ADMIN_TOKEN || env.FEEDBACK_ADMIN_TOKEN.length < 32 || !env.FEEDBACK_DB || !env.FEEDBACK_RATE_LIMITER) return reply(503);
  const expected = Buffer.from(`Bearer ${env.FEEDBACK_ADMIN_TOKEN}`);
  const provided = Buffer.from(request.headers.get("authorization") || "");
  if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) {
    const { success } = await env.FEEDBACK_RATE_LIMITER.limit({ key: `admin:${request.headers.get("cf-connecting-ip") || "local"}` });
    return reply(success ? 401 : 429);
  }
  return env;
}

export async function GET(request: Request) {
  try {
    const env = await authorize(request);
    if (env instanceof Response) return env;
    const params = new URL(request.url).searchParams;
    const status = params.get("status") || "pending";
    const before = Number(params.get("before") || Number.MAX_SAFE_INTEGER);
    if (!["pending", "published", "hidden"].includes(status) || !Number.isSafeInteger(before) || before < 1) return reply(400);
    const { results } = await env.FEEDBACK_DB.prepare(
      "SELECT id, pain_point, search_query, locale, status, created_at FROM feedback WHERE status = ? AND id < ? ORDER BY id DESC LIMIT 21",
    ).bind(status, before).all<Feedback>();
    return reply(200, { items: results.slice(0, 20), nextCursor: results.length > 20 ? results[19].id : null });
  } catch {
    console.error("Feedback review unavailable: check the D1 binding and admin secret.");
    return reply(503);
  }
}

export async function PATCH(request: Request) {
  try {
    const env = await authorize(request);
    if (env instanceof Response) return env;
    const body = await readFeedbackBody(request);
    if (body instanceof Response) return body;
    if (!body || typeof body !== "object" || Array.isArray(body)) return reply(400);
    const { id, status } = body as Record<string, unknown>;
    if (typeof id !== "number" || !Number.isSafeInteger(id) || id < 1 || (status !== "published" && status !== "hidden")) return reply(400);
    const result = await env.FEEDBACK_DB.prepare("UPDATE feedback SET status = ? WHERE id = ?").bind(status, id).run();
    if (!result.success) return reply(503);
    return result.meta.changes ? reply(200, { ok: true }) : reply(404);
  } catch {
    console.error("Feedback review failed: check the D1 binding and migrations.");
    return reply(503);
  }
}
