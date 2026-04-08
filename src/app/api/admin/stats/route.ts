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

    const ALLOW_DEV_ADMIN_BYPASS =
      process.env.ALLOW_DEV_ADMIN_BYPASS === "true" && process.env.NODE_ENV === "development";
    if (!adminCheck && !ALLOW_DEV_ADMIN_BYPASS) {
      return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 });
    }
    if (!adminCheck && ALLOW_DEV_ADMIN_BYPASS) {
      console.warn("[admin-stats] ALLOW_DEV_ADMIN_BYPASS enabled", { userId: user.id });
    }

    // Get time range from query params
    const { searchParams } = new URL(request.url);
    const parsedDays = Number(searchParams.get("days"));
    const days = Number.isFinite(parsedDays)
      ? Math.min(365, Math.max(1, Math.trunc(parsedDays)))
      : 30;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    // Fetch aggregate stats in parallel using bounded/count/sum queries.
    const [
      creatorsResult,
      approvedCreatorsResult,
      newCreatorsResult,
      fansResult,
      fansRecentResult,
      contentResult,
      activeContentResult,
      recentContentResult,
      avgContentPriceResult,
      transactionsCountResult,
      transactionsCountRecentResult,
      transactionsSumsResult,
      transactionsSumsRecentResult,
      pendingAppsResult,
      activeBansResult,
      messagesResult,
      recentMessagesResult,
      tierCipherResult,
      tierLegendResult,
      tierApexResult,
    ] = await Promise.all([
      supabase.from("creator_applications").select("id", { count: "exact", head: true }),
      supabase.from("creator_applications").select("id", { count: "exact", head: true }).eq("status", "approved"),
      supabase.from("creator_applications").select("id", { count: "exact", head: true }).gte("created_at", since),
      supabase.from("fan_codes").select("id", { count: "exact", head: true }),
      supabase.from("fan_codes").select("id", { count: "exact", head: true }).gte("created_at", since),
      supabase.from("content_items_v2").select("id", { count: "exact", head: true }),
      supabase.from("content_items_v2").select("id", { count: "exact", head: true }).eq("is_active", true),
      supabase.from("content_items_v2").select("id", { count: "exact", head: true }).gte("created_at", since),
      supabase.from("content_items_v2").select("price.avg()"),
      supabase.from("transactions_v2").select("id", { count: "exact", head: true }).eq("status", "success"),
      supabase.from("transactions_v2").select("id", { count: "exact", head: true }).eq("status", "success").gte("created_at", since),
      supabase.from("transactions_v2").select("amount.sum(), platform_fee.sum(), creator_earnings.sum()").eq("status", "success"),
      supabase.from("transactions_v2").select("amount.sum(), platform_fee.sum(), creator_earnings.sum()").eq("status", "success").gte("created_at", since),
      supabase.from("creator_applications").select("id", { count: "exact" }).eq("status", "pending"),
      supabase.from("creator_bans").select("id", { count: "exact" }).eq("is_active", true),
      supabase.from("fan_messages").select("id", { count: "exact", head: true }),
      supabase.from("fan_messages").select("id", { count: "exact", head: true }).gte("created_at", since),
      supabase.from("creator_applications").select("id", { count: "exact", head: true }).eq("tier", "cipher"),
      supabase.from("creator_applications").select("id", { count: "exact", head: true }).eq("tier", "legend"),
      supabase.from("creator_applications").select("id", { count: "exact", head: true }).eq("tier", "apex"),
    ]);

    const queryErrors = [
      creatorsResult.error,
      approvedCreatorsResult.error,
      newCreatorsResult.error,
      fansResult.error,
      fansRecentResult.error,
      contentResult.error,
      activeContentResult.error,
      recentContentResult.error,
      avgContentPriceResult.error,
      transactionsCountResult.error,
      transactionsCountRecentResult.error,
      transactionsSumsResult.error,
      transactionsSumsRecentResult.error,
      pendingAppsResult.error,
      activeBansResult.error,
      messagesResult.error,
      recentMessagesResult.error,
      tierCipherResult.error,
      tierLegendResult.error,
      tierApexResult.error,
    ].filter(Boolean);

    if (queryErrors.length > 0) {
      console.error("[admin-stats] one or more aggregate queries failed", queryErrors);
      return NextResponse.json({ error: "Failed to fetch platform stats" }, { status: 500 });
    }

    const tierStats = {
      cipher: tierCipherResult.count || 0,
      legend: tierLegendResult.count || 0,
      apex: tierApexResult.count || 0,
    };

    const totalCreators = creatorsResult.count || 0;
    const approvedCreators = approvedCreatorsResult.count || 0;
    const creatorsRecent = newCreatorsResult.count || 0;

    const totalFans = fansResult.count || 0;
    const fansRecent = fansRecentResult.count || 0;

    const totalContent = contentResult.count || 0;
    const contentRecent = recentContentResult.count || 0;
    const activeContent = activeContentResult.count || 0;

    const avgContentPrice = Math.round(Number((avgContentPriceResult.data as Array<{ avg?: number }> | null)?.[0]?.avg ?? 0));

    const totalTransactions = transactionsCountResult.count || 0;
    const periodTransactions = transactionsCountRecentResult.count || 0;

    const totalGMV = Number((transactionsSumsResult.data as Array<{ sum?: number }> | null)?.[0]?.sum ?? 0);
    const recentGMV = Number((transactionsSumsRecentResult.data as Array<{ sum?: number }> | null)?.[0]?.sum ?? 0);
    const totalFees = Number((transactionsSumsResult.data as Array<{ sum?: number }> | null)?.[1]?.sum ?? 0);
    const totalCreatorEarnings = Number((transactionsSumsResult.data as Array<{ sum?: number }> | null)?.[2]?.sum ?? 0);

    const messagesTotal = messagesResult.count || 0;
    const recentMessages = recentMessagesResult.count || 0;

    // Calculate growth rates (mock comparison for now)
    const calculateGrowth = (recent: number, total: number) => {
      const previous = total - recent;
      return previous > 0 ? ((recent - previous) / previous) * 100 : 0;
    };

    const stats = {
      // User metrics
      users: {
        totalCreators,
        approvedCreators,
        pendingApplications: pendingAppsResult.count || 0,
        totalFans,
        newCreatorsThisPeriod: creatorsRecent,
        newFansThisPeriod: fansRecent,
        tierDistribution: tierStats,
        creatorGrowth: calculateGrowth(creatorsRecent, totalCreators),
        fanGrowth: calculateGrowth(fansRecent, totalFans),
      },
      
      // Content metrics
      content: {
        totalItems: totalContent,
        activeItems: activeContent,
        newItemsThisPeriod: contentRecent,
        averagePrice: avgContentPrice,
        contentGrowth: calculateGrowth(contentRecent, totalContent),
      },
      
      // Financial metrics
      finances: {
        totalGMV: totalGMV,
        periodGMV: recentGMV,
        totalPlatformFees: totalFees,
        totalCreatorEarnings: totalCreatorEarnings,
        totalTransactions,
        periodTransactions,
        averageTransactionValue: totalTransactions > 0
          ? Math.round(totalGMV / totalTransactions)
          : 0,
        gmvGrowth: calculateGrowth(recentGMV, totalGMV),
      },
      
      // Engagement metrics
      engagement: {
        totalMessages: messagesTotal,
        periodMessages: recentMessages,
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
      ...(adminCheck ? { admin_id: user.id } : {}),
      action: "view_platform_stats",
      target_type: "platform",
      target_id: "all",
      details: { days, bypassUsed: !adminCheck && ALLOW_DEV_ADMIN_BYPASS, stats_summary: { creators: totalCreators, gmv: totalGMV } }
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
