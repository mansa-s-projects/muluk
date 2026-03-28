import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { appBaseUrl, dashboardUrl, encryptToken, jsonFetch } from "@/app/api/auth/_utils";

type TikTokToken = {
  access_token: string;
  refresh_token?: string;
  open_id?: string;
};

type TikTokUser = {
  data?: {
    user?: {
      open_id?: string;
      username?: string;
      follower_count?: number;
    };
  };
};

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const savedState = req.cookies.get("tiktok_oauth_state")?.value;
  const verifier = req.cookies.get("tiktok_oauth_verifier")?.value;

  if (!code || !state || !savedState || state !== savedState || !verifier) {
    return NextResponse.redirect(dashboardUrl(req, {
      social_error: "tiktok",
      social_msg: "TikTok auth validation failed.",
    }));
  }

  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
  const callback = `${appBaseUrl(req)}/api/auth/tiktok/callback`;

  if (!clientKey || !clientSecret) {
    return NextResponse.redirect(dashboardUrl(req, {
      social_error: "tiktok",
      social_msg: "TikTok OAuth credentials missing.",
    }));
  }

  try {
    const token = await jsonFetch<TikTokToken>("https://open.tiktokapis.com/v2/oauth/token/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_key: clientKey,
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: callback,
        code_verifier: verifier,
      }),
    });

    if (!token?.access_token) {
      console.error("TikTok token exchange missing access_token");
      return NextResponse.redirect(dashboardUrl(req, {
        social_error: "tiktok",
        social_msg: "TikTok connection failed.",
      }));
    }

    const info = await jsonFetch<TikTokUser>("https://open.tiktokapis.com/v2/user/info/?fields=open_id,username,follower_count", {
      headers: { Authorization: `Bearer ${token.access_token}` },
    });

    const userInfo = info.data?.user;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(dashboardUrl(req, { social_error: "tiktok", social_msg: "Sign in to connect TikTok." }));
    }

    const { error } = await supabase
      .from("social_connections")
      .upsert(
        {
          creator_id: user.id,
          platform: "tiktok",
          platform_username: userInfo?.username ?? null,
          platform_user_id: userInfo?.open_id ?? token.open_id ?? null,
          access_token: encryptToken(token.access_token),
          refresh_token: token.refresh_token ? encryptToken(token.refresh_token) : null,
          follower_count: Number(userInfo?.follower_count ?? 0),
          connected_at: new Date().toISOString(),
        },
        { onConflict: "creator_id,platform" }
      );

    if (error) throw error;

    const res = NextResponse.redirect(dashboardUrl(req, { connected: "tiktok" }));
    res.cookies.delete("tiktok_oauth_state");
    res.cookies.delete("tiktok_oauth_verifier");
    return res;
  } catch (err) {
    console.error("TikTok callback failed", err);
    return NextResponse.redirect(dashboardUrl(req, {
      social_error: "tiktok",
      social_msg: "TikTok connection failed.",
    }));
  }
}
