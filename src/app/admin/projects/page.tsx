import { requireAdminPage } from "@/lib/admin-page";
import { ContentList } from "@/components/admin/content-list";
export default async function ProjectsPage() { await requireAdminPage(); return <ContentList kind="projects" />; }
