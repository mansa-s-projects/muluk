import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/creator/presence?filter=all|online|recent
// Returns live fan presence data for the authenticated creator's Command Center.

const TWO_MIN_MS = 2 * 60 * 1000;
const FIFTEEN_MIN_MS = 15 * 60 * 1000;

type RawPresenceRow = {
  fan_code_id: string;
  last_seen_at: string;
  current_page: string | null;
  session_id: string | null;
  updated_at: string;
  fan_codes_v2: { code: string };
};

type RawActivityRow = {
  id: string;
  fan_code_id: string;
  activity_type: string;
  page: string | null;
  content_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  fan_codes_v2: { code: string };
};

type RawTxRow = {
  fan_code_id: string;
  creator_earnings: number | null;
  amount: number;
};

export async function GET(req: Request) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const filter = url.searchParams.get("filter") ?? "all";

  const now = Date.now();
  const twoMinAgo = new Date(now - TWO_MIN_MS).toISOString();
  const fifteenMinAgo = new Date(now - FIFTEEN_MIN_MS).toISOString();

  // ── Parallel queries ────────────────────────────────────────────────────────
  const [presenceResult, activityResult, spendResult] = await Promise.all([
    // All presence rows for this creator, ordered by recency
    supabase
      .from("fan_presence")
      .select(
        "fan_code_id, last_seen_at, current_page, session_id, updated_at, fan_codes_v2!inner(code)"
      )
      .eq("creator_id", user.id)
      .order("last_seen_at", { ascending: false })
      .limit(500),

    // Recent activity feed (latest 50 events)
    supabase
      .from("fan_activity")
      .select(
        "id, fan_code_id, activity_type, page, content_id, metadata, created_at, fan_codes_v2!inner(code)"
      )
      .eq("creator_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50),

    // Aggregate spend per fan — used for high-value detection
    supabase
      .from("transactions_v2")
      .select("fan_code_id, creator_earnings, amount")
      .eq("creator_id", user.id)
      .eq("status", "success"),
  ]);

  // ── Build spend map ─────────────────────────────────────────────────────────
  const spendMap = new Map<string, { total: number; count: number }>();
  for (const tx of (spendResult.data ?? []) as RawTxRow[]) {
    const prev = spendMap.get(tx.fan_code_id) ?? { total: 0, count: 0 };
    spendMap.set(tx.fan_code_id, {
      total: prev.total + (tx.creator_earnings ?? tx.amount ?? 0),
      count: prev.count + 1,
    });
  }

  // ── Shape presence rows ─────────────────────────────────────────────────────
  const allFans = (presenceResult.data ?? []).map((row: unknown) => {
    const r = row as RawPresenceRow;
    const spend = spendMap.get(r.fan_code_id);
    const lastSeen = new Date(r.last_seen_at).getTime();
    return {
      fan_code_id: r.fan_code_id,
      code: (r.fan_codes_v2 as { code: string }).code,
      last_seen_at: r.last_seen_at,
      // Compute online status dynamically — is_online stored column is stale by design
      is_online: lastSeen > now - TWO_MIN_MS,
      is_recent: lastSeen > now - FIFTEEN_MIN_MS,
      current_page: r.current_page ?? null,
      lifetime_spend: spend?.total ?? 0,
      purchase_count: spend?.count ?? 0,
    };
  });

  // Apply filter
  const fans =
    filter === "online"
      ? allFans.filter((f) => f.is_online)
      : filter === "recent"
        ? allFans.filter((f) => f.is_recent)
        : allFans;

  // ── Shape activity rows ─────────────────────────────────────────────────────
  const activity = (activityResult.data ?? []).map((row: unknown) => {
    const r = row as RawActivityRow;
    return {
      id: r.id,
      fan_code_id: r.fan_code_id,
      code: (r.fan_codes_v2 as { code: string }).code,
      activity_type: r.activity_type,
      page: r.page ?? null,
      content_id: r.content_id ?? null,
      metadata: r.metadata ?? {},
      created_at: r.created_at,
    };
  });

  // ── Compute stats from full dataset ─────────────────────────────────────────
  const onlineNow = allFans.filter((f) => f.is_online).length;
  const recentlyActive = allFans.filter((f) => f.is_recent).length;
  const vaultViewers = allFans.filter(
    (f) => f.is_recent && f.current_page?.toLowerCase().includes("vault")
  ).length;
  const highValueOnline = allFans.filter(
    (f) => f.is_online && f.lifetime_spend > 0
  ).length;

  return NextResponse.json({
    fans,
    activity,
    stats: {
      online_now: onlineNow,
      recently_active: recentlyActive,
      vault_viewers: vaultViewers,
      high_value_online: highValueOnline,
    },
    fetched_at: new Date().toISOString(),
  });
}
