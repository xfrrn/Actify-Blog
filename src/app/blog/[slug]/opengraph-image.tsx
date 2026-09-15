import { getPost } from "@/lib/posts";
import { createOpenGraphImage } from "@/lib/opengraph-image";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Blog Post";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return new Response("Post not found", { status: 404 });
  return createOpenGraphImage({ title: post.title, description: post.description, date: post.date });
}
