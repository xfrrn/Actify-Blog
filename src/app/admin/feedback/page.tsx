import { requireAdminPage } from "@/lib/admin-page";
import { FeedbackList } from "@/components/admin/feedback-list";
export default async function FeedbackPage() { await requireAdminPage(); return <FeedbackList />; }
