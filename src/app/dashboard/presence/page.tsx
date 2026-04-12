import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardShell from "@/app/dashboard/components/DashboardShell";
import PresenceClient, { type PresenceData } from "./PresenceClient";

export const metadata = {
  title: "Live Fan Presence — MULUK",
  description: "See who's online, what they're viewing, and who your high-value fans are.",
};

const TWO_MIN_MS = 2 * 60 * 1000;
const FIFTEEN_MIN_MS = 15 * 60 * 1000;

export default async function PresencePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.onboarding_completed !== true) {
    redirect("/dashboard/onboarding");
  }

  // ── Server-side initial data fetch ────────────────────────────────────────
  // Runs on the server so the page is populated on first render (no loading flash).
  const now = Date.now();
  const twoMinAgo = new Date(now - TWO_MIN_MS).toISOString();
  const fifteenMinAgo = new Date(now - FIFTEEN_MIN_MS).toISOString();

  const [presenceResult, activityResult, spendResult] = await Promise.all([
    supabase
      .from("fan_presence")
      .select(
        "fan_code_id, last_seen_at, current_page, session_id, updated_at, fan_codes_v2!inner(code)"
      )
      .eq("creator_id", user.id)
      .order("last_seen_at", { ascending: false })
      .limit(500),

    supabase
      .from("fan_activity")
      .select(
        "id, fan_code_id, activity_type, page, content_id, metadata, created_at, fan_codes_v2!inner(code)"
      )
      .eq("creator_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50),

    supabase
      .from("transactions_v2")
      .select("fan_code_id, creator_earnings, amount")
      .eq("creator_id", user.id)
      .eq("status", "success"),
  ]);

  // Build spend map
  const spendMap = new Map<string, { total: number; count: number }>();
  for (const tx of spendResult.data ?? []) {
    const t = tx as { fan_code_id: string; creator_earnings: number | null; amount: number };
    const prev = spendMap.get(t.fan_code_id) ?? { total: 0, count: 0 };
    spendMap.set(t.fan_code_id, {
      total: prev.total + (t.creator_earnings ?? t.amount ?? 0),
      count: prev.count + 1,
    });
  }

  // Shape fans
  const allFans = (presenceResult.data ?? []).map((row) => {
    const r = row as unknown as {
      fan_code_id: string;
      last_seen_at: string;
      current_page: string | null;
      fan_codes_v2: Array<{ code: string }>;
    };
    const spend = spendMap.get(r.fan_code_id);
    const lastSeen = new Date(r.last_seen_at).getTime();
    return {
      fan_code_id: r.fan_code_id,
      code: r.fan_codes_v2[0]?.code ?? "",
      last_seen_at: r.last_seen_at,
      is_online: lastSeen > now - TWO_MIN_MS,
      is_recent: lastSeen > now - FIFTEEN_MIN_MS,
      current_page: r.current_page ?? null,
      lifetime_spend: spend?.total ?? 0,
      purchase_count: spend?.count ?? 0,
    };
  });

  // Shape activity
  const activity = (activityResult.data ?? []).map((row) => {
    const r = row as unknown as {
      id: string;
      fan_code_id: string;
      activity_type: string;
      page: string | null;
      content_id: string | null;
      metadata: Record<string, unknown>;
      created_at: string;
      fan_codes_v2: Array<{ code: string }>;
    };
    return {
      id: r.id,
      fan_code_id: r.fan_code_id,
      code: r.fan_codes_v2[0]?.code ?? "",
      activity_type: r.activity_type,
      page: r.page ?? null,
      content_id: r.content_id ?? null,
      metadata: r.metadata ?? {},
      created_at: r.created_at,
    };
  });

  const onlineNow = allFans.filter((f) => f.is_online).length;
  const recentlyActive = allFans.filter((f) => f.is_recent).length;
  const vaultViewers = allFans.filter(
    (f) => f.is_recent && f.current_page?.toLowerCase().includes("vault")
  ).length;
  const highValueOnline = allFans.filter((f) => f.is_online && f.lifetime_spend > 0).length;

  const initialData: PresenceData = {
    fans: allFans,
    activity,
    stats: {
      online_now: onlineNow,
      recently_active: recentlyActive,
      vault_viewers: vaultViewers,
      high_value_online: highValueOnline,
    },
    fetched_at: new Date().toISOString(),
  };

  return (
    <DashboardShell userEmail={user.email ?? ""} userId={user.id}>
      <PresenceClient userId={user.id} initialData={initialData} />
    </DashboardShell>
  );
}
