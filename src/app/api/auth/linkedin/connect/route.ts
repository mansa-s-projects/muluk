import { NextRequest, NextResponse } from "next/server";
import { appBaseUrl, randomToken, sanitizeOAuthRedirect, dashboardUrl } from "@/app/api/auth/_utils";

export async function GET(req: NextRequest) {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const callback = process.env.LINKEDIN_CALLBACK_URL || `${appBaseUrl(req)}/api/auth/linkedin/callback`;
  const redirect = sanitizeOAuthRedirect(req, req.nextUrl.searchParams.get("redirect"), { allowOnboardingToken: true });

  if (!clientId) {
    return NextResponse.redirect(dashboardUrl(req, {
      social_error: "linkedin",
      social_msg: "LinkedIn OAuth is not configured.",
    }));
  }

  const state = randomToken(16);
  const authUrl = new URL("https://www.linkedin.com/oauth/v2/authorization");
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", callback);
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("scope", "r_liteprofile r_emailaddress w_member_social");

  const isSecure = process.env.NODE_ENV !== "development";
  const res = NextResponse.redirect(authUrl);
  res.cookies.set("linkedin_oauth_state", state, { httpOnly: true, sameSite: "lax", secure: isSecure, path: "/", maxAge: 600 });
  if (redirect && redirect !== "/") {
    res.cookies.set("linkedin_oauth_redirect", redirect, { httpOnly: true, sameSite: "lax", secure: isSecure, path: "/", maxAge: 600 });
  }
  return res;
}
