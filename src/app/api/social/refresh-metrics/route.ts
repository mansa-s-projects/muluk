import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { decryptToken, jsonFetch } from "@/app/api/auth/_utils";

type SocialRow = {
  id: string;
  platform: string;
  platform_username: string | null;
  platform_user_id: string | null;
  access_token: string | null;
  follower_count: number | null;
};

function normalizeMetrics(input?: {
  followers?: number;
  following?: number;
  likes?: number;
  views?: number;
  posts?: number;
  engagementRate?: number;
}) {
  return {
    followers: Number(input?.followers ?? 0),
    following: Number(input?.following ?? 0),
    likes: Number(input?.likes ?? 0),
    views: Number(input?.views ?? 0),
    posts: Number(input?.posts ?? 0),
    engagementRate: Number(input?.engagementRate ?? 0),
  };
}

async function refreshTwitter(row: SocialRow) {
  if (!row.access_token) throw new Error("Missing token");
  const accessToken = decryptToken(row.access_token);
  const me = await jsonFetch<{
    data?: {
      id?: string;
      username?: string;
      public_metrics?: {
        followers_count?: number;
        following_count?: number;
        tweet_count?: number;
      };
    };
  }>("https://api.twitter.com/2/users/me?user.fields=username,public_metrics", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const metrics = normalizeMetrics({
    followers: me.data?.public_metrics?.followers_count,
    following: me.data?.public_metrics?.following_count,
    posts: me.data?.public_metrics?.tweet_count,
  });

  return {
    platform_username: me.data?.username ?? row.platform_username,
    platform_user_id: me.data?.id ?? row.platform_user_id,
    follower_count: metrics.followers,
    metrics,
    profile_url: me.data?.username ? `https://x.com/${me.data.username}` : null,
  };
}

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: rows, error } = await supabase
      .from("social_connections")
      .select("id, platform, platform_username, platform_user_id, access_token, follower_count")
      .eq("creator_id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const results: Array<{ platform: string; status: string; error?: string }> = [];

    for (const row of (rows ?? []) as SocialRow[]) {
      try {
        let next = {
          platform_username: row.platform_username,
          platform_user_id: row.platform_user_id,
          follower_count: Number(row.follower_count ?? 0),
          metrics: normalizeMetrics({ followers: row.follower_count ?? 0 }),
          profile_url: null as string | null,
        };

        if (row.platform === "twitter" && row.access_token) {
          next = await refreshTwitter(row);
        }

        const updatePrimary = await supabase
          .from("social_connections")
          .update({
            platform_username: next.platform_username,
            platform_user_id: next.platform_user_id,
            follower_count: next.follower_count,
            metrics: next.metrics,
            profile_url: next.profile_url,
            last_synced_at: new Date().toISOString(),
          })
          .eq("id", row.id)
          .eq("creator_id", user.id);

        // Compatibility for environments where new cache columns are not yet migrated.
        if (updatePrimary.error && /(metrics|profile_url|last_synced_at)/i.test(updatePrimary.error.message)) {
          await supabase
            .from("social_connections")
            .update({
              platform_username: next.platform_username,
              platform_user_id: next.platform_user_id,
              follower_count: next.follower_count,
            })
            .eq("id", row.id)
            .eq("creator_id", user.id);
        }

        results.push({ platform: row.platform, status: "ok" });
      } catch (err) {
        results.push({
          platform: row.platform,
          status: "error",
          error: err instanceof Error ? err.message : "Refresh failed",
        });
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Refresh failed" },
      { status: 500 }
    );
  }
}
