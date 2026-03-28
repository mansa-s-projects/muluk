import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { appBaseUrl, dashboardUrl, jsonFetch } from "@/app/api/auth/_utils";

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

/**
 * AES-256-GCM encryption for OAuth tokens stored in the database.
 * TOKEN_ENCRYPTION_KEY must be a 64-char hex string (32 bytes).
 */
function encryptToken(value: string): string {
  const hexKey = process.env.TOKEN_ENCRYPTION_KEY;
  if (!hexKey || hexKey.length < 64) {
    throw new Error("TOKEN_ENCRYPTION_KEY missing or too short — must be a 64-char hex string");
  }
  const keyBuf = Buffer.from(hexKey, "hex");
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", keyBuf, iv);
  const enc = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("hex");
}

export function decryptToken(hex: string): string {
  const hexKey = process.env.TOKEN_ENCRYPTION_KEY;
  if (!hexKey || hexKey.length < 64) {
    throw new Error("TOKEN_ENCRYPTION_KEY missing or too short");
  }
  const keyBuf = Buffer.from(hexKey, "hex");
  const buf = Buffer.from(hex, "hex");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const enc = buf.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", keyBuf, iv);
  decipher.setAuthTag(tag);
  return decipher.update(enc).toString("utf8") + decipher.final("utf8");
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const savedState = req.cookies.get("youtube_oauth_state")?.value;

  if (!code || !state || !savedState || state !== savedState) {
    return NextResponse.redirect(dashboardUrl(req, {
      social_error: "youtube",
      social_msg: "YouTube auth validation failed.",
    }));
  }

  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  const callback = `${appBaseUrl(req)}/api/auth/youtube/callback`;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(dashboardUrl(req, {
      social_error: "youtube",
      social_msg: "YouTube OAuth credentials missing.",
    }));
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
      return NextResponse.redirect(dashboardUrl(req, {
        social_error: "youtube",
        social_msg: "YouTube connection failed: channel not found.",
      }));
    }

    const channelTitle = channelInfo.snippet.title;
    const channelId = channelInfo.id;
    const subscribers = Number(channelInfo.statistics?.subscriberCount || 0);

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(dashboardUrl(req, { social_error: "youtube", social_msg: "Sign in to connect YouTube." }));
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

    const res = NextResponse.redirect(dashboardUrl(req, { connected: "youtube" }));
    res.cookies.delete("youtube_oauth_state");
    return res;
  } catch (err) {
    console.error("YouTube callback failed", err);
    return NextResponse.redirect(dashboardUrl(req, {
      social_error: "youtube",
      social_msg: "YouTube connection failed.",
    }));
  }
}
