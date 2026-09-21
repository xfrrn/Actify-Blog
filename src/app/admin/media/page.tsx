import { requireAdminPage } from "@/lib/admin-page";
import { MediaLibrary } from "@/components/admin/media-library";
export default async function MediaPage() { await requireAdminPage(); return <div className="admin-page"><h1 className="admin-title">图片素材</h1><p className="admin-muted mb-8 mt-2">把文章与作品里的图片放在一起，随时取用。</p><MediaLibrary /></div>; }
