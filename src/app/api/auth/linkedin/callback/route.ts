import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { appBaseUrl, dashboardUrl, encryptToken, jsonFetch, popupCloseResponse } from "@/app/api/auth/_utils";

type LinkedInToken = { access_token: string; expires_in: number };
type LinkedInProfile = { id?: string; localizedFirstName?: string; localizedLastName?: string };
type LinkedInFollowers = { firstDegreeSize?: number };

function clearCookies(res: NextResponse): NextResponse {
  res.cookies.delete("linkedin_oauth_state");
  res.cookies.delete("linkedin_oauth_redirect");
  return res;
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const savedState = req.cookies.get("linkedin_oauth_state")?.value;
  const redirect = req.cookies.get("linkedin_oauth_redirect")?.value;
  const isPopup = redirect === "onboarding";

  if (!code || !state || !savedState || state !== savedState) {
    if (isPopup) return popupCloseResponse(false, "LinkedIn", "LinkedIn auth validation failed.", ["linkedin_oauth_state", "linkedin_oauth_redirect"]);
    return clearCookies(NextResponse.redirect(dashboardUrl(req, { social_error: "linkedin", social_msg: "LinkedIn auth failed." })));
  }

  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
  const callback = process.env.LINKEDIN_CALLBACK_URL || `${appBaseUrl(req)}/api/auth/linkedin/callback`;

  if (!clientId || !clientSecret) {
    if (isPopup) return popupCloseResponse(false, "LinkedIn", "LinkedIn OAuth credentials missing.", ["linkedin_oauth_state", "linkedin_oauth_redirect"]);
    return clearCookies(NextResponse.redirect(dashboardUrl(req, { social_error: "linkedin", social_msg: "LinkedIn credentials missing." })));
  }

  try {
    const token = await jsonFetch<LinkedInToken>("https://www.linkedin.com/oauth/v2/accessToken", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: callback, client_id: clientId, client_secret: clientSecret }),
    });

    const [profile, network] = await Promise.all([
      jsonFetch<LinkedInProfile>("https://api.linkedin.com/v2/me", {
        headers: { Authorization: `Bearer ${token.access_token}` },
      }),
      jsonFetch<LinkedInFollowers>("https://api.linkedin.com/v2/networkSizes/urn:li:person:me?edgeType=CompanyFollowedByMember", {
        headers: { Authorization: `Bearer ${token.access_token}` },
      }).catch(() => ({ firstDegreeSize: 0 })),
    ]);

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      if (isPopup) return popupCloseResponse(false, "LinkedIn", "Session expired.", ["linkedin_oauth_state", "linkedin_oauth_redirect"]);
      return clearCookies(NextResponse.redirect(dashboardUrl(req, { social_error: "linkedin", social_msg: "Session expired." })));
    }

    const username = [profile.localizedFirstName, profile.localizedLastName].filter(Boolean).join(" ") || "LinkedIn User";
    const encrypted = encryptToken(token.access_token);

    await supabase.from("social_connections").upsert({
      creator_id: user.id,
      platform: "linkedin",
      platform_user_id: profile.id ?? "",
      platform_username: username,
      access_token: encrypted,
      access_token_encrypted: encrypted,
      follower_count: network.firstDegreeSize ?? 0,
      connected_at: new Date().toISOString(),
    }, { onConflict: "creator_id,platform" });

    if (isPopup) return popupCloseResponse(true, "LinkedIn", undefined, ["linkedin_oauth_state", "linkedin_oauth_redirect"]);
    const dest = redirect || "/dashboard/integrations";
    const successRes = NextResponse.redirect(new URL(dest, req.url));
    return clearCookies(successRes);
  } catch (err) {
    console.error("[linkedin-callback]", err);
    if (isPopup) return popupCloseResponse(false, "LinkedIn", "LinkedIn connection failed.", ["linkedin_oauth_state", "linkedin_oauth_redirect"]);
    return clearCookies(NextResponse.redirect(dashboardUrl(req, { social_error: "linkedin", social_msg: "LinkedIn connection failed." })));
  }
}
