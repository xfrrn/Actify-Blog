import { DATA } from "@/data/site";
import { createOpenGraphImage } from "@/lib/opengraph-image";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Blog";

export default function Image() {
  return createOpenGraphImage({ title: DATA.name + " · Blog", description: DATA.blog.description });
}
