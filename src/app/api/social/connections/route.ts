import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type SocialConnection = {
  platform: "instagram" | "tiktok" | "twitter" | "youtube" | "telegram";
  connected: boolean;
  username?: string;
  followers?: number;
  engagement?: number;
  views?: number;
  dmSignals?: number;
};

type SocialRow = {
  platform: string;
  platform_username: string | null;
  follower_count: number | null;
  metrics: {
    followers?: number;
    engagementRate?: number;
    views?: number;
  } | null;
};

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: rows, error } = await supabase
      .from("social_connections")
      .select("platform, platform_username, follower_count, metrics")
      .eq("creator_id", user.id);

    if (error) {
      console.error("Failed to fetch social connections:", error);
      return NextResponse.json({ error: "Failed to fetch connections" }, { status: 500 });
    }

    const connections: SocialConnection[] = ((rows || []) as SocialRow[]).map((row) => ({
      platform: row.platform as SocialConnection["platform"],
      connected: true,
      username: row.platform_username || undefined,
      followers: row.follower_count || row.metrics?.followers || undefined,
      engagement: row.metrics?.engagementRate || undefined,
      views: row.metrics?.views || undefined,
    }));

    return NextResponse.json({ connections });
  } catch (error) {
    console.error("Social connections fetch failed:", error);
    return NextResponse.json({ error: "Fetch failed" }, { status: 500 });
  }
}
