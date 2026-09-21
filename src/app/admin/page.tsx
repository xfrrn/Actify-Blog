import { redirect } from "next/navigation";
import { requireAdminPage } from "@/lib/admin-page";
export default async function AdminPage() { await requireAdminPage(); redirect("/admin/posts"); }
