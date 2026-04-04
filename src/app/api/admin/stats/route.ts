import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Get comprehensive platform stats for admin dashboard
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

    // Get time range from query params
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "30");
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    // Fetch all stats in parallel
    const [
      creatorsResult,
      fansResult,
      contentResult,
      transactionsResult,
      pendingAppsResult,
      activeBansResult,
      messagesResult
    ] = await Promise.all([
      // Total creators
      supabase.from("creator_applications").select("id, status, created_at, tier"),
      
      // Total fans (from fan_codes)
      supabase.from("fan_codes").select("id, created_at"),
      
      // Content stats
      supabase.from("content_items_v2").select("id, created_at, price, is_active"),
      
      // Transaction stats
      supabase.from("transactions_v2").select("id, amount, status, created_at, platform_fee, creator_earnings"),
      
      // Pending applications
      supabase.from("creator_applications").select("id", { count: "exact" }).eq("status", "pending"),
      
      // Active bans
      supabase.from("creator_bans").select("id", { count: "exact" }).eq("is_active", true),
      
      // Messages sent
      supabase.from("fan_messages").select("id, created_at")
    ]);

    // Process creators data
    const creators = creatorsResult.data || [];
    const creatorsRecent = creators.filter(c => c.created_at >= since);
    const approvedCreators = creators.filter(c => c.status === "approved");
    const tierStats = {
      cipher: creators.filter(c => c.tier === "cipher").length,
      legend: creators.filter(c => c.tier === "legend").length,
      apex: creators.filter(c => c.tier === "apex").length,
    };

    // Process fans data
    const fans = fansResult.data || [];
    const fansRecent = fans.filter(f => f.created_at >= since);

    // Process content data
    const content = contentResult.data || [];
    const contentRecent = content.filter(c => c.created_at >= since);
    const activeContent = content.filter(c => c.is_active);
    const avgContentPrice = content.length > 0 
      ? content.reduce((sum, c) => sum + (c.price || 0), 0) / content.length 
      : 0;

    // Process transaction data
    const transactions = transactionsResult.data || [];
    const successfulTransactions = transactions.filter(t => t.status === "success");
    const recentTransactions = successfulTransactions.filter(t => t.created_at >= since);
    
    const totalGMV = successfulTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
    const recentGMV = recentTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
    const totalFees = successfulTransactions.reduce((sum, t) => sum + (t.platform_fee || 0), 0);
    const totalCreatorEarnings = successfulTransactions.reduce((sum, t) => sum + (t.creator_earnings || 0), 0);

    // Process messages
    const messages = messagesResult.data || [];
    const recentMessages = messages.filter(m => m.created_at >= since);

    // Calculate growth rates (mock comparison for now)
    const calculateGrowth = (recent: number, total: number) => {
      const previous = total - recent;
      return previous > 0 ? ((recent - previous) / previous) * 100 : 0;
    };

    const stats = {
      // User metrics
      users: {
        totalCreators: creators.length,
        approvedCreators: approvedCreators.length,
        pendingApplications: pendingAppsResult.count || 0,
        totalFans: fans.length,
        newCreatorsThisPeriod: creatorsRecent.length,
        newFansThisPeriod: fansRecent.length,
        tierDistribution: tierStats,
        creatorGrowth: calculateGrowth(creatorsRecent.length, creators.length),
        fanGrowth: calculateGrowth(fansRecent.length, fans.length),
      },
      
      // Content metrics
      content: {
        totalItems: content.length,
        activeItems: activeContent.length,
        newItemsThisPeriod: contentRecent.length,
        averagePrice: Math.round(avgContentPrice),
        contentGrowth: calculateGrowth(contentRecent.length, content.length),
      },
      
      // Financial metrics
      finances: {
        totalGMV: totalGMV,
        periodGMV: recentGMV,
        totalPlatformFees: totalFees,
        totalCreatorEarnings: totalCreatorEarnings,
        totalTransactions: successfulTransactions.length,
        periodTransactions: recentTransactions.length,
        averageTransactionValue: successfulTransactions.length > 0 
          ? Math.round(totalGMV / successfulTransactions.length) 
          : 0,
        gmvGrowth: calculateGrowth(recentGMV, totalGMV),
      },
      
      // Engagement metrics
      engagement: {
        totalMessages: messages.length,
        periodMessages: recentMessages.length,
        activeBans: activeBansResult.count || 0,
      },
      
      // Time period
      period: {
        days,
        since,
        generatedAt: new Date().toISOString(),
      }
    };

    // Log admin action
    await supabase.from("admin_audit_logs").insert({
      admin_id: user.id,
      action: "view_platform_stats",
      target_type: "platform",
      target_id: "all",
      details: { days, stats_summary: { creators: creators.length, gmv: totalGMV } }
    });

    return NextResponse.json({ success: true, stats });

  } catch (error) {
    console.error("Admin stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch platform stats" },
      { status: 500 }
    );
  }
}
