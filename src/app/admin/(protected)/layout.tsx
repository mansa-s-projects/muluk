import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getRoleFromUser, isEmailInAdminAllowlist, hasMinimumRole } from "@/lib/auth/role-guards";

/**
 * Admin (protected) layout — defence-in-depth gate.
 *
 * Middleware enforces the same three checks before the request reaches
 * this component; we re-verify here so a middleware misconfiguration can
 * never accidentally expose admin pages.
 *
 *  1. Valid session
 *  2. Role is admin or super_admin (from JWT — no extra DB query)
 *  3. Email in admin_allowlist (one service-role DB query per page load)
 *
 * Non-admin requests receive a 404 (security by obscurity).
 */
export default async function AdminProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) notFound();

  const role = getRoleFromUser(user);
  if (!hasMinimumRole(role, "admin")) notFound();

  if (!user.email) notFound();
  const { allowed } = await isEmailInAdminAllowlist(user.email);
  if (!allowed) notFound();

  return (
    <div data-admin-role={role} className="admin-layout">
      {children}
    </div>
  );
}
