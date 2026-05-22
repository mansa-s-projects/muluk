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

    const ALLOW_DEV_ADMIN_BYPASS =
      process.env.ALLOW_DEV_ADMIN_BYPASS === "true" && process.env.NODE_ENV === "development";
    if (!adminCheck && !ALLOW_DEV_ADMIN_BYPASS) {
      return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 });
    }
    if (!adminCheck && ALLOW_DEV_ADMIN_BYPASS) {
      console.warn("[admin-creator-details] ALLOW_DEV_ADMIN_BYPASS enabled", { userId: user.id, creatorId: id });
    }

    // Get creator profile
    const { data: creator, error: creatorError } = await supabase
      .from("creator_applications")
      .select("*")
      .eq("user_id", id)
      .single();

    if (creatorError || !creator) {
      return NextResponse.json({ error: "Creator not found" }, { status: 404 });
    }

    const walletPromise = supabase
      .from("creator_wallets")
      .select("*")
      .eq("creator_id", id)
      .single();

    const socialsPromise = supabase
      .from("social_connections")
      .select("platform, platform_username, follower_count, connected_at")
      .eq("creator_id", id);

    const bansPromise = supabase
      .from("creator_bans")
      .select("*")
      .eq("creator_id", id)
      .order("created_at", { ascending: false });

    const notesPromise = supabase
      .from("admin_notes")
      .select("*")
      .eq("target_type", "creator")
      .eq("target_id", id)
      .order("created_at", { ascending: false });

    const contentPromise = supabase
      .from("content_items_v2")
      .select("*")
      .eq("creator_id", id)
      .order("created_at", { ascending: false })
      .limit(20);

    const transactionsPromise = supabase
      .from("transactions_v2")
      .select("*")
      .eq("creator_id", id)
      .order("created_at", { ascending: false })
      .limit(50);

    const fanCodesPromise = supabase
      .from("fan_codes_v2")
      .select("*, content_items_v2!inner(creator_id)")
      .eq("content_items_v2.creator_id", id)
      .order("created_at", { ascending: false })
      .limit(50);

    const messagesPromise = supabase
      .from("fan_messages")
      .select("*")
      .eq("creator_id", id)
      .order("created_at", { ascending: false })
      .limit(50);

    const activityPromise = supabase
      .from("activity_log")
      .select("*")
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .limit(100);

    const aiUsagePromise = supabase
      .from("daily_briefs")
      .select("*")
      .eq("creator_id", id)
      .order("date", { ascending: false })
      .limit(30);

    const [
      walletResult,
      socialsResult,
      bansResult,
      notesResult,
      contentResult,
      transactionsResult,
      fanCodesResult,
      messagesResult,
      activityResult,
      aiUsageResult,
    ] = await Promise.all([
      walletPromise,
      socialsPromise,
      bansPromise,
      notesPromise,
      contentPromise,
      transactionsPromise,
      fanCodesPromise,
      messagesPromise,
      activityPromise,
      aiUsagePromise,
    ]);

    if (walletResult.error) {
      console.warn("[admin-creator-details] wallet query failed", { creatorId: id, error: walletResult.error.message });
    }
    if (socialsResult.error) {
      console.warn("[admin-creator-details] socials query failed", { creatorId: id, error: socialsResult.error.message });
    }
    if (bansResult.error) {
      console.warn("[admin-creator-details] bans query failed", { creatorId: id, error: bansResult.error.message });
    }
    if (notesResult.error) {
      console.warn("[admin-creator-details] notes query failed", { creatorId: id, error: notesResult.error.message });
    }
    if (contentResult.error) {
      console.warn("[admin-creator-details] content query failed", { creatorId: id, error: contentResult.error.message });
    }
    if (transactionsResult.error) {
      console.warn("[admin-creator-details] transactions query failed", { creatorId: id, error: transactionsResult.error.message });
    }
    if (fanCodesResult.error) {
      console.warn("[admin-creator-details] fanCodes query failed", { creatorId: id, error: fanCodesResult.error.message });
    }
    if (messagesResult.error) {
      console.warn("[admin-creator-details] messages query failed", { creatorId: id, error: messagesResult.error.message });
    }
    if (activityResult.error) {
      console.warn("[admin-creator-details] activity query failed", { creatorId: id, error: activityResult.error.message });
    }
    if (aiUsageResult.error) {
      console.warn("[admin-creator-details] aiUsage query failed", { creatorId: id, error: aiUsageResult.error.message });
    }

    const wallet = walletResult.data;
    const socials = socialsResult.data;
    const bans = bansResult.data;
    const notes = notesResult.data;
    const content = contentResult.data;
    const transactions = transactionsResult.data;
    const fanCodes = fanCodesResult.data;
    const messages = messagesResult.data;
    const activity = activityResult.data;
    const aiUsage = aiUsageResult.data;

    // Compile profile
    const profile = {
      creator,
      wallet: wallet || null,
      socials: socials || [],
      bans: bans || [],
      notes: notes || [],
      content: content || [],
      transactions: transactions || [],
      fanCodes: (fanCodes || []).map((f) => ({
        ...(f as Record<string, unknown>),
        content_items_v2: undefined,
      })),
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

    // Log admin action; avoid non-admin FK issues when bypass mode is used.
    if (adminCheck) {
      await supabase.from("admin_audit_logs").insert({
        admin_id: user.id,
        action: "view_creator_details",
        target_type: "creator",
        target_id: id,
        details: { creator_handle: creator.handle }
      });
    } else if (ALLOW_DEV_ADMIN_BYPASS) {
      console.warn("[admin-creator-details] skipped admin_audit_logs insert in bypass mode", { creatorId: id });
    }

    return NextResponse.json({ success: true, profile });

  } catch (error) {
    console.error("Admin creator details error:", error);
    return NextResponse.json(
      { error: "Failed to fetch creator details" },
      { status: 500 }
    );
  }
}
