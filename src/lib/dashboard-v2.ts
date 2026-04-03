import { createClient } from "@/lib/supabase/server";

// ─── Types ──────────────────────────────────────────────────────────────────

export type V2ContentItem = {
  id: string;
  title: string;
  description: string | null;
  price: number;
  currency: string;
  file_url: string | null;
  preview_url: string | null;
  is_active: boolean;
  created_at: string;
  unlockCount: number;
  paidUnlockCount: number;
  paidRevenue: number;
};

export type V2FanSummary = {
  fan_display_id: string;
  fan_code_id: string;
  total_spent: number;
  unlock_count: number;
  last_payment_at: string | null;
  payment_method: string | null;
  content_title: string | null;
};

export type V2Transaction = {
  id: string;
  fan_code: string;
  content_title: string;
  amount: number;
  currency: string;
  payment_method: string;
  status: string;
  creator_earnings: number;
  platform_fee: number;
  created_at: string;
};

export type V2EarningsBreakdown = {
  totalRevenue: number;
  totalEarnings: number;
  totalFees: number;
  transactionCount: number;
  successfulCount: number;
  byMethod: Record<string, { count: number; total: number }>;
};

export type V2DashboardOverview = {
  totalRevenue: number;
  totalEarnings: number;
  paidUnlocks: number;
  unpaidCodes: number;
  contentCount: number;
  activeContentCount: number;
  recentTransactions: V2Transaction[];
};

export type V2ContentStats = {
  items: V2ContentItem[];
  totalItems: number;
  totalRevenue: number;
};

export type V2FanStats = {
  totalPaidCodes: number;
  totalUnpaidCodes: number;
  fans: V2FanSummary[];
  topSpenders: V2FanSummary[];
  recentPaidUnlocks: V2FanSummary[];
};

export type V2PriceOptimizerResult = {
  eligible: boolean;
  reason: string;
  averagePrice: number;
  medianPrice: number;
  totalPurchases: number;
  recommendation: string | null;
};

export type V2ContentPlan = {
  id: string;
  title: string;
  description: string | null;
  planType: string;
  status: string;
  source: string;
  plannedFor: string | null;
  createdAt: string;
};

export type V2OnboardingSnapshot = {
  niche: string;
  confidence: string;
  pricingRecommendation: string;
  first30Days: string[];
  platformPriority: string[];
  contentPillars: Array<{ name: string; description: string }>;
};

// ─── Safe number parser ─────────────────────────────────────────────────────

function safe(v: unknown): number {
  if (typeof v === "number" && isFinite(v)) return v;
  if (typeof v === "string") {
    const n = parseFloat(v);
    return isFinite(n) ? n : 0;
  }
  return 0;
}

// ─── Dashboard Overview ─────────────────────────────────────────────────────

