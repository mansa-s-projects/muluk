import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { appBaseUrl, dashboardUrl, jsonFetch } from "@/app/api/auth/_utils";

type InstagramToken = {
  access_token: string;
  user_id: string;
};

type InstagramMe = {
  id?: string;
  username?: string;
};

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const savedState = req.cookies.get("instagram_oauth_state")?.value;

  if (!code || !state || !savedState || state !== savedState) {
    return NextResponse.redirect(dashboardUrl(req, {
      social_error: "instagram",
      social_msg: "Instagram auth validation failed.",
    }));
  }

  const clientId = process.env.INSTAGRAM_CLIENT_ID;
  const clientSecret = process.env.INSTAGRAM_CLIENT_SECRET;
  const callback = process.env.INSTAGRAM_CALLBACK_URL || `${appBaseUrl(req)}/api/auth/instagram/callback`;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(dashboardUrl(req, {
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

    const me = await jsonFetch<InstagramMe>(`https://graph.instagram.com/me?fields=id,username&access_token=${token.access_token}`);

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(dashboardUrl(req, { social_error: "instagram", social_msg: "Sign in to connect Instagram." }));
    }

    const { error } = await supabase
      .from("social_connections")
      .upsert(
        {
          creator_id: user.id,
          platform: "instagram",
          platform_username: me.username ?? null,
          platform_user_id: me.id ?? token.user_id,
          access_token: token.access_token,
          connected_at: new Date().toISOString(),
        },
        { onConflict: "creator_id,platform" }
      );

    if (error) throw error;

    const res = NextResponse.redirect(dashboardUrl(req, { connected: "instagram" }));
    res.cookies.delete("instagram_oauth_state");
    return res;
  } catch (err) {
    console.error("Instagram callback failed", err);
    return NextResponse.redirect(dashboardUrl(req, {
      social_error: "instagram",
      social_msg: "Instagram connection failed.",
    }));
  }
}
