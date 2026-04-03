import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isDebugRoute = pathname === "/debug" || pathname.startsWith("/debug/");

  if (process.env.NODE_ENV === "production" && isDebugRoute) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return updateSession(request);
}

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/debug/:path*"],
};