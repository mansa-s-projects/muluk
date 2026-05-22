import { NextRequest, NextResponse } from "next/server";
import { appBaseUrl, dashboardUrl, randomToken, sanitizeOAuthRedirect, sha256Base64Url } from "@/app/api/auth/_utils";

export async function GET(req: NextRequest) {
  const clientId = process.env.TWITTER_CLIENT_ID;
  const callback = process.env.TWITTER_CALLBACK_URL || `${appBaseUrl(req)}/api/auth/twitter/callback`;
  const isSecure = process.env.NODE_ENV !== "development";
  const allowlist = (process.env.OAUTH_REDIRECT_ALLOWED_ORIGINS || "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
  const redirect = sanitizeOAuthRedirect(req, req.nextUrl.searchParams.get("redirect"), {
    allowOnboardingToken: true,
    allowedOrigins: allowlist,
  });

  if (!clientId) {
    return NextResponse.redirect(dashboardUrl(req, {
      social_error: "twitter",
      social_msg: "Twitter OAuth is not configured.",
    }));
  }

  const state = randomToken(16);
  const verifier = randomToken(32);
  const challenge = sha256Base64Url(verifier);

  const authUrl = new URL("https://twitter.com/i/oauth2/authorize");
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", callback);
  authUrl.searchParams.set("scope", "tweet.read users.read offline.access");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("code_challenge", challenge);
  authUrl.searchParams.set("code_challenge_method", "S256");

  const res = NextResponse.redirect(authUrl);
  res.cookies.set("twitter_oauth_state", state, { httpOnly: true, sameSite: "lax", secure: isSecure, path: "/", maxAge: 600 });
  res.cookies.set("twitter_oauth_verifier", verifier, { httpOnly: true, sameSite: "lax", secure: isSecure, path: "/", maxAge: 600 });
  if (redirect && redirect !== "/") {
    res.cookies.set("twitter_oauth_redirect", redirect, { httpOnly: true, sameSite: "lax", secure: isSecure, path: "/", maxAge: 600 });
  }
  return res;
}
