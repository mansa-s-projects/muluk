import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { appBaseUrl, dashboardUrl, encryptToken, jsonFetch } from "@/app/api/auth/_utils";

type InstagramToken = {
  access_token: string;
  user_id: string;
};

type InstagramMe = {
  id?: string;
  username?: string;
};

/** Always removes the oauth state cookie regardless of outcome. */
function redirectWithCleanup(url: URL): NextResponse {
  const res = NextResponse.redirect(url);
  res.cookies.delete("instagram_oauth_state");
  return res;
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const savedState = req.cookies.get("instagram_oauth_state")?.value;

  if (!code || !state || !savedState || state !== savedState) {
    return redirectWithCleanup(dashboardUrl(req, {
      social_error: "instagram",
      social_msg: "Instagram auth validation failed.",
    }));
  }

  const clientId = process.env.INSTAGRAM_CLIENT_ID;
  const clientSecret = process.env.INSTAGRAM_CLIENT_SECRET;
  const callback = process.env.INSTAGRAM_CALLBACK_URL || `${appBaseUrl(req)}/api/auth/instagram/callback`;

  if (!clientId || !clientSecret) {
    return redirectWithCleanup(dashboardUrl(req, {
      social_error: "instagram",
      social_msg: "Instagram OAuth credentials missing.",
    }));
  }

  try {
    const token = await jsonFetch<InstagramToken>("https://api.instagram.com/oauth/access_token", {
      method: "POST",
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        redirect_uri: callback,
        code,
      }),
    });

    if (!token?.access_token) {
      console.error("Instagram token exchange missing access_token", token);
      return redirectWithCleanup(dashboardUrl(req, {
        social_error: "instagram",
        social_msg: "Instagram connection failed.",
      }));
    }

    const meUrl = `https://graph.instagram.com/me?fields=id,username&access_token=${token.access_token}`;
    const sanitizedMeUrl = "https://graph.instagram.com/me?fields=id,username&access_token=[REDACTED]";
    let me: InstagramMe;
    try {
      me = await jsonFetch<InstagramMe>(meUrl);
    } catch (err) {
      console.error("Instagram /me request failed", {
        url: sanitizedMeUrl,
        message: err instanceof Error ? err.message : "unknown error",
      });
      throw err;
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return redirectWithCleanup(dashboardUrl(req, { social_error: "instagram", social_msg: "Sign in to connect Instagram." }));
    }

    const { error } = await supabase
      .from("social_connections")
      .upsert(
        {
          creator_id: user.id,
          platform: "instagram",
          platform_username: me.username ?? null,
          platform_user_id: me.id ?? token.user_id,
          access_token: encryptToken(token.access_token),
          connected_at: new Date().toISOString(),
        },
        { onConflict: "creator_id,platform" }
      );

    if (error) throw error;

    return redirectWithCleanup(dashboardUrl(req, { connected: "instagram" }));
  } catch (err) {
    console.error("Instagram callback failed", err);
    return redirectWithCleanup(dashboardUrl(req, {
      social_error: "instagram",
      social_msg: "Instagram connection failed.",
    }));
  }
}
