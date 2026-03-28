import { NextRequest, NextResponse } from "next/server";
import { appBaseUrl, dashboardUrl, randomToken } from "@/app/api/auth/_utils";

export async function GET(req: NextRequest) {
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const callback = `${appBaseUrl(req)}/api/auth/tiktok/callback`;

  if (!clientKey) {
    return NextResponse.redirect(dashboardUrl(req, {
      social_error: "tiktok",
      social_msg: "TikTok OAuth is not configured yet.",
    }));
  }

  const state = randomToken(16);
  const authUrl = new URL("https://www.tiktok.com/v2/auth/authorize/");
  authUrl.searchParams.set("client_key", clientKey);
  authUrl.searchParams.set("redirect_uri", callback);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "user.info.basic");
  authUrl.searchParams.set("state", state);

  const res = NextResponse.redirect(authUrl);
  res.cookies.set("tiktok_oauth_state", state, { httpOnly: true, sameSite: "lax", secure: true, path: "/", maxAge: 600 });
  return res;
}