export async function getCreatorDashboardOverview(
  userId: string
): Promise<V2DashboardOverview> {
  const supabase = await createClient();

  // Content count
  const { data: contentRows } = await supabase
    .from("content_items_v2")
    .select("id, is_active")
    .eq("creator_id", userId);

  const contentCount = contentRows?.length ?? 0;
  const activeContentCount = contentRows?.filter((r) => r.is_active).length ?? 0;

  // Fan codes
  const { data: fanCodes } = await supabase
    .from("fan_codes_v2")
    .select("id, is_paid, content_id")
    .in(
      "content_id",
      (contentRows ?? []).map((c) => c.id)
    );

  const paidUnlocks = fanCodes?.filter((f) => f.is_paid).length ?? 0;
  const unpaidCodes = fanCodes?.filter((f) => !f.is_paid).length ?? 0;

  // Transactions
  const { data: txRows } = await supabase
    .from("transactions_v2")
    .select(
      "id, content_id, fan_code_id, amount, currency, payment_method, status, creator_earnings, platform_fee, created_at"
    )
    .eq("creator_id", userId)
    .eq("status", "success")
    .order("created_at", { ascending: false })
    .limit(20);

  const totalRevenue = (txRows ?? []).reduce((s, t) => s + safe(t.amount), 0);
  const totalEarnings = (txRows ?? []).reduce(
    (s, t) => s + safe(t.creator_earnings),
    0
  );

  // Resolve content titles for transactions
  const contentMap = new Map<string, string>();
  for (const c of contentRows ?? []) {
    contentMap.set(c.id, "");
  }
  if (contentMap.size > 0) {
    const { data: titleRows } = await supabase
      .from("content_items_v2")
      .select("id, title")
      .in("id", Array.from(contentMap.keys()));
    for (const t of titleRows ?? []) {
      contentMap.set(t.id, t.title || "Untitled");
    }
  }

  // Resolve fan codes for transactions
  const fanCodeIds = [
    ...new Set((txRows ?? []).map((t) => t.fan_code_id).filter(Boolean)),
  ];
  const fanCodeMap = new Map<string, string>();
  if (fanCodeIds.length > 0) {
    const { data: codeRows } = await supabase
      .from("fan_codes_v2")
      .select("id, code")
      .in("id", fanCodeIds);
    for (const c of codeRows ?? []) {
      fanCodeMap.set(c.id, c.code);
    }
  }

  const recentTransactions: V2Transaction[] = (txRows ?? []).map((tx) => ({
    id: tx.id,
    fan_code: fanCodeMap.get(tx.fan_code_id) ?? "FAN-UNKNOWN",
    content_title: contentMap.get(tx.content_id) ?? "Unknown",
    amount: safe(tx.amount),
    currency: tx.currency || "usd",
    payment_method: tx.payment_method || "whop",
    status: tx.status,
    creator_earnings: safe(tx.creator_earnings),
    platform_fee: safe(tx.platform_fee),
    created_at: tx.created_at || "",
  }));

  return {
    totalRevenue,
    totalEarnings,
    paidUnlocks,
    unpaidCodes,
    contentCount,
    activeContentCount,
    recentTransactions,
  };
}

// ─── Content Stats ──────────────────────────────────────────────────────────

export async function getCreatorContentStats(
  userId: string
): Promise<V2ContentStats> {
  const supabase = await createClient();

  const { data: items } = await supabase
    .from("content_items_v2")
    .select("id, title, description, price, currency, file_url, preview_url, is_active, created_at")
    .eq("creator_id", userId)
    .order("created_at", { ascending: false });

  if (!items || items.length === 0) {
    return { items: [], totalItems: 0, totalRevenue: 0 };
  }

  const contentIds = items.map((i) => i.id);

  // Fan codes per content
  const { data: fanCodes } = await supabase
    .from("fan_codes_v2")
    .select("content_id, is_paid")
    .in("content_id", contentIds);

  // Transactions per content
  const { data: txRows } = await supabase
    .from("transactions_v2")
    .select("content_id, amount")
    .eq("creator_id", userId)
    .eq("status", "success")
    .in("content_id", contentIds);

  const unlockMap = new Map<string, { total: number; paid: number }>();
  const revenueMap = new Map<string, number>();

  for (const fc of fanCodes ?? []) {
    const key = fc.content_id;
    const prev = unlockMap.get(key) || { total: 0, paid: 0 };
    prev.total++;
    if (fc.is_paid) prev.paid++;
    unlockMap.set(key, prev);
  }

  for (const tx of txRows ?? []) {
    revenueMap.set(tx.content_id, (revenueMap.get(tx.content_id) || 0) + safe(tx.amount));
  }

  const mapped: V2ContentItem[] = items.map((item) => ({
    id: item.id,
    title: item.title || "Untitled",
    description: item.description,
    price: safe(item.price),
    currency: item.currency || "usd",
    file_url: item.file_url,
    preview_url: item.preview_url,
    is_active: Boolean(item.is_active),
    created_at: item.created_at || "",
    unlockCount: unlockMap.get(item.id)?.total ?? 0,
    paidUnlockCount: unlockMap.get(item.id)?.paid ?? 0,
    paidRevenue: revenueMap.get(item.id) ?? 0,
  }));

  const totalRevenue = mapped.reduce((s, c) => s + c.paidRevenue, 0);

  return { items: mapped, totalItems: mapped.length, totalRevenue };
}

