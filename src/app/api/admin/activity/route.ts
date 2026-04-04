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

    if (!adminCheck && process.env.NODE_ENV !== "development") {
      return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const eventType = searchParams.get("eventType");
    const severity = searchParams.get("severity");
    const since = searchParams.get("since"); // ISO timestamp for polling
    const limit = parseInt(searchParams.get("limit") || "50");

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
    const [
      { count: totalCreators },
      { count: totalFans },
      { count: activeBans }
    ] = await Promise.all([
      supabase.from("creator_applications").select("id", { count: "exact", head: true }),
      supabase.from("fan_codes").select("id", { count: "exact", head: true }),
      supabase.from("creator_bans").select("id", { count: "exact", head: true }).eq("is_active", true)
    ]);

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

    if (!adminCheck && process.env.NODE_ENV !== "development") {
      return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 });
    }

    const body = await request.json();
    const { event_type, user_id, user_type, metadata, severity = "info" } = body;

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
