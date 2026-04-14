import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getRoleFromUser, isEmailInAdminAllowlist } from "@/lib/auth/role-guards";
import { hasMinimumRole } from "@/lib/auth/permissions";

export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

/**
 * Admin layout — defence-in-depth gate.
 *
 * Middleware already enforces the same three checks before the request
 * reaches this component. We re-verify here so a middleware misconfiguration
 * can never accidentally expose admin pages.
 *
 * Check order (mirrors middleware):
 *  1. Valid session
 *  2. Role is admin or super_admin (from JWT — no extra DB query)
 *  3. Email in admin_allowlist (one service-role DB query per page load)
 */
export default async function AdminLayout({
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