// ─── Fan Stats ──────────────────────────────────────────────────────────────

export async function getCreatorFanStats(
  userId: string
): Promise<V2FanStats> {
  const supabase = await createClient();

  // Get all creator content IDs
  const { data: contentRows } = await supabase
    .from("content_items_v2")
    .select("id, title")
    .eq("creator_id", userId);

  const contentIds = (contentRows ?? []).map((c) => c.id);
  const titleMap = new Map<string, string>();
  for (const c of contentRows ?? []) {
    titleMap.set(c.id, c.title || "Untitled");
  }

  if (contentIds.length === 0) {
    return { totalPaidCodes: 0, totalUnpaidCodes: 0, fans: [], topSpenders: [], recentPaidUnlocks: [] };
  }

  // All fan codes for this creator's content
  const { data: fanCodes } = await supabase
    .from("fan_codes_v2")
    .select("id, code, content_id, is_paid, payment_method, paid_at")
    .in("content_id", contentIds)
    .order("paid_at", { ascending: false });

  const totalPaidCodes = fanCodes?.filter((f) => f.is_paid).length ?? 0;
  const totalUnpaidCodes = fanCodes?.filter((f) => !f.is_paid).length ?? 0;

  // All transactions for this creator
  const { data: txRows } = await supabase
    .from("transactions_v2")
    .select("fan_code_id, amount, created_at")
    .eq("creator_id", userId)
    .eq("status", "success");

  // Build per-fan-code aggregation
  const spendMap = new Map<string, { total: number; count: number; last: string }>();
  for (const tx of txRows ?? []) {
    const prev = spendMap.get(tx.fan_code_id) || { total: 0, count: 0, last: "" };
    prev.total += safe(tx.amount);
    prev.count++;
    if (tx.created_at > prev.last) prev.last = tx.created_at;
    spendMap.set(tx.fan_code_id, prev);
  }

  const fans: V2FanSummary[] = (fanCodes ?? [])
    .filter((f) => f.is_paid)
    .map((f) => {
      const spend = spendMap.get(f.id);
      return {
        fan_display_id: f.code,
        fan_code_id: f.id,
        total_spent: spend?.total ?? 0,
        unlock_count: spend?.count ?? 1,
        last_payment_at: f.paid_at || spend?.last || null,
        payment_method: f.payment_method,
        content_title: titleMap.get(f.content_id) || null,
      };
    });

  const topSpenders = [...fans].sort((a, b) => b.total_spent - a.total_spent).slice(0, 10);
  const recentPaidUnlocks = [...fans]
    .filter((f) => f.last_payment_at)
    .sort((a, b) => (b.last_payment_at || "").localeCompare(a.last_payment_at || ""))
    .slice(0, 10);

  return { totalPaidCodes, totalUnpaidCodes, fans, topSpenders, recentPaidUnlocks };
}

// ─── Earnings Stats ─────────────────────────────────────────────────────────

export async function getCreatorEarningsStats(
  userId: string
): Promise<V2EarningsBreakdown> {
  const supabase = await createClient();

  const { data: allTx } = await supabase
    .from("transactions_v2")
    .select("amount, currency, payment_method, status, creator_earnings, platform_fee")
    .eq("creator_id", userId);

  const successTx = (allTx ?? []).filter((t) => t.status === "success");

  const totalRevenue = successTx.reduce((s, t) => s + safe(t.amount), 0);
  const totalEarnings = successTx.reduce((s, t) => s + safe(t.creator_earnings), 0);
  const totalFees = successTx.reduce((s, t) => s + safe(t.platform_fee), 0);

  const byMethod: Record<string, { count: number; total: number }> = {};
  for (const tx of successTx) {
    const m = tx.payment_method || "unknown";
    if (!byMethod[m]) byMethod[m] = { count: 0, total: 0 };
    byMethod[m].count++;
    byMethod[m].total += safe(tx.creator_earnings);
  }

  return {
    totalRevenue,
    totalEarnings,
    totalFees,
    transactionCount: (allTx ?? []).length,
    successfulCount: successTx.length,
    byMethod,
  };
}

