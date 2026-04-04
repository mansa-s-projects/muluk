import { NextRequest, NextResponse } from "next/server";
import { appBaseUrl, dashboardUrl, randomToken, sha256Base64Url } from "@/app/api/auth/_utils";

export async function GET(req: NextRequest) {
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const callback = `${appBaseUrl(req)}/api/auth/tiktok/callback`;
  const redirect = req.nextUrl.searchParams.get("redirect") || "";

  if (!clientKey) {
    return NextResponse.redirect(dashboardUrl(req, {
      social_error: "tiktok",
      social_msg: "TikTok OAuth is not configured yet.",
    }));
  }

  const isSecure = process.env.NODE_ENV !== "development";
  const state = randomToken(16);
  const verifier = randomToken(32);
  const challenge = sha256Base64Url(verifier);

  const authUrl = new URL("https://www.tiktok.com/v2/auth/authorize/");
  authUrl.searchParams.set("client_key", clientKey);
  authUrl.searchParams.set("redirect_uri", callback);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "user.info.basic");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("code_challenge", challenge);
  authUrl.searchParams.set("code_challenge_method", "S256");

  const res = NextResponse.redirect(authUrl);
  res.cookies.set("tiktok_oauth_state", state, { httpOnly: true, sameSite: "lax", secure: isSecure, path: "/", maxAge: 600 });
  res.cookies.set("tiktok_oauth_verifier", verifier, { httpOnly: true, sameSite: "lax", secure: isSecure, path: "/", maxAge: 600 });
  if (redirect) {
    res.cookies.set("tiktok_oauth_redirect", redirect, { httpOnly: true, sameSite: "lax", secure: isSecure, path: "/", maxAge: 600 });
  }
  return res;
}
