import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { database, dataDirectory } from "@/lib/cms-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(_request: Request, { params }: { params: Promise<{ filename: string }> }) {
  const { filename } = await params;
  if (!/^[a-f0-9-]{36}\.(jpg|png|webp|gif)$/.test(filename)) return new Response(null, { status: 404 });
  const { rows: [media] } = await (await database()).query<{ mime: string; storage: string; url: string }>("SELECT mime, storage, url FROM media WHERE filename=$1", [filename]);
  if (!media) return new Response(null, { status: 404 });
  if (media.storage === "r2") return new Response(null, { status: 302, headers: { Location: media.url, "Cache-Control": "no-store" } });
  try {
    const bytes = await readFile(join(dataDirectory(), "uploads", filename));
    return new Response(bytes, { headers: { "Content-Type": media.mime, "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" } });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return new Response(null, { status: 404 });
    throw error;
  }
}
