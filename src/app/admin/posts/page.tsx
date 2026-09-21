import { requireAdminPage } from "@/lib/admin-page";
import { ContentList } from "@/components/admin/content-list";
export default async function PostsPage() { await requireAdminPage(); return <ContentList kind="posts" />; }
