import { NextRequest, NextResponse } from "next/server";
import { appBaseUrl, dashboardUrl, randomToken } from "@/app/api/auth/_utils";

export async function GET(req: NextRequest) {
  const clientId = process.env.INSTAGRAM_CLIENT_ID;
  const callback = process.env.INSTAGRAM_CALLBACK_URL || `${appBaseUrl(req)}/api/auth/instagram/callback`;
  const redirect = req.nextUrl.searchParams.get("redirect") || "";

  if (!clientId) {
    return NextResponse.redirect(dashboardUrl(req, {
      social_error: "instagram",
      social_msg: "Instagram OAuth is not configured yet.",
    }));
  }

  const state = randomToken(16);
  const authUrl = new URL("https://api.instagram.com/oauth/authorize");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", callback);
  authUrl.searchParams.set("scope", "user_profile,user_media");
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("state", state);

  const isSecure = process.env.NODE_ENV !== "development";
  const res = NextResponse.redirect(authUrl);
  res.cookies.set("instagram_oauth_state", state, { httpOnly: true, sameSite: "lax", secure: isSecure, path: "/", maxAge: 600 });
  if (redirect) {
    res.cookies.set("instagram_oauth_redirect", redirect, { httpOnly: true, sameSite: "lax", secure: isSecure, path: "/", maxAge: 600 });
  }
  return res;
}
