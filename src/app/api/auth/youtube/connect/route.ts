import { NextRequest, NextResponse } from "next/server";
import { appBaseUrl, dashboardUrl, randomToken } from "@/app/api/auth/_utils";

export async function GET(req: NextRequest) {
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const callback = `${appBaseUrl(req)}/api/auth/youtube/callback`;

  if (!clientId) {
    return NextResponse.redirect(dashboardUrl(req, {
      social_error: "youtube",
      social_msg: "YouTube OAuth is not configured yet.",
    }));
  }

  const state = randomToken(16);
  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", callback);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "https://www.googleapis.com/auth/youtube.readonly");
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");
  authUrl.searchParams.set("state", state);

  const res = NextResponse.redirect(authUrl);
  res.cookies.set("youtube_oauth_state", state, { httpOnly: true, sameSite: "lax", secure: true, path: "/", maxAge: 600 });
  return res;
}
