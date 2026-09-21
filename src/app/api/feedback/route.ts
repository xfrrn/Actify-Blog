import { z } from "zod";
import { database } from "@/lib/cms-db";
import { consumeLimit, clientIp } from "@/lib/admin-auth";
import { readJson, apiError, json } from "@/lib/admin-http";

export const runtime = "nodejs";
const schema = z.object({
  painPoint: z.string().trim().max(2000).refine((s) => [...s].length >= 10 && !s.includes("\0")),
  searchQuery: z.string().trim().max(200).refine((s) => !s.includes("\0")),
  website: z.literal(""), locale: z.enum(["en", "zh"]),
});
export async function POST(request: Request) {
  try {
    const body = schema.parse(await readJson(request, 16384));
    await consumeLimit(`feedback:${clientIp(request)}`, 3, 60);
    await (await database()).query("INSERT INTO feedback(pain_point,search_query,locale) VALUES ($1,$2,$3)", [body.painPoint, body.searchQuery, body.locale]);
    return json({ ok: true }, 201);
  } catch (error) { return apiError(error); }
}
