// This bootstrap route has been retired.
// Admin accounts are managed through the allowlist in the admin panel.
import { redirect } from "next/navigation";

export default function SetupAdminPage() {
  redirect("/admin/login");
}
