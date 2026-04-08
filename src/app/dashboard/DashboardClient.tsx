"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import JSZip from "jszip";
import { createClient } from "@/lib/supabase/client";
import { getBaseUrl } from "@/lib/utils/getBaseUrl";
import {
  BioGeneratorModal,
  CaptionGeneratorModal,
  PriceOptimizerModal,
  ContentCalendarModal,
  FanMessageBlastModal,
  CollabFinderModal,
  TaxSummaryModal,
} from "./tools/ToolModals";
import {
  CipherScore,
  PhantomModeToggle,
  DarkVault,
  CipherRadioCompact,
  LegacyMode,
  FanPredictionEngine,
  FanCodeGenerator,
  DailyBriefWidget,
  ContentIdeasWidget,
  FanPersonasWidget,
  DynamicPricingWidget,
  VoiceCloneWidget,
  type CipherScoreData,
} from "./features/InsaneFeatures";

export type WalletData = {
  balance: number;
  total_earnings: number;
  referral_income: number;
};

export type FanCodeRow = {
  id: string;
  code: string;
  status: string;
  created_at: string;
  custom_name: string | null;
  creator_notes: string | null;
  tags: string[];
  is_vip: boolean;
};

export type TransactionRow = {
  id: string;
  fan_code: string | null;
  amount: number;
  type: string | null;
  status: string;
  created_at: string;
};

export type ChartDay = {
  label: string;
  amount: number;
};

export type HeatRow = {
  fan_code: string;
  total: number;
  last_active: string;
  subscription_status: string;
};

export type ContentItem = {
  id: string;
  title: string;
  description: string;
  price: number;
  burn_mode: boolean;
  expires_at: string | null;
  status: string;
  created_at: string;
};

export type CreatorProfileSummary = {
  displayName: string;
  handle: string;
  bio: string;
  category: string;
  createdAt: string;
  referralHandle: string | null;
};

export type WithdrawalRow = {
  id: string;
  amount: number;
  method: string;
  status: string;
  created_at: string;
};

export type NotificationItem = {
  id: string;
  message: string;
  created_at: string;
  unread: boolean;
};

export type SocialPlatform = "twitter" | "tiktok" | "instagram" | "youtube" | "telegram";

export type SocialConnection = {
  platform: SocialPlatform;
  platform_username: string | null;
  platform_user_id: string | null;
  follower_count: number;
  connected_at: string;
  metrics?: {
    followers?: number;
    engagementRate?: number;
    likes?: number;
    views?: number;
    posts?: number;
    following?: number;
  };
  last_synced_at?: string | null;
  profile_url?: string | null;
};

export type SocialReach = {
  totalFollowers: number;
  byPlatform: Array<{ platform: SocialPlatform; followers: number }>;
};

export type AnalyticsData = {
  pageViews: number;
  conversionRate: number;
  bestDay: string;
  retentionRate: number;
  byType: Array<{ label: string; value: number }>;
  topCountries: Array<{ country: string; fans: number }>;
};

export type DashboardData = {
  wallet: WalletData;
  fanCodes: FanCodeRow[];
  fanCodeCount: number;
  transactions: TransactionRow[];
  chartData: ChartDay[];
  heatMap: HeatRow[];
  contentItems: ContentItem[];
  withdrawals: WithdrawalRow[];
  notifications: NotificationItem[];
  analytics: AnalyticsData;
  referralStats: {
    totalCreators: number;
    activeCreators: number;
    lifetimeEarnings: number;
    monthEarnings: number;
    leaderboardPosition: number;
    leaderboardTotal: number;
  };
  topContentType: string;
  chartTrend: "up" | "down";
  missingTables: string[];
  userEmail: string;
  userId: string;
  phantomMode: boolean;
  hasVaultPin: boolean;
  creatorProfile: CreatorProfileSummary;
  socialConnections: SocialConnection[];
  socialReach: SocialReach;
  oauthAvailable: {
    twitter: boolean;
    tiktok: boolean;
    instagram: boolean;
    youtube: boolean;
    telegram: boolean;
  };
};

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});
const mono: React.CSSProperties = { fontFamily: "var(--font-mono)" };
const disp: React.CSSProperties = { fontFamily: "var(--font-display)" };

const PLATFORM_META: Record<SocialPlatform, { label: string; color: string }> = {
  twitter: { label: "Twitter/X", color: "#1DA1F2" },
  tiktok: { label: "TikTok", color: "#ff0050" },
  instagram: { label: "Instagram", color: "#E1306C" },
  youtube: { label: "YouTube", color: "#FF0000" },
  telegram: { label: "Telegram", color: "#2AABEE" },
};

const SOCIAL_PLATFORMS: SocialPlatform[] = ["twitter", "tiktok", "instagram", "youtube", "telegram"];

function SocialIcon({ platform }: { platform: SocialPlatform }) {
  const iconStyle: React.CSSProperties = { width: "18px", height: "18px", display: "block" };
  if (platform === "twitter") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" style={iconStyle}>
        <path fill="#1DA1F2" d="M18.9 2H22l-6.8 7.8L23 22h-6.3l-4.9-6.4L6.2 22H3.1l7.2-8.2L1 2h6.5l4.4 5.8L18.9 2z" />
      </svg>
    );
  }
  if (platform === "tiktok") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" style={iconStyle}>
        <path fill="#ffffff" d="M14.5 3c.4 1.6 1.8 3.1 3.5 3.5v3c-1.3-.1-2.6-.5-3.5-1.2v6.1a5.2 5.2 0 1 1-4.5-5.1v3a2.2 2.2 0 1 0 1.5 2.1V3h3z" />
        <path fill="#ff0050" d="M14.5 3c.4 1.6 1.8 3.1 3.5 3.5v1.5c-1.3-.1-2.6-.5-3.5-1.2V3z" opacity="0.9" />
      </svg>
    );
  }
  if (platform === "instagram") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" style={iconStyle}>
        <rect x="4" y="4" width="16" height="16" rx="5" fill="none" stroke="#E1306C" strokeWidth="2" />
        <circle cx="12" cy="12" r="3.5" fill="none" stroke="#E1306C" strokeWidth="2" />
        <circle cx="17.2" cy="6.8" r="1.2" fill="#E1306C" />
      </svg>
    );
  }
  if (platform === "youtube") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" style={iconStyle}>
        <rect x="2" y="5" width="20" height="14" rx="4" fill="#FF0000" />
        <path d="M10 9l6 3-6 3V9z" fill="#fff" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" style={iconStyle}>
      <circle cx="12" cy="12" r="10" fill="#2AABEE" />
      <path d="M17.5 7.8 6.8 11.9c-.7.3-.7.7-.1.9l2.8.9 1.1 3.5c.1.4.1.6.6.6.4 0 .5-.2.8-.5l1.5-1.5 3 .2c.6 0 .9-.2 1-.8l1.8-8.5c.2-.7-.3-1-1-.7z" fill="#fff" />
    </svg>
  );
}

function formatDate(val: string) {
  if (!val) return "-";
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return val;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function daysLeft(expiresAt: string | null) {
  if (!expiresAt) return null;
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (!Number.isFinite(ms)) return null;
  return Math.max(Math.ceil(ms / (1000 * 60 * 60 * 24)), 0);
}

function formatDateTime(val: string) {
  if (!val) return "-";
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return val;
  return d.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function normalizeTagsInput(input: string): string[] {
  return Array.from(new Set(input.split(",").map(tag => tag.trim()).filter(Boolean))).slice(0, 12);
}

function tagColor(tag: string) {
  const tones = ["#c8a96e", "#8dcfff", "#ff8fb1", "#6dd6a6", "#d9b3ff"];
  const hash = Array.from(tag).reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return tones[hash % tones.length];
}

function escapeCsv(value: unknown) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function toCsv<T extends Record<string, unknown>>(rows: T[]) {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  return [
    headers.join(","),
    ...rows.map(row => headers.map(header => escapeCsv(row[header])).join(",")),
  ].join("\n");
}

function downloadBlob(filename: string, blob: Blob) {
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(href);
}

function estimateFileSizeLabel(content: string) {
  const sizeKb = new Blob([content]).size / 1024;
  return `~${Math.max(sizeKb, 1).toFixed(sizeKb >= 10 ? 0 : 1)}KB CSV`;
}

type FanInsightRow = FanCodeRow & {
  totalSpent: number;
  transactionCount: number;
  firstSeen: string;
  lastActive: string;
  statusLabel: "active" | "inactive";
  // Estimated content preview: placeholder derived from contentTitles + transaction count;
  // does NOT reflect actual purchased items as no content-to-fan linkage exists yet.
  estimatedContentPreview: string[];
  transactions: TransactionRow[];
};

function DashboardModal({ title, subtitle, onClose, children }: { title: string; subtitle?: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={event => {
        if (event.target === event.currentTarget) onClose();
      }}
      style={{ position: "fixed", inset: 0, zIndex: 9100, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}
    >
      <div style={{ width: "100%", maxWidth: "900px", maxHeight: "84vh", overflowY: "auto", background: "#0d0d18", border: "1px solid rgba(200,169,110,0.3)", borderRadius: "16px", padding: "26px", position: "relative", boxShadow: "0 28px 80px rgba(0,0,0,0.5)" }}>
        <button type="button" aria-label="Close" onClick={onClose} style={{ position: "absolute", top: "14px", right: "14px", border: "none", background: "transparent", color: "var(--dim)", fontSize: "22px", cursor: "pointer" }}>×</button>
        <div style={{ ...mono, fontSize: "10px", letterSpacing: "0.18em", color: "var(--gold-dim)", marginBottom: "6px" }}>PRIVATE CREATOR CRM</div>
        <div style={{ ...disp, fontSize: "32px", color: "var(--gold)", marginBottom: subtitle ? "6px" : "18px" }}>{title}</div>
        {subtitle && <div style={{ fontSize: "13px", color: "var(--dim)", marginBottom: "18px" }}>{subtitle}</div>}
        {children}
      </div>
    </div>
  );
}

function Cursor() {
  useEffect(() => {
    const dot = document.getElementById("db-cursor");
    const ring = document.getElementById("db-ring");
    if (!dot || !ring) return;
    let mx = -200;
    let my = -200;
    let rx = -200;
    let ry = -200;
    let raf = 0;

    const move = (e: MouseEvent) => {
      mx = e.clientX;
      my = e.clientY;
    };

    const tick = () => {
      rx += (mx - rx) * 0.12;
      ry += (my - ry) * 0.12;
      dot.style.left = `${mx}px`;
      dot.style.top = `${my}px`;
      ring.style.left = `${rx}px`;
      ring.style.top = `${ry}px`;
      raf = requestAnimationFrame(tick);
    };

    document.addEventListener("mousemove", move);
    raf = requestAnimationFrame(tick);
    return () => {
      document.removeEventListener("mousemove", move);
      cancelAnimationFrame(raf);
    };
  }, []);

  return null;
}

const SECTIONS = [
  { key: "dashboard", label: "Dashboard" },
  { key: "content", label: "Content" },
  { key: "fans", label: "Fans" },
  { key: "earnings", label: "Earnings" },
  { key: "paylinks", label: "Pay Links" },
  { key: "referrals", label: "Referrals" },
  { key: "analytics", label: "Analytics" },
  { key: "tools", label: "Tools" },
  { key: "vault", label: "Vault" },
  { key: "legacy", label: "Legacy" },
  { key: "settings", label: "Settings" },
] as const;

type SectionKey = (typeof SECTIONS)[number]["key"];

const SLICE_COLORS: Record<string, string> = {
  subscription: "#c8a96e",
  tip: "#987a4c",
};
const SLICE_DEFAULT_COLOR = "#5f5137";

function DonutChart({ data }: { data: Array<{ label: string; value: number }> }) {
  const size = 140;
  const r = 52;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const total = data.reduce((s, v) => s + v.value, 0) || 1;

  if (data.every(d => d.value === 0)) {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={22} />
      </svg>
    );
  }

  const slices = data.map((slice, index) => {
    const dashLen = (slice.value / total) * circumference;
    const cumulativeStart = data
      .slice(0, index)
      .reduce((sum, previousSlice) => sum + (previousSlice.value / total) * circumference, 0);
    const offset = circumference - cumulativeStart;
    return { ...slice, dashLen, offset };
  });

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ transform: "rotate(-90deg)" }}
      aria-hidden="true"
    >
      {slices.map(slice => (
        <circle
          key={slice.label}
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={SLICE_COLORS[slice.label] ?? SLICE_DEFAULT_COLOR}
          strokeWidth={22}
          strokeDasharray={`${slice.dashLen} ${circumference - slice.dashLen}`}
          strokeDashoffset={slice.offset}
        />
      ))}
    </svg>
  );
}

