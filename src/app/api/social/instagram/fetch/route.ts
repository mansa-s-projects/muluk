/**
 * POST /api/social/instagram/fetch
 * Fetches the creator's recent Instagram media and stores in social_posts.
 * Uses the stored access_token from social_connections.
 */
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { decryptToken } from "@/app/api/auth/_utils";

function getDb() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

type IgMediaItem = {
  id: string;
  caption?: string;
  like_count?: number;
  comments_count?: number;
  media_type?: string;
  timestamp?: string;
  thumbnail_url?: string;
  media_url?: string;
};

type IgMediaResponse = { data?: IgMediaItem[]; error?: { message: string } };

export async function POST(_req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();

  // Load Instagram connection
  const { data: conn, error: connErr } = await db
    .from("social_connections")
    .select("id, access_token, platform_user_id, follower_count")
    .eq("creator_id", user.id)
    .eq("platform", "instagram")
    .maybeSingle();

  if (connErr || !conn || !conn.access_token) {
    return NextResponse.json(
      { error: "Instagram not connected. Visit /api/social/instagram/connect first." },
      { status: 404 }
    );
  }

  let accessToken: string;
  try {
    accessToken = decryptToken(conn.access_token);
  } catch {
    return NextResponse.json({ error: "Could not decrypt access token" }, { status: 500 });
  }

  // Fetch recent 25 media items via Instagram Graph API
  const igUserId = conn.platform_user_id ?? "me";
  const fields = "id,caption,like_count,comments_count,media_type,timestamp";
  const mediaUrl =
    `https://graph.instagram.com/${igUserId}/media` +
    `?fields=${fields}&limit=25&access_token=${encodeURIComponent(accessToken)}`;

  let posts: IgMediaItem[] = [];
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    try {
      const res = await fetch(mediaUrl, { signal: controller.signal });
      if (!res.ok) {
        const bodyText = await res.text().catch(() => "");
        console.error("[instagram-fetch] Graph API non-OK response", {
          status: res.status,
          body: bodyText.slice(0, 300),
        });
        return NextResponse.json({ error: "Instagram API request failed" }, { status: res.status >= 400 && res.status < 600 ? res.status : 502 });
      }
      const json = (await res.json()) as IgMediaResponse;
      if (json.error) {
        console.error("[instagram-fetch] Graph API error:", json.error.message);
        return NextResponse.json({ error: json.error.message }, { status: 502 });
      }
      posts = json.data ?? [];
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Network error";
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  if (posts.length === 0) {
    return NextResponse.json({ fetched: 0, message: "No media found" });
  }

  // Upsert into social_posts
  const rows = posts.map((p) => ({
    creator_id:      user.id,
    provider:        "instagram",
    provider_post_id: p.id,
    caption:         p.caption ?? null,
    like_count:      p.like_count ?? 0,
    comments_count:  p.comments_count ?? 0,
    media_type:      p.media_type ?? null,
    posted_at:       p.timestamp ?? null,
    raw_json:        p,
  }));

  const { error: upsertErr } = await db
    .from("social_posts")
    .upsert(rows, { onConflict: "creator_id,provider,provider_post_id" });

  if (upsertErr) {
    console.error("[instagram-fetch] Upsert error:", upsertErr.message);
    return NextResponse.json({ error: "Failed to save posts" }, { status: 500 });
  }

  // Update last_synced_at on the connection
  const { error: updateErr } = await db
    .from("social_connections")
    .update({ last_synced_at: new Date().toISOString() })
    .eq("id", conn.id);

  if (updateErr) {
    console.error("[instagram-fetch] update last_synced_at failed:", updateErr.message);
  }

  return NextResponse.json({ fetched: rows.length });
}
