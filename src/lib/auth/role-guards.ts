import { createClient as createServiceClient } from "@supabase/supabase-js";

export const PUBLIC_ROUTES = new Set(["/", "/login", "/apply"]);

// Path prefixes accessible without authentication (fan-facing pages)
const PUBLIC_PREFIXES = ["/book", "/booking", "/r", "/vault", "/commission", "/tips", "/series"];

const ADMIN_PREFIXES = ["/admin", "/setup-admin"];
const DEBUG_PREFIXES = ["/debug"];
const CREATOR_PREFIXES = ["/dashboard", "/onboarding"];

export function isPublicRoute(pathname: string): boolean {
  if (PUBLIC_ROUTES.has(pathname)) return true;
  return PUBLIC_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

export function isAdminRoute(pathname: string): boolean {
  return ADMIN_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function isDebugRoute(pathname: string): boolean {
  return DEBUG_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function isCreatorRoute(pathname: string): boolean {
  return CREATOR_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function isMarketingRoute(pathname: string): boolean {
  return pathname === "/marketing" || pathname.startsWith("/marketing/");
}

export function shouldNoIndex(pathname: string): boolean {
  return (
    ADMIN_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`)) ||
    DEBUG_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`)) ||
    CREATOR_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`)) ||
    pathname === "/marketing" ||
    pathname.startsWith("/marketing/")
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

  // Verify no protected prefixes exist
  if (ADMIN_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`)) ||
      DEBUG_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`)) ||
      CREATOR_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`)) ||
      pathname === "/marketing" || pathname.startsWith("/marketing/")) {
    return false;
  }

  // Safe static asset extensions
  const safeExtensions = /\.(png|jpg|jpeg|gif|webp|svg|css|js|json|ico|woff|woff2|ttf|eot)$/i;
  return safeExtensions.test(pathname);
}

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
