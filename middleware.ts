import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import {
  isAdminRoute,
  isBypassPath,
  isCreatorRoute,
  isDebugRoute,
  isMarketingRoute,
  isPublicRoute,
  isAdminUserById,
  shouldNoIndex,
} from "@/lib/auth/role-guards";

async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // ── Onboarding consolidation ─────────────────────────────────────────────
  // /dashboard/onboarding is the sole onboarding controller.
  // Any route under /onboarding/* (legacy standalone pages) must redirect there.
  if (pathname === "/onboarding" || pathname.startsWith("/onboarding/")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard/onboarding";
    return NextResponse.redirect(url, { status: 308 });
  }

  if (isBypassPath(pathname)) {
    return NextResponse.next();
  }

  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
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

  const isAdmin = user ? await isAdminUserById(user.id) : false;

  // /debug is never public in production and should not reveal existence.
  if (process.env.NODE_ENV === "production" && isDebugRoute(pathname)) {
    return new NextResponse(null, { status: 404 });
  }

  // Admin routes are sensitive and should not reveal whether they exist.
  if (isAdminRoute(pathname) && (!user || !isAdmin)) {
    return new NextResponse(null, { status: 404 });
  }

  const needsAuth =
    !isPublicRoute(pathname) &&
    (isCreatorRoute(pathname) || isMarketingRoute(pathname) || !isBypassPath(pathname));

  if (!user && needsAuth) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    const search = request.nextUrl.search;
    const fullPath = pathname + (search ?? "");
    url.searchParams.set("next", fullPath);
    return NextResponse.redirect(url);
  }

  if (shouldNoIndex(pathname)) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
    response.headers.set("Cache-Control", "private, no-store");
  }

  return response;
}

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Skip API routes, Next.js internals, and common static asset extensions.
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|css|js|map|txt|xml|woff|woff2|ttf)$).*)",
  ],
};