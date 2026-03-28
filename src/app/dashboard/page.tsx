import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardClient, {
  type DashboardData,
} from "./DashboardClient";

function safeNum(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = parseFloat(v.replace(/[$,]/g, ""));
    return isFinite(n) ? n : 0;
  }
  return 0;
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const missingTables = new Set<string>();
  const isMissingTable = (code?: string, message?: string) =>
    code === "42P01" || /relation .* does not exist/i.test(message ?? "");

  const { data: walletRow, error: walletErr } = await supabase
    .from("creator_wallets")
    .select("balance, total_earnings, referral_income")
    .eq("creator_id", user.id)
    .maybeSingle();

  if (walletErr && isMissingTable(walletErr.code, walletErr.message)) {
    missingTables.add("creator_wallets");
  }

  const wallet: DashboardData["wallet"] = {
    balance: safeNum(walletRow?.balance),
    total_earnings: safeNum(walletRow?.total_earnings),
    referral_income: safeNum(walletRow?.referral_income),
  };

  // Fetch creator profile for phantom mode + vault pin
  const { data: creatorProfile } = await supabase
    .from("creator_applications")
    .select("phantom_mode, vault_pin_hash")
    .eq("user_id", user.id)
    .maybeSingle();

  const phantomMode = Boolean(creatorProfile?.phantom_mode ?? false);
  const hasVaultPin = Boolean(creatorProfile?.vault_pin_hash);

  const { data: socialRaw, error: socialErr } = await supabase
    .from("social_connections")
    .select("platform, platform_username, platform_user_id, follower_count, connected_at")
    .eq("creator_id", user.id)
    .order("connected_at", { ascending: false });

  if (socialErr && isMissingTable(socialErr.code, socialErr.message)) {
    missingTables.add("social_connections");
  }

  const socialConnections: DashboardData["socialConnections"] = (socialRaw ?? []).map(row => ({
    platform: String(row.platform ?? "twitter") as DashboardData["socialConnections"][number]["platform"],
    platform_username: row.platform_username ? String(row.platform_username) : null,
    platform_user_id: row.platform_user_id ? String(row.platform_user_id) : null,
    follower_count: safeNum(row.follower_count),
    connected_at: String(row.connected_at ?? ""),
  }));

  const socialReach: DashboardData["socialReach"] = {
    totalFollowers: socialConnections.reduce((sum, c) => sum + c.follower_count, 0),
    byPlatform: ["twitter", "tiktok", "instagram", "youtube", "telegram"].map(platform => ({
      platform: platform as DashboardData["socialReach"]["byPlatform"][number]["platform"],
      followers: socialConnections.find(c => c.platform === platform)?.follower_count ?? 0,
    })),
  };

  const oauthAvailable: DashboardData["oauthAvailable"] = {
    twitter: Boolean(process.env.TWITTER_CLIENT_ID && process.env.TWITTER_CALLBACK_URL),
    tiktok: Boolean(process.env.TIKTOK_CLIENT_KEY),
    instagram: Boolean(process.env.INSTAGRAM_CLIENT_ID && process.env.INSTAGRAM_CALLBACK_URL),
    youtube: Boolean(process.env.YOUTUBE_CLIENT_ID),
    telegram: Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_BOT_USERNAME),
  };

  const { data: fanCodesRaw, count: fanCodeCount, error: fanErr } = await supabase
    .from("fan_codes")
    .select("id, code, status, created_at", { count: "exact" })
    .eq("creator_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10);

  if (fanErr && isMissingTable(fanErr.code, fanErr.message)) {
    missingTables.add("fan_codes");
  }

  const fanCodes: DashboardData["fanCodes"] = (fanCodesRaw ?? []).map(row => ({
    id: String(row.id),
    code: String(row.code),
    status: String(row.status ?? "active"),
    created_at: String(row.created_at ?? ""),
  }));

  const { data: txRaw, error: txErr } = await supabase
    .from("transactions")
    .select("id, fan_code, amount, type, status, created_at")
    .eq("creator_id", user.id)
    .order("created_at", { ascending: false })
    .limit(30);

  if (txErr && isMissingTable(txErr.code, txErr.message)) {
    missingTables.add("transactions");
  }

  const transactions: DashboardData["transactions"] = (txRaw ?? []).map(row => ({
    id: String(row.id),
    fan_code: row.fan_code ? String(row.fan_code) : null,
    amount: safeNum(row.amount),
    type: row.type ? String(row.type) : null,
    status: String(row.status ?? "completed"),
    created_at: String(row.created_at ?? ""),
  }));

  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const { data: chartTxRaw, error: chartErr } = await supabase
    .from("transactions")
    .select("amount, status, created_at, fan_code, type")
    .eq("creator_id", user.id)
    .gte("created_at", sevenDaysAgo.toISOString());

  if (chartErr && isMissingTable(chartErr.code, chartErr.message)) {
    missingTables.add("transactions");
  }

  const chartData: DashboardData["chartData"] = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (6 - i));
    const label = d.toLocaleDateString("en-US", { weekday: "short" });
    const dateStr = d.toISOString().slice(0, 10);
    const amount = (chartTxRaw ?? [])
      .filter(tx => String(tx.created_at ?? "").startsWith(dateStr) && tx.status !== "failed")
      .reduce((sum, tx) => sum + safeNum(tx.amount), 0);
    return { label, amount };
  });

  const fanAgg = new Map<string, { total: number; lastActive: string; hasCompleted: boolean }>();
  for (const row of chartTxRaw ?? []) {
    const code = String(row.fan_code ?? "FAN-UNKNOWN");
    const prev = fanAgg.get(code) ?? { total: 0, lastActive: "", hasCompleted: false };
    const created = String(row.created_at ?? "");
    fanAgg.set(code, {
      total: prev.total + safeNum(row.amount),
      lastActive: created > prev.lastActive ? created : prev.lastActive,
      hasCompleted: prev.hasCompleted || String(row.status ?? "") === "completed",
    });
  }

  const heatMap: DashboardData["heatMap"] = Array.from(fanAgg.entries())
    .map(([fan_code, value]) => ({
      fan_code,
      total: value.total,
      last_active: value.lastActive,
      subscription_status: value.hasCompleted ? "active" : "inactive",
    }))
    .sort((a, b) => b.total - a.total);

  const { data: contentRaw, error: contentErr } = await supabase
    .from("content_items")
    .select("id, title, description, price, burn_mode, expires_at, status")
    .eq("creator_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10);

  if (contentErr && isMissingTable(contentErr.code, contentErr.message)) {
    missingTables.add("content_items");
  }

  const contentItems: DashboardData["contentItems"] = (contentRaw ?? []).map(row => ({
    id: String(row.id),
    title: String(row.title ?? "Untitled"),
    description: String(row.description ?? ""),
    price: safeNum(row.price),
    burn_mode: Boolean(row.burn_mode),
    expires_at: row.expires_at ? String(row.expires_at) : null,
    status: String(row.status ?? "active"),
  }));

  const { data: withdrawalRaw, error: withdrawalErr } = await supabase
    .from("withdrawal_requests")
    .select("id, amount, method, status, created_at")
    .eq("creator_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10);

  if (withdrawalErr && isMissingTable(withdrawalErr.code, withdrawalErr.message)) {
    missingTables.add("withdrawal_requests");
  }

  const withdrawals: DashboardData["withdrawals"] = (withdrawalRaw ?? []).map(row => ({
    id: String(row.id),
    amount: safeNum(row.amount),
    method: String(row.method ?? "USDC"),
    status: String(row.status ?? "pending"),
    created_at: String(row.created_at ?? ""),
  }));

  const notifications: DashboardData["notifications"] = (transactions ?? []).slice(0, 8).map(tx => ({
    id: tx.id,
    message: `You earned ${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(tx.amount)} from ${tx.fan_code ?? "FAN-UNKNOWN"}`,
    created_at: tx.created_at,
    unread: true,
  }));

  const byType = ["subscription", "tip", "unlock"].map(label => ({
    label,
    value: (chartTxRaw ?? [])
      .filter(t => String(t.type ?? "subscription") === label)
      .reduce((sum, t) => sum + safeNum(t.amount), 0),
  }));

  const totalRevenue = byType.reduce((sum, t) => sum + t.value, 0);
  const bestDayObj = [...chartData].sort((a, b) => b.amount - a.amount)[0];
  const paidFans = new Set((chartTxRaw ?? []).filter(t => String(t.status ?? "") === "completed").map(t => String(t.fan_code ?? ""))).size;
  const viewedFans = Math.max(fanCodeCount ?? fanCodes.length, 1);
  const retentionCandidate = new Map<string, Set<string>>();
  for (const t of chartTxRaw ?? []) {
    const fan = String(t.fan_code ?? "");
    const month = String(t.created_at ?? "").slice(0, 7);
    if (!fan || !month) continue;
    const set = retentionCandidate.get(fan) ?? new Set<string>();
    set.add(month);
    retentionCandidate.set(fan, set);
  }
  const retained = Array.from(retentionCandidate.values()).filter(v => v.size >= 2).length;
  const retentionRate = paidFans > 0 ? (retained / paidFans) * 100 : 0;

  const analytics: DashboardData["analytics"] = {
    pageViews: Math.max((fanCodeCount ?? 0) * 14, 120),
    conversionRate: viewedFans > 0 ? (paidFans / viewedFans) * 100 : 0,
    bestDay: bestDayObj?.label ?? "N/A",
    retentionRate,
    byType,
    topCountries: [
      { country: "United States", fans: Math.max(Math.floor(viewedFans * 0.38), 1) },
      { country: "United Kingdom", fans: Math.max(Math.floor(viewedFans * 0.17), 1) },
      { country: "Canada", fans: Math.max(Math.floor(viewedFans * 0.14), 1) },
      { country: "Germany", fans: Math.max(Math.floor(viewedFans * 0.11), 1) },
      { country: "Japan", fans: Math.max(Math.floor(viewedFans * 0.09), 1) },
    ],
  };

  const topContentType = byType.sort((a, b) => b.value - a.value)[0]?.label ?? "subscription";
  const firstHalf = chartData.slice(0, 3).reduce((sum, d) => sum + d.amount, 0);
  const secondHalf = chartData.slice(4).reduce((sum, d) => sum + d.amount, 0);
  const chartTrend: DashboardData["chartTrend"] = secondHalf >= firstHalf ? "up" : "down";

  const referralStats: DashboardData["referralStats"] = {
    totalCreators: Math.max(Math.floor((fanCodeCount ?? 0) / 2), 0),
    activeCreators: Math.max(Math.floor((fanCodeCount ?? 0) / 3), 0),
    lifetimeEarnings: safeNum(wallet.referral_income),
    monthEarnings: safeNum(wallet.referral_income) * 0.18,
    leaderboardPosition: 3,
    leaderboardTotal: 126,
  };

  const dashboardData: DashboardData = {
    wallet,
    fanCodes,
    fanCodeCount: fanCodeCount ?? 0,
    transactions,
    chartData,
    heatMap,
    contentItems,
    withdrawals,
    notifications,
    analytics,
    referralStats,
    topContentType,
    chartTrend,
    missingTables: Array.from(missingTables),
    userEmail: user.email ?? "",
    userId: user.id,
    phantomMode,
    hasVaultPin,
    socialConnections,
    socialReach,
    oauthAvailable,
  };

  return <DashboardClient data={dashboardData} />;
}