export default function DashboardClient({
  data,
  v2Data,
}: {
  data: DashboardData;
  v2Data?: {
    overview: import("@/lib/dashboard-v2").V2DashboardOverview | null;
    content: import("@/lib/dashboard-v2").V2ContentStats | null;
    fans: import("@/lib/dashboard-v2").V2FanStats | null;
    earnings: import("@/lib/dashboard-v2").V2EarningsBreakdown | null;
    toolGating: import("@/lib/dashboard-v2").ToolGating | null;
    contentPlans: import("@/lib/dashboard-v2").V2ContentPlan[];
  };
}) {
  const {
    wallet,
    fanCodes,
    fanCodeCount,
    transactions,
    chartData,
    contentItems,
    withdrawals,
    notifications,
    analytics,
    referralStats,
    topContentType,
    chartTrend,
    missingTables,
    userEmail,
    userId,
    phantomMode,
    hasVaultPin,
    creatorProfile,
    socialConnections,
    socialReach,
    oauthAvailable,
  } = data;

  const [activeSection, setActiveSection] = useState<SectionKey>("dashboard");
  const [copied, setCopied] = useState(false);
  const [copyErr, setCopyErr] = useState("");
  const [notifOpen, setNotifOpen] = useState(false);
  const [liveNotifications, setLiveNotifications] = useState<NotificationItem[]>(notifications);
  const [unreadCount, setUnreadCount] = useState(notifications.filter(n => n.unread).length);

  const [aiPrompt, setAiPrompt] = useState("");
  const [aiDraft, setAiDraft] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiErr, setAiErr] = useState("");

  const [burnMode, setBurnMode] = useState(false);
  const [contentTitle, setContentTitle] = useState("");
  const [contentDesc, setContentDesc] = useState("");
  const [contentPrice, setContentPrice] = useState("0");
  const [contentWhopCheckoutUrl, setContentWhopCheckoutUrl] = useState("");
  const [contentExpiry, setContentExpiry] = useState("24h");
  const [contentSaving, setContentSaving] = useState(false);
  const [contentMsg, setContentMsg] = useState("");

  const [withdrawMethod, setWithdrawMethod] = useState("USDC");
  const [withdrawAmount, setWithdrawAmount] = useState("20");
  const [withdrawSaving, setWithdrawSaving] = useState(false);
  const [withdrawMsg, setWithdrawMsg] = useState("");

  const [settingsName, setSettingsName] = useState(creatorProfile.displayName || "");
  const [settingsHandle, setSettingsHandle] = useState(creatorProfile.handle || "");
  const [settingsBio, setSettingsBio] = useState(creatorProfile.bio || "");
  const [settingsCategory, setSettingsCategory] = useState(creatorProfile.category || "luxury");
  const [settings2fa, setSettings2fa] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState("");
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [fansState, setFansState] = useState<FanCodeRow[]>(fanCodes);
  const [fanSearch, setFanSearch] = useState("");
  const [fanFilter, setFanFilter] = useState<"all" | "vip" | "active" | "inactive">("all");
  const [fanSort, setFanSort] = useState<"spent" | "recent" | "name">("spent");
  const [fanDrafts, setFanDrafts] = useState<Record<string, { customName: string; creatorNotes: string; tags: string; isVip: boolean }>>({});
  const [fanSavingId, setFanSavingId] = useState<string | null>(null);
  const [fanSaveMsg, setFanSaveMsg] = useState("");
  const [selectedFanCode, setSelectedFanCode] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportBusy, setExportBusy] = useState(false);
  const [exportMsg, setExportMsg] = useState("");

  const [animatedRefStats, setAnimatedRefStats] = useState({
    totalCreators: 0,
    activeCreators: 0,
    lifetimeEarnings: 0,
    monthEarnings: 0,
  });

  // Tool modals
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [connections, setConnections] = useState<SocialConnection[]>(socialConnections);
  const [socialMsg, setSocialMsg] = useState("");
  const [socialLoading, setSocialLoading] = useState<SocialPlatform | null>(null);
  const [socialRefreshing, setSocialRefreshing] = useState(false);
  const [autoShareEnabled, setAutoShareEnabled] = useState(false);
  const [shareText, setShareText] = useState("New exclusive content just dropped 🔒 cipher.co/@creator");

  // Referral handle customization
  const [customHandle, setCustomHandle] = useState(creatorProfile.referralHandle || "");
  const [handleUnlocked, setHandleUnlocked] = useState(false);
  const [handleUnlockProgress, setHandleUnlockProgress] = useState(0);
  const [handleRequired, setHandleRequired] = useState(1000);
  const [handleSaving, setHandleSaving] = useState(false);
  const [handleMsg, setHandleMsg] = useState("");
  const [showHandleEdit, setShowHandleEdit] = useState(false);

  const handle = customHandle || creatorProfile.referralHandle || userEmail.split("@")[0] || userId.slice(0, 8);
  const referralLink = `cipher.so/ref/${handle}`;
  const maxChart = Math.max(...chartData.map(d => d.amount), 1);
  const forecast = useMemo(() => {
    const totalWeek = chartData.reduce((sum, d) => sum + d.amount, 0);
    const daily = totalWeek / 7;
    return daily * 30;
  }, [chartData]);

  const contentTitles = useMemo(() => contentItems.map(item => item.title).slice(0, 8), [contentItems]);

  const fanInsights = useMemo<FanInsightRow[]>(() => {
    return fansState.map(fan => {
      const relatedTransactions = transactions
        .filter(tx => tx.fan_code === fan.code)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      const totalSpent = relatedTransactions.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
      const firstSeen = relatedTransactions.at(-1)?.created_at ?? fan.created_at;
      const lastActive = relatedTransactions[0]?.created_at ?? fan.created_at;
      const daysSinceActive = (Date.now() - new Date(lastActive).getTime()) / (1000 * 60 * 60 * 24);
      return {
        ...fan,
        totalSpent,
        transactionCount: relatedTransactions.length,
        firstSeen,
        lastActive,
        statusLabel: daysSinceActive <= 30 ? "active" : "inactive",
        // Estimate only: slices contentTitles by transaction count as a placeholder;
        // actual purchased items are unavailable without a content_id FK on transactions.
        estimatedContentPreview: contentTitles.slice(0, Math.max(1, Math.min(3, relatedTransactions.length || 1))),
        transactions: relatedTransactions,
      };
    });
  }, [contentTitles, fansState, transactions]);

  const filteredFans = useMemo(() => {
    const term = fanSearch.trim().toLowerCase();
    const filtered = fanInsights.filter(fan => {
      const matchesSearch = !term || [fan.code, fan.custom_name ?? "", fan.creator_notes ?? "", fan.tags.join(" ")].join(" ").toLowerCase().includes(term);
      const matchesFilter = fanFilter === "all"
        || (fanFilter === "vip" && fan.is_vip)
        || (fanFilter === "active" && fan.statusLabel === "active")
        || (fanFilter === "inactive" && fan.statusLabel === "inactive");
      return matchesSearch && matchesFilter;
    });

    return filtered.sort((left, right) => {
      if (fanSort === "name") {
        return (left.custom_name || left.code).localeCompare(right.custom_name || right.code);
      }
      if (fanSort === "recent") {
        return new Date(right.lastActive).getTime() - new Date(left.lastActive).getTime();
      }
      return right.totalSpent - left.totalSpent;
    });
  }, [fanFilter, fanInsights, fanSearch, fanSort]);

  const selectedFan = useMemo(
    () => fanInsights.find(fan => fan.code === selectedFanCode) ?? null,
    [fanInsights, selectedFanCode],
  );

  const vipCount = fanInsights.filter(fan => fan.is_vip).length;
  const activeFanCount = fanInsights.filter(fan => fan.statusLabel === "active").length;
  const crmCoverage = fanInsights.filter(fan => fan.custom_name || fan.creator_notes || fan.tags.length > 0 || fan.is_vip).length;

  const cipherScoreData: CipherScoreData = {
    totalEarnings: wallet.total_earnings,
    fanCount: fanCodeCount,
    contentCount: contentItems.length,
    withdrawalCount: withdrawals.length,
    retentionRate: analytics.retentionRate,
  };

  const socialReachLive = useMemo(() => {
    const byPlatform = SOCIAL_PLATFORMS.map(platform => {
      const connection = connections.find(c => c.platform === platform);
      return { platform, followers: Number(connection?.follower_count ?? 0) };
    });
    const totalFollowers = byPlatform.reduce((sum, item) => sum + item.followers, 0);
    return { totalFollowers, byPlatform };
  }, [connections]);

  const effectiveReach = socialReachLive.totalFollowers > 0 ? socialReachLive : socialReach;

  const socialAnalyticsSummary = useMemo(() => {
    const totals = connections.reduce(
      (acc, connection) => {
        acc.connectedAccounts += 1;
        acc.followers += Number(connection.metrics?.followers ?? connection.follower_count ?? 0);
        acc.likes += Number(connection.metrics?.likes ?? 0);
        acc.views += Number(connection.metrics?.views ?? 0);
        acc.posts += Number(connection.metrics?.posts ?? 0);
        return acc;
      },
      { connectedAccounts: 0, followers: 0, likes: 0, views: 0, posts: 0 }
    );

    return totals;
  }, [connections]);

  const potentialFans = Math.floor(effectiveReach.totalFollowers * 0.01);
  const estimatedMonthly = potentialFans * 15;
  const isActivationMode = wallet.total_earnings === 0 && transactions.length === 0;
  const activeDrop = contentItems.find(item => item.status === "active") ?? contentItems[0] ?? null;

  useEffect(() => {
    setShareText(`New exclusive content just dropped 🔒 cipher.co/@${handle}`);
  }, [handle]);

  useEffect(() => {
    setFansState(fanCodes);
  }, [fanCodes]);

  useEffect(() => {
    setSettingsName(creatorProfile.displayName || "");
    setSettingsHandle(creatorProfile.handle || "");
    setSettingsBio(creatorProfile.bio || "");
    setSettingsCategory(creatorProfile.category || "luxury");
  }, [creatorProfile]);

  useEffect(() => {
    const duration = 800;
    const start = performance.now();
    const timer = requestAnimationFrame(function step(now) {
      const p = Math.min((now - start) / duration, 1);
      setAnimatedRefStats({
        totalCreators: Math.round(referralStats.totalCreators * p),
        activeCreators: Math.round(referralStats.activeCreators * p),
        lifetimeEarnings: referralStats.lifetimeEarnings * p,
        monthEarnings: referralStats.monthEarnings * p,
      });
      if (p < 1) requestAnimationFrame(step);
    });
    return () => cancelAnimationFrame(timer);
  }, [referralStats]);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/dashboard/notifications", { cache: "no-store" });
        if (!res.ok) return;
        const json = await res.json();
        const nextItems = (json.items ?? []) as NotificationItem[];
        setLiveNotifications(nextItems);
        setUnreadCount(Number(json.unreadCount ?? 0));
      } catch (err) {
        console.error("Notification refresh failed:", err);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const refreshConnections = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("social_connections")
        .select("platform, platform_username, platform_user_id, follower_count, connected_at, metrics, last_synced_at, profile_url")
        .eq("creator_id", userId)
        .order("connected_at", { ascending: false });
      if (error) throw error;
      setConnections((data ?? []) as SocialConnection[]);
    } catch (err) {
      console.error("Refresh social connections failed:", err);
    }
  }, [userId]);

  useEffect(() => {
    const url = new URL(window.location.href);
    const connected = url.searchParams.get("connected");
    const socialError = url.searchParams.get("social_error");
    const socialMsgParam = url.searchParams.get("social_msg");
    if (connected) {
      setSocialMsg(`${connected.toUpperCase()} connected successfully.`);
      refreshConnections();
      url.searchParams.delete("connected");
      url.searchParams.delete("social_error");
      url.searchParams.delete("social_msg");
      window.history.replaceState({}, "", url.toString());
    } else if (socialError) {
      setSocialMsg(socialMsgParam || `Could not connect ${socialError}.`);
      url.searchParams.delete("connected");
      url.searchParams.delete("social_error");
      url.searchParams.delete("social_msg");
      window.history.replaceState({}, "", url.toString());
    }
  }, [refreshConnections]);

  const refreshSocialMetrics = async () => {
    setSocialRefreshing(true);
    setSocialMsg("");
    try {
      const res = await fetch("/api/social/refresh-metrics", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not refresh social metrics.");
      await refreshConnections();
      const failures = (data.results || []).filter((item: { status?: string }) => item.status === "error");
      setSocialMsg(
        failures.length > 0
          ? `Refreshed with ${failures.length} platform issue(s).`
          : "Live social metrics refreshed."
      );
    } catch (err) {
      setSocialMsg(err instanceof Error ? err.message : "Could not refresh social metrics.");
    } finally {
      setSocialRefreshing(false);
    }
  };

  // Check referral handle unlock status
  useEffect(() => {
    const checkUnlockStatus = async () => {
      try {
        const res = await fetch("/api/referral/update-handle");
        if (!res.ok) return;
        const data = await res.json();
        setHandleUnlocked(data.unlocked);
        setHandleUnlockProgress(data.progress);
        setHandleRequired(data.required);
        if (data.currentHandle) {
          setCustomHandle(data.currentHandle);
        }
      } catch (err) {
        console.error("Failed to check handle unlock status:", err);
      }
    };
    checkUnlockStatus();
  }, []);

  const updateReferralHandle = async () => {
    if (!customHandle.trim()) {
      setHandleMsg("Please enter a handle");
      return;
    }
    
    setHandleSaving(true);
    setHandleMsg("");
    
    try {
      const res = await fetch("/api/referral/update-handle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle: customHandle.trim() }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to update handle");
      }
      
      setHandleMsg("Referral link updated!");
      setShowHandleEdit(false);
    } catch (err) {
      setHandleMsg(err instanceof Error ? err.message : "Failed to update handle");
    } finally {
      setHandleSaving(false);
    }
  };

  const connectPlatform = async (platform: SocialPlatform) => {
    if (!oauthAvailable[platform]) {
      setSocialMsg(`${PLATFORM_META[platform].label} is coming soon. Add environment variables first.`);
      return;
    }

    setSocialLoading(platform);
    const connectUrl =
      platform === "telegram"
        ? "/api/auth/telegram/connect"
        : `/api/auth/${platform}/connect`;
    window.location.href = connectUrl;
  };

  const disconnectPlatform = async (platform: SocialPlatform) => {
    setSocialLoading(platform);
    setSocialMsg("");
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("social_connections")
        .delete()
        .eq("creator_id", userId)
        .eq("platform", platform);
      if (error) throw error;
      await refreshConnections();
      setSocialMsg(`${PLATFORM_META[platform].label} disconnected.`);
    } catch (err) {
      console.error("Disconnect failed:", err);
      setSocialMsg(`Could not disconnect ${PLATFORM_META[platform].label}.`);
    } finally {
      setSocialLoading(null);
    }
  };

  const copyLink = () => {
    navigator.clipboard
      .writeText(`https://${referralLink}`)
      .then(() => {
        setCopied(true);
        setCopyErr("");
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(err => {
        console.error("Failed to copy referral link:", err);
        setCopied(false);
        setCopyErr("Could not copy link. Please copy manually.");
      });
  };

  const copyAi = () => {
    navigator.clipboard
      .writeText(aiDraft)
      .then(() => setAiErr(""))
      .catch(err => {
        console.error("Failed to copy AI draft:", err);
        setAiErr("Clipboard blocked by browser.");
      });
  };

  const generatePost = async () => {
    if (!aiPrompt.trim()) {
      setAiErr("Add a topic or mood first.");
      return;
    }

    setAiLoading(true);
    setAiErr("");
    setAiDraft("");

    try {
      const res = await fetch("/api/ai/ghostwrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: aiPrompt.trim() }),
      });

      if (!res.ok || !res.body) {
        const msg = await res.text();
        let parsedMessage = msg;
        try {
          const parsed = JSON.parse(msg) as { error?: string };
          parsedMessage = parsed.error || msg;
        } catch {}
        throw new Error(parsedMessage || "Failed to generate draft");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        setAiDraft(prev => prev + decoder.decode(value, { stream: true }));
      }
    } catch (err) {
      console.error("Ghostwriter failed:", err);
      setAiErr(err instanceof Error ? err.message : "Generation failed. Try again.");
    } finally {
      setAiLoading(false);
    }
  };

  const [generatedUnlockUrl, setGeneratedUnlockUrl] = useState("");
  const [copiedDropLink, setCopiedDropLink] = useState(false);
  const [checkedLaunch, setCheckedLaunch] = useState<Set<number>>(new Set());
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  // ── Pay Links state ────────────────────────────────────────────────────────
  type PayLinkItem = {
    id: string;
    title: string;
    description: string | null;
    price: number;
    content_type: string;
    content_value: string | null;
    file_url: string | null;
    is_active: boolean;
    view_count: number;
    purchase_count: number;
    created_at: string;
      slug?: string | null;
      whop_checkout_url?: string | null;
      whop_product_id?: string | null;
      is_live?: boolean;
  };
  const [payLinks, setPayLinks] = useState<PayLinkItem[]>([]);
  const [payLinksLoading, setPayLinksLoading] = useState(false);
  const [payLinksLoaded, setPayLinksLoaded] = useState(false);
  const [plTitle, setPlTitle] = useState("");
  const [plDescription, setPlDescription] = useState("");
  const [plPrice, setPlPrice] = useState("10");
  const [plContentType, setPlContentType] = useState<"text" | "file">("text");
  const [plContentValue, setPlContentValue] = useState("");
  const [plFile, setPlFile] = useState<File | null>(null);
  const [plSaving, setPlSaving] = useState(false);
  const [plMsg, setPlMsg] = useState("");
  const [plCreatedId, setPlCreatedId] = useState<string | null>(null);
  const [plCopiedId, setPlCopiedId] = useState<string | null>(null);

  const saveContentItem = async () => {
    setContentMsg("");
    setGeneratedUnlockUrl("");
    if (!contentTitle.trim()) {
      setContentMsg("Title is required.");
      return;
    }

    if (!contentWhopCheckoutUrl.trim()) {
      setContentMsg("Whop checkout URL is required.");
      return;
    }

    setContentSaving(true);
    try {
      const priceVal = Math.round(Number(contentPrice) * 100); // Convert to cents
      if (!Number.isFinite(priceVal) || priceVal < 50) {
        setContentMsg("Price must be at least $0.50 (50 cents).");
        setContentSaving(false);
        return;
      }

      // Use V2 API for content creation
      const res = await fetch("/api/v2/content/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: contentTitle.trim(),
          description: contentDesc.trim(),
          price: priceVal,
          currency: "usd",
          whop_checkout_url: contentWhopCheckoutUrl.trim(),
          file_url: "https://placeholder.com/content", // Replace with actual file upload
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errData.error || "Failed to create content");
      }

      const { data } = await res.json();
      const unlockUrl = data.unlockUrl;
      setGeneratedUnlockUrl(unlockUrl);

      if (autoShareEnabled) {
        try {
          const shareRes = await fetch("/api/social/auto-share", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contentTitle: contentTitle.trim(),
              shareText: shareText.trim(),
            }),
          });
          if (!shareRes.ok) {
            console.error("Auto-share failed with status", shareRes.status);
            setContentMsg(`Content LIVE! Unlock link generated. Auto-share failed.`);
            return;
          }
        } catch (shareErr) {
          console.error("Auto-share network error:", shareErr);
          setContentMsg(`Content LIVE! Unlock link generated. Auto-share failed.`);
          return;
        }
      }

      setContentMsg("✓ Content LIVE! Your unlock link is ready.");
      setContentTitle("");
      setContentDesc("");
      setContentPrice("0");
      setContentWhopCheckoutUrl("");
    } catch (err) {
      console.error("Save content failed:", err);
      setContentMsg(err instanceof Error ? err.message : "Could not save content item.");
    } finally {
      setContentSaving(false);
    }
  };

  const requestWithdrawal = async () => {
    setWithdrawMsg("");
    const amt = Number(withdrawAmount || 0);
    if (!Number.isFinite(amt)) {
      setWithdrawMsg("Invalid amount.");
      return;
    }
    if (amt < 20) {
      setWithdrawMsg("Minimum withdrawal is $20.");
      return;
    }
    if (amt > wallet.balance) {
      setWithdrawMsg("Amount exceeds available balance.");
      return;
    }

    setWithdrawSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("withdrawal_requests").insert({
        creator_id: userId,
        amount: amt,
        method: withdrawMethod,
        status: "pending",
      });
      if (error) throw error;
      setWithdrawMsg("Withdrawal request submitted.");
    } catch (err) {
      console.error("Withdrawal request failed:", err);
      setWithdrawMsg("Could not submit withdrawal request.");
    } finally {
      setWithdrawSaving(false);
    }
  };

  const saveSettings = async () => {
    setSettingsMsg("");
    setSettingsSaving(true);
    try {
      const supabase = createClient();
      const payload = {
        user_id: userId,
        display_name: settingsName,
        handle: settingsHandle,
        bio: settingsBio,
        category: settingsCategory,
        notify_email: true,
        two_factor_enabled: settings2fa,
      };

      const { error } = await supabase
        .from("creator_applications")
        .upsert(payload, { onConflict: "user_id" });
      if (error) throw error;
      setSettingsMsg("Settings saved.");
    } catch (err) {
      console.error("Save settings failed:", err);
      setSettingsMsg("Could not save settings.");
    } finally {
      setSettingsSaving(false);
    }
  };

  const getFanDraft = (fan: FanCodeRow) => {
    return fanDrafts[fan.id] ?? {
      customName: fan.custom_name ?? "",
      creatorNotes: fan.creator_notes ?? "",
      tags: fan.tags.join(", "),
      isVip: fan.is_vip,
    };
  };

  const patchFanDraft = (fanId: string, next: Partial<{ customName: string; creatorNotes: string; tags: string; isVip: boolean }>, source?: FanCodeRow) => {
    setFanDrafts(prev => {
      const base = source
        ? getFanDraft(source)
        : prev[fanId] ?? { customName: "", creatorNotes: "", tags: "", isVip: false };
      return {
        ...prev,
        [fanId]: { ...base, ...next },
      };
    });
  };

  const saveFanRecord = async (fan: FanCodeRow) => {
    const draft = getFanDraft(fan);
    setFanSavingId(fan.id);
    setFanSaveMsg("");
    try {
      const res = await fetch(`/api/fans/${encodeURIComponent(fan.code)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customName: draft.customName,
          creatorNotes: draft.creatorNotes,
          tags: normalizeTagsInput(draft.tags),
          isVip: draft.isVip,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof json.error === "string" ? json.error : "Could not save fan profile.");
      }

      setFansState(prev => prev.map(item => (
        item.id === fan.id
          ? {
              ...item,
              custom_name: json.fan?.custom_name ?? draft.customName,
              creator_notes: json.fan?.creator_notes ?? draft.creatorNotes,
              tags: Array.isArray(json.fan?.tags) ? json.fan.tags : normalizeTagsInput(draft.tags),
              is_vip: Boolean(json.fan?.is_vip ?? draft.isVip),
            }
          : item
      )));
      setFanDrafts(prev => {
        const next = { ...prev };
        delete next[fan.id];
        return next;
      });
      setFanSaveMsg(`Saved ${draft.customName || fan.code}.`);
    } catch (err) {
      console.error("Save fan record failed:", err);
      setFanSaveMsg(err instanceof Error ? err.message : "Could not save fan profile.");
    } finally {
      setFanSavingId(null);
    }
  };

  const exportDataBundle = async () => {
    setExportBusy(true);
    setExportMsg("");
    try {
      const fanRows = fanInsights.map(fan => ({
        code: fan.code,
        custom_name: fan.custom_name ?? "",
        vip: fan.is_vip ? "yes" : "no",
        tags: fan.tags.join(" | "),
        notes: fan.creator_notes ?? "",
        total_spent_usd: fan.totalSpent,
        transaction_count: fan.transactionCount,
        first_seen: formatDateTime(fan.firstSeen),
        last_active: formatDateTime(fan.lastActive),
        crm_status: fan.statusLabel,
      }));
      const earningsRows = transactions.map(tx => ({
        transaction_id: tx.id,
        fan_code: tx.fan_code ?? "anonymous",
        amount_usd: tx.amount,
        type: tx.type ?? "subscription",
        status: tx.status,
        created_at: formatDateTime(tx.created_at),
      }));
      const contentRows = contentItems.map(item => {
        return {
          title: item.title,
          status: item.status,
          created_at: formatDateTime(item.created_at),
          price_usd: item.price,
          burn_mode: item.burn_mode ? "yes" : "no",
          expiry: item.expires_at ? formatDateTime(item.expires_at) : "persistent",
          // estimated_sales and estimated_revenue_usd are omitted: TransactionRow has no
          // content_id FK so any time-based aggregation would double-count transactions.
          estimated_sales: null,
          estimated_revenue_usd: null,
        };
      });
      const summary = {
        exportedAt: new Date().toISOString(),
        creator: {
          displayName: settingsName || creatorProfile.displayName || "",
          handle: settingsHandle || creatorProfile.handle || "",
          email: userEmail,
          category: settingsCategory || creatorProfile.category || "",
        },
        totals: {
          fans: fanInsights.length,
          vipFans: vipCount,
          activeFans: activeFanCount,
          transactions: transactions.length,
          contentItems: contentItems.length,
          totalRevenue: wallet.total_earnings,
        },
        privacy: {
          note: "Exports are generated locally in your browser. No extra fan data is sent to third-party services.",
          anonymousSafe: true,
        },
      };

      const fanCsv = toCsv(fanRows);
      const earningsCsv = toCsv(earningsRows);
      const contentCsv = toCsv(contentRows);
      const summaryJson = JSON.stringify(summary, null, 2);

      const zip = new JSZip();
      zip.file("fans.csv", fanCsv);
      zip.file("earnings.csv", earningsCsv);
      zip.file("content-performance.csv", contentCsv);
      zip.file("summary.json", summaryJson);

      const blob = await zip.generateAsync({ type: "blob" });
      const stamp = new Date().toISOString().slice(0, 10);
      downloadBlob(`cipher-export-${stamp}.zip`, blob);
      setExportMsg("Export bundle downloaded.");
    } catch (err) {
      console.error("Export failed:", err);
      setExportMsg("Could not generate export bundle.");
    } finally {
      setExportBusy(false);
    }
  };

  const exportFanCsv = () => {
    const csv = toCsv(filteredFans.map(fan => ({
      code: fan.code,
      custom_name: fan.custom_name ?? "",
      vip: fan.is_vip ? "yes" : "no",
      total_spent_usd: fan.totalSpent,
      last_active: formatDateTime(fan.lastActive),
      tags: fan.tags.join(" | "),
    })));
    downloadBlob("cipher-fans.csv", new Blob([csv], { type: "text/csv;charset=utf-8" }));
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  // ── Pay Links helpers ──────────────────────────────────────────────────────
  const loadPayLinks = async () => {
    if (payLinksLoading) return;
    setPayLinksLoading(true);
    try {
      const res = await fetch("/api/payment-links");
      if (!res.ok) throw new Error("Could not load payment links.");
      const json = await res.json();
      setPayLinks(json.items ?? []);
      setPayLinksLoaded(true);
    } catch (err) {
      console.error(err);
    } finally {
      setPayLinksLoading(false);
    }
  };

  const savePayLink = async () => {
    setPlMsg("");
    setPlCreatedId(null);
    if (!plTitle.trim()) { setPlMsg("Title is required."); return; }
    const priceNum = Math.round(Number(plPrice) * 100);
    if (!Number.isFinite(priceNum) || priceNum < 50) { setPlMsg("Minimum price is $0.50."); return; }
    if (plContentType === "text" && !plContentValue.trim()) { setPlMsg("Text content is required."); return; }
    if (plContentType === "file" && !plFile) { setPlMsg("Please select a file."); return; }

    setPlSaving(true);
    try {
      let fileUrl: string | undefined;
      if (plContentType === "file" && plFile) {
        const formData = new FormData();
        formData.append("file", plFile);
        formData.append("folder", "payment-links");
        const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
        const uploadJson = await uploadRes.json();
        if (!uploadRes.ok || !uploadJson.url) {
          throw new Error(uploadJson.error || "File upload failed.");
        }
        fileUrl = uploadJson.url as string;
      }

      const res = await fetch("/api/payment-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: plTitle.trim(),
          description: plDescription.trim() || undefined,
          price: priceNum,
          content_type: plContentType,
          content_value: plContentType === "text" ? plContentValue.trim() : undefined,
          file_url: plContentType === "file" ? fileUrl : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create payment link.");
      const baseUrl = getBaseUrl();
      const generatedLink = `${baseUrl}/pay/${json.id}`;
      setPlCreatedId(json.id);
      setPlMsg("✓ Payment link created.");
      navigator.clipboard.writeText(generatedLink).catch(() => {});
      setPlTitle(""); setPlDescription(""); setPlPrice("10"); setPlContentValue(""); setPlFile(null); setPlContentType("text");
      await loadPayLinks();
    } catch (err) {
      setPlMsg(err instanceof Error ? err.message : "Failed to create payment link.");
    } finally {
      setPlSaving(false);
    }
  };

  const togglePayLink = async (id: string, active: boolean) => {
    await fetch(`/api/payment-links/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: active }),
    });
    setPayLinks(prev => prev.map(p => p.id === id ? { ...p, is_active: active } : p));
  };

  const deletePayLink = async (id: string) => {
    await fetch(`/api/payment-links/${id}`, { method: "DELETE" });
    setPayLinks(prev => prev.filter(p => p.id !== id));
    if (plCreatedId === id) setPlCreatedId(null);
  };

  const copyPayLinkUrl = (id: string) => {
    const baseUrl = getBaseUrl();
    navigator.clipboard.writeText(`${baseUrl}/pay/${id}`).then(() => {
      setPlCopiedId(id);
      setTimeout(() => setPlCopiedId(null), 2000);
    }).catch(() => {});
  };

  return (
    <>
      <div id="db-cursor" style={{ position: "fixed", width: "8px", height: "8px", background: "var(--gold)", borderRadius: "50%", pointerEvents: "none", zIndex: 99999, top: "-100px", left: "-100px", transform: "translate(-50%,-50%)", mixBlendMode: "screen" }} />
      <div id="db-ring" style={{ position: "fixed", width: "32px", height: "32px", border: "1px solid rgba(200,169,110,0.4)", borderRadius: "50%", pointerEvents: "none", zIndex: 99998, top: "-100px", left: "-100px", transform: "translate(-50%,-50%)" }} />
      <Cursor />

      <div style={{ display: "flex", minHeight: "100vh", background: "#020203", backgroundImage: "radial-gradient(circle at 10% 5%, rgba(200,169,110,0.09), transparent 40%)" }}>
        <aside className="db-sidebar" style={{ width: "220px", position: "fixed", top: 0, left: 0, bottom: 0, background: "rgba(8,8,15,0.98)", borderRight: "1px solid rgba(255,255,255,0.055)", display: "flex", flexDirection: "column", zIndex: 100, backdropFilter: "blur(12px)", overflowY: "auto", minHeight: 0 }}>
          <div style={{ padding: "24px 20px", borderBottom: "1px solid rgba(255,255,255,0.055)" }}>
            <Link href="/" style={{ ...mono, fontSize: "13px", fontWeight: 500, letterSpacing: "0.3em", color: "var(--gold)", textDecoration: "none", display: "block", marginBottom: "3px" }}>CIPHER</Link>
            <div style={{ ...mono, fontSize: "10px", color: "var(--dim)", letterSpacing: "0.12em" }}>Creator Console</div>
          </div>

          <nav style={{ flex: 1, padding: "8px 0", overflowY: "auto" }}>
            {SECTIONS.map(({ key, label }) => {
              const active = activeSection === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveSection(key)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    display: "flex",
                    alignItems: "center",
                    padding: "11px 20px",
                    fontSize: "13px",
                    color: active ? "var(--gold)" : "var(--muted)",
                    background: active ? "rgba(200,169,110,0.07)" : "transparent",
                    borderRight: `2px solid ${active ? "var(--gold)" : "transparent"}`,
                    borderTop: "none",
                    borderBottom: "none",
                    borderLeft: "none",
                    transition: "all 0.15s",
                    fontFamily: active ? "var(--font-mono)" : "var(--font-body)",
                    letterSpacing: active ? "0.08em" : "0",
                    fontWeight: active ? 500 : 300,
                    cursor: "pointer",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </nav>

          <div style={{ borderTop: "1px solid rgba(255,255,255,0.055)" }}>
            {/* Radio stays above profile block */}
            <div style={{ padding: "10px 20px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              <CipherRadioCompact />
            </div>

            {/* Compact profile block */}
            <div style={{ padding: "10px 12px", position: "relative" }}>
              <button
                type="button"
                onClick={() => setProfileMenuOpen(v => !v)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: "9px",
                  background: profileMenuOpen ? "rgba(200,169,110,0.07)" : "transparent",
                  border: `1px solid ${profileMenuOpen ? "rgba(200,169,110,0.22)" : "rgba(255,255,255,0.07)"}`,
                  borderRadius: "6px",
                  padding: "8px 10px",
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                {/* Avatar */}
                <div style={{ width: "26px", height: "26px", borderRadius: "50%", border: "1px solid rgba(200,169,110,0.35)", background: "rgba(200,169,110,0.12)", display: "grid", placeItems: "center", ...mono, color: "var(--gold)", fontSize: "11px", flexShrink: 0 }}>
                  {(userEmail[0] || "C").toUpperCase()}
                </div>
                {/* Email + role */}
                <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                  <div style={{ fontSize: "11px", color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{userEmail}</div>
                  <div style={{ ...mono, fontSize: "8px", color: "var(--gold-dim)", letterSpacing: "0.14em", marginTop: "2px" }}>CREATOR</div>
                </div>
                {/* Chevron */}
                <svg viewBox="0 0 10 6" width="9" height="9" fill="none" style={{ color: "var(--dim)", flexShrink: 0, transform: profileMenuOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>
                  <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              {/* Profile dropdown — opens upward */}
              {profileMenuOpen && (
                <div style={{ position: "absolute", bottom: "calc(100% + 6px)", left: "12px", right: "12px", background: "#0d0d18", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", overflow: "hidden" }}>
                  {/* Phantom Mode */}
                  <div style={{ padding: "10px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <div style={{ ...mono, fontSize: "9px", letterSpacing: "0.14em", color: "var(--gold-dim)", marginBottom: "7px" }}>PHANTOM MODE</div>
                    <PhantomModeToggle userId={userId} initialPhantom={phantomMode} />
                  </div>
                  {/* Settings */}
                  <button
                    type="button"
                    onClick={() => { setActiveSection("settings"); setProfileMenuOpen(false); }}
                    style={{ width: "100%", display: "flex", alignItems: "center", gap: "9px", padding: "10px 12px", background: "transparent", border: "none", borderBottom: "1px solid rgba(255,255,255,0.06)", color: "var(--muted)", fontSize: "12px", cursor: "pointer", textAlign: "left" }}
                  >
                    <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
                      <circle cx="8" cy="8" r="2.5" />
                      <path d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3.05 3.05l1.06 1.06M11.89 11.89l1.06 1.06M12.95 3.05l-1.06 1.06M4.11 11.89l-1.06 1.06" />
                    </svg>
                    Settings
                  </button>
                  {/* Sign out */}
                  <button
                    type="button"
                    onClick={() => { setProfileMenuOpen(false); handleSignOut(); }}
                    style={{ width: "100%", display: "flex", alignItems: "center", gap: "9px", padding: "10px 12px", background: "transparent", border: "none", color: "var(--dim)", fontSize: "12px", cursor: "pointer", textAlign: "left" }}
                  >
                    <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
                      <path d="M10 8H2M6 5l-3 3 3 3" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M6 2h7a1 1 0 011 1v10a1 1 0 01-1 1H6" strokeLinecap="round" />
                    </svg>
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </aside>

        <div className="db-main" style={{ marginLeft: "220px", flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          <header style={{ height: "56px", position: "sticky", top: 0, background: "rgba(2,2,3,0.95)", borderBottom: "1px solid rgba(255,255,255,0.055)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 28px", zIndex: 50 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ ...mono, fontSize: "10px", color: "var(--dim)", letterSpacing: "0.15em" }}>CIPHER</span>
              <span style={{ color: "rgba(255,255,255,0.18)" }}>/</span>
              <span style={{ ...mono, fontSize: "10px", color: "var(--gold)", letterSpacing: "0.15em" }}>{activeSection.toUpperCase()}</span>
            </div>

            <div style={{ position: "relative", display: "flex", alignItems: "center", gap: "12px" }}>
              <button
                type="button"
                onClick={() => {
                  setNotifOpen(v => !v);
                  // Note: unreadCount is managed exclusively by the backend poll
                  // (every 30 s) to avoid flicker from optimistic local clears.
                }}
                style={{ position: "relative", width: "34px", height: "34px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.1)", background: notifOpen ? "rgba(200,169,110,0.08)" : "rgba(255,255,255,0.02)", color: "var(--gold)", cursor: "pointer", display: "grid", placeItems: "center" }}
                aria-label="Notifications"
              >
                <svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
                  <path d="M8 1a5 5 0 00-5 5v2.5L2 10h12l-1-1.5V6a5 5 0 00-5-5z" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M6.5 13a1.5 1.5 0 003 0" strokeLinecap="round" />
                </svg>
                {unreadCount > 0 && (
                  <span style={{ position: "absolute", top: "-4px", right: "-4px", minWidth: "16px", height: "16px", borderRadius: "999px", background: "var(--gold)", color: "#120c00", ...mono, fontSize: "9px", display: "grid", placeItems: "center", padding: "0 3px" }}>
                    {unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div style={{ position: "absolute", right: 0, top: "44px", width: "340px", maxHeight: "360px", overflowY: "auto", background: "#111120", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", padding: "10px", boxShadow: "0 16px 40px rgba(0,0,0,0.4)" }}>
                  <div style={{ ...mono, fontSize: "10px", letterSpacing: "0.16em", color: "var(--gold-dim)", marginBottom: "8px" }}>LIVE NOTIFICATIONS</div>
                  {liveNotifications.length === 0 && <div style={{ fontSize: "13px", color: "var(--dim)" }}>No notifications yet.</div>}
                  {liveNotifications.map(item => (
                    <div key={item.id} style={{ padding: "9px", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "6px", marginBottom: "8px", background: item.unread ? "rgba(200,169,110,0.08)" : "rgba(255,255,255,0.02)" }}>
                      <div style={{ fontSize: "13px", color: "var(--white)", marginBottom: "4px" }}>{item.message}</div>
                      <div style={{ ...mono, fontSize: "10px", color: "var(--dim)" }}>{formatDate(item.created_at)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </header>

          <main style={{ flex: 1, padding: "28px", display: "grid", gap: "16px", alignContent: "start" }}>
            {missingTables.length > 0 && (
              <div style={{ padding: "12px", borderRadius: "8px", border: "1px solid rgba(200,169,110,0.3)", background: "rgba(200,169,110,0.08)", color: "var(--gold)" }}>
                Missing tables detected: {missingTables.join(", ")}. Run the SQL migration before using scheduler and payouts.
              </div>
            )}

            {activeSection === "dashboard" && (
              <>
                <CipherScore data={cipherScoreData} />

                {/* AI Daily Brief - Prominent at top */}
                <DailyBriefWidget />

                {/* AI Content Ideas & Voice Clone Grid */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <ContentIdeasWidget />
                  <VoiceCloneWidget />
                </div>
                
                {/* Activation mode: no earnings yet */}
                {isActivationMode && (
                  <>
                    {/* Next Actions Rail */}
                    <div style={{ background: "#111120", border: "1px solid rgba(200,169,110,0.25)", borderRadius: "8px", padding: "20px" }}>
                      <div style={{ ...mono, fontSize: "10px", letterSpacing: "0.18em", color: "var(--gold-dim)", marginBottom: "16px" }}>NEXT ACTIONS</div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "12px" }}>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(`https://cipher.so/${creatorProfile.handle || userId}`).then(() => {
                              setCopiedDropLink(true);
                              setTimeout(() => setCopiedDropLink(false), 2000);
                            }).catch(() => {});
                          }}
                          style={{ background: "rgba(200,169,110,0.08)", border: "1px solid rgba(200,169,110,0.3)", borderRadius: "8px", padding: "16px", textAlign: "left", cursor: "pointer" }}
                        >
                          <div style={{ ...mono, fontSize: "18px", color: "var(--gold)", marginBottom: "8px" }}>01</div>
                          <div style={{ ...disp, fontSize: "17px", color: "var(--gold)", marginBottom: "4px" }}>{copiedDropLink ? "Copied!" : "Share Your Drop"}</div>
                          <div style={{ fontSize: "12px", color: "var(--dim)" }}>Copy your drop link and send it to followers</div>
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveSection("fans")}
                          style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", padding: "16px", textAlign: "left", cursor: "pointer" }}
                        >
                          <div style={{ ...mono, fontSize: "18px", color: "var(--muted)", marginBottom: "8px" }}>02</div>
                          <div style={{ ...disp, fontSize: "17px", color: "var(--white)", marginBottom: "4px" }}>Message Fans</div>
                          <div style={{ fontSize: "12px", color: "var(--dim)" }}>Blast your fan list with a direct message</div>
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveSection("content")}
                          style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", padding: "16px", textAlign: "left", cursor: "pointer" }}
                        >
                          <div style={{ ...mono, fontSize: "18px", color: "var(--muted)", marginBottom: "8px" }}>03</div>
                          <div style={{ ...disp, fontSize: "17px", color: "var(--white)", marginBottom: "4px" }}>Post Content</div>
                          <div style={{ fontSize: "12px", color: "var(--dim)" }}>Schedule or publish your next drop</div>
                        </button>
                      </div>
                    </div>

                    {/* Active drop spotlight */}
                    {activeDrop ? (
                      <div style={{ background: "#111120", border: "1px solid rgba(200,169,110,0.3)", borderRadius: "8px", padding: "20px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ ...mono, fontSize: "10px", letterSpacing: "0.18em", color: "var(--gold-dim)", marginBottom: "8px" }}>YOUR ACTIVE DROP</div>
                            <div style={{ ...disp, fontSize: "26px", color: "var(--gold)", marginBottom: "4px" }}>{activeDrop.title}</div>
                            {activeDrop.description && <div style={{ fontSize: "13px", color: "var(--dim)", marginBottom: "10px" }}>{activeDrop.description}</div>}
                            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                              <div style={{ ...disp, fontSize: "28px", color: "var(--gold)" }}>{money.format(activeDrop.price / 100)}</div>
                              <div style={{ ...mono, fontSize: "9px", color: "#39c56f", letterSpacing: "0.16em", background: "rgba(57,197,111,0.12)", border: "1px solid rgba(57,197,111,0.3)", borderRadius: "4px", padding: "3px 8px" }}>● LIVE</div>
                            </div>
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: "8px", flexShrink: 0 }}>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(`https://cipher.so/${creatorProfile.handle || userId}`).then(() => {
                                  setCopiedDropLink(true);
                                  setTimeout(() => setCopiedDropLink(false), 2000);
                                }).catch(() => {});
                              }}
                              style={{ border: "none", borderRadius: "6px", padding: "10px 18px", background: "var(--gold)", color: "#120c00", ...mono, fontSize: "11px", letterSpacing: "0.12em", cursor: "pointer" }}
                            >
                              {copiedDropLink ? "COPIED ✓" : "COPY LINK"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setActiveSection("content")}
                              style={{ border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", padding: "10px 18px", background: "transparent", color: "var(--muted)", ...mono, fontSize: "11px", letterSpacing: "0.12em", cursor: "pointer" }}
                            >
                              MANAGE
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div style={{ background: "#111120", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "8px", padding: "24px", textAlign: "center" }}>
                        <div style={{ ...mono, fontSize: "10px", letterSpacing: "0.18em", color: "var(--gold-dim)", marginBottom: "10px" }}>NO ACTIVE DROP</div>
                        <div style={{ fontSize: "14px", color: "var(--muted)", marginBottom: "14px" }}>You need a live drop before your first sale can happen.</div>
                        <button
                          type="button"
                          onClick={() => setActiveSection("content")}
                          style={{ border: "none", borderRadius: "6px", padding: "10px 20px", background: "var(--gold)", color: "#120c00", ...mono, fontSize: "11px", letterSpacing: "0.12em", cursor: "pointer" }}
                        >
                          CREATE YOUR FIRST DROP →
                        </button>
                      </div>
                    )}

                    {/* Contextual stats */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: "12px" }}>
                      {[
                        { label: "Revenue", value: "—", sub: "No sales yet — drop is live" },
                        { label: "Fan Codes", value: String(fanCodeCount), sub: fanCodeCount > 0 ? "Identities ready to buy" : "Generate codes in Fans tab" },
                        { label: "Potential Reach", value: effectiveReach.totalFollowers > 0 ? effectiveReach.totalFollowers.toLocaleString() : "—", sub: effectiveReach.totalFollowers > 0 ? `≈ ${potentialFans} potential buyers` : "Connect socials to estimate" },
                        { label: "Content Items", value: String(contentItems.length), sub: contentItems.length > 0 ? "Drop is ready to sell" : "Create your first drop" },
                      ].map(card => (
                        <div key={card.label} style={{ background: "#111120", border: "1px solid rgba(255,255,255,0.055)", borderRadius: "8px", padding: "18px" }}>
                          <div style={{ ...mono, fontSize: "10px", letterSpacing: "0.14em", color: "var(--gold-dim)", marginBottom: "12px" }}>{card.label}</div>
                          <div style={{ ...disp, fontSize: "34px", color: card.label === "Revenue" ? "var(--dim)" : "var(--gold)", lineHeight: 1 }}>{card.value}</div>
                          <div style={{ color: "var(--dim)", fontSize: "12px", marginTop: "8px" }}>{card.sub}</div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* Stats Grid — analytics mode only */}
                {!isActivationMode && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: "12px" }}>
                  {[
                    { label: "Total Earnings", value: money.format(wallet.total_earnings), sub: "Net processed" },
                    { label: "Balance Available", value: money.format(wallet.balance), sub: "Ready for payout" },
                    { label: "Fan Codes", value: String(fanCodeCount), sub: "Active identities" },
                    { label: "Referral Income", value: money.format(wallet.referral_income), sub: "Lifetime referral" },
                  ].map(card => (
                    <div key={card.label} style={{ background: "#111120", border: "1px solid rgba(255,255,255,0.055)", borderRadius: "8px", padding: "18px" }}>
                      <div style={{ ...mono, fontSize: "10px", letterSpacing: "0.14em", color: "var(--gold-dim)", marginBottom: "12px" }}>{card.label}</div>
                      <div style={{ ...disp, fontSize: "34px", color: "var(--gold)", lineHeight: 1 }}>{card.value}</div>
                      <div style={{ color: "var(--dim)", fontSize: "12px", marginTop: "8px" }}>{card.sub}</div>
                    </div>
                  ))}
                </div>
                )}

                <div style={{ background: "#111120", border: "1px solid rgba(255,255,255,0.055)", borderRadius: "8px", padding: "18px" }}>
                  <div style={{ ...mono, fontSize: "10px", letterSpacing: "0.14em", color: "var(--gold-dim)", marginBottom: "10px" }}>SOCIAL REACH</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "12px" }}>
                    <div style={{ border: "1px solid rgba(255,255,255,0.06)", borderRadius: "8px", padding: "12px", background: "rgba(255,255,255,0.02)" }}>
                      <div style={{ ...mono, fontSize: "10px", color: "var(--dim)", letterSpacing: "0.1em" }}>TOTAL COMBINED FOLLOWERS</div>
                      <div style={{ ...disp, fontSize: "38px", color: "var(--gold)", marginTop: "4px" }}>{effectiveReach.totalFollowers.toLocaleString()}</div>
                      <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "8px" }}>
                        Your potential CIPHER audience: {effectiveReach.totalFollowers.toLocaleString()} people.
                      </div>
                      <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "4px" }}>
                        If 1% convert: {potentialFans.toLocaleString()} fan codes = {money.format(estimatedMonthly)}/month estimated.
                      </div>
                    </div>
                    <div style={{ border: "1px solid rgba(255,255,255,0.06)", borderRadius: "8px", padding: "12px", background: "rgba(255,255,255,0.02)", display: "grid", gap: "6px" }}>
                      {effectiveReach.byPlatform.map(item => (
                        <div key={item.platform} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px", color: "var(--muted)" }}>
                          <span style={{ display: "inline-flex", gap: "6px", alignItems: "center" }}>
                            <SocialIcon platform={item.platform} />
                            {PLATFORM_META[item.platform].label}
                          </span>
                          <span style={{ ...mono, color: "var(--gold)" }}>{item.followers.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Earnings chart or empty state */}
                {isActivationMode ? (
                  <div style={{ background: "#111120", border: "1px solid rgba(255,255,255,0.055)", borderRadius: "8px", padding: "32px 18px", textAlign: "center" }}>
                    <div style={{ ...mono, fontSize: "10px", letterSpacing: "0.15em", color: "var(--gold-dim)", marginBottom: "16px" }}>EARNINGS TIMELINE</div>
                    <div style={{ display: "flex", gap: "8px", alignItems: "flex-end", height: "80px", justifyContent: "center", opacity: 0.15 }}>
                      {[20, 35, 15, 50, 30, 45, 60].map((h, i) => (
                        <div key={i} style={{ width: "32px", height: `${h}%`, background: "linear-gradient(180deg, rgba(232,204,150,0.85), rgba(200,169,110,0.35))", borderRadius: "4px 4px 0 0" }} />
                      ))}
                    </div>
                    <div style={{ ...disp, fontSize: "20px", color: "var(--muted)", marginTop: "14px" }}>Your earnings chart will appear after your first sale</div>
                    <div style={{ fontSize: "12px", color: "var(--dim)", marginTop: "6px" }}>Every sale adds a bar. Share your link to start the clock.</div>
                  </div>
                ) : (
                <div style={{ background: "#111120", border: "1px solid rgba(255,255,255,0.055)", borderRadius: "8px", padding: "18px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
                    <div>
                      <div style={{ ...mono, fontSize: "10px", letterSpacing: "0.15em", color: "var(--gold-dim)" }}>EARNINGS LAST 7 DAYS</div>
                      <div style={{ fontSize: "14px", color: "var(--white)" }}>Revenue timeline</div>
                    </div>
                    <div style={{ ...mono, color: "var(--dim)", fontSize: "11px" }}>{money.format(chartData.reduce((s, d) => s + d.amount, 0))} total</div>
                  </div>

                  <div style={{ display: "flex", gap: "8px", alignItems: "flex-end", height: "120px" }}>
                    {chartData.map(day => (
                      <div key={day.label} style={{ flex: 1, display: "grid", gap: "8px" }}>
                        <div style={{ height: `${Math.max((day.amount / maxChart) * 100, 3)}%`, background: "linear-gradient(180deg, rgba(232,204,150,0.85), rgba(200,169,110,0.35))", borderRadius: "4px 4px 0 0", boxShadow: "0 0 16px rgba(200,169,110,0.22)" }} />
                        <div style={{ ...mono, fontSize: "10px", color: "var(--dim)", textAlign: "center" }}>{day.label}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop: "18px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <div style={{ border: "1px solid rgba(255,255,255,0.055)", borderRadius: "7px", padding: "14px", background: "rgba(255,255,255,0.02)" }}>
                      <div style={{ ...mono, fontSize: "10px", color: "var(--gold-dim)", letterSpacing: "0.12em" }}>30-DAY FORECAST</div>
                      <div style={{ ...disp, marginTop: "8px", fontSize: "30px", color: chartTrend === "up" ? "var(--gold)" : "#ff6a6a" }}>
                        {money.format(forecast)}
                      </div>
                      <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "6px" }}>
                        At your current rate you&apos;ll earn {money.format(forecast)} this month.
                      </div>
                      <div style={{ fontSize: "12px", color: "var(--dim)", marginTop: "4px" }}>
                        Top earning content type: {topContentType}
                      </div>
                    </div>

                    <div style={{ border: "1px solid rgba(255,255,255,0.055)", borderRadius: "7px", padding: "14px", background: "rgba(255,255,255,0.02)" }}>
                      <div style={{ ...mono, fontSize: "10px", color: "var(--gold-dim)", letterSpacing: "0.12em" }}>AI STUDIO</div>
                      <textarea
                        value={aiPrompt}
                        onChange={e => setAiPrompt(e.target.value)}
                        placeholder="Mood, topic, launch angle..."
                        style={{ width: "100%", marginTop: "8px", minHeight: "72px", background: "#0d0d18", border: "1px solid rgba(255,255,255,0.08)", color: "var(--white)", borderRadius: "6px", padding: "10px" }}
                      />
                      <div style={{ display: "flex", gap: "8px", marginTop: "8px", flexWrap: "wrap" }}>
                        <button type="button" onClick={generatePost} disabled={aiLoading} style={{ padding: "8px 12px", borderRadius: "6px", border: "none", background: "var(--gold)", color: "#120c00", ...mono, fontSize: "11px", letterSpacing: "0.1em", cursor: "pointer" }}>{aiLoading ? "GENERATING" : "GENERATE POST"}</button>
                        <button type="button" onClick={copyAi} disabled={!aiDraft} style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.14)", background: "transparent", color: "var(--white)", ...mono, fontSize: "11px", letterSpacing: "0.1em", cursor: "pointer" }}>COPY</button>
                        <button type="button" onClick={generatePost} disabled={aiLoading} style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.14)", background: "transparent", color: "var(--dim)", ...mono, fontSize: "11px", letterSpacing: "0.1em", cursor: "pointer" }}>TRY AGAIN</button>
                      </div>
                      <div style={{ marginTop: "8px", fontSize: "12px", color: aiErr ? "#ff6a6a" : "var(--muted)", whiteSpace: "pre-wrap" }}>
                        {aiDraft || aiErr || "Generated draft appears here."}
                      </div>
                    </div>
                  </div>
                </div>
                )}

                {/* First sale module or transactions */}
                {isActivationMode ? (
                  <div style={{ background: "#111120", border: "1px solid rgba(200,169,110,0.2)", borderRadius: "8px", padding: "20px" }}>
                    <div style={{ ...mono, fontSize: "10px", letterSpacing: "0.18em", color: "var(--gold-dim)", marginBottom: "16px" }}>GET YOUR FIRST SALE</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                      <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "8px", padding: "16px" }}>
                        <div style={{ ...mono, fontSize: "10px", letterSpacing: "0.14em", color: "#8dcfff", marginBottom: "10px" }}>POST THIS NOW (COPY → PASTE)</div>
                        <div style={{ fontSize: "13px", color: "var(--white)", lineHeight: 1.7, marginBottom: "12px" }}>
                          <div>Just dropped exclusive content on CIPHER. First access is limited — grab it before it expires 🔒</div>
                          {activeDrop && <div style={{ marginTop: "8px", color: "var(--gold)" }}>&quot;{activeDrop.title}&quot; — {money.format(activeDrop.price / 100)}</div>}
                          <div style={{ marginTop: "8px", color: "var(--muted)" }}>cipher.so/{creatorProfile.handle || userId}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const text = `Just dropped exclusive content on CIPHER. First access is limited — grab it before it expires 🔒${activeDrop ? `\n\n"${activeDrop.title}" — ${money.format(activeDrop.price / 100)}` : ""}\n\ncipher.so/${creatorProfile.handle || userId}`;
                            navigator.clipboard.writeText(text).catch(() => {});
                          }}
                          style={{ border: "1px solid rgba(29,161,242,0.4)", borderRadius: "5px", padding: "7px 12px", background: "rgba(29,161,242,0.08)", color: "#8dcfff", ...mono, fontSize: "10px", letterSpacing: "0.12em", cursor: "pointer" }}
                        >
                          COPY TWEET
                        </button>
                      </div>

                      <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "8px", padding: "16px" }}>
                        <div style={{ ...mono, fontSize: "10px", letterSpacing: "0.14em", color: "#d9b3ff", marginBottom: "10px" }}>DM SCRIPT (SEND TO TOP FOLLOWERS)</div>
                        <div style={{ fontSize: "13px", color: "var(--white)", lineHeight: 1.7, marginBottom: "12px" }}>
                          <div>Hey — just launched something exclusive on CIPHER, thought you&apos;d want first access before I post publicly.</div>
                          <div style={{ marginTop: "8px" }}>It&apos;s {activeDrop ? money.format(activeDrop.price / 100) : "limited pricing"} and expires soon.</div>
                          <div style={{ marginTop: "8px", color: "var(--muted)" }}>cipher.so/{creatorProfile.handle || userId}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const text = `Hey — just launched something exclusive on CIPHER, thought you'd want first access before I post publicly.\n\nIt's ${activeDrop ? money.format(activeDrop.price / 100) : "limited pricing"} and expires soon.\n\ncipher.so/${creatorProfile.handle || userId}`;
                            navigator.clipboard.writeText(text).catch(() => {});
                          }}
                          style={{ border: "1px solid rgba(217,179,255,0.4)", borderRadius: "5px", padding: "7px 12px", background: "rgba(217,179,255,0.08)", color: "#d9b3ff", ...mono, fontSize: "10px", letterSpacing: "0.12em", cursor: "pointer" }}
                        >
                          COPY DM
                        </button>
                      </div>
                    </div>

                    <div style={{ marginTop: "16px", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "8px", padding: "14px" }}>
                      <div style={{ ...mono, fontSize: "10px", letterSpacing: "0.14em", color: "var(--gold-dim)", marginBottom: "12px" }}>LAUNCH CHECKLIST</div>
                      {[
                        "Drop link copied and ready to share",
                        "Posted on Twitter / X",
                        "Posted on Instagram or TikTok",
                        "DM\u2019d at least 5 followers",
                        "Shared in a Telegram group or Discord",
                        "Story or video mention posted",
                      ].map((text, idx) => (
                        <label
                          key={idx}
                          style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 0", borderBottom: idx < 5 ? "1px solid rgba(255,255,255,0.04)" : "none", cursor: "pointer" }}
                        >
                          <input
                            type="checkbox"
                            checked={checkedLaunch.has(idx)}
                            onChange={() => {
                              setCheckedLaunch(prev => {
                                const next = new Set(prev);
                                if (next.has(idx)) next.delete(idx); else next.add(idx);
                                return next;
                              });
                            }}
                            style={{ accentColor: "var(--gold)", width: "16px", height: "16px", cursor: "pointer" }}
                          />
                          <span style={{ fontSize: "13px", color: checkedLaunch.has(idx) ? "var(--dim)" : "var(--white)", textDecoration: checkedLaunch.has(idx) ? "line-through" : "none" }}>
                            {text}
                          </span>
                        </label>
                      ))}
                      {checkedLaunch.size > 0 && (
                        <div style={{ marginTop: "12px", ...mono, fontSize: "10px", color: "var(--gold)", letterSpacing: "0.12em" }}>
                          {checkedLaunch.size}/6 COMPLETE{checkedLaunch.size === 6 ? " — FULL LAUNCH DONE \u2713" : ""}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                <div style={{ background: "#111120", border: "1px solid rgba(255,255,255,0.055)", borderRadius: "8px", overflow: "hidden" }}>
                  <div style={{ padding: "14px", ...mono, fontSize: "10px", color: "var(--gold-dim)", letterSpacing: "0.12em", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>RECENT TRANSACTIONS</div>
                  {transactions.length === 0 && (
                    <div style={{ padding: "24px", color: "var(--muted)" }}>No transactions yet. Share your page to activate your earnings stream.</div>
                  )}
                  {transactions.map(tx => (
                    <div key={tx.id} style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr 0.8fr 1fr 0.8fr", gap: "8px", padding: "12px 14px", borderTop: "1px solid rgba(255,255,255,0.04)", alignItems: "center" }}>
                      <div style={{ ...mono, fontSize: "11px", color: "var(--muted)" }}>{tx.fan_code ?? "FAN-UNKN"}</div>
                      <div style={{ ...disp, fontSize: "24px", color: "var(--gold)" }}>{money.format(tx.amount)}</div>
                      <div style={{ fontSize: "12px", color: "var(--muted)", textTransform: "capitalize" }}>{tx.type ?? "subscription"}</div>
                      <div style={{ ...mono, fontSize: "11px", color: "var(--dim)" }}>{formatDate(tx.created_at)}</div>
                      <div style={{ ...mono, fontSize: "10px", color: tx.status === "completed" ? "var(--gold)" : "var(--dim)", letterSpacing: "0.1em" }}>{tx.status}</div>
                    </div>
                  ))}
                </div>
                )}
              </>
            )}

            {activeSection === "content" && (
              <div style={{ display: "grid", gap: "12px" }}>
                {/* Link to full content manager */}
                <div style={{ background: "#111120", border: "1px solid rgba(200,169,110,0.2)", borderRadius: "8px", padding: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ ...mono, fontSize: "10px", letterSpacing: "0.12em", color: "var(--gold-dim)" }}>CONTENT MANAGER</div>
                    <div style={{ fontSize: "16px", color: "var(--gold)", marginTop: "4px" }}>Full content management system</div>
                    <div style={{ fontSize: "13px", color: "var(--dim)", marginTop: "4px" }}>Upload, organize, and manage all your content</div>
                  </div>
                  <Link
                    href="/dashboard/content"
                    style={{
                      padding: "12px 24px",
                      background: "var(--gold)",
                      border: "none",
                      borderRadius: "8px",
                      color: "#120c00",
                      ...mono,
                      fontSize: "12px",
                      fontWeight: 600,
                      textDecoration: "none",
                      cursor: "pointer",
                    }}
                  >
                    OPEN →
                  </Link>
                </div>

                <div style={{ background: "#111120", border: "1px solid rgba(255,255,255,0.055)", borderRadius: "8px", padding: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ ...mono, fontSize: "10px", letterSpacing: "0.12em", color: "var(--gold-dim)" }}>QUICK UPLOAD</div>
                      <div style={{ fontSize: "14px", color: "var(--white)" }}>Set content to self-expire automatically</div>
                    </div>
                    <button type="button" onClick={() => setBurnMode(v => !v)} style={{ border: "1px solid rgba(255,255,255,0.1)", borderRadius: "999px", padding: "8px 14px", background: burnMode ? "rgba(200,169,110,0.16)" : "transparent", color: burnMode ? "var(--gold)" : "var(--dim)", ...mono, fontSize: "11px", letterSpacing: "0.1em", cursor: "pointer" }}>
                      {burnMode ? "BURN MODE ON" : "BURN MODE OFF"}
                    </button>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "12px" }}>
                    <input value={contentTitle} onChange={e => setContentTitle(e.target.value)} placeholder="Content title" style={{ background: "#0d0d18", border: "1px solid rgba(255,255,255,0.1)", color: "var(--white)", borderRadius: "6px", padding: "10px" }} />
                    <input value={contentPrice} onChange={e => setContentPrice(e.target.value)} placeholder="Price" style={{ background: "#0d0d18", border: "1px solid rgba(255,255,255,0.1)", color: "var(--white)", borderRadius: "6px", padding: "10px" }} />
                  </div>
                  <input value={contentWhopCheckoutUrl} onChange={e => setContentWhopCheckoutUrl(e.target.value)} placeholder="Whop checkout URL" style={{ marginTop: "10px", width: "100%", background: "#0d0d18", border: "1px solid rgba(255,255,255,0.1)", color: "var(--white)", borderRadius: "6px", padding: "10px" }} />
                  <textarea value={contentDesc} onChange={e => setContentDesc(e.target.value)} placeholder="Description" style={{ marginTop: "10px", width: "100%", minHeight: "72px", background: "#0d0d18", border: "1px solid rgba(255,255,255,0.1)", color: "var(--white)", borderRadius: "6px", padding: "10px" }} />
                  <div style={{ marginTop: "10px", border: "1px solid rgba(29,161,242,0.28)", borderRadius: "8px", padding: "10px", background: "rgba(29,161,242,0.06)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                      <div>
                        <div style={{ ...mono, fontSize: "10px", letterSpacing: "0.12em", color: "#8dcfff" }}>AUTO-SHARE TO CONNECTED ACCOUNTS</div>
                        <div style={{ fontSize: "12px", color: "var(--dim)", marginTop: "2px" }}>Twitter + Telegram will post after publish when connected.</div>
                      </div>
                      <button type="button" onClick={() => setAutoShareEnabled(v => !v)} style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: "999px", padding: "7px 12px", background: autoShareEnabled ? "rgba(29,161,242,0.2)" : "transparent", color: autoShareEnabled ? "#8dcfff" : "var(--dim)", ...mono, fontSize: "10px", letterSpacing: "0.1em", cursor: "pointer" }}>
                        {autoShareEnabled ? "AUTO-SHARE ON" : "AUTO-SHARE OFF"}
                      </button>
                    </div>
                    {autoShareEnabled && (
                      <textarea value={shareText} onChange={e => setShareText(e.target.value)} placeholder="Share text" style={{ marginTop: "8px", width: "100%", minHeight: "56px", background: "#0d0d18", border: "1px solid rgba(255,255,255,0.1)", color: "var(--white)", borderRadius: "6px", padding: "10px" }} />
                    )}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: "10px", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                    <select value={contentExpiry} onChange={e => setContentExpiry(e.target.value)} style={{ background: "#0d0d18", border: "1px solid rgba(255,255,255,0.1)", color: "var(--white)", borderRadius: "6px", padding: "10px" }}>
                      <option value="24h">Expire in 24h</option>
                      <option value="7d">Expire in 7d</option>
                      <option value="30d">Expire in 30d</option>
                    </select>
                    <button type="button" onClick={saveContentItem} disabled={contentSaving} style={{ border: "none", borderRadius: "6px", padding: "10px 14px", background: "var(--gold)", color: "#120c00", ...mono, fontSize: "11px", letterSpacing: "0.1em", cursor: "pointer" }}>
                      {contentSaving ? "SAVING" : "SAVE CONTENT"}
                    </button>
                  </div>
                  {contentMsg && <div style={{ marginTop: "8px", color: contentMsg.includes("Could") ? "#ff6a6a" : "var(--gold)", fontSize: "12px" }}>{contentMsg}</div>}
                  
                  {generatedUnlockUrl && (
                    <div style={{ marginTop: "12px", padding: "12px", background: "rgba(200,169,110,0.08)", border: "1px solid rgba(200,169,110,0.3)", borderRadius: "6px" }}>
                      <div style={{ ...mono, fontSize: "9px", color: "var(--gold-dim)", marginBottom: "6px" }}>UNLOCK LINK (COPY & SHARE)</div>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <input 
                          readOnly 
                          value={generatedUnlockUrl} 
                          style={{ flex: 1, padding: "8px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(200,169,110,0.2)", borderRadius: "4px", color: "var(--gold)", fontSize: "12px", fontFamily: "monospace" }}
                        />
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(generatedUnlockUrl);
                            setContentMsg("Link copied!");
                          }}
                          style={{ padding: "8px 16px", background: "var(--gold)", border: "none", borderRadius: "4px", color: "#000", ...mono, fontSize: "10px", cursor: "pointer" }}
                        >
                          COPY
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ background: "#111120", border: "1px solid rgba(255,255,255,0.055)", borderRadius: "8px", padding: "16px" }}>
                  <div style={{ ...mono, fontSize: "10px", color: "var(--gold-dim)", letterSpacing: "0.12em", marginBottom: "10px" }}>ACTIVE CONTENT ITEMS</div>
                  {contentItems.length === 0 && <div style={{ color: "var(--muted)" }}>No content items yet. Schedule your first drop above.</div>}
                  <div style={{ display: "grid", gap: "8px" }}>
                    {contentItems.map(item => {
                      const left = daysLeft(item.expires_at);
                      const expiring = left !== null && left <= 2;
                      // Get v2 stats if available
                      const v2Item = v2Data?.content?.items.find(v => v.id === item.id);
                      const unlockCount = v2Item?.unlockCount ?? 0;
                      const paidUnlocks = v2Item?.paidUnlockCount ?? 0;
                      const revenue = v2Item?.paidRevenue ?? 0;
                      
                      return (
                        <div key={item.id} style={{ border: `1px solid ${expiring ? "rgba(200,169,110,0.5)" : "rgba(255,255,255,0.08)"}`, borderRadius: "7px", padding: "10px", background: "rgba(255,255,255,0.02)", animation: expiring ? "pulseGold 1.4s ease-in-out infinite" : "none" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <div>
                              <div style={{ fontSize: "14px", color: "var(--white)" }}>{item.title}</div>
                              <div style={{ fontSize: "12px", color: "var(--dim)", marginTop: "4px" }}>{item.description || "No description"}</div>
                            </div>
                            <div style={{ textAlign: "right" }}>
                              <div style={{ ...disp, fontSize: "24px", color: "var(--gold)" }}>{money.format(item.price / 100)}</div>
                              <div style={{ ...mono, fontSize: "9px", color: "var(--dim)" }}>per unlock</div>
                            </div>
                          </div>
                          
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginTop: "10px", paddingTop: "10px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                            <div style={{ textAlign: "center" }}>
                              <div style={{ ...disp, fontSize: "18px", color: "var(--white)" }}>{unlockCount}</div>
                              <div style={{ ...mono, fontSize: "8px", color: "var(--dim)" }}>TOTAL CODES</div>
                            </div>
                            <div style={{ textAlign: "center" }}>
                              <div style={{ ...disp, fontSize: "18px", color: "var(--gold)" }}>{paidUnlocks}</div>
                              <div style={{ ...mono, fontSize: "8px", color: "var(--dim)" }}>PAID UNLOCKS</div>
                            </div>
                            <div style={{ textAlign: "center" }}>
                              <div style={{ ...disp, fontSize: "18px", color: "#4cc88c" }}>{money.format(revenue / 100)}</div>
                              <div style={{ ...mono, fontSize: "8px", color: "var(--dim)" }}>REVENUE</div>
                            </div>
                          </div>
                          
                          <div style={{ ...mono, fontSize: "10px", color: "var(--muted)", marginTop: "8px", display: "flex", justifyContent: "space-between" }}>
                            <span>{item.burn_mode ? `Burn mode - ${left ?? "?"} day(s) left` : "Persistent content"}</span>
                            <span>{item.status === "active" ? "● LIVE" : "○ INACTIVE"}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {activeSection === "fans" && (
              <div style={{ display: "grid", gap: "12px" }}>
                {/* AI Fan Personas - Top of fans section */}
                <FanPersonasWidget />

                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: "10px" }}>
                  {[
                    { label: "Tracked fans", value: String(fanInsights.length), hint: `${crmCoverage} enriched with CRM notes` },
                    { label: "VIP fans", value: String(vipCount), hint: `${fanInsights.length ? Math.round((vipCount / fanInsights.length) * 100) : 0}% of total base` },
                    { label: "Active last 30d", value: String(activeFanCount), hint: "Recent spenders and returning buyers" },
                    { label: "Lifetime fan value", value: money.format(fanInsights.reduce((sum, fan) => sum + fan.totalSpent, 0)), hint: "Based on linked transactions" },
                  ].map(stat => (
                    <div key={stat.label} style={{ background: "#111120", border: "1px solid rgba(255,255,255,0.055)", borderRadius: "8px", padding: "14px" }}>
                      <div style={{ ...mono, fontSize: "10px", color: "var(--gold-dim)", letterSpacing: "0.12em" }}>{stat.label}</div>
                      <div style={{ ...disp, fontSize: "30px", color: "var(--gold)", marginTop: "6px" }}>{stat.value}</div>
                      <div style={{ fontSize: "12px", color: "var(--dim)", marginTop: "6px" }}>{stat.hint}</div>
                    </div>
                  ))}
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#111120", border: "1px solid rgba(255,255,255,0.055)", borderRadius: "8px", padding: "16px" }}>
                  <div>
                    <div style={{ ...mono, fontSize: "10px", color: "var(--gold-dim)", letterSpacing: "0.12em" }}>GENERATE NEW CODES</div>
                    <div style={{ fontSize: "13px", color: "var(--dim)", marginTop: "4px" }}>Create anonymous fan codes for new supporters</div>
                  </div>
                  <FanCodeGenerator
                    userId={userId}
                    currentCount={fanCodeCount}
                    tier={creatorProfile.category}
                    onGenerated={(newCodes) => {
                      // Refresh fan codes after generation
                      setFansState(prev => [...newCodes.map(c => ({
                        id: c.id,
                        code: c.code,
                        status: "active",
                        created_at: c.created_at,
                        custom_name: null,
                        creator_notes: null,
                        tags: [],
                        is_vip: false,
                      })), ...prev]);
                    }}
                  />
                </div>

                <div style={{ background: "#111120", border: "1px solid rgba(255,255,255,0.055)", borderRadius: "8px", padding: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
                    <div>
                      <div style={{ ...mono, fontSize: "10px", color: "var(--gold-dim)", letterSpacing: "0.12em" }}>PRIVATE FAN CRM</div>
                      <div style={{ fontSize: "14px", color: "var(--white)", marginTop: "4px" }}>Track custom names, notes, tags, VIP status, and spend signals without exposing data publicly.</div>
                    </div>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      <input value={fanSearch} onChange={e => setFanSearch(e.target.value)} placeholder="Search code, notes, tags" style={{ minWidth: "220px", background: "#0d0d18", border: "1px solid rgba(255,255,255,0.1)", color: "var(--white)", borderRadius: "6px", padding: "10px" }} />
                      <select value={fanFilter} onChange={e => setFanFilter(e.target.value as typeof fanFilter)} style={{ background: "#0d0d18", border: "1px solid rgba(255,255,255,0.1)", color: "var(--white)", borderRadius: "6px", padding: "10px" }}>
                        <option value="all">All fans</option>
                        <option value="vip">VIP only</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                      <select value={fanSort} onChange={e => setFanSort(e.target.value as typeof fanSort)} style={{ background: "#0d0d18", border: "1px solid rgba(255,255,255,0.1)", color: "var(--white)", borderRadius: "6px", padding: "10px" }}>
                        <option value="spent">Sort by spend</option>
                        <option value="recent">Sort by recent activity</option>
                        <option value="name">Sort by name</option>
                      </select>
                      <button type="button" onClick={exportFanCsv} style={{ border: "1px solid rgba(200,169,110,0.4)", borderRadius: "6px", padding: "10px 12px", background: "rgba(200,169,110,0.08)", color: "var(--gold)", ...mono, fontSize: "10px", letterSpacing: "0.1em", cursor: "pointer" }}>EXPORT CSV</button>
                    </div>
                  </div>

                  {fanSaveMsg && <div style={{ marginTop: "10px", color: fanSaveMsg.startsWith("Saved") ? "#39c56f" : "#ff8a8a", fontSize: "12px" }}>{fanSaveMsg}</div>}

                  <div style={{ marginTop: "14px", display: "grid", gap: "10px" }}>
                    {filteredFans.length === 0 && <div style={{ color: "var(--muted)" }}>No fans match the current filters yet.</div>}
                    {filteredFans.map(fan => {
                      const draft = getFanDraft(fan);
                      return (
                        <div key={fan.id} style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", padding: "14px", background: "rgba(255,255,255,0.02)" }}>
                          <div style={{ display: "grid", gridTemplateColumns: "1.15fr 1fr 1fr auto", gap: "10px", alignItems: "start" }}>
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                                <div style={{ ...mono, fontSize: "11px", color: "var(--gold)", letterSpacing: "0.1em" }}>{fan.code}</div>
                                <div style={{ ...mono, fontSize: "9px", color: fan.statusLabel === "active" ? "#39c56f" : "var(--dim)", letterSpacing: "0.1em" }}>{fan.statusLabel.toUpperCase()}</div>
                                {fan.is_vip && <div style={{ ...mono, fontSize: "9px", color: "#ff9ec2", letterSpacing: "0.1em" }}>VIP</div>}
                              </div>
                              <input value={draft.customName} onChange={e => patchFanDraft(fan.id, { customName: e.target.value }, fan)} placeholder="Custom name" style={{ width: "100%", marginTop: "8px", background: "#0d0d18", border: "1px solid rgba(255,255,255,0.1)", color: "var(--white)", borderRadius: "6px", padding: "10px" }} />
                              <textarea value={draft.creatorNotes} onChange={e => patchFanDraft(fan.id, { creatorNotes: e.target.value }, fan)} placeholder="Private notes" style={{ width: "100%", minHeight: "74px", marginTop: "8px", background: "#0d0d18", border: "1px solid rgba(255,255,255,0.1)", color: "var(--white)", borderRadius: "6px", padding: "10px" }} />
                            </div>

                            <div>
                              <div style={{ ...mono, fontSize: "10px", color: "var(--gold-dim)", letterSpacing: "0.12em", marginBottom: "6px" }}>SEGMENTS</div>
                              <input value={draft.tags} onChange={e => patchFanDraft(fan.id, { tags: e.target.value }, fan)} placeholder="vip, whale, comeback" style={{ width: "100%", background: "#0d0d18", border: "1px solid rgba(255,255,255,0.1)", color: "var(--white)", borderRadius: "6px", padding: "10px" }} />
                              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "10px" }}>
                                {normalizeTagsInput(draft.tags).length === 0 && <div style={{ fontSize: "12px", color: "var(--muted)" }}>No tags yet.</div>}
                                {normalizeTagsInput(draft.tags).map(tag => (
                                  <span key={tag} style={{ border: `1px solid ${tagColor(tag)}55`, background: `${tagColor(tag)}1a`, color: tagColor(tag), borderRadius: "999px", padding: "4px 8px", fontSize: "11px" }}>{tag}</span>
                                ))}
                              </div>
                            </div>

                            <div>
                              <div style={{ ...mono, fontSize: "10px", color: "var(--gold-dim)", letterSpacing: "0.12em", marginBottom: "6px" }}>SIGNALS</div>
                              <div style={{ ...disp, fontSize: "26px", color: "var(--gold)" }}>{money.format(fan.totalSpent)}</div>
                              <div style={{ fontSize: "12px", color: "var(--dim)", marginTop: "4px" }}>{fan.transactionCount} purchases</div>
                              <div style={{ fontSize: "12px", color: "var(--dim)", marginTop: "6px" }}>Last active {formatDate(fan.lastActive)}</div>
                              <div style={{ fontSize: "12px", color: "var(--dim)", marginTop: "2px" }}>Joined {formatDate(fan.firstSeen)}</div>
                              <button type="button" onClick={() => patchFanDraft(fan.id, { isVip: !draft.isVip }, fan)} style={{ marginTop: "10px", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "999px", padding: "8px 12px", background: draft.isVip ? "rgba(255,143,177,0.15)" : "transparent", color: draft.isVip ? "#ff9ec2" : "var(--dim)", ...mono, fontSize: "10px", letterSpacing: "0.1em", cursor: "pointer" }}>{draft.isVip ? "VIP ENABLED" : "MARK VIP"}</button>
                            </div>

                            <div style={{ display: "grid", gap: "8px", minWidth: "130px" }}>
                              <button type="button" onClick={() => setSelectedFanCode(fan.code)} style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: "6px", padding: "10px 12px", background: "transparent", color: "var(--white)", ...mono, fontSize: "10px", letterSpacing: "0.1em", cursor: "pointer" }}>OPEN PROFILE</button>
                              <button type="button" onClick={() => void saveFanRecord(fan)} disabled={fanSavingId === fan.id} style={{ border: "none", borderRadius: "6px", padding: "10px 12px", background: "var(--gold)", color: "#120c00", ...mono, fontSize: "10px", letterSpacing: "0.1em", cursor: "pointer" }}>{fanSavingId === fan.id ? "SAVING" : "SAVE CRM"}</button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {activeSection === "earnings" && (
              <div style={{ display: "grid", gap: "12px" }}>
                {/* AI Pricing Optimizer */}
                <DynamicPricingWidget />

                <div style={{ background: "#111120", border: "1px solid rgba(255,255,255,0.055)", borderRadius: "8px", padding: "16px" }}>
                  <div style={{ ...mono, fontSize: "10px", color: "var(--gold-dim)", letterSpacing: "0.12em" }}>PAYOUT COMMAND CENTER</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "12px", alignItems: "center", marginTop: "10px" }}>
                    <div>
                      <div style={{ ...disp, fontSize: "42px", color: "var(--gold)" }}>{money.format(wallet.balance)}</div>
                      <div style={{ fontSize: "12px", color: "var(--dim)" }}>Your next automatic payout: {formatDate(new Date(Date.now() + 1000 * 60 * 60 * 24 * 5).toISOString())}</div>
                    </div>
                    <button type="button" onClick={requestWithdrawal} disabled={withdrawSaving} style={{ border: "none", borderRadius: "8px", padding: "10px 14px", background: "var(--gold)", color: "#130d00", ...mono, fontSize: "11px", letterSpacing: "0.1em", cursor: "pointer" }}>{withdrawSaving ? "SENDING" : "WITHDRAW"}</button>
                  </div>
                  <div style={{ display: "flex", gap: "8px", marginTop: "10px", flexWrap: "wrap" }}>
                    <select value={withdrawMethod} onChange={e => setWithdrawMethod(e.target.value)} style={{ background: "#0d0d18", border: "1px solid rgba(255,255,255,0.1)", color: "var(--white)", borderRadius: "6px", padding: "10px" }}>
                      <option>Whop</option>
                      <option>Wise</option>
                      <option>USDC</option>
                      <option>PayPal</option>
                    </select>
                    <input value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} placeholder="Amount" style={{ background: "#0d0d18", border: "1px solid rgba(255,255,255,0.1)", color: "var(--white)", borderRadius: "6px", padding: "10px" }} />
                  </div>
                  {withdrawMsg && <div style={{ marginTop: "8px", color: withdrawMsg.includes("submitted") ? "var(--gold)" : "#ff6a6a", fontSize: "12px" }}>{withdrawMsg}</div>}
                </div>

                <div style={{ background: "#111120", border: "1px solid rgba(255,255,255,0.055)", borderRadius: "8px", overflow: "hidden" }}>
                  <div style={{ padding: "12px 14px", ...mono, fontSize: "10px", color: "var(--gold-dim)", letterSpacing: "0.12em", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>WITHDRAWAL HISTORY</div>
                  {withdrawals.length === 0 && <div style={{ padding: "14px", color: "var(--muted)" }}>No withdrawals yet.</div>}
                  {withdrawals.map(w => (
                    <div key={w.id} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", padding: "10px 14px", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                      <div style={{ ...disp, fontSize: "24px", color: "var(--gold)" }}>{money.format(w.amount)}</div>
                      <div style={{ fontSize: "12px", color: "var(--muted)" }}>{w.method}</div>
                      <div style={{ ...mono, fontSize: "11px", color: "var(--dim)" }}>{formatDate(w.created_at)}</div>
                      <div style={{ ...mono, fontSize: "10px", color: w.status === "completed" ? "var(--gold)" : "var(--dim)", letterSpacing: "0.1em" }}>{w.status.toUpperCase()}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeSection === "paylinks" && (
              <div
                style={{ display: "grid", gap: "16px" }}
                // Load data on first visit to this tab
                ref={el => { if (el && !payLinksLoaded && !payLinksLoading) loadPayLinks(); }}
              >
                {/* ── Section header ── */}
                <div style={{ background: "#111120", border: "1px solid rgba(200,169,110,0.25)", borderRadius: "8px", padding: "20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", flexWrap: "wrap" }}>
                    <div>
                      <div style={{ ...mono, fontSize: "10px", letterSpacing: "0.18em", color: "var(--gold-dim)", marginBottom: "6px" }}>PAYMENT LINKS</div>
                      <div style={{ ...disp, fontSize: "26px", color: "var(--gold)", lineHeight: 1.2, marginBottom: "8px" }}>Direct Sale Pages</div>
                      <div style={{ fontSize: "13px", color: "var(--dim)", lineHeight: 1.6, maxWidth: "480px" }}>
                        Generate a shareable <span style={{ color: "var(--muted)" }}>cipher.so/pay/[id]</span> URL.
                        Upload content, set a price, click Generate Link, and sell instantly with Stripe checkout.
                      </div>
                    </div>
                    <div style={{ ...mono, fontSize: "10px", color: "var(--gold)", background: "rgba(200,169,110,0.08)", border: "1px solid rgba(200,169,110,0.2)", borderRadius: "6px", padding: "8px 14px", whiteSpace: "nowrap" }}>
                      {payLinks.length} LINK{payLinks.length !== 1 ? "S" : ""} CREATED
                    </div>
                  </div>
                </div>

                {/* ── Create form ── */}
                <div style={{ background: "#111120", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "8px", padding: "20px", display: "grid", gap: "12px" }}>
                  <div style={{ ...mono, fontSize: "10px", letterSpacing: "0.18em", color: "var(--gold-dim)" }}>CREATE NEW PAYMENT LINK</div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "10px", alignItems: "start" }}>
                    <input
                      value={plTitle}
                      onChange={e => setPlTitle(e.target.value)}
                      placeholder="Link title (e.g. 'Exclusive Strategy Guide')"
                      style={{ background: "#070711", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.85)", borderRadius: "6px", padding: "10px 12px", fontSize: "13px", outline: "none" }}
                    />
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ ...mono, fontSize: "14px", color: "var(--gold)" }}>$</span>
                      <input
                        value={plPrice}
                        onChange={e => setPlPrice(e.target.value)}
                        placeholder="10.00"
                        style={{ width: "90px", background: "#070711", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.85)", borderRadius: "6px", padding: "10px 12px", fontSize: "13px", outline: "none" }}
                      />
                    </div>
                  </div>

                  <textarea
                    value={plDescription}
                    onChange={e => setPlDescription(e.target.value)}
                    placeholder="Short description shown on the payment page (optional)"
                    rows={2}
                    style={{ background: "#070711", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.85)", borderRadius: "6px", padding: "10px 12px", fontSize: "13px", resize: "vertical", outline: "none" }}
                  />

                  {/* Content type selector */}
                  <div>
                    <div style={{ ...mono, fontSize: "9px", letterSpacing: "0.14em", color: "var(--dim)", marginBottom: "8px" }}>CONTENT TYPE</div>
                    <div style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
                      {(["text", "file"] as const).map(type => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setPlContentType(type)}
                          style={{
                            ...mono,
                            padding: "6px 14px",
                            borderRadius: "999px",
                            border: `1px solid ${plContentType === type ? "rgba(200,169,110,0.5)" : "rgba(255,255,255,0.08)"}`,
                            background: plContentType === type ? "rgba(200,169,110,0.1)" : "transparent",
                            color: plContentType === type ? "var(--gold)" : "var(--dim)",
                            fontSize: "10px",
                            letterSpacing: "0.12em",
                            cursor: "pointer",
                          }}
                        >
                          {type.toUpperCase()}
                        </button>
                      ))}
                    </div>
                    {plContentType === "text" ? (
                      <textarea
                        value={plContentValue}
                        onChange={e => setPlContentValue(e.target.value)}
                        placeholder="Paste the premium text buyers get after payment"
                        rows={4}
                        style={{ width: "100%", background: "#070711", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.85)", borderRadius: "6px", padding: "10px 12px", fontSize: "13px", resize: "vertical", outline: "none" }}
                      />
                    ) : (
                      <input
                        type="file"
                        onChange={e => setPlFile(e.target.files?.[0] ?? null)}
                        style={{ width: "100%", background: "#070711", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.85)", borderRadius: "6px", padding: "10px 12px", fontSize: "13px", outline: "none" }}
                      />
                    )}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "12px", justifyContent: "space-between", flexWrap: "wrap" }}>
                    {plMsg && (
                      <div style={{ ...mono, fontSize: "10px", letterSpacing: "0.1em", color: plMsg.startsWith("✓") ? "var(--gold)" : "#e05555" }}>
                        {plMsg}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={savePayLink}
                      disabled={plSaving}
                      style={{ ...mono, padding: "10px 22px", border: "none", borderRadius: "6px", background: "var(--gold)", color: "#120c00", fontSize: "11px", letterSpacing: "0.14em", cursor: "pointer", opacity: plSaving ? 0.6 : 1, marginLeft: "auto" }}
                    >
                      {plSaving ? "GENERATING…" : "GENERATE LINK"}
                    </button>
                  </div>

                  {/* Generated link display */}
                  {plCreatedId && (
                    <div style={{ padding: "14px", background: "rgba(200,169,110,0.06)", border: "1px solid rgba(200,169,110,0.3)", borderRadius: "8px" }}>
                      <div style={{ ...mono, fontSize: "14px", letterSpacing: "0.08em", color: "var(--gold-dim)", marginBottom: "8px" }}>Your Payment Link is Ready</div>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <input
                          readOnly
                          value={`${getBaseUrl()}/pay/${plCreatedId}`}
                          style={{ flex: 1, ...mono, fontSize: "12px", color: "var(--gold)", background: "#070711", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "5px", padding: "9px 12px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", outline: "none" }}
                        />
                        <button
                          type="button"
                          onClick={() => copyPayLinkUrl(plCreatedId)}
                          style={{ ...mono, padding: "9px 16px", border: "1px solid rgba(200,169,110,0.4)", borderRadius: "5px", background: plCopiedId === plCreatedId ? "rgba(200,169,110,0.15)" : "transparent", color: "var(--gold)", fontSize: "10px", letterSpacing: "0.12em", cursor: "pointer", flexShrink: 0 }}
                        >
                          {plCopiedId === plCreatedId ? "COPIED ✓" : "COPY"}
                        </button>
                        <a
                          href={`/pay/${plCreatedId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ ...mono, padding: "9px 14px", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "5px", background: "transparent", color: "var(--muted)", fontSize: "10px", letterSpacing: "0.12em", textDecoration: "none", flexShrink: 0 }}
                        >
                          OPEN
                        </a>
                      </div>
                    </div>
                  )}
                </div>

                {/* ── Existing links list ── */}
                {payLinksLoading && (
                  <div style={{ ...mono, fontSize: "11px", color: "var(--dim)", textAlign: "center", padding: "24px" }}>
                    LOADING…
                  </div>
                )}
                {!payLinksLoading && payLinks.length > 0 && (
                  <div style={{ background: "#111120", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "8px", overflow: "hidden" }}>
                    <div style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)", ...mono, fontSize: "10px", letterSpacing: "0.14em", color: "var(--gold-dim)" }}>
                      YOUR PAYMENT LINKS
                    </div>
                    {payLinks.map((pl, idx) => (
                      <div
                        key={pl.id}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr auto",
                          gap: "12px",
                          padding: "14px 16px",
                          borderTop: idx > 0 ? "1px solid rgba(255,255,255,0.05)" : "none",
                          alignItems: "center",
                        }}
                      >
                        {/* Info */}
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                            <div style={{ fontSize: "14px", color: "rgba(255,255,255,0.85)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {pl.title}
                            </div>
                            <div
                              style={{
                                ...mono,
                                fontSize: "9px",
                                letterSpacing: "0.1em",
                                padding: "2px 7px",
                                borderRadius: "999px",
                                background: pl.is_active ? "rgba(80,212,138,0.1)" : "rgba(255,255,255,0.04)",
                                border: `1px solid ${pl.is_active ? "rgba(80,212,138,0.3)" : "rgba(255,255,255,0.08)"}`,
                                color: pl.is_active ? "#50d48a" : "var(--dim)",
                                flexShrink: 0,
                              }}
                            >
                              {pl.is_active ? "LIVE" : "PAUSED"}
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: "16px" }}>
                            <span style={{ ...mono, fontSize: "12px", color: "var(--gold)" }}>
                              ${(pl.price / 100).toFixed(2)}
                            </span>
                            <span style={{ ...mono, fontSize: "10px", color: "var(--dim)" }}>
                              {pl.view_count} views
                            </span>
                            <span style={{ ...mono, fontSize: "10px", color: "var(--dim)" }}>
                              {pl.purchase_count} sales
                            </span>
                          </div>
                          <div style={{ ...mono, fontSize: "10px", color: "rgba(255,255,255,0.2)", marginTop: "4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            /pay/{pl.id}
                          </div>
                            {pl.whop_product_id && (
                              <div style={{ ...mono, fontSize: "9px", color: "rgba(80,212,138,0.5)", marginTop: "2px", letterSpacing: "0.1em" }}>
                                ✓ WHOP
                              </div>
                            )}
                        </div>

                        {/* Actions */}
                        <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                          <button
                            type="button"
                            onClick={() => copyPayLinkUrl(pl.id)}
                            style={{ ...mono, padding: "7px 12px", border: "1px solid rgba(200,169,110,0.3)", borderRadius: "5px", background: plCopiedId === pl.id ? "rgba(200,169,110,0.12)" : "transparent", color: "var(--gold)", fontSize: "9px", letterSpacing: "0.1em", cursor: "pointer" }}
                          >
                            {plCopiedId === pl.id ? "COPIED ✓" : "COPY"}
                          </button>
                            <a
                              href={`/pay/${pl.slug ?? pl.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ ...mono, padding: "7px 12px", border: "1px solid rgba(200,169,110,0.2)", borderRadius: "5px", background: "transparent", color: "rgba(200,169,110,0.6)", fontSize: "9px", letterSpacing: "0.1em", cursor: "pointer", textDecoration: "none" }}
                            >
                              OPEN ↗
                            </a>
                          <button
                            type="button"
                            onClick={() => togglePayLink(pl.id, !pl.is_active)}
                            style={{ ...mono, padding: "7px 12px", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "5px", background: "transparent", color: "var(--dim)", fontSize: "9px", letterSpacing: "0.1em", cursor: "pointer" }}
                          >
                            {pl.is_active ? "PAUSE" : "RESUME"}
                          </button>
                          <button
                            type="button"
                            onClick={() => { if (window.confirm("Delete this payment link?")) deletePayLink(pl.id); }}
                            style={{ ...mono, padding: "7px 10px", border: "1px solid rgba(224,85,85,0.2)", borderRadius: "5px", background: "transparent", color: "rgba(224,85,85,0.6)", fontSize: "9px", letterSpacing: "0.1em", cursor: "pointer" }}
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {!payLinksLoading && payLinksLoaded && payLinks.length === 0 && (
                  <div style={{ textAlign: "center", padding: "32px", color: "var(--dim)", fontSize: "13px" }}>
                    No payment links yet. Create your first one above.
                  </div>
                )}

                {/* ── How it works ── */}
                <div style={{ background: "#111120", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "8px", padding: "20px" }}>
                  <div style={{ ...mono, fontSize: "10px", letterSpacing: "0.14em", color: "var(--gold-dim)", marginBottom: "14px" }}>HOW IT WORKS</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
                    {[
                      { n: "01", title: "Upload + price", body: "Choose text or file content, set your price, then click Generate Link." },
                      { n: "02", title: "Share", body: "Copy your /pay/[id] URL and share it anywhere — posts, stories, DMs, bios." },
                      { n: "03", title: "Instant checkout", body: "Buyers unlock instantly with Stripe Checkout and are redirected back to the pay page." },
                    ].map(step => (
                      <div key={step.n} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "8px", padding: "14px" }}>
                        <div style={{ ...mono, fontSize: "18px", color: "rgba(200,169,110,0.35)", marginBottom: "8px" }}>{step.n}</div>
                        <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.75)", marginBottom: "5px" }}>{step.title}</div>
                        <div style={{ fontSize: "12px", color: "var(--dim)", lineHeight: 1.6 }}>{step.body}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeSection === "referrals" && (
              <div style={{ display: "grid", gap: "12px" }}>
                <div style={{ background: "#111120", border: "1px solid rgba(255,255,255,0.055)", borderRadius: "8px", padding: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                    <div style={{ ...mono, fontSize: "10px", color: "var(--gold-dim)", letterSpacing: "0.12em" }}>REFERRAL COMMAND CENTER</div>
                    {!handleUnlocked && (
                      <div style={{ ...mono, fontSize: "9px", color: "var(--dim)", letterSpacing: "0.1em" }}>
                        LOCKED
                      </div>
                    )}
                  </div>
                  
                  <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: "12px", marginTop: "10px" }}>
                    <div>
                      <div style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: "7px", padding: "10px", ...mono, color: "var(--gold)", fontSize: "12px", wordBreak: "break-all" }}>{referralLink}</div>
                      <div style={{ display: "flex", gap: "8px", marginTop: "8px", flexWrap: "wrap" }}>
                        <button type="button" onClick={copyLink} style={{ border: "none", borderRadius: "6px", padding: "8px 12px", background: copied ? "rgba(200,169,110,0.2)" : "var(--gold)", color: copied ? "var(--gold)" : "#120c00", ...mono, fontSize: "11px", letterSpacing: "0.1em", cursor: "pointer" }}>
                          {copied ? "COPIED" : "COPY LINK"}
                        </button>
                        
                        {handleUnlocked ? (
                          <button 
                            type="button" 
                            onClick={() => setShowHandleEdit(!showHandleEdit)}
                            style={{ border: "1px solid rgba(200,169,110,0.4)", borderRadius: "6px", padding: "8px 12px", background: "transparent", color: "var(--gold)", ...mono, fontSize: "11px", letterSpacing: "0.1em", cursor: "pointer" }}
                          >
                            {showHandleEdit ? "CANCEL" : "CUSTOMIZE"}
                          </button>
                        ) : (
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 12px", ...mono, fontSize: "10px", color: "var(--dim)" }}>
                            <span>🔒</span>
                            <span>Customize at ${handleRequired.toLocaleString()} ({(handleUnlockProgress || 0).toFixed(0)}%)</span>
                          </div>
                        )}
                      </div>
                      {copyErr && <div style={{ marginTop: "6px", color: "#ff6a6a", fontSize: "12px" }}>{copyErr}</div>}
                      
                      {/* Custom Handle Editor */}
                      {showHandleEdit && handleUnlocked && (
                        <div style={{ marginTop: "16px", padding: "16px", background: "rgba(255,255,255,0.03)", borderRadius: "8px", border: "1px solid rgba(200,169,110,0.2)" }}>
                          <div style={{ ...mono, fontSize: "10px", color: "var(--gold-dim)", marginBottom: "10px" }}>
                            CUSTOM REFERRAL HANDLE
                          </div>
                          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                            <span style={{ ...mono, fontSize: "12px", color: "var(--dim)" }}>cipher.so/ref/</span>
                            <input
                              type="text"
                              value={customHandle}
                              onChange={e => setCustomHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
                              placeholder="your-handle"
                              maxLength={30}
                              style={{ flex: 1, padding: "10px", background: "#0d0d18", border: "1px solid rgba(255,255,255,0.1)", color: "var(--white)", borderRadius: "6px", ...mono, fontSize: "12px" }}
                            />
                          </div>
                          <div style={{ fontSize: "11px", color: "var(--dim)", marginTop: "6px" }}>
                            3-30 characters, letters, numbers, hyphens, underscores only
                          </div>
                          {handleMsg && (
                            <div style={{ marginTop: "10px", padding: "10px", borderRadius: "6px", fontSize: "12px", background: handleMsg.includes("updated") ? "rgba(76,200,140,0.1)" : "rgba(200,100,100,0.1)", color: handleMsg.includes("updated") ? "#4cc88c" : "#ff8f8f" }}>
                              {handleMsg}
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={updateReferralHandle}
                            disabled={handleSaving}
                            style={{ marginTop: "12px", width: "100%", padding: "12px", border: "none", borderRadius: "6px", background: "var(--gold)", color: "#120c00", ...mono, fontSize: "11px", fontWeight: 600, letterSpacing: "0.1em", cursor: handleSaving ? "not-allowed" : "pointer", opacity: handleSaving ? 0.6 : 1 }}
                          >
                            {handleSaving ? "SAVING..." : "UPDATE REFERRAL LINK"}
                          </button>
                        </div>
                      )}
                      
                      {/* Locked Progress Bar */}
                      {!handleUnlocked && (
                        <div style={{ marginTop: "16px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", ...mono, fontSize: "10px", color: "var(--dim)", marginBottom: "6px" }}>
                            <span>Progress to unlock</span>
                            <span>{(handleUnlockProgress || 0).toFixed(0)}%</span>
                          </div>
                          <div style={{ height: "6px", background: "rgba(255,255,255,0.06)", borderRadius: "3px", overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${Math.min(handleUnlockProgress || 0, 100)}%`, background: "linear-gradient(90deg, var(--gold-dim), var(--gold))", borderRadius: "3px", transition: "width 0.5s ease" }} />
                          </div>
                          <div style={{ fontSize: "11px", color: "var(--dim)", marginTop: "8px" }}>
                            Earn ${handleRequired.toLocaleString()} to unlock custom referral handles
                          </div>
                        </div>
                      )}
                    </div>

                    <div style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: "7px", padding: "10px", display: "grid", placeItems: "center", background: "rgba(255,255,255,0.02)" }}>
                      <svg viewBox="0 0 120 120" width="110" height="110" aria-label="Referral QR">
                        <rect x="0" y="0" width="120" height="120" fill="#0f0f19" />
                        {[8, 20, 32, 60, 72, 84, 96].map((x, idx) => (
                          <rect key={`x${idx}`} x={x} y={x % 40 === 0 ? 20 : 44} width="8" height="8" fill="#c8a96e" />
                        ))}
                        <rect x="8" y="8" width="26" height="26" stroke="#c8a96e" fill="none" />
                        <rect x="86" y="8" width="26" height="26" stroke="#c8a96e" fill="none" />
                        <rect x="8" y="86" width="26" height="26" stroke="#c8a96e" fill="none" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: "10px" }}>
                  {[
                    { label: "Total Creators", value: String(animatedRefStats.totalCreators) },
                    { label: "Active Creators", value: String(animatedRefStats.activeCreators) },
                    { label: "Lifetime Earnings", value: money.format(animatedRefStats.lifetimeEarnings) },
                    { label: "This Month", value: money.format(animatedRefStats.monthEarnings) },
                  ].map(stat => (
                    <div key={stat.label} style={{ background: "#111120", border: "1px solid rgba(255,255,255,0.055)", borderRadius: "8px", padding: "14px" }}>
                      <div style={{ ...mono, fontSize: "10px", color: "var(--gold-dim)", letterSpacing: "0.12em", marginBottom: "8px" }}>{stat.label}</div>
                      <div style={{ ...disp, fontSize: "30px", color: "var(--gold)" }}>{stat.value}</div>
                    </div>
                  ))}
                </div>

                <div style={{ background: "#111120", border: "1px solid rgba(255,255,255,0.055)", borderRadius: "8px", padding: "14px", ...mono, color: "var(--white)", letterSpacing: "0.08em", fontSize: "12px" }}>
                  You are #{referralStats.leaderboardPosition} of all referrers ({referralStats.leaderboardTotal} total)
                </div>
              </div>
            )}

            {activeSection === "analytics" && (
              <div style={{ display: "grid", gap: "12px" }}>
                <FanPredictionEngine />
                <div style={{ background: "#111120", border: "1px solid rgba(255,255,255,0.055)", borderRadius: "8px", padding: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center", marginBottom: "12px", flexWrap: "wrap" }}>
                    <div>
                      <div style={{ ...mono, fontSize: "10px", color: "var(--gold-dim)", letterSpacing: "0.12em" }}>LIVE SOCIAL ANALYTICS</div>
                      <div style={{ fontSize: "12px", color: "var(--dim)", marginTop: "4px" }}>Linked accounts with refreshed follower and engagement signals.</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => void refreshSocialMetrics()}
                      disabled={socialRefreshing}
                      style={{ border: "1px solid rgba(200,169,110,0.3)", borderRadius: "6px", padding: "8px 12px", background: "rgba(200,169,110,0.08)", color: "var(--gold)", ...mono, fontSize: "10px", letterSpacing: "0.1em", cursor: "pointer", opacity: socialRefreshing ? 0.6 : 1 }}
                    >
                      {socialRefreshing ? "REFRESHING..." : "REFRESH METRICS"}
                    </button>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: "10px", marginBottom: "12px" }}>
                    {[
                      { label: "CONNECTED", value: socialAnalyticsSummary.connectedAccounts.toLocaleString() },
                      { label: "FOLLOWERS", value: socialAnalyticsSummary.followers.toLocaleString() },
                      { label: "LIKES", value: socialAnalyticsSummary.likes.toLocaleString() },
                      { label: "VIEWS", value: socialAnalyticsSummary.views.toLocaleString() },
                    ].map((item) => (
                      <div key={item.label} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "8px", padding: "12px" }}>
                        <div style={{ ...mono, fontSize: "9px", color: "var(--gold-dim)", marginBottom: "6px" }}>{item.label}</div>
                        <div style={{ ...disp, fontSize: "28px", color: "var(--gold)" }}>{item.value}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: "grid", gap: "8px" }}>
                    {connections.length === 0 && <div style={{ fontSize: "12px", color: "var(--dim)" }}>No linked social accounts yet.</div>}
                    {connections.map((connection) => (
                      <div key={connection.platform} style={{ display: "grid", gridTemplateColumns: "1.2fr repeat(4,minmax(0,1fr))", gap: "8px", alignItems: "center", padding: "10px 12px", borderRadius: "8px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                        <div>
                          <div style={{ display: "inline-flex", gap: "8px", alignItems: "center" }}>
                            <SocialIcon platform={connection.platform} />
                            <span style={{ fontSize: "12px", color: "var(--white)" }}>{PLATFORM_META[connection.platform].label}</span>
                          </div>
                          <div style={{ fontSize: "11px", color: "var(--dim)", marginTop: "4px" }}>@{connection.platform_username || "unknown"}</div>
                        </div>
                        <div style={{ fontSize: "11px", color: "var(--muted)" }}>{Number(connection.metrics?.followers ?? connection.follower_count ?? 0).toLocaleString()} followers</div>
                        <div style={{ fontSize: "11px", color: "var(--muted)" }}>{Number(connection.metrics?.likes ?? 0).toLocaleString()} likes</div>
                        <div style={{ fontSize: "11px", color: "var(--muted)" }}>{Number(connection.metrics?.views ?? 0).toLocaleString()} views</div>
                        <div style={{ fontSize: "11px", color: "var(--muted)" }}>
                          {connection.metrics?.engagementRate ? `${connection.metrics.engagementRate.toFixed(1)}% engagement` : `${Number(connection.metrics?.posts ?? 0).toLocaleString()} posts`}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: "10px" }}>
                  <div style={{ background: "#111120", border: "1px solid rgba(255,255,255,0.055)", borderRadius: "8px", padding: "14px" }}>
                    <div style={{ ...mono, fontSize: "10px", color: "var(--gold-dim)", letterSpacing: "0.12em" }}>TOTAL PAGE VIEWS</div>
                    <div style={{ ...disp, fontSize: "34px", color: "var(--gold)" }}>{analytics.pageViews}</div>
                  </div>
                  <div style={{ background: "#111120", border: "1px solid rgba(255,255,255,0.055)", borderRadius: "8px", padding: "14px" }}>
                    <div style={{ ...mono, fontSize: "10px", color: "var(--gold-dim)", letterSpacing: "0.12em" }}>CONVERSION RATE</div>
                    <div style={{ ...disp, fontSize: "34px", color: "var(--gold)" }}>{analytics.conversionRate.toFixed(1)}%</div>
                  </div>
                  <div style={{ background: "#111120", border: "1px solid rgba(255,255,255,0.055)", borderRadius: "8px", padding: "14px" }}>
                    <div style={{ ...mono, fontSize: "10px", color: "var(--gold-dim)", letterSpacing: "0.12em" }}>BEST DAY</div>
                    <div style={{ ...disp, fontSize: "34px", color: "var(--gold)" }}>{analytics.bestDay}</div>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div style={{ background: "#111120", border: "1px solid rgba(255,255,255,0.055)", borderRadius: "8px", padding: "14px" }}>
                    <div style={{ ...mono, fontSize: "10px", color: "var(--gold-dim)", letterSpacing: "0.12em", marginBottom: "8px" }}>REVENUE BY CONTENT TYPE</div>
                    <DonutChart data={analytics.byType} />
                    <div style={{ marginTop: "8px", display: "grid", gap: "4px" }}>
                      {analytics.byType.map(s => (
                        <div key={s.label} style={{ fontSize: "12px", color: "var(--muted)", textTransform: "capitalize" }}>{s.label}: {money.format(s.value)}</div>
                      ))}
                    </div>
                  </div>

                  <div style={{ background: "#111120", border: "1px solid rgba(255,255,255,0.055)", borderRadius: "8px", padding: "14px" }}>
                    <div style={{ ...mono, fontSize: "10px", color: "var(--gold-dim)", letterSpacing: "0.12em", marginBottom: "8px" }}>RETENTION + GEO</div>
                    <div style={{ fontSize: "13px", color: "var(--white)", marginBottom: "8px" }}>Fan retention (2+ months): {analytics.retentionRate.toFixed(1)}%</div>
                    <div style={{ display: "grid", gap: "5px" }}>
                      {analytics.topCountries.map(c => (
                        <div key={c.country} style={{ fontSize: "12px", color: "var(--muted)", display: "flex", justifyContent: "space-between" }}><span>{c.country}</span><span>{c.fans}</span></div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeSection === "tools" && (
              <>
                {activeTool === "bio" && <BioGeneratorModal userId={userId} onClose={() => setActiveTool(null)} />}
                {activeTool === "caption" && <CaptionGeneratorModal onClose={() => setActiveTool(null)} />}
                {activeTool === "price" && <PriceOptimizerModal onClose={() => setActiveTool(null)} />}
                {activeTool === "calendar" && <ContentCalendarModal userId={userId} onClose={() => setActiveTool(null)} />}
                {activeTool === "blast" && <FanMessageBlastModal userId={userId} fanCodeCount={fanCodeCount} onClose={() => setActiveTool(null)} />}
                {activeTool === "collab" && <CollabFinderModal userId={userId} onClose={() => setActiveTool(null)} />}
                {activeTool === "tax" && <TaxSummaryModal transactions={transactions} onClose={() => setActiveTool(null)} />}

                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: "10px" }}>
                  {[
                    { key: "bio", title: "Bio Generator", desc: "AI writes 3 creator bio variations from keywords. Pick your favorite, save it.", icon: "✦" },
                    { key: "caption", title: "Caption Generator", desc: "AI writes platform-optimized captions for photos, videos, and announcements.", icon: "✎" },
                    { key: "price", title: "Price Optimizer", desc: "Analyzes your real transaction data. Recommends optimal price with AI confidence score.", icon: "◈" },
                    { key: "calendar", title: "Content Calendar", desc: "7-day planning board. Click each day, assign content drops, schedule to DB.", icon: "⬡" },
                    { key: "blast", title: "Fan Message Blast", desc: "Broadcast to all fans, active fans, or top spenders instantly.", icon: "▲" },
                    { key: "collab", title: "Collaboration Finder", desc: "Discover other CIPHER creators. Send split proposals with custom cut percentages.", icon: "◎" },
                    { key: "voice", title: "Voice Studio", desc: "Private rollout. Coming soon.", icon: "🎙️", comingSoon: true },
                    { key: "tax", title: "Tax Summary", desc: "Full earnings breakdown by year. Platform fee calc. Export CSV for your accountant.", icon: "≡" },
                  ].map(tool => (
                    <button
                      key={tool.key}
                      type="button"
                      onClick={() => {
                        if (tool.comingSoon) return;
                        setActiveTool(tool.key);
                      }}
                      style={{ textAlign: "left", background: "#111120", border: "1px solid rgba(255,255,255,0.055)", borderRadius: "8px", padding: "18px", color: "var(--white)", cursor: tool.comingSoon ? "not-allowed" : "pointer", transition: "border-color 0.2s", opacity: tool.comingSoon ? 0.72 : 1 }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(200,169,110,0.4)")}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.055)")}
                    >
                      <div style={{ fontSize: "24px", marginBottom: "8px", color: "var(--gold)" }}>{tool.icon}</div>
                      <div style={{ ...mono, fontSize: "10px", letterSpacing: "0.12em", color: "var(--gold-dim)", marginBottom: "6px" }}>CREATOR TOOL</div>
                      <div style={{ ...disp, fontSize: "24px", color: "var(--gold)", marginBottom: "8px" }}>{tool.title}</div>
                      <div style={{ fontSize: "12px", color: "var(--dim)", lineHeight: 1.6 }}>{tool.desc}</div>
                      <div style={{ marginTop: "14px", ...mono, fontSize: "10px", color: "rgba(200,169,110,0.6)", letterSpacing: "0.1em" }}>{tool.comingSoon ? "COMING SOON" : "OPEN TOOL →"}</div>
                    </button>
                  ))}
                </div>
              </>
            )}

            {activeSection === "vault" && (
              <div style={{ display: "grid", gap: "12px" }}>
                <div style={{ background: "#111120", border: "1px solid rgba(255,255,255,0.055)", borderRadius: "8px", padding: "18px" }}>
                  <div style={{ ...mono, fontSize: "10px", letterSpacing: "0.14em", color: "var(--gold-dim)", marginBottom: "8px" }}>DARK VAULT</div>
                  <div style={{ fontSize: "13px", color: "var(--dim)", marginBottom: "16px" }}>
                    A 4-digit PIN-protected space only you can access. SHA-256 hashed. Never stored in plaintext.
                  </div>
                  <DarkVault hasPin={hasVaultPin} onSetup={() => {}} />
                </div>
              </div>
            )}

            {activeSection === "legacy" && (
              <div style={{ display: "grid", gap: "12px" }}>
                <LegacyMode />
              </div>
            )}

            {activeSection === "settings" && (
              <div style={{ display: "grid", gap: "10px" }}>
                <div style={{ background: "#111120", border: "1px solid rgba(255,255,255,0.055)", borderRadius: "8px", padding: "16px" }}>
                  <div style={{ ...mono, fontSize: "10px", color: "var(--gold-dim)", letterSpacing: "0.12em", marginBottom: "8px" }}>SETTINGS</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                    <input value={settingsName} onChange={e => setSettingsName(e.target.value)} placeholder="Display name" style={{ background: "#0d0d18", border: "1px solid rgba(255,255,255,0.1)", color: "var(--white)", borderRadius: "6px", padding: "10px" }} />
                    <input value={settingsHandle} onChange={e => setSettingsHandle(e.target.value)} placeholder="Handle" style={{ background: "#0d0d18", border: "1px solid rgba(255,255,255,0.1)", color: "var(--white)", borderRadius: "6px", padding: "10px" }} />
                  </div>
                  <textarea value={settingsBio} onChange={e => setSettingsBio(e.target.value)} placeholder="Bio" style={{ marginTop: "10px", width: "100%", minHeight: "80px", background: "#0d0d18", border: "1px solid rgba(255,255,255,0.1)", color: "var(--white)", borderRadius: "6px", padding: "10px" }} />
                  <div style={{ display: "flex", gap: "8px", marginTop: "10px", flexWrap: "wrap" }}>
                    <select value={settingsCategory} onChange={e => setSettingsCategory(e.target.value)} style={{ background: "#0d0d18", border: "1px solid rgba(255,255,255,0.1)", color: "var(--white)", borderRadius: "6px", padding: "10px" }}>
                      <option value="luxury">Luxury</option>
                      <option value="fitness">Fitness</option>
                      <option value="music">Music</option>
                      <option value="education">Education</option>
                    </select>
                    <button type="button" onClick={() => setSettings2fa(v => !v)} style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: "6px", padding: "10px", background: settings2fa ? "rgba(200,169,110,0.18)" : "transparent", color: settings2fa ? "var(--gold)" : "var(--muted)", ...mono, fontSize: "11px", letterSpacing: "0.1em", cursor: "pointer" }}>{settings2fa ? "2FA ENABLED" : "2FA DISABLED"}</button>
                    <button type="button" onClick={() => setExportOpen(true)} style={{ border: "1px solid rgba(200,169,110,0.35)", borderRadius: "6px", padding: "10px 12px", background: "rgba(200,169,110,0.08)", color: "var(--gold)", ...mono, fontSize: "11px", letterSpacing: "0.1em", cursor: "pointer" }}>EXPORT DATA</button>
                    <button type="button" onClick={saveSettings} disabled={settingsSaving} style={{ border: "none", borderRadius: "6px", padding: "10px 14px", background: "var(--gold)", color: "#120c00", ...mono, fontSize: "11px", letterSpacing: "0.1em", cursor: "pointer" }}>{settingsSaving ? "SAVING" : "SAVE"}</button>
                  </div>
                  {settingsMsg && <div style={{ marginTop: "8px", color: settingsMsg.includes("saved") ? "var(--gold)" : "#ff6a6a", fontSize: "12px" }}>{settingsMsg}</div>}
                </div>

                <div style={{ background: "#111120", border: "1px solid rgba(255,255,255,0.055)", borderRadius: "8px", padding: "16px" }}>
                  <div style={{ ...mono, fontSize: "10px", color: "var(--gold-dim)", letterSpacing: "0.12em", marginBottom: "8px" }}>EXPORT CENTER</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: "12px" }}>
                    <div>
                      <div style={{ fontSize: "14px", color: "var(--white)" }}>Generate creator-safe exports directly in the browser.</div>
                      <div style={{ fontSize: "12px", color: "var(--dim)", marginTop: "8px", lineHeight: 1.7 }}>ZIP exports include fan CRM, earnings history, content performance, and a machine-readable summary. No extra fan data leaves the device during export.</div>
                    </div>
                    <div style={{ border: "1px solid rgba(200,169,110,0.18)", borderRadius: "8px", padding: "12px", background: "rgba(200,169,110,0.04)" }}>
                      <div style={{ fontSize: "12px", color: "var(--muted)", display: "flex", justifyContent: "space-between" }}><span>Fans file</span><span>{estimateFileSizeLabel(toCsv(fanInsights.map(fan => ({ code: fan.code, total: fan.totalSpent }))))}</span></div>
                      <div style={{ fontSize: "12px", color: "var(--muted)", display: "flex", justifyContent: "space-between", marginTop: "6px" }}><span>Earnings rows</span><span>{transactions.length}</span></div>
                      <div style={{ fontSize: "12px", color: "var(--muted)", display: "flex", justifyContent: "space-between", marginTop: "6px" }}><span>Content items</span><span>{contentItems.length}</span></div>
                      <div style={{ fontSize: "12px", color: "#8dcfff", marginTop: "10px" }}>Privacy note: exports are local downloads. Use the GDPR contact action for deletion or subject-access requests.</div>
                    </div>
                  </div>
                </div>

                <div style={{ background: "#111120", border: "1px solid rgba(255,255,255,0.055)", borderRadius: "8px", padding: "16px" }}>
                  <div style={{ ...mono, fontSize: "10px", color: "var(--gold-dim)", letterSpacing: "0.12em", marginBottom: "8px" }}>CONNECTED ACCOUNTS</div>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", marginBottom: "12px", alignItems: "center", flexWrap: "wrap" }}>
                    <div style={{ fontSize: "12px", color: "var(--dim)" }}>Connect your social platforms, then refresh live follower and engagement stats.</div>
                    <button
                      type="button"
                      onClick={() => void refreshSocialMetrics()}
                      disabled={socialRefreshing}
                      style={{ border: "1px solid rgba(200,169,110,0.3)", borderRadius: "6px", padding: "8px 12px", background: "rgba(200,169,110,0.08)", color: "var(--gold)", ...mono, fontSize: "10px", letterSpacing: "0.1em", cursor: "pointer", opacity: socialRefreshing ? 0.6 : 1 }}
                    >
                      {socialRefreshing ? "REFRESHING..." : "REFRESH LIVE METRICS"}
                    </button>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "10px" }}>
                    {SOCIAL_PLATFORMS.map(platform => {
                      const meta = PLATFORM_META[platform];
                      const connected = connections.find(c => c.platform === platform) ?? null;
                      const isConnected = Boolean(connected);
                      const canConnect = oauthAvailable[platform];
                      const isBusy = socialLoading === platform;

                      return (
                        <div
                          key={platform}
                          style={{
                            border: `1px solid ${isConnected ? "rgba(57,197,111,0.5)" : `${meta.color}66`}`,
                            borderRadius: "8px",
                            padding: "12px",
                            background: "rgba(255,255,255,0.02)",
                            boxShadow: isConnected ? `0 0 18px ${meta.color}33` : "none",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                            <div style={{ display: "inline-flex", gap: "8px", alignItems: "center" }}>
                              <SocialIcon platform={platform} />
                              <div style={{ fontSize: "13px", color: "var(--white)" }}>{meta.label}</div>
                            </div>
                            <div style={{ ...mono, fontSize: "9px", color: isConnected ? "#39c56f" : "var(--dim)", letterSpacing: "0.08em" }}>
                              {isConnected ? "CONNECTED" : "NOT CONNECTED"}
                            </div>
                          </div>

                          <div style={{ fontSize: "12px", color: "var(--muted)", minHeight: "20px" }}>
                            {isConnected
                              ? `@${connected?.platform_username || "unknown"}`
                              : canConnect
                                ? "Ready to connect"
                                : "Coming soon"}
                          </div>

                          {isConnected && (
                            <div style={{ marginTop: "8px", display: "grid", gap: "4px" }}>
                              <div style={{ fontSize: "11px", color: "var(--white)" }}>{Number(connected?.metrics?.followers ?? connected?.follower_count ?? 0).toLocaleString()} followers</div>
                              {!!connected?.metrics?.engagementRate && <div style={{ fontSize: "11px", color: "#8dcfff" }}>{connected.metrics.engagementRate.toFixed(1)}% engagement</div>}
                              {!!connected?.metrics?.likes && <div style={{ fontSize: "11px", color: "var(--dim)" }}>{Number(connected.metrics.likes).toLocaleString()} likes</div>}
                              {!!connected?.metrics?.views && <div style={{ fontSize: "11px", color: "var(--dim)" }}>{Number(connected.metrics.views).toLocaleString()} views</div>}
                              {!!connected?.metrics?.posts && <div style={{ fontSize: "11px", color: "var(--dim)" }}>{Number(connected.metrics.posts).toLocaleString()} posts</div>}
                              <div style={{ ...mono, fontSize: "9px", color: "var(--dim)" }}>
                                {connected?.last_synced_at ? `Synced ${formatDateTime(connected.last_synced_at)}` : "Not synced yet"}
                              </div>
                            </div>
                          )}

                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "10px", gap: "8px" }}>
                            {platform === "telegram" && canConnect && !isConnected && (
                              <a
                                href={`/api/auth/telegram/connect`}
                                style={{ ...mono, fontSize: "10px", color: meta.color, letterSpacing: "0.08em", textDecoration: "none" }}
                              >
                                TELEGRAM LOGIN
                              </a>
                            )}
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => {
                                if (isConnected) {
                                  void disconnectPlatform(platform);
                                } else {
                                  void connectPlatform(platform);
                                }
                              }}
                              style={{
                                border: "none",
                                borderRadius: "6px",
                                padding: "8px 10px",
                                background: isConnected ? "rgba(255,255,255,0.1)" : canConnect ? meta.color : "rgba(255,255,255,0.08)",
                                color: isConnected ? "var(--white)" : canConnect ? "#020203" : "var(--dim)",
                                ...mono,
                                fontSize: "10px",
                                letterSpacing: "0.09em",
                                cursor: "pointer",
                                marginLeft: "auto",
                              }}
                            >
                              {isBusy ? "WORKING..." : isConnected ? "DISCONNECT" : canConnect ? "CONNECT" : "COMING SOON"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {socialMsg && <div style={{ marginTop: "10px", fontSize: "12px", color: socialMsg.includes("success") || socialMsg.includes("connected") ? "#39c56f" : "#ffb86c" }}>{socialMsg}</div>}
                </div>

                <div style={{ border: "1px solid rgba(255,82,82,0.35)", background: "rgba(255,82,82,0.09)", borderRadius: "8px", padding: "14px" }}>
                  <div style={{ ...mono, fontSize: "10px", letterSpacing: "0.12em", color: "#ff7a7a" }}>DANGER ZONE</div>
                  <div style={{ fontSize: "13px", color: "#ffb3b3", marginTop: "6px" }}>Delete account action is UI-only for now.</div>
                  <button type="button" onClick={() => window.confirm("Delete account? This is a UI-only action right now.")} style={{ marginTop: "8px", border: "1px solid rgba(255,82,82,0.5)", borderRadius: "6px", padding: "8px 12px", background: "transparent", color: "#ff9b9b", ...mono, fontSize: "11px", letterSpacing: "0.1em", cursor: "pointer" }}>DELETE ACCOUNT</button>
                </div>
              </div>
            )}

            {selectedFan && (
              <DashboardModal
                title={selectedFan.custom_name || selectedFan.code}
                subtitle="Private fan profile with transaction history and creator-only notes."
                onClose={() => setSelectedFanCode(null)}
              >
                <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: "16px" }}>
                  <div style={{ display: "grid", gap: "12px" }}>
                    <div style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", padding: "14px", background: "rgba(255,255,255,0.02)" }}>
                      <div style={{ ...mono, fontSize: "10px", color: "var(--gold-dim)", letterSpacing: "0.12em" }}>PROFILE</div>
                      <div style={{ fontSize: "13px", color: "var(--dim)", marginTop: "8px" }}>Fan code: <span style={{ color: "var(--white)" }}>{selectedFan.code}</span></div>
                      <div style={{ fontSize: "13px", color: "var(--dim)", marginTop: "4px" }}>First interaction: <span style={{ color: "var(--white)" }}>{formatDateTime(selectedFan.firstSeen)}</span></div>
                      <div style={{ fontSize: "13px", color: "var(--dim)", marginTop: "4px" }}>Last active: <span style={{ color: "var(--white)" }}>{formatDateTime(selectedFan.lastActive)}</span></div>
                      <div style={{ fontSize: "13px", color: "var(--dim)", marginTop: "4px" }}>Status: <span style={{ color: selectedFan.statusLabel === "active" ? "#39c56f" : "var(--white)" }}>{selectedFan.statusLabel}</span></div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "10px" }}>
                        {selectedFan.tags.length === 0 && <span style={{ fontSize: "12px", color: "var(--muted)" }}>No tags saved.</span>}
                        {selectedFan.tags.map(tag => <span key={tag} style={{ border: `1px solid ${tagColor(tag)}55`, background: `${tagColor(tag)}1a`, color: tagColor(tag), borderRadius: "999px", padding: "4px 8px", fontSize: "11px" }}>{tag}</span>)}
                      </div>
                      {selectedFan.creator_notes && <div style={{ marginTop: "10px", fontSize: "13px", color: "var(--white)", lineHeight: 1.7 }}>{selectedFan.creator_notes}</div>}
                    </div>

                    <div style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", padding: "14px", background: "rgba(255,255,255,0.02)" }}>
                      <div style={{ ...mono, fontSize: "10px", color: "var(--gold-dim)", letterSpacing: "0.12em", marginBottom: "8px" }}>TRANSACTION HISTORY</div>
                      <div style={{ display: "grid", gap: "8px" }}>
                        {selectedFan.transactions.length === 0 && <div style={{ fontSize: "12px", color: "var(--muted)" }}>No linked transactions yet.</div>}
                        {selectedFan.transactions.slice(0, 8).map(tx => (
                          <div key={tx.id} style={{ display: "grid", gridTemplateColumns: "0.8fr 1fr 1fr", gap: "8px", padding: "10px", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "8px" }}>
                            <div style={{ ...disp, fontSize: "22px", color: "var(--gold)" }}>{money.format(tx.amount)}</div>
                            <div style={{ fontSize: "12px", color: "var(--muted)", textTransform: "capitalize" }}>{tx.type ?? "subscription"}</div>
                            <div style={{ fontSize: "12px", color: "var(--dim)", textAlign: "right" }}>{formatDateTime(tx.created_at)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "grid", gap: "12px" }}>
                    <div style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", padding: "14px", background: "rgba(255,255,255,0.02)" }}>
                      <div style={{ ...mono, fontSize: "10px", color: "var(--gold-dim)", letterSpacing: "0.12em" }}>VALUE SIGNALS</div>
                      <div style={{ ...disp, fontSize: "32px", color: "var(--gold)", marginTop: "8px" }}>{money.format(selectedFan.totalSpent)}</div>
                      <div style={{ fontSize: "12px", color: "var(--dim)", marginTop: "6px" }}>{selectedFan.transactionCount} transactions linked</div>
                      <div style={{ fontSize: "12px", color: "var(--dim)", marginTop: "4px" }}>{selectedFan.is_vip ? "High-touch VIP experience enabled." : "Not marked as VIP yet."}</div>
                    </div>

                    <div style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", padding: "14px", background: "rgba(255,255,255,0.02)" }}>
                      <div style={{ ...mono, fontSize: "10px", color: "var(--gold-dim)", letterSpacing: "0.12em" }}>CONTENT ACCESSED <span style={{ fontSize: "9px", opacity: 0.5 }}>(estimate)</span></div>
                      <div style={{ display: "grid", gap: "8px", marginTop: "10px" }}>
                        {selectedFan.estimatedContentPreview.map(item => (
                          <div key={item} style={{ fontSize: "13px", color: "var(--white)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "8px", padding: "10px" }}>{item}</div>
                        ))}
                      </div>
                    </div>

                    <div style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", padding: "14px", background: "rgba(255,255,255,0.02)" }}>
                      <div style={{ ...mono, fontSize: "10px", color: "var(--gold-dim)", letterSpacing: "0.12em" }}>NEXT ACTION</div>
                      <div style={{ fontSize: "13px", color: "var(--dim)", marginTop: "8px", lineHeight: 1.7 }}>Use this record to prep a private perk, comeback offer, or early-access drop. Messaging itself stays manual.</div>
                      <button type="button" onClick={() => window.alert("Special offer composer is a UI stub for now.")} style={{ marginTop: "12px", border: "none", borderRadius: "6px", padding: "10px 12px", background: "var(--gold)", color: "#120c00", ...mono, fontSize: "10px", letterSpacing: "0.1em", cursor: "pointer" }}>SEND SPECIAL OFFER</button>
                    </div>
                  </div>
                </div>
              </DashboardModal>
            )}

            {exportOpen && (
              <DashboardModal
                title="Export Creator Data"
                subtitle="Client-side ZIP export with privacy-safe messaging and no extra server processing."
                onClose={() => setExportOpen(false)}
              >
                <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "16px" }}>
                  <div style={{ display: "grid", gap: "12px" }}>
                    <div style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", padding: "14px", background: "rgba(255,255,255,0.02)" }}>
                      <div style={{ ...mono, fontSize: "10px", color: "var(--gold-dim)", letterSpacing: "0.12em" }}>INCLUDED FILES</div>
                      <div style={{ display: "grid", gap: "8px", marginTop: "10px" }}>
                        <div style={{ fontSize: "13px", color: "var(--white)" }}>fans.csv</div>
                        <div style={{ fontSize: "12px", color: "var(--dim)" }}>Private CRM fields, VIP labels, tag segments, and lifetime value.</div>
                        <div style={{ fontSize: "13px", color: "var(--white)", marginTop: "6px" }}>earnings.csv</div>
                        <div style={{ fontSize: "12px", color: "var(--dim)" }}>Transaction-level exports for bookkeeping and reconciliation.</div>
                        <div style={{ fontSize: "13px", color: "var(--white)", marginTop: "6px" }}>content-performance.csv</div>
                        <div style={{ fontSize: "12px", color: "var(--dim)" }}>Content pricing, burn mode, and estimated performance based on available dashboard records.</div>
                        <div style={{ fontSize: "13px", color: "var(--white)", marginTop: "6px" }}>summary.json</div>
                        <div style={{ fontSize: "12px", color: "var(--dim)" }}>Portable metadata, totals, and export timestamp.</div>
                      </div>
                    </div>

                    <div style={{ border: "1px solid rgba(29,161,242,0.24)", borderRadius: "10px", padding: "14px", background: "rgba(29,161,242,0.06)" }}>
                      <div style={{ ...mono, fontSize: "10px", color: "#8dcfff", letterSpacing: "0.12em" }}>PRIVACY</div>
                      <div style={{ fontSize: "13px", color: "var(--white)", marginTop: "8px", lineHeight: 1.7 }}>These exports are assembled in-browser and downloaded immediately. CIPHER does not upload a second copy during export generation. For deletion requests or subject-access workflows, contact privacy directly.</div>
                    </div>
                  </div>

                  <div style={{ display: "grid", gap: "12px" }}>
                    <div style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", padding: "14px", background: "rgba(255,255,255,0.02)" }}>
                      <div style={{ ...mono, fontSize: "10px", color: "var(--gold-dim)", letterSpacing: "0.12em" }}>EXPORT SNAPSHOT</div>
                      <div style={{ display: "grid", gap: "6px", marginTop: "10px" }}>
                        <div style={{ fontSize: "12px", color: "var(--muted)", display: "flex", justifyContent: "space-between" }}><span>Fan records</span><span>{fanInsights.length}</span></div>
                        <div style={{ fontSize: "12px", color: "var(--muted)", display: "flex", justifyContent: "space-between" }}><span>Transactions</span><span>{transactions.length}</span></div>
                        <div style={{ fontSize: "12px", color: "var(--muted)", display: "flex", justifyContent: "space-between" }}><span>Content rows</span><span>{contentItems.length}</span></div>
                        <div style={{ fontSize: "12px", color: "var(--muted)", display: "flex", justifyContent: "space-between" }}><span>Estimated fan CSV size</span><span>{estimateFileSizeLabel(toCsv(fanInsights.map(fan => ({ code: fan.code, spent: fan.totalSpent, notes: fan.creator_notes ?? "" }))))}</span></div>
                      </div>
                    </div>

                    <button type="button" onClick={() => void exportDataBundle()} disabled={exportBusy} style={{ border: "none", borderRadius: "8px", padding: "12px 14px", background: "var(--gold)", color: "#120c00", ...mono, fontSize: "11px", letterSpacing: "0.1em", cursor: "pointer" }}>{exportBusy ? "BUILDING ZIP" : "DOWNLOAD ZIP EXPORT"}</button>
                    <a href="mailto:privacy@cipher.so?subject=GDPR%20data%20request" style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px", padding: "12px 14px", color: "var(--white)", textDecoration: "none", ...mono, fontSize: "11px", letterSpacing: "0.1em", textAlign: "center" }}>CONTACT PRIVACY / GDPR</a>
                    {exportMsg && <div style={{ fontSize: "12px", color: exportMsg.includes("downloaded") ? "#39c56f" : "#ff8a8a" }}>{exportMsg}</div>}
                  </div>
                </div>
              </DashboardModal>
            )}
          </main>
        </div>

        <nav className="db-mobile-nav" style={{ display: "none" }}>
          {SECTIONS.slice(0, 5).map(({ key, label }) => (
            <button key={key} type="button" onClick={() => setActiveSection(key)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", padding: "8px 12px", background: "transparent", border: "none", fontSize: "10px", color: activeSection === key ? "var(--gold)" : "var(--dim)", textDecoration: "none", ...mono }}>
              <span style={{ fontSize: "9px", letterSpacing: "0.1em" }}>{label}</span>
            </button>
          ))}
        </nav>
      </div>

      <style>{`
        @keyframes pulseGold {
          0%, 100% { box-shadow: 0 0 0 rgba(200,169,110,0.0); }
          50% { box-shadow: 0 0 20px rgba(200,169,110,0.28); }
        }
        @media (hover: hover) and (pointer: fine) {
          #db-cursor, #db-ring { display: block; }
        }
        @media (hover: none), (pointer: coarse) {
          #db-cursor, #db-ring { display: none !important; }
        }
        @media (max-width: 1100px) {
          .db-main main > div:first-child { grid-template-columns: repeat(2, minmax(0,1fr)) !important; }
        }
        @media (max-width: 768px) {
          .db-sidebar { display: none !important; }
          .db-main { margin-left: 0 !important; padding-bottom: 74px; }
          .db-mobile-nav {
            display: flex !important;
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background: rgba(8,8,15,0.97);
            border-top: 1px solid rgba(255,255,255,0.07);
            justify-content: space-around;
            padding: 10px 0 calc(10px + env(safe-area-inset-bottom));
            z-index: 200;
            backdrop-filter: blur(12px);
          }
        }
      `}</style>
    </>
  );
}
