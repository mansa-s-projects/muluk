import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const allowedRoutes = new Set([
  "/",
  "/join",
  "/signup",
  "/verify-email",
  "/onboarding",
  "/assessment",
  "/dashboard",
  "/reports",
  "/book",
  "/booking/success",
  "/strategy-room",
  "/workflows",
  "/settings",
  "/settings/social",
  "/login",
  "/success",
  "/_not-found",
]);

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    /\.(?:png|jpg|jpeg|gif|webp|svg|ico|css|js|map|txt|xml|woff|woff2|ttf)$/i.test(pathname)
  ) {
    return NextResponse.next();
  }

  if (allowedRoutes.has(pathname)) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = "/";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
