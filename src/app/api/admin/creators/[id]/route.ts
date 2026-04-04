import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Get detailed creator profile
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
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

    // Get creator profile
    const { data: creator, error: creatorError } = await supabase
      .from("creator_applications")
      .select(`*, auth.users!inner(email, created_at, last_sign_in_at)`)
      .eq("user_id", id)
      .single();

    if (creatorError || !creator) {
      return NextResponse.json({ error: "Creator not found" }, { status: 404 });
    }

    // Get wallet info
    const { data: wallet } = await supabase
      .from("creator_wallets")
      .select("*")
      .eq("creator_id", id)
      .single();

    // Get social connections
    const { data: socials } = await supabase
      .from("social_connections")
      .select("platform, platform_username, follower_count, connected_at")
      .eq("creator_id", id);

    // Get ban history
    const { data: bans } = await supabase
      .from("creator_bans")
      .select("*, admin:admin_id(display_name)")
      .eq("creator_id", id)
      .order("created_at", { ascending: false });

    // Get admin notes
    const { data: notes } = await supabase
      .from("admin_notes")
      .select("*, admin:admin_id(display_name)")
      .eq("target_type", "creator")
      .eq("target_id", id)
      .order("created_at", { ascending: false });

    // Get recent content
    const { data: content } = await supabase
      .from("content_items_v2")
      .select("*")
      .eq("creator_id", id)
      .order("created_at", { ascending: false })
      .limit(20);

    // Get recent transactions
    const { data: transactions } = await supabase
      .from("transactions_v2")
      .select("*")
      .eq("creator_id", id)
      .order("created_at", { ascending: false })
      .limit(50);

    // Get recent fan codes
    const { data: fanCodes } = await supabase
      .from("fan_codes")
      .select("*")
      .eq("creator_id", id)
      .order("created_at", { ascending: false })
      .limit(50);

    // Get recent messages sent
    const { data: messages } = await supabase
      .from("fan_messages")
      .select("*")
      .eq("creator_id", id)
      .order("created_at", { ascending: false })
      .limit(50);

    // Get activity log
    const { data: activity } = await supabase
      .from("activity_log")
      .select("*")
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .limit(100);

    // Get AI usage
    const { data: aiUsage } = await supabase
      .from("daily_briefs")
      .select("*")
      .eq("creator_id", id)
      .order("date", { ascending: false })
      .limit(30);

    // Compile profile
    const profile = {
      creator,
      wallet: wallet || null,
      socials: socials || [],
      bans: bans || [],
      notes: notes || [],
      content: content || [],
      transactions: transactions || [],
      fanCodes: fanCodes || [],
      messages: messages || [],
      activity: activity || [],
      aiUsage: aiUsage || [],
      stats: {
        totalContent: content?.length || 0,
        totalTransactions: transactions?.length || 0,
        totalFans: fanCodes?.length || 0,
        totalMessages: messages?.length || 0,
        isCurrentlyBanned: bans?.some(b => b.is_active && (b.ban_type === 'permanent' || new Date(b.expires_at) > new Date())) || false,
      }
    };

    // Log admin action
    await supabase.from("admin_audit_logs").insert({
      admin_id: user.id,
      action: "view_creator_details",
      target_type: "creator",
      target_id: id,
      details: { creator_handle: creator.handle }
    });

    return NextResponse.json({ success: true, profile });

  } catch (error) {
    console.error("Admin creator details error:", error);
    return NextResponse.json(
      { error: "Failed to fetch creator details" },
      { status: 500 }
    );
  }
}
