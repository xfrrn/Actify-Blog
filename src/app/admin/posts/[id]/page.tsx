import { requireAdminPage } from "@/lib/admin-page";
import { getContent, CmsError } from "@/lib/cms-store";
import { PostEditor } from "@/components/admin/post-editor";
import { notFound } from "next/navigation";
export default async function EditPost({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage();
  const { id } = await params;
  let initial;
  try { initial = await getContent("posts", id); }
  catch (error) { if (error instanceof CmsError && error.status === 404) notFound(); throw error; }
  return <PostEditor key={id} initial={initial} />;
}
