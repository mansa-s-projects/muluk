import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { appBaseUrl, dashboardUrl, decryptToken, encryptToken, jsonFetch } from "@/app/api/auth/_utils";

type GoogleToken = {
  access_token: string;
  refresh_token?: string;
};

type YouTubeResponse = {
  items?: Array<{
    id?: string;
    snippet?: { title?: string };
    statistics?: { subscriberCount?: string };
  }>;
};

export { decryptToken };

function clearOAuthCookies(res: NextResponse): NextResponse {
  res.cookies.delete("youtube_oauth_state");
  res.cookies.delete("youtube_oauth_redirect");
  return res;
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const savedState = req.cookies.get("youtube_oauth_state")?.value;
  const redirect = req.cookies.get("youtube_oauth_redirect")?.value;
  const isOnboarding = redirect === "onboarding";

  const errorRedirect = (msg: string) => {
    if (isOnboarding) {
      const url = new URL("/dashboard/onboarding", appBaseUrl(req));
      url.searchParams.set("social_error", "youtube");
      url.searchParams.set("social_msg", msg);
      return clearOAuthCookies(NextResponse.redirect(url));
    }
    return clearOAuthCookies(NextResponse.redirect(dashboardUrl(req, {
      social_error: "youtube",
      social_msg: msg,
    })));
  };

  if (!code || !state || !savedState || state !== savedState) {
    return errorRedirect("YouTube auth validation failed.");
  }

  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  const callback = `${appBaseUrl(req)}/api/auth/youtube/callback`;

  if (!clientId || !clientSecret) {
    return errorRedirect("YouTube OAuth credentials missing.");
  }

  try {
    const token = await jsonFetch<GoogleToken>("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: callback,
      }),
    });

    const channel = await jsonFetch<YouTubeResponse>(
      "https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true",
      { headers: { Authorization: `Bearer ${token.access_token}` } }
    );

    const channelInfo = channel.items?.[0];

    if (!channelInfo?.id || !channelInfo.snippet?.title) {
      console.error("YouTube channel data missing or empty", channel);
      return errorRedirect("YouTube connection failed: channel not found.");
    }

    const channelTitle = channelInfo.snippet.title;
    const channelId = channelInfo.id;
    const subscribers = Number(channelInfo.statistics?.subscriberCount || 0);

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return errorRedirect("Sign in to connect YouTube.");
    }

    const { error } = await supabase
      .from("social_connections")
      .upsert(
        {
          creator_id: user.id,
          platform: "youtube",
          platform_username: channelTitle,
          platform_user_id: channelId,
          access_token: encryptToken(token.access_token),
          refresh_token: token.refresh_token ? encryptToken(token.refresh_token) : null,
          follower_count: Number.isFinite(subscribers) ? subscribers : 0,
          connected_at: new Date().toISOString(),
        },
        { onConflict: "creator_id,platform" }
      );

    if (error) throw error;

    // Redirect to onboarding or dashboard based on where the flow started
    if (isOnboarding) {
      const onboardingUrl = new URL("/dashboard/onboarding", appBaseUrl(req));
      onboardingUrl.searchParams.set("connected", "youtube");
      return clearOAuthCookies(NextResponse.redirect(onboardingUrl));
    }
    return clearOAuthCookies(NextResponse.redirect(dashboardUrl(req, { connected: "youtube" })));
  } catch (err) {
    console.error("YouTube callback failed", err);
    return errorRedirect("YouTube connection failed.");
  }
}
