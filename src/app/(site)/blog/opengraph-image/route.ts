import { DATA } from "@/data/site";
import { createOpenGraphImage } from "@/lib/opengraph-image";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const response = await createOpenGraphImage({ title: DATA.name + " · Blog", description: DATA.blog.description });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
