import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// List all creators with search and filters
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
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "all";
    const tier = searchParams.get("tier") || "all";
    const sortBy = searchParams.get("sortBy") || "created_at";
    const sortOrder = searchParams.get("sortOrder") || "desc";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = (page - 1) * limit;

    // Build base query
    let query = supabase
      .from("creator_applications")
      .select(`
        *,
        creator_wallets!left(balance, total_earnings),
        social_connections!left(platform, follower_count)
      `, { count: "exact" });

    // Apply filters
    if (search) {
      query = query.or(`display_name.ilike.%${search}%,handle.ilike.%${search}%,email.ilike.%${search}%`);
    }

    if (status !== "all") {
      query = query.eq("status", status);
    }

    if (tier !== "all") {
      query = query.eq("tier", tier);
    }

    // Apply sorting
    query = query.order(sortBy, { ascending: sortOrder === "asc" });

    // Apply pagination
    const { data: creators, error, count } = await query.range(offset, offset + limit - 1);

    if (error) throw error;

    // Check ban status for each creator
    const creatorsWithBans = await Promise.all(
      (creators || []).map(async (creator) => {
        const { data: banData } = await supabase
          .from("creator_bans")
          .select("is_active, ban_type, expires_at, reason")
          .eq("creator_id", creator.user_id)
          .eq("is_active", true)
          .maybeSingle();

        // Get content count
        const { count: contentCount } = await supabase
          .from("content_items_v2")
          .select("id", { count: "exact" })
          .eq("creator_id", creator.user_id);

        // Get fan count
        const { count: fanCount } = await supabase
          .from("fan_codes")
          .select("id", { count: "exact" })
          .eq("creator_id", creator.user_id);

        // Get transaction count and volume
        const { data: transactions } = await supabase
          .from("transactions_v2")
          .select("amount, status")
          .eq("creator_id", creator.user_id);

        const successfulTransactions = (transactions || []).filter(t => t.status === "success");
        const totalVolume = successfulTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);

        return {
          ...creator,
          ban_status: banData || null,
          stats: {
            content_count: contentCount || 0,
            fan_count: fanCount || 0,
            transaction_count: successfulTransactions.length,
            total_volume: totalVolume,
          }
        };
      })
    );

    // Log admin action
    await supabase.from("admin_audit_logs").insert({
      admin_id: user.id,
      action: "list_creators",
      target_type: "platform",
      target_id: "all",
      details: { search, status, tier, page, limit }
    });

    return NextResponse.json({
      creators: creatorsWithBans,
      total: count || 0,
      page,
      totalPages: Math.ceil((count || 0) / limit),
    });

  } catch (error) {
    console.error("Admin creators list error:", error);
    return NextResponse.json(
      { error: "Failed to fetch creators" },
      { status: 500 }
    );
  }
}
