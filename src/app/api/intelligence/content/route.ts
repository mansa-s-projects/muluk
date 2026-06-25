// GET /api/intelligence/content
// Returns top performing content rankings for the creator.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const allowDevBypass =
    process.env.ALLOW_DEV_ADMIN_BYPASS === "true" && process.env.NODE_ENV === "development";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user && !allowDevBypass) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!user && allowDevBypass) {
    return NextResponse.json({ content: [], bypassUsed: true });
  }

  const { data, error } = await supabase
    .from("content_rankings")
    .select("id, platform, title, thumbnail_url, post_url, content_type, views, likes, comments, shares, engagement_rate, virality_score, posted_at")
    .eq("creator_id", user.id)
    .order("views", { ascending: false })
    .limit(24);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ content: data ?? [], bypassUsed: false });
}