// ─── Recent Transactions ────────────────────────────────────────────────────

export async function getCreatorRecentTransactions(
  userId: string,
  limit = 20
): Promise<V2Transaction[]> {
  const supabase = await createClient();

  const { data: txRows } = await supabase
    .from("transactions_v2")
    .select(
      "id, content_id, fan_code_id, amount, currency, payment_method, status, creator_earnings, platform_fee, created_at"
    )
    .eq("creator_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!txRows || txRows.length === 0) return [];

  // Resolve content titles
  const contentIds = [...new Set(txRows.map((t) => t.content_id))];
  const { data: contentRows } = await supabase
    .from("content_items_v2")
    .select("id, title")
    .in("id", contentIds);

  const contentMap = new Map<string, string>();
  for (const c of contentRows ?? []) {
    contentMap.set(c.id, c.title || "Untitled");
  }

  // Resolve fan codes
  const fanCodeIds = [...new Set(txRows.map((t) => t.fan_code_id))];
  const { data: codeRows } = await supabase
    .from("fan_codes_v2")
    .select("id, code")
    .in("id", fanCodeIds);

  const codeMap = new Map<string, string>();
  for (const c of codeRows ?? []) {
    codeMap.set(c.id, c.code);
  }

  return txRows.map((tx) => ({
    id: tx.id,
    fan_code: codeMap.get(tx.fan_code_id) ?? "FAN-UNKNOWN",
    content_title: contentMap.get(tx.content_id) ?? "Unknown",
    amount: safe(tx.amount),
    currency: tx.currency || "usd",
    payment_method: tx.payment_method || "whop",
    status: tx.status,
    creator_earnings: safe(tx.creator_earnings),
    platform_fee: safe(tx.platform_fee),
    created_at: tx.created_at || "",
  }));
}

// ─── Price Optimizer (Safe) ─────────────────────────────────────────────────

export async function getPriceOptimizerData(
  userId: string
): Promise<V2PriceOptimizerResult> {
  const supabase = await createClient();

  const { data: txRows } = await supabase
    .from("transactions_v2")
    .select("amount")
    .eq("creator_id", userId)
    .eq("status", "success");

  const prices = (txRows ?? []).map((t) => safe(t.amount)).filter((p) => p > 0);

  if (prices.length < 5) {
    return {
      eligible: false,
      reason: `Needs more transaction data (${prices.length}/5 successful payments)`,
      averagePrice: 0,
      medianPrice: 0,
      totalPurchases: prices.length,
      recommendation: null,
    };
  }

  const sorted = [...prices].sort((a, b) => a - b);
  const avg = prices.reduce((s, p) => s + p, 0) / prices.length;
  const median =
    sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)];

  let recommendation: string;
  if (avg > median * 1.3) {
    recommendation = `Your average sale ($${(avg / 100).toFixed(2)}) is significantly above median ($${(median / 100).toFixed(2)}). A few high-value purchases are skewing results. Consider offering tiered pricing.`;
  } else if (median > avg * 1.1) {
    recommendation = `Most of your sales cluster above the average. Your audience may support a price increase to $${(median * 1.15 / 100).toFixed(2)}.`;
  } else {
    recommendation = `Your pricing is consistent. Average and median are close at $${(avg / 100).toFixed(2)}. Current price point is validated by ${prices.length} successful purchases.`;
  }

  return {
    eligible: true,
    reason: "Sufficient transaction data available",
    averagePrice: avg,
    medianPrice: median,
    totalPurchases: prices.length,
    recommendation,
  };
}

// ─── Tool Gating Logic ──────────────────────────────────────────────────────

export type ToolGating = {
  bioGenerator: { enabled: true };
  priceOptimizer: { enabled: boolean; reason: string };
  contentCalendar: { enabled: true; mode: "planning" | "live" };
  fanMessageBlast: { enabled: boolean; reason: string };
  collabFinder: { enabled: true; mode: "placeholder" };
  taxSummary: { enabled: boolean; reason: string };
};

