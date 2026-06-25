import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

const PUBLIC_PATHS = new Set([
  "/", "/login", "/signup", "/join", "/verify-email", "/success", "/_not-found",
]);

const PUBLIC_PREFIXES = ["/booking/success", "/join/"];

const ALLOW_DEV_ADMIN_BYPASS =
  process.env.ALLOW_DEV_ADMIN_BYPASS === "true" && process.env.NODE_ENV === "development";

function isPublic(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true;
  return PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    /\.(?:png|jpg|jpeg|gif|webp|svg|ico|css|js|map|txt|xml|woff|woff2|ttf)$/i.test(pathname)
  ) {
    return NextResponse.next();
  }

  if (isPublic(pathname)) return NextResponse.next();

  if (ALLOW_DEV_ADMIN_BYPASS && pathname.startsWith("/dashboard")) {
    const response = NextResponse.next({ request: { headers: request.headers } });
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
    return response;
  }

  const response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // ✅ FIX: wrap in try/catch so a Supabase error never causes a 500
  try {
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  } catch {
    // If Supabase is unreachable, redirect to login rather than crashing
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

export const config = {
  // ✅ FIX: also exclude favicon and common static extensions at the matcher level
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|css|js|woff2?|ttf)).*)"],
};