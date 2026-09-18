import { getCloudflareContext } from "@opennextjs/cloudflare";
import { feedbackResponse as reply, readFeedbackBody } from "@/lib/feedback";

export async function POST(request: Request) {
  const body = await readFeedbackBody(request);
  if (body instanceof Response) return body;
  if (!body || typeof body !== "object" || Array.isArray(body)) return reply(400);
  const { painPoint, searchQuery, website, locale } = body as Record<string, unknown>;
  if (typeof painPoint !== "string" || [...painPoint.trim()].length < 10 || painPoint.trim().length > 2000 || painPoint.includes("\0")
    || typeof searchQuery !== "string" || searchQuery.trim().length > 200 || searchQuery.includes("\0")
    || website !== "" || (locale !== "en" && locale !== "zh")) return reply(400);

  try {
    const { env } = await getCloudflareContext({ async: true });
    if (!env.FEEDBACK_DB || !env.FEEDBACK_RATE_LIMITER) return reply(503);
    // ponytail: per-IP, per-location limit; add Turnstile if distributed spam appears.
    const { success } = await env.FEEDBACK_RATE_LIMITER.limit({ key: `submit:${request.headers.get("cf-connecting-ip") || "local"}` });
    if (!success) return reply(429);
    const result = await env.FEEDBACK_DB.prepare(
      "INSERT INTO feedback (pain_point, search_query, locale) VALUES (?, ?, ?)",
    ).bind(painPoint.trim(), searchQuery.trim(), locale).run();
    return reply(result.success ? 201 : 503);
  } catch {
    console.error("Feedback submission failed: check the D1 binding, migration, and rate limiter.");
    return reply(503);
  }
}
