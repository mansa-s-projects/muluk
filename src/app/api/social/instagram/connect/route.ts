import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const redirect = req.nextUrl.searchParams.get("redirect");
  const target = new URL("/api/auth/instagram/connect", req.url);
  if (redirect) {
    target.searchParams.set("redirect", redirect);
  }
  return NextResponse.redirect(target);
}