export async function getToolGating(userId: string): Promise<ToolGating> {
  const supabase = await createClient();

  const { count: successCountRaw } = await supabase
    .from("transactions_v2")
    .select("id", { count: "exact", head: true })
    .eq("creator_id", userId)
    .eq("status", "success");

  const successCount = successCountRaw ?? 0;

  const { error: fanMsgErr } = await supabase
    .from("creator_broadcasts_v2")
    .select("id", { count: "exact", head: true })
    .eq("creator_id", userId)
    .limit(0);

  const fanMsgExists = !fanMsgErr || !fanMsgErr.message?.includes("does not exist");

  return {
    bioGenerator: { enabled: true },
    priceOptimizer: {
      enabled: successCount >= 5,
      reason:
        successCount >= 5
          ? "Ready"
          : `Needs more transaction data (${successCount}/5 successful payments)`,
    },
    contentCalendar: { enabled: true, mode: "planning" },
    fanMessageBlast: {
      enabled: fanMsgExists,
      reason: fanMsgExists ? "Ready" : "Fan messaging infrastructure not yet available",
    },
    collabFinder: { enabled: true, mode: "placeholder" },
    taxSummary: {
      enabled: successCount > 0,
      reason:
        successCount > 0
          ? "Ready"
          : "No tax summary until first successful payment",
    },
  };
}

export async function getCreatorContentPlans(userId: string): Promise<V2ContentPlan[]> {
  const supabase = await createClient();

  const { data: plans } = await supabase
    .from("content_plans_v2")
    .select("id, title, description, plan_type, status, source, planned_for, created_at")
    .eq("creator_id", userId)
    .order("planned_for", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(12);

  return (plans ?? []).map((plan) => ({
    id: plan.id,
    title: plan.title || "Untitled",
    description: plan.description,
    planType: plan.plan_type || "unlock",
    status: plan.status || "planned",
    source: plan.source || "manual",
    plannedFor: plan.planned_for || null,
    createdAt: plan.created_at || "",
  }));
}

export async function getCreatorOnboardingSnapshot(userId: string): Promise<V2OnboardingSnapshot | null> {
  const supabase = await createClient();

  const { data: row } = await supabase
    .from("creator_onboarding")
    .select("analysis")
    .eq("user_id", userId)
    .maybeSingle();

  const analysis = row?.analysis as Record<string, unknown> | undefined;
  if (!analysis) return null;

  const contentPillars = Array.isArray(analysis.contentPillars)
    ? analysis.contentPillars
        .map((pillar) => {
          const value = pillar as Record<string, unknown>;
          return {
            name: String(value.name ?? ""),
            description: String(value.description ?? ""),
          };
        })
        .filter((pillar) => pillar.name || pillar.description)
    : [];

  return {
    niche: String(analysis.niche ?? ""),
    confidence: String(analysis.confidence ?? ""),
    pricingRecommendation: String((analysis.pricing as { recommendation?: string } | undefined)?.recommendation ?? ""),
    first30Days: Array.isArray(analysis.first30Days) ? analysis.first30Days.map((item) => String(item)) : [],
    platformPriority: Array.isArray(analysis.platformPriority) ? analysis.platformPriority.map((item) => String(item)) : [],
    contentPillars,
  };
}

// ─── 7-day chart data from v2 ───────────────────────────────────────────────

export type V2ChartDay = { label: string; amount: number };

export async function getV2ChartData(userId: string): Promise<V2ChartDay[]> {
  const supabase = await createClient();
  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const { data: txRows } = await supabase
    .from("transactions_v2")
    .select("amount, created_at")
    .eq("creator_id", userId)
    .eq("status", "success")
    .gte("created_at", sevenDaysAgo.toISOString());

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (6 - i));
    const label = d.toLocaleDateString("en-US", { weekday: "short" });
    const dateStr = d.toISOString().slice(0, 10);
    const amount = (txRows ?? [])
      .filter((tx) => (tx.created_at || "").startsWith(dateStr))
      .reduce((sum, tx) => sum + safe(tx.amount), 0);
    return { label, amount };
  });
}
