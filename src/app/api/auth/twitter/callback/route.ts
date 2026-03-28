import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { appBaseUrl, dashboardUrl, encryptToken, jsonFetch } from "@/app/api/auth/_utils";

type TwitterToken = {
  access_token: string;
  refresh_token?: string;
};

type TwitterMe = {
  data?: {
    id?: string;
    username?: string;
  };
};

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const savedState = req.cookies.get("twitter_oauth_state")?.value;
  const verifier = req.cookies.get("twitter_oauth_verifier")?.value;

  if (!code || !state || !savedState || state !== savedState || !verifier) {
    return NextResponse.redirect(dashboardUrl(req, {
      social_error: "twitter",
      social_msg: "Twitter auth validation failed.",
    }));
  }

  const clientId = process.env.TWITTER_CLIENT_ID;
  const clientSecret = process.env.TWITTER_CLIENT_SECRET;
  const callback = process.env.TWITTER_CALLBACK_URL || `${appBaseUrl(req)}/api/auth/twitter/callback`;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(dashboardUrl(req, {
      social_error: "twitter",
      social_msg: "Twitter OAuth credentials missing.",
    }));
  }

  try {
    const token = await jsonFetch<TwitterToken>("https://api.twitter.com/2/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: callback,
        code_verifier: verifier,
      }),
    });

    if (!token?.access_token) {
      console.error("Twitter token exchange missing access_token");
      return NextResponse.redirect(dashboardUrl(req, {
        social_error: "twitter",
        social_msg: "Twitter connection failed.",
      }));
    }

    const me = await jsonFetch<TwitterMe>("https://api.twitter.com/2/users/me?user.fields=username", {
      headers: { Authorization: `Bearer ${token.access_token}` },
    });

    if (!me.data?.id) {
      console.error("Twitter /me returned missing user data for callback");
      return NextResponse.redirect(dashboardUrl(req, {
        social_error: "twitter",
        social_msg: "Twitter connection failed: missing user data.",
      }));
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(dashboardUrl(req, { social_error: "twitter", social_msg: "Sign in to connect Twitter." }));
    }

    const { error } = await supabase
      .from("social_connections")
      .upsert(
        {
          creator_id: user.id,
          platform: "twitter",
          platform_username: me.data.username ?? null,
          platform_user_id: me.data.id,
          access_token: encryptToken(token.access_token),
          refresh_token: token.refresh_token ? encryptToken(token.refresh_token) : null,
          connected_at: new Date().toISOString(),
        },
        { onConflict: "creator_id,platform" }
      );

    if (error) throw error;

    const res = NextResponse.redirect(dashboardUrl(req, { connected: "twitter" }));
    res.cookies.delete("twitter_oauth_state");
    res.cookies.delete("twitter_oauth_verifier");
    return res;
  } catch (err) {
    console.error("Twitter callback failed", err);
    return NextResponse.redirect(dashboardUrl(req, {
      social_error: "twitter",
      social_msg: "Twitter connection failed.",
    }));
  }
}
