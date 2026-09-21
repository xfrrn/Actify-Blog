import { requireAdminPage } from "@/lib/admin-page";
import { getContent, CmsError } from "@/lib/cms-store";
import { ProjectEditor } from "@/components/admin/project-editor";
import { notFound } from "next/navigation";
export default async function EditProject({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage();
  const { id } = await params;
  let initial;
  try { initial = await getContent("projects", id); }
  catch (error) { if (error instanceof CmsError && error.status === 404) notFound(); throw error; }
  return <ProjectEditor key={id} initial={initial} />;
}
