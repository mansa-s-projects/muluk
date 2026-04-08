/**
 * POST /api/social/analyze
 * Loads the creator's social_posts + connection data, runs the rule-based
 * analytics engine, persists result to creator_onboarding, returns payload.
 */
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { analyzeSocial } from "@/lib/analyzeSocial";
import { generateLaunchCommand } from "@/lib/generateLaunchCommand";

function getDb() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Optional body overrides
  let body: { niche?: string; providers?: string[] } = {};
  try { body = await req.json(); } catch { /* body optional */ }

  const db = getDb();

  // Load best connection (highest follower count)
  const { data: connections, error: connErr } = await db
    .from("social_connections")
    .select("platform, platform_user_id, platform_username, follower_count, metrics")
    .eq("creator_id", user.id)
    .order("follower_count", { ascending: false });

  if (connErr) {
    console.error("[social-analyze] connections query failed:", connErr.message);
    return NextResponse.json({ error: "Failed to load connections" }, { status: 500 });
  }

  if (!connections || connections.length === 0) {
    return NextResponse.json({ error: "No social connections found" }, { status: 400 });
  }

  const bestConnection = connections?.[0] ?? null;
  const followers = bestConnection?.follower_count ?? 0;
  const platform  = bestConnection?.platform ?? "none";

  // Providers to analyze (default to all connected)
  const providers: string[] = body.providers?.length
    ? body.providers
    : (connections ?? []).map((c: { platform: string }) => c.platform);

  // Load recent social posts
  const { data: rawPosts, error: postsErr } = await db
    .from("social_posts")
    .select("caption, like_count, comments_count, media_type, posted_at")
    .eq("creator_id", user.id)
    .in("provider", providers.length ? providers : ["instagram", "tiktok", "twitter"])
    .order("posted_at", { ascending: false })
    .limit(50);

  if (postsErr) {
    console.error("[social-analyze] posts query failed:", postsErr.message);
    return NextResponse.json({ error: "Failed to load posts" }, { status: 500 });
  }

  const posts = (rawPosts ?? []).map((p: {
    caption: string | null;
    like_count: number;
    comments_count: number;
    media_type: string | null;
    posted_at: string | null;
  }) => ({
    caption:        p.caption,
    like_count:     p.like_count ?? 0,
    comments_count: p.comments_count ?? 0,
    media_type:     p.media_type,
    posted_at:      p.posted_at,
  }));

  // Run analytics
  const analysis = analyzeSocial({ posts, followers_count: followers });

  // Generate launch strategy
  const niche   = body.niche ?? "creator";
  const command = generateLaunchCommand({
    niche,
    strongest_platform: platform,
    followers_count:    followers,
    analysis,
  });

  // Persist to creator_onboarding snapshot
  const { error: upsertErr } = await db.from("creator_onboarding").upsert(
    {
      user_id:           user.id,
      analytics_snapshot: { analysis, command, computed_at: new Date().toISOString() },
      updated_at:        new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (upsertErr) {
    console.error("[social-analyze] upsert failed:", upsertErr.message);
    return NextResponse.json({ error: "Failed to save analytics" }, { status: 500 });
  }

  return NextResponse.json({
    analysis,
    command,
    posts_analyzed: posts.length,
    followers,
    platform,
  });
}
