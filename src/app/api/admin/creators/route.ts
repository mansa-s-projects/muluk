import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function sanitizeSearchTerm(input: string): string {
  return input.replace(/[^a-zA-Z0-9@._\s-]/g, "").trim();
}

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

    const ALLOW_DEV_ADMIN_BYPASS =
      process.env.ALLOW_DEV_ADMIN_BYPASS === "true" && process.env.NODE_ENV === "development";
    if (!adminCheck && !ALLOW_DEV_ADMIN_BYPASS) {
      return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 });
    }
    if (!adminCheck && ALLOW_DEV_ADMIN_BYPASS) {
      console.warn("[admin-creators] ALLOW_DEV_ADMIN_BYPASS enabled", { userId: user.id });
    }

    const { searchParams } = new URL(request.url);
    const search = sanitizeSearchTerm(searchParams.get("search") || "");
    const status = searchParams.get("status") || "all";
    const tier = searchParams.get("tier") || "all";
    const rawSortBy = searchParams.get("sortBy") || "created_at";
    const rawSortOrder = searchParams.get("sortOrder") || "desc";
    const rawPage = Number(searchParams.get("page"));
    const rawLimit = Number(searchParams.get("limit"));

    const sortableColumns = new Set(["created_at", "name", "handle", "status", "tier"]);
    const requestedSortBy = rawSortBy === "display_name" ? "name" : rawSortBy;
    const sortBy = sortableColumns.has(requestedSortBy) ? requestedSortBy : "created_at";
    const sortOrder = rawSortOrder === "asc" ? "asc" : "desc";
    const page = Number.isFinite(rawPage) ? Math.max(1, Math.trunc(rawPage)) : 1;
    const limit = Number.isFinite(rawLimit) ? Math.min(100, Math.max(1, Math.trunc(rawLimit))) : 20;
    const offset = (page - 1) * limit;

    // Build base query
    let query = supabase
      .from("creator_applications")
      .select(
        `
        *,
        creator_wallets!left(balance, total_earnings),
        social_connections!left(platform, follower_count)
      `,
        { count: "exact" }
      );

    // Apply filters
    if (search) {
      query = query.or(`name.ilike.%${search}%,handle.ilike.%${search}%,email.ilike.%${search}%`);
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
    let { data: creators, error, count } = await query.range(offset, offset + limit - 1);

    // If optional relation joins are not available in this environment, retry with a minimal query.
    if (error) {
      console.warn("[admin-creators] rich query failed, retrying minimal query:", error.message);

      let fallbackQuery = supabase
        .from("creator_applications")
        .select("*", { count: "exact" });

      if (search) {
        fallbackQuery = fallbackQuery.or(`name.ilike.%${search}%,handle.ilike.%${search}%,email.ilike.%${search}%`);
      }
      if (status !== "all") {
        fallbackQuery = fallbackQuery.eq("status", status);
      }
      if (tier !== "all") {
        fallbackQuery = fallbackQuery.eq("tier", tier);
      }

      const fallback = await fallbackQuery
        .order(sortBy, { ascending: sortOrder === "asc" })
        .range(offset, offset + limit - 1);

      if (fallback.error) throw fallback.error;

      creators = fallback.data;
      count = fallback.count;
      error = null;
    }

    const creatorIds = (creators || []).map((c) => c.user_id).filter(Boolean);

    let creatorsWithBans = creators || [];
    if (creatorIds.length > 0) {
      const [bansResult, contentResult, fansResult, transactionsResult] = await Promise.all([
        supabase
          .from("creator_bans")
          .select("creator_id, is_active, ban_type, expires_at, reason, created_at")
          .in("creator_id", creatorIds)
          .eq("is_active", true)
          .order("created_at", { ascending: false }),
        supabase
          .from("content_items_v2")
          .select("creator_id")
          .in("creator_id", creatorIds),
        supabase
          .from("fan_codes_v2")
          .select("content_items_v2!inner(creator_id)")
          .in("content_items_v2.creator_id", creatorIds),
        supabase
          .from("transactions_v2")
          .select("creator_id, amount")
          .in("creator_id", creatorIds)
          .eq("status", "success"),
      ]);

      if (bansResult.error) console.error("[admin-creators] bans query failed:", bansResult.error.message);
      if (contentResult.error) console.error("[admin-creators] content query failed:", contentResult.error.message);
      if (fansResult.error) console.error("[admin-creators] fan codes query failed:", fansResult.error.message);
      if (transactionsResult.error) console.error("[admin-creators] transactions query failed:", transactionsResult.error.message);

      const banMap = new Map<string, { is_active: boolean; ban_type: string; expires_at: string | null; reason: string | null }>();
      for (const row of bansResult.data || []) {
        if (!banMap.has(row.creator_id)) {
          banMap.set(row.creator_id, {
            is_active: row.is_active,
            ban_type: row.ban_type,
            expires_at: row.expires_at,
            reason: row.reason,
          });
        }
      }

      const contentCountMap = new Map<string, number>();
      for (const row of contentResult.data || []) {
        contentCountMap.set(row.creator_id, (contentCountMap.get(row.creator_id) || 0) + 1);
      }

      const fanCountMap = new Map<string, number>();
      for (const row of fansResult.data || []) {
        const content = (row as { content_items_v2?: { creator_id?: string } | Array<{ creator_id?: string }> }).content_items_v2;
        const creatorId = Array.isArray(content) ? content[0]?.creator_id : content?.creator_id;
        if (!creatorId) continue;
        fanCountMap.set(creatorId, (fanCountMap.get(creatorId) || 0) + 1);
      }

      const txnStatsMap = new Map<string, { transaction_count: number; total_volume: number }>();
      for (const row of transactionsResult.data || []) {
        const current = txnStatsMap.get(row.creator_id) || { transaction_count: 0, total_volume: 0 };
        current.transaction_count += 1;
        current.total_volume += row.amount || 0;
        txnStatsMap.set(row.creator_id, current);
      }

      creatorsWithBans = (creators || []).map((creator) => {
        const txn = txnStatsMap.get(creator.user_id) || { transaction_count: 0, total_volume: 0 };
        const displayName = (creator as { display_name?: string; name?: string }).display_name || (creator as { name?: string }).name || "Unknown";
        return {
          ...creator,
          display_name: displayName,
          ban_status: banMap.get(creator.user_id) || null,
          stats: {
            content_count: contentCountMap.get(creator.user_id) || 0,
            fan_count: fanCountMap.get(creator.user_id) || 0,
            transaction_count: txn.transaction_count,
            total_volume: txn.total_volume,
          },
        };
      });
    }

    // Log admin action without blocking response if audit insert is denied by RLS.
    const { error: auditError } = await supabase.from("admin_audit_logs").insert({
      admin_id: user.id,
      action: "list_creators",
      target_type: "platform",
      target_id: "all",
      details: { search, status, tier, page, limit },
    });
    if (auditError) {
      console.warn("[admin-creators] audit log insert failed:", auditError.message);
    }

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
