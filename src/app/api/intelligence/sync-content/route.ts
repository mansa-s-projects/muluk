// POST /api/intelligence/sync-content
// Fetches top posts from connected platforms and stores in content_rankings.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { decryptToken } from "@/app/api/auth/_utils";

async function fetchInstagramPosts(token: string, creatorId: string) {
  const fields = "id,caption,media_type,thumbnail_url,media_url,timestamp,like_count,comments_count,insights.metric(impressions,reach,saved)";
  const res = await fetch(`https://graph.instagram.com/me/media?fields=${fields}&limit=12&access_token=${token}`);
  if (!res.ok) return [];

  const data = await res.json() as { data?: Array<Record<string, unknown>> };
  return (data.data ?? []).map(post => {
    const insights = (post.insights as { data?: Array<{ name: string; values: Array<{ value: number }> }> } | null)?.data ?? [];
    const get = (name: string) => insights.find(i => i.name === name)?.values?.[0]?.value ?? 0;
    const likes = Number(post.like_count ?? 0);
    const comments = Number(post.comments_count ?? 0);
    const followers = 1000; // approx; would need profile call
    const engRate = followers > 0 ? ((likes + comments) / followers) * 100 : 0;
    return {
      creator_id: creatorId,
      platform: "instagram",
      post_id: String(post.id),
      title: String(post.caption ?? "").slice(0, 100) || null,
      thumbnail_url: String(post.thumbnail_url ?? post.media_url ?? "") || null,
      post_url: `https://www.instagram.com/p/${post.id}/`,
      content_type: String(post.media_type ?? "image").toLowerCase(),
      views: get("impressions"),
      likes,
      comments: Number(post.comments_count ?? 0),
      shares: 0,
      saves: get("saved"),
      reach: get("reach"),
      impressions: get("impressions"),
      engagement_rate: engRate,
      virality_score: Math.min(1000, Math.round(engRate * 100)),
      posted_at: post.timestamp ? new Date(String(post.timestamp)).toISOString() : null,
    };
  });
}

async function fetchYouTubeVideos(token: string, creatorId: string) {
  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/search?part=snippet&forMine=true&type=video&order=viewCount&maxResults=12&access_token=${token}`
  );
  if (!res.ok) return [];

  const data = await res.json() as { items?: Array<Record<string, unknown>> };
  const items = data.items ?? [];

  const ids = items.map(i => ((i.id as Record<string, string>)?.videoId)).filter(Boolean).join(",");
  if (!ids) return [];

  const statsRes = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${ids}&access_token=${token}`
  );
  const statsData = statsRes.ok ? (await statsRes.json() as { items?: Array<{ id: string; statistics: Record<string, string> }> }) : { items: [] };
  const statsMap = new Map((statsData.items ?? []).map(v => [v.id, v.statistics]));

  return items.map(item => {
    const videoId = ((item.id as Record<string, string>)?.videoId) ?? "";
    const snippet = (item.snippet as Record<string, unknown>) ?? {};
    const stats = statsMap.get(videoId) ?? {};
    const views = Number(stats.viewCount ?? 0);
    const likes = Number(stats.likeCount ?? 0);
    const comments = Number(stats.commentCount ?? 0);
    const subs = 1000;
    const engRate = subs > 0 ? ((likes + comments) / subs) * 100 : 0;
    return {
      creator_id: creatorId,
      platform: "youtube",
      post_id: videoId,
      title: String(snippet.title ?? "").slice(0, 100) || null,
      thumbnail_url: ((snippet.thumbnails as Record<string, { url: string }> | null)?.medium?.url) ?? null,
      post_url: `https://www.youtube.com/watch?v=${videoId}`,
      content_type: "video",
      views,
      likes,
      comments,
      shares: 0,
      saves: 0,
      reach: views,
      impressions: views,
      engagement_rate: engRate,
      virality_score: Math.min(1000, Math.round((views / 10000) * 100)),
      posted_at: snippet.publishedAt ? new Date(String(snippet.publishedAt)).toISOString() : null,
    };
  });
}

export async function POST() {
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = createServiceClient();

  const { data: connections } = await db
    .from("social_connections")
    .select("platform, access_token_encrypted, access_token")
    .eq("creator_id", user.id)
    .in("platform", ["instagram", "youtube", "tiktok"]);

  const posts: Record<string, unknown>[] = [];

  for (const conn of connections ?? []) {
    const raw = conn.access_token_encrypted ?? conn.access_token;
    if (!raw) continue;
    let token: string;
    try { token = decryptToken(raw); } catch { continue; }

    if (conn.platform === "instagram") {
      const igPosts = await fetchInstagramPosts(token, user.id).catch(() => []);
      posts.push(...igPosts);
    } else if (conn.platform === "youtube") {
      const ytPosts = await fetchYouTubeVideos(token, user.id).catch(() => []);
      posts.push(...ytPosts);
    }
  }

  if (posts.length > 0) {
    await db.from("content_rankings").upsert(posts, { onConflict: "creator_id,platform,post_id" });
  }

  return NextResponse.json({ synced: posts.length });
}
