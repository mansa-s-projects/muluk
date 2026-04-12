import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Get real-time activity feed
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const { data: adminCheck } = await supabase
      .from("admin_users")
      .select("id, role")
      .eq("user_id", user.id)
      .single();

    const ALLOW_DEV_ADMIN_BYPASS =
      process.env.ALLOW_DEV_ADMIN_BYPASS === "true" && process.env.NODE_ENV === "development";
    if (!adminCheck && !ALLOW_DEV_ADMIN_BYPASS) {
      return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 });
    }
    if (!adminCheck && ALLOW_DEV_ADMIN_BYPASS) {
      console.warn("[admin-activity-get] ALLOW_DEV_ADMIN_BYPASS enabled", { userId: user.id });
    }

    const { searchParams } = new URL(request.url);
    const eventType = searchParams.get("eventType");
    const severity = searchParams.get("severity");
    const since = searchParams.get("since"); // ISO timestamp for polling
    const rawLimit = Number(searchParams.get("limit"));
    const normalizedLimit = Number.isFinite(rawLimit) ? Math.trunc(rawLimit) : 50;
    const limit = Math.min(100, Math.max(1, normalizedLimit || 50));

    let query = supabase
      .from("admin_realtime_events")
      .select(`*`, { count: "exact" })
      .order("created_at", { ascending: false });

    if (eventType) {
      query = query.eq("event_type", eventType);
    }

    if (severity) {
      query = query.eq("severity", severity);
    }

    if (since) {
      query = query.gt("created_at", since);
    }

    const { data: events, error, count } = await query.limit(limit);

    if (error) throw error;

    // Also get some key platform stats for context
    const [creatorsCountResult, fansCountResult, activeBansResult] = await Promise.all([
      supabase.from("creator_applications").select("id", { count: "exact", head: true }),
      supabase.from("fan_codes_v2").select("id", { count: "exact", head: true }),
      supabase.from("creator_bans").select("id", { count: "exact", head: true }).eq("is_active", true)
    ]);

    if (creatorsCountResult.error) {
      console.error("[admin-activity] creator count query failed:", creatorsCountResult.error.message);
    }
    if (fansCountResult.error) {
      console.error("[admin-activity] fan count query failed:", fansCountResult.error.message);
    }
    if (activeBansResult.error) {
      console.error("[admin-activity] active ban count query failed:", activeBansResult.error.message);
    }

    const totalCreators = creatorsCountResult.count ?? 0;
    const totalFans = fansCountResult.count ?? 0;
    const activeBans = activeBansResult.count ?? 0;

    return NextResponse.json({
      events: events || [],
      total: count || 0,
      context: {
        totalCreators,
        totalFans,
        activeBans,
        lastPollAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error("Admin activity feed error:", error);
    return NextResponse.json(
      { error: "Failed to fetch activity feed" },
      { status: 500 }
    );
  }
}

// Post new activity event (for internal use by other API routes)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const { data: adminCheck } = await supabase
      .from("admin_users")
      .select("id")
      .eq("user_id", user.id)
      .single();

    const ALLOW_DEV_ADMIN_BYPASS =
      process.env.ALLOW_DEV_ADMIN_BYPASS === "true" && process.env.NODE_ENV === "development";
    if (!adminCheck && !ALLOW_DEV_ADMIN_BYPASS) {
      return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 });
    }
    if (!adminCheck && ALLOW_DEV_ADMIN_BYPASS) {
      console.warn("[admin-activity-post] ALLOW_DEV_ADMIN_BYPASS enabled", { userId: user.id });
    }

    const body = await request.json();
    const { event_type, user_id, user_type, metadata } = body;

    if (!event_type || typeof event_type !== "string") {
      return NextResponse.json({ error: "event_type is required and must be a string" }, { status: 400 });
    }

    if (user_id != null && typeof user_id !== "string") {
      return NextResponse.json({ error: "user_id must be a string when provided" }, { status: 400 });
    }

    if (user_type != null && typeof user_type !== "string") {
      return NextResponse.json({ error: "user_type must be a string when provided" }, { status: 400 });
    }

    if (metadata != null && (typeof metadata !== "object" || Array.isArray(metadata))) {
      return NextResponse.json({ error: "metadata must be an object when provided" }, { status: 400 });
    }

    const allowedSeverities = new Set(["info", "warning", "critical"]);
    const parsedSeverity = typeof body.severity === "string" ? body.severity : "info";
    const severity = allowedSeverities.has(parsedSeverity) ? parsedSeverity : "info";

    const { data, error } = await supabase
      .from("admin_realtime_events")
      .insert({
        event_type,
        user_id,
        user_type,
        metadata,
        severity
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, event: data });

  } catch (error) {
    console.error("Admin activity post error:", error);
    return NextResponse.json(
      { error: "Failed to post activity" },
      { status: 500 }
    );
  }
}
