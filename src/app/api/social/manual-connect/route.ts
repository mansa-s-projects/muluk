// POST /api/social/manual-connect
// Connect non-OAuth channels: website, newsletter, podcast
// Creator provides URL and basic stats manually.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_PLATFORMS = ["website", "newsletter", "podcast"] as const;
type ManualPlatform = typeof ALLOWED_PLATFORMS[number];

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as {
    platform: ManualPlatform;
    url: string;
    username?: string;
    follower_count?: number;
    monthly_views?: number;
  };

  if (!ALLOWED_PLATFORMS.includes(body.platform)) {
    return NextResponse.json({ error: "Invalid platform" }, { status: 400 });
  }
  if (!body.url || !body.url.startsWith("http")) {
    return NextResponse.json({ error: "Valid URL required" }, { status: 400 });
  }

  const { error } = await supabase.from("social_connections").upsert({
    creator_id: user.id,
    platform: body.platform,
    platform_username: body.username || body.url,
    platform_user_id: body.url,
    follower_count: body.follower_count ?? 0,
    website_url: body.url,
    metrics: { monthly_views: body.monthly_views ?? 0 },
    connected_at: new Date().toISOString(),
  }, { onConflict: "creator_id,platform" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { platform } = await req.json() as { platform: string };
  await supabase.from("social_connections").delete().eq("creator_id", user.id).eq("platform", platform);
  return NextResponse.json({ success: true });
}
