"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasMinimumRole, isValidRole, type UserRole } from "@/lib/auth/permissions";
import { isEmailInAdminAllowlist } from "@/lib/auth/role-guards";

export type AdminLoginResult = { error: string } | void;

// Generic denial message — never reveal why access was blocked
const DENIED = "Invalid credentials or insufficient permissions.";

/**
 * Server Action for admin login.
 *
 * Security layers (all must pass):
 *  1. Valid Supabase credentials
 *  2. Account is not banned
 *  3. users.role is admin or super_admin (checked from DB, not JWT — authoritative)
 *  4. Email is in admin_allowlist and active
 *
 * On success:  redirect() to /admin/dashboard (handled by Next.js router)
 * On failure:  return { error } — session is signed out before returning
 */
export async function adminLoginAction(formData: FormData): Promise<AdminLoginResult> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const supabase = await createClient();

  // ── 1. Authenticate ──────────────────────────────────────────
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError || !authData.user) {
    // Do not expose whether the email exists
    return { error: DENIED };
  }

  const userId = authData.user.id;

  // ── 2. Fetch role from DB (authoritative, not JWT) ───────────
  // We query DB here rather than reading JWT app_metadata because:
  //  a) Login is a once-per-session call — the extra query is negligible
  //  b) JWT may be stale if the role was changed after the last sign-in
  const { data: userRow } = await supabase
    .from("users")
    .select("role, is_banned")
    .eq("id", userId)
    .maybeSingle();

  // Banned accounts are silently denied
  if (userRow?.is_banned) {
    await supabase.auth.signOut();
    return { error: DENIED };
  }

  const role = isValidRole(userRow?.role) ? (userRow!.role as UserRole) : "fan";

  // ── 3. Role must be admin or super_admin ─────────────────────
  if (!hasMinimumRole(role, "admin")) {
    // Sign out so we leave no session for non-admins
    await supabase.auth.signOut();
    return { error: DENIED };
  }

  // ── 4. Email allowlist check (defence-in-depth) ──────────────
  // A role escalation attack (someone sets their own role to admin
  // in the DB) will fail here unless their email was explicitly
  // added to the allowlist by a super_admin.
  const { allowed } = await isEmailInAdminAllowlist(email);
  if (!allowed) {
    await supabase.auth.signOut();
    return { error: DENIED };
  }

  // ── All checks passed — session is active, redirect ──────────
  redirect("/admin/dashboard");
}
