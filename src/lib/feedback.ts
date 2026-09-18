import { getCloudflareContext } from "@opennextjs/cloudflare";

export type FeedbackStatus = "pending" | "published" | "hidden";
export type Feedback = {
  id: number;
  pain_point: string;
  search_query: string;
  locale: "en" | "zh";
  status: FeedbackStatus;
  created_at: string;
};

type Statement = {
  bind(...values: (string | number)[]): Statement;
  run(): Promise<{ success: boolean; meta: { changes: number } }>;
  all<T>(): Promise<{ results: T[] }>;
};

declare global {
  interface CloudflareEnv {
    FEEDBACK_DB: { prepare(sql: string): Statement };
    FEEDBACK_RATE_LIMITER: { limit(options: { key: string }): Promise<{ success: boolean }> };
    FEEDBACK_ADMIN_TOKEN?: string;
  }
}

export function feedbackResponse(status: number, data: object = { ok: status === 201 }) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex", ...(status === 429 ? { "Retry-After": "60" } : {}) },
  });
}

export async function readFeedbackBody(request: Request): Promise<unknown> {
  // Next.js can normalize request.url to localhost behind its dev/proxy server.
  const url = new URL(request.url);
  const expectedOrigin = `${url.protocol}//${request.headers.get("host") || url.host}`;
  if (request.headers.get("origin") !== expectedOrigin) return feedbackResponse(403);
  if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") return feedbackResponse(415);
  // Cap bytes while reading, including requests without Content-Length.
  const reader = request.body?.getReader();
  if (!reader) return feedbackResponse(400);
  try {
    let size = 0;
    let text = "";
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 16384) {
        await reader.cancel();
        return feedbackResponse(413);
      }
      text += decoder.decode(value, { stream: true });
    }
    return JSON.parse(text + decoder.decode());
  } catch {
    return feedbackResponse(400);
  } finally {
    reader.releaseLock();
  }
}

export async function getPublishedFeedback() {
  try {
    const { env } = await getCloudflareContext({ async: true });
    // ponytail: show the latest 20 approved posts; add a paginated archive when needed.
    const { results } = await env.FEEDBACK_DB.prepare(
      "SELECT id, pain_point, locale, created_at FROM feedback WHERE status = 'published' ORDER BY id DESC LIMIT 20",
    ).all<Pick<Feedback, "id" | "pain_point" | "locale" | "created_at">>();
    return results;
  } catch {
    console.error("Published feedback unavailable: check the D1 binding and migrations.");
    return [];
  }
}
