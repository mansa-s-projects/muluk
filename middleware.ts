import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import {
  isAdminRoute,
  isBypassPath,
  isCreatorRoute,
  isFanRoute,
  isDebugRoute,
  isMarketingRoute,
  isPublicRoute,
  shouldNoIndex,
  isEmailInAdminAllowlist,
  getRoleFromUser,
} from "@/lib/auth/role-guards";
import { hasMinimumRole } from "@/lib/auth/permissions";

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

function redirectTo(request: NextRequest, pathname: string): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.searchParams.set("next", request.nextUrl.pathname + (request.nextUrl.search ?? ""));
  return NextResponse.redirect(url);
}

function privateResponse(response: NextResponse): NextResponse {
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

// ─────────────────────────────────────────────────────────────
// MAIN HANDLER
// ─────────────────────────────────────────────────────────────

async function updateSession(request: NextRequest): Promise<NextResponse> {
  const pathname = request.nextUrl.pathname;

  // ── Legacy onboarding redirect (308 permanent) ──────────────
  if (pathname === "/onboarding" || pathname.startsWith("/onboarding/")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard/onboarding";
    return NextResponse.redirect(url, { status: 308 });
  }

  // ── Static assets and API routes bypass auth entirely ───────
  if (isBypassPath(pathname)) {
    return NextResponse.next();
  }

  // ── Build mutable response so session cookies are refreshed ─
  const response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Read role from JWT app_metadata — no extra DB query.
  // Kept fresh by the sync_role_to_jwt trigger on every role change.
  const role = getRoleFromUser(user);

  // ── Debug routes: invisible in production ───────────────────
  if (process.env.NODE_ENV === "production" && isDebugRoute(pathname)) {
    return new NextResponse(null, { status: 404 });
  }

  // ── Admin routes ─────────────────────────────────────────────
  if (isAdminRoute(pathname)) {
    // /admin/login is the public entry point for the admin system.
    // Everyone can see it — but authenticated admins skip straight to the dashboard.
    if (pathname === "/admin/login") {
      if (user && hasMinimumRole(role, "admin")) {
        const url = request.nextUrl.clone();
        url.pathname = "/admin/dashboard";
        url.search = "";
        return NextResponse.redirect(url);
      }
      // Not yet an admin — show the login page
      return response;
    }

    // All other /admin/* routes enforce three sequential gates:
    //
    //  Gate 1 — Must be authenticated.
    //           Unauthenticated users are redirected to the login page
    //           (not 404, so an admin who is logged out can get back in).
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      url.search = "";
      return NextResponse.redirect(url);
    }

    //  Gate 2 — Must hold the admin or super_admin role.
    //           Wrong-role users get 404 — they should not know this panel exists.
    if (!hasMinimumRole(role, "admin")) {
      return new NextResponse(null, { status: 404 });
    }

    //  Gate 3 — Email must be in the admin_allowlist (defence-in-depth).
    //           Even if someone gains the admin role via the DB, they still
    //           need their email explicitly allowlisted by a super_admin.
    if (!user.email) {
      return new NextResponse(null, { status: 404 });
    }
    const { allowed } = await isEmailInAdminAllowlist(user.email);
    if (!allowed) {
      return new NextResponse(null, { status: 404 });
    }

    // All gates passed — attach role header and harden response
    response.headers.set("X-User-Role", role);
    return privateResponse(response);
  }

  // ── /pending — approval holding page ────────────────────────
  // Unauthenticated users hit the catch-all below → /login.
  // Authenticated users who are already approved skip straight
  // to the dashboard so they never see a stale pending screen.
  if (pathname === "/pending") {
    if (user && user.app_metadata?.is_approved === true) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      url.search = "";
      return NextResponse.redirect(url);
    }
    return response;
  }

  // ── Let Layouts Handle Role Navigation (/dashboard vs /fan) ──
  if (isCreatorRoute(pathname) || isFanRoute(pathname)) {
    if (!user) return redirectTo(request, "/login");
    // Note: the exact role redirection is now handled safely by 
    // getSafeProfile() inside src/app/dashboard/layout.tsx 
    // and src/app/fan/layout.tsx
    response.headers.set("X-User-Role", role);
    return response;
  }

  // ── Marketing routes ─────────────────────────────────────────
  if (isMarketingRoute(pathname)) {
    if (!user) return redirectTo(request, "/login");
    response.headers.set("X-User-Role", role);
    return response;
  }

  // ── All other non-public routes ───────────────────────────────
  if (!isPublicRoute(pathname) && !user) {
    return redirectTo(request, "/login");
  }

  // ── SEO: noindex on all private areas ────────────────────────
  if (shouldNoIndex(pathname)) {
    privateResponse(response);
  }

  if (user) {
    response.headers.set("X-User-Role", role);
  }

  return response;
}

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|css|js|map|txt|xml|woff|woff2|ttf)$).*)",
  ],
};
