import { getPost } from "@/lib/posts";
import { getLanguage } from "@/lib/server-language";
import { createOpenGraphImage } from "@/lib/opengraph-image";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { locale } = await getLanguage();
  const post = await getPost(slug, locale);
  if (!post) return new Response("Post not found", { status: 404 });
  const response = await createOpenGraphImage({ title: post.title, description: post.description, date: post.date });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
