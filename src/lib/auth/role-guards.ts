import { createClient as createServiceClient } from "@supabase/supabase-js";
import type { UserRole } from "./permissions";
import { isValidRole } from "./permissions";

// ─────────────────────────────────────────────────────────────
// ROUTE CLASSIFICATION
// ─────────────────────────────────────────────────────────────

export const PUBLIC_ROUTES = new Set(["/", "/login", "/apply"]);

const PUBLIC_PREFIXES   = ["/book", "/booking", "/r", "/vault", "/commission", "/tips", "/series"];
const ADMIN_PREFIXES    = ["/admin"];
const DEBUG_PREFIXES    = ["/debug"];
const CREATOR_PREFIXES  = ["/dashboard", "/onboarding"];
const FAN_PREFIXES      = ["/fan"];
const MARKETING_PREFIXES = ["/marketing"];

function matchesPrefixes(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.has(pathname) || matchesPrefixes(pathname, PUBLIC_PREFIXES);
}

export function isAdminRoute(pathname: string): boolean {
  return matchesPrefixes(pathname, ADMIN_PREFIXES);
}

export function isDebugRoute(pathname: string): boolean {
  return matchesPrefixes(pathname, DEBUG_PREFIXES);
}

export function isCreatorRoute(pathname: string): boolean {
  return matchesPrefixes(pathname, CREATOR_PREFIXES);
}

export function isFanRoute(pathname: string): boolean {
  return matchesPrefixes(pathname, FAN_PREFIXES);
}

export function isMarketingRoute(pathname: string): boolean {
  return matchesPrefixes(pathname, MARKETING_PREFIXES);
}

export function shouldNoIndex(pathname: string): boolean {
  return (
    matchesPrefixes(pathname, ADMIN_PREFIXES) ||
    matchesPrefixes(pathname, DEBUG_PREFIXES) ||
    matchesPrefixes(pathname, CREATOR_PREFIXES) ||
    matchesPrefixes(pathname, FAN_PREFIXES) ||
    matchesPrefixes(pathname, MARKETING_PREFIXES)
  );
}

export function isBypassPath(pathname: string): boolean {
  if (
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico" ||
    pathname.startsWith("/api/")
  ) {
    return true;
  }

  // Any protected prefix is never bypassed
  if (
    matchesPrefixes(pathname, ADMIN_PREFIXES) ||
    matchesPrefixes(pathname, DEBUG_PREFIXES) ||
    matchesPrefixes(pathname, CREATOR_PREFIXES) ||
    matchesPrefixes(pathname, FAN_PREFIXES) ||
    matchesPrefixes(pathname, MARKETING_PREFIXES)
  ) {
    return false;
  }

  const safeExtensions = /\.(png|jpg|jpeg|gif|webp|svg|css|js|json|ico|woff|woff2|ttf|eot)$/i;
  return safeExtensions.test(pathname);
}

// ─────────────────────────────────────────────────────────────
// ROLE EXTRACTION (no DB query — reads from JWT metadata)
// ─────────────────────────────────────────────────────────────

type JwtUser = {
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
} | null;

/**
 * Reads the user's role from their JWT app_metadata.
 * The sync_role_to_jwt DB trigger keeps this fresh on every role change.
 * Falls back to 'fan' if absent or invalid.
 */
export function getRoleFromUser(user: JwtUser): UserRole {
  if (!user) return "fan";
  const raw = user.app_metadata?.role ?? user.user_metadata?.role;
  return isValidRole(raw) ? raw : "fan";
}

// ─────────────────────────────────────────────────────────────
// ADMIN EMAIL ALLOWLIST (DB query — only called for admin routes)
// ─────────────────────────────────────────────────────────────

type AllowlistResult =
  | { allowed: true; role: "admin" | "super_admin" }
  | { allowed: false; role: "fan" };

/**
 * Returns whether `email` is in the admin_allowlist and active.
 * Uses the service role key so RLS is bypassed.
 * Only call this on admin routes — it does a DB round-trip.
 */
export async function isEmailInAdminAllowlist(
  email: string
): Promise<AllowlistResult> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey || !email) return { allowed: false, role: "fan" };

  const service = createServiceClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data } = await service
    .from("admin_allowlist")
    .select("role")
    .eq("email", email)
    .eq("is_active", true)
    .maybeSingle();

  if (!data) return { allowed: false, role: "fan" };

  const role = data.role as UserRole;
  if (role !== "admin" && role !== "super_admin") return { allowed: false, role: "fan" };
  return { allowed: true, role };
}

// ─────────────────────────────────────────────────────────────
// LEGACY: isAdminUserById — kept for backward compatibility.
// Prefer getRoleFromUser() + isEmailInAdminAllowlist() instead.
// ─────────────────────────────────────────────────────────────

export async function isAdminUserById(userId: string): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey || !userId) return false;

  const service = createServiceClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await service
    .from("admin_users")
    .select("id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  return !error && !!data;
}
