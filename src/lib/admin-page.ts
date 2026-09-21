import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { sessionCookie, validSession } from "./admin-auth";

export async function requireAdminPage() {
  if (!validSession((await cookies()).get(sessionCookie)?.value)) redirect("/admin/login");
}
