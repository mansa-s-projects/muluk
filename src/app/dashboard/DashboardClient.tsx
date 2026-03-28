"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

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
};

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});
const mono: React.CSSProperties = { fontFamily: "var(--font-mono)" };
const disp: React.CSSProperties = { fontFamily: "var(--font-display)" };

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
  { key: "referrals", label: "Referrals" },
  { key: "analytics", label: "Analytics" },
  { key: "tools", label: "Tools" },
  { key: "settings", label: "Settings" },
] as const;

type SectionKey = (typeof SECTIONS)[number]["key"];

export default function DashboardClient({ data }: { data: DashboardData }) {
  const {
    wallet,
    fanCodes,
    fanCodeCount,
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
    missingTables,
    userEmail,
    userId,
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
  const [contentExpiry, setContentExpiry] = useState("24h");
  const [contentSaving, setContentSaving] = useState(false);
  const [contentMsg, setContentMsg] = useState("");

  const [withdrawMethod, setWithdrawMethod] = useState("USDC");
  const [withdrawAmount, setWithdrawAmount] = useState("20");
  const [withdrawSaving, setWithdrawSaving] = useState(false);
  const [withdrawMsg, setWithdrawMsg] = useState("");

  const [settingsName, setSettingsName] = useState("");
  const [settingsHandle, setSettingsHandle] = useState("");
  const [settingsBio, setSettingsBio] = useState("");
  const [settingsCategory, setSettingsCategory] = useState("luxury");
  const [settings2fa, setSettings2fa] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState("");
  const [settingsSaving, setSettingsSaving] = useState(false);

  const [animatedRefStats, setAnimatedRefStats] = useState({
    totalCreators: 0,
    activeCreators: 0,
    lifetimeEarnings: 0,
    monthEarnings: 0,
  });

  const handle = userEmail.split("@")[0] || userId.slice(0, 8);
  const referralLink = `cipher.so/ref/${handle}`;
  const maxChart = Math.max(...chartData.map(d => d.amount), 1);
  const forecast = useMemo(() => {
    const totalWeek = chartData.reduce((sum, d) => sum + d.amount, 0);
    const daily = totalWeek / 7;
    return daily * 30;
  }, [chartData]);

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
        throw new Error(msg || "Failed to generate draft");
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
      setAiErr("Generation failed. Try again.");
    } finally {
      setAiLoading(false);
    }
  };

  const saveContentItem = async () => {
    setContentMsg("");
    if (!contentTitle.trim()) {
      setContentMsg("Title is required.");
      return;
    }

    const now = new Date();
    const expiresAt = new Date(now);
    if (contentExpiry === "24h") expiresAt.setHours(expiresAt.getHours() + 24);
    if (contentExpiry === "7d") expiresAt.setDate(expiresAt.getDate() + 7);
    if (contentExpiry === "30d") expiresAt.setDate(expiresAt.getDate() + 30);

    setContentSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("content_items").insert({
        creator_id: userId,
        title: contentTitle.trim(),
        description: contentDesc.trim(),
        price: Number(contentPrice || 0),
        burn_mode: burnMode,
        expires_at: burnMode ? expiresAt.toISOString() : null,
        status: "active",
      });

      if (error) throw error;
      setContentMsg("Content item saved. Refresh to see latest.");
      setContentTitle("");
      setContentDesc("");
      setContentPrice("0");
    } catch (err) {
      console.error("Save content failed:", err);
      setContentMsg("Could not save content item.");
    } finally {
      setContentSaving(false);
    }
  };

  const requestWithdrawal = async () => {
    setWithdrawMsg("");
    const amt = Number(withdrawAmount || 0);
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

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <>
      <div id="db-cursor" style={{ position: "fixed", width: "8px", height: "8px", background: "var(--gold)", borderRadius: "50%", pointerEvents: "none", zIndex: 99999, top: "-100px", left: "-100px", transform: "translate(-50%,-50%)", mixBlendMode: "screen" }} />
      <div id="db-ring" style={{ position: "fixed", width: "32px", height: "32px", border: "1px solid rgba(200,169,110,0.4)", borderRadius: "50%", pointerEvents: "none", zIndex: 99998, top: "-100px", left: "-100px", transform: "translate(-50%,-50%)" }} />
      <Cursor />

      <div style={{ display: "flex", minHeight: "100vh", background: "#020203", backgroundImage: "radial-gradient(circle at 10% 5%, rgba(200,169,110,0.09), transparent 40%)" }}>
        <aside className="db-sidebar" style={{ width: "220px", position: "fixed", top: 0, left: 0, bottom: 0, background: "rgba(8,8,15,0.98)", borderRight: "1px solid rgba(255,255,255,0.055)", display: "flex", flexDirection: "column", zIndex: 100, backdropFilter: "blur(12px)" }}>
          <div style={{ padding: "24px 20px", borderBottom: "1px solid rgba(255,255,255,0.055)" }}>
            <a href="/" style={{ ...mono, fontSize: "13px", fontWeight: 500, letterSpacing: "0.3em", color: "var(--gold)", textDecoration: "none", display: "block", marginBottom: "3px" }}>CIPHER</a>
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

          <div style={{ padding: "16px 20px", borderTop: "1px solid rgba(255,255,255,0.055)" }}>
            <div style={{ ...mono, fontSize: "9px", letterSpacing: "0.2em", color: "var(--gold-dim)", marginBottom: "6px", textTransform: "uppercase" }}>Signed in as</div>
            <div style={{ fontSize: "12px", color: "var(--muted)", marginBottom: "14px", wordBreak: "break-all", lineHeight: 1.4 }}>{userEmail}</div>
            <button type="button" onClick={handleSignOut} style={{ ...mono, width: "100%", padding: "9px", background: "transparent", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "3px", color: "var(--dim)", fontSize: "10px", letterSpacing: "0.15em", cursor: "pointer", transition: "all 0.2s" }}>SIGN OUT</button>
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
                  setUnreadCount(0);
                }}
                style={{ position: "relative", width: "34px", height: "34px", borderRadius: "50%", border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.02)", color: "var(--gold)", cursor: "pointer" }}
              >
                B
                {unreadCount > 0 && (
                  <span style={{ position: "absolute", top: "-4px", right: "-2px", minWidth: "18px", height: "18px", borderRadius: "9px", background: "var(--gold)", color: "#120c00", ...mono, fontSize: "10px", display: "grid", placeItems: "center" }}>
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

              <div style={{ width: "30px", height: "30px", borderRadius: "50%", border: "1px solid rgba(200,169,110,0.3)", display: "grid", placeItems: "center", ...mono, color: "var(--gold)", background: "var(--gold-glow)" }}>
                {(userEmail[0] || "C").toUpperCase()}
              </div>
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
              </>
            )}

            {activeSection === "content" && (
              <div style={{ display: "grid", gap: "12px" }}>
                <div style={{ background: "#111120", border: "1px solid rgba(255,255,255,0.055)", borderRadius: "8px", padding: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ ...mono, fontSize: "10px", letterSpacing: "0.12em", color: "var(--gold-dim)" }}>BURN MODE CONTENT SCHEDULER</div>
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
                  <textarea value={contentDesc} onChange={e => setContentDesc(e.target.value)} placeholder="Description" style={{ marginTop: "10px", width: "100%", minHeight: "72px", background: "#0d0d18", border: "1px solid rgba(255,255,255,0.1)", color: "var(--white)", borderRadius: "6px", padding: "10px" }} />
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
                </div>

                <div style={{ background: "#111120", border: "1px solid rgba(255,255,255,0.055)", borderRadius: "8px", padding: "16px" }}>
                  <div style={{ ...mono, fontSize: "10px", color: "var(--gold-dim)", letterSpacing: "0.12em", marginBottom: "10px" }}>ACTIVE CONTENT ITEMS</div>
                  {contentItems.length === 0 && <div style={{ color: "var(--muted)" }}>No content items yet. Schedule your first drop above.</div>}
                  <div style={{ display: "grid", gap: "8px" }}>
                    {contentItems.map(item => {
                      const left = daysLeft(item.expires_at);
                      const expiring = left !== null && left <= 2;
                      return (
                        <div key={item.id} style={{ border: `1px solid ${expiring ? "rgba(200,169,110,0.5)" : "rgba(255,255,255,0.08)"}`, borderRadius: "7px", padding: "10px", background: "rgba(255,255,255,0.02)", animation: expiring ? "pulseGold 1.4s ease-in-out infinite" : "none" }}>
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <div style={{ fontSize: "14px", color: "var(--white)" }}>{item.title}</div>
                            <div style={{ ...disp, fontSize: "24px", color: "var(--gold)" }}>{money.format(item.price)}</div>
                          </div>
                          <div style={{ fontSize: "12px", color: "var(--dim)" }}>{item.description || "No description"}</div>
                          <div style={{ ...mono, fontSize: "10px", color: "var(--muted)", marginTop: "6px" }}>
                            {item.burn_mode ? `Burn mode - ${left ?? "?"} day(s) left` : "Persistent content"}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {activeSection === "fans" && (
              <div style={{ background: "#111120", border: "1px solid rgba(255,255,255,0.055)", borderRadius: "8px", padding: "16px" }}>
                <div style={{ ...mono, fontSize: "10px", color: "var(--gold-dim)", letterSpacing: "0.12em", marginBottom: "8px" }}>FAN HEAT MAP</div>
                <div style={{ fontSize: "14px", color: "var(--white)", marginBottom: "12px" }}>Top fans by spending, sorted descending</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: "10px" }}>
                  {heatMap.length === 0 && <div style={{ color: "var(--muted)" }}>No fan spend data yet.</div>}
                  {heatMap.map((row, idx) => {
                    const tier = idx === 0 ? "gold" : idx < Math.ceil(heatMap.length / 2) ? "silver" : "dim";
                    const borderColor = tier === "gold" ? "#c8a96e" : tier === "silver" ? "#a7adb8" : "rgba(255,255,255,0.12)";
                    return (
                      <div key={row.fan_code} style={{ border: `1px solid ${borderColor}`, borderRadius: "8px", padding: "12px", background: "rgba(255,255,255,0.02)" }}>
                        <div style={{ ...mono, fontSize: "11px", color: "var(--gold)", letterSpacing: "0.1em" }}>{row.fan_code}</div>
                        <div style={{ ...disp, fontSize: "30px", color: "var(--white)", marginTop: "6px" }}>{money.format(row.total)}</div>
                        <div style={{ fontSize: "12px", color: "var(--dim)", marginTop: "4px" }}>Last active: {formatDate(row.last_active)}</div>
                        <div style={{ ...mono, fontSize: "10px", color: "var(--muted)", marginTop: "6px" }}>{row.subscription_status}</div>
                      </div>
                    );
                  })}
                </div>

                <div style={{ marginTop: "14px", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "12px" }}>
                  <div style={{ ...mono, fontSize: "10px", color: "var(--gold-dim)", letterSpacing: "0.12em", marginBottom: "8px" }}>FAN CODES</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "8px" }}>
                    {fanCodes.map(fc => (
                      <div key={fc.id} style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: "7px", padding: "8px", background: "rgba(255,255,255,0.02)" }}>
                        <div style={{ ...mono, color: "var(--gold)", fontSize: "11px" }}>{fc.code}</div>
                        <div style={{ fontSize: "11px", color: "var(--dim)" }}>{formatDate(fc.created_at)}</div>
                        <div style={{ ...mono, fontSize: "10px", color: "var(--muted)", marginTop: "4px" }}>{fc.status}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeSection === "earnings" && (
              <div style={{ display: "grid", gap: "12px" }}>
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
                      <option>Stripe</option>
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

            {activeSection === "referrals" && (
              <div style={{ display: "grid", gap: "12px" }}>
                <div style={{ background: "#111120", border: "1px solid rgba(255,255,255,0.055)", borderRadius: "8px", padding: "16px" }}>
                  <div style={{ ...mono, fontSize: "10px", color: "var(--gold-dim)", letterSpacing: "0.12em" }}>REFERRAL COMMAND CENTER</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: "12px", marginTop: "10px" }}>
                    <div>
                      <div style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: "7px", padding: "10px", ...mono, color: "var(--gold)", fontSize: "12px", wordBreak: "break-all" }}>{referralLink}</div>
                      <button type="button" onClick={copyLink} style={{ marginTop: "8px", border: "none", borderRadius: "6px", padding: "8px 12px", background: copied ? "rgba(200,169,110,0.2)" : "var(--gold)", color: copied ? "var(--gold)" : "#120c00", ...mono, fontSize: "11px", letterSpacing: "0.1em", cursor: "pointer" }}>
                        {copied ? "COPIED" : "COPY LINK"}
                      </button>
                      {copyErr && <div style={{ marginTop: "6px", color: "#ff6a6a", fontSize: "12px" }}>{copyErr}</div>}
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
                    <div style={{ display: "flex", width: "140px", height: "140px", borderRadius: "50%", overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)" }}>
                      {analytics.byType.map(slice => {
                        const total = analytics.byType.reduce((s, v) => s + v.value, 0) || 1;
                        const width = `${(slice.value / total) * 100}%`;
                        return <div key={slice.label} style={{ width, background: slice.label === "subscription" ? "#c8a96e" : slice.label === "tip" ? "#987a4c" : "#5f5137" }} />;
                      })}
                    </div>
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
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: "10px" }}>
                {[
                  { title: "Bio Generator", desc: "AI writes creator bio from 3 keywords" },
                  { title: "Price Optimizer", desc: "Optimal price recommendation for your audience" },
                  { title: "Content Calendar", desc: "7-day planning board" },
                  { title: "Fan Message Blast", desc: "Broadcast to active fan codes" },
                  { title: "Collaboration Finder", desc: "Discover creators by category" },
                  { title: "Tax Summary", desc: "Export earnings CSV" },
                ].map(tool => (
                  <button key={tool.title} type="button" style={{ textAlign: "left", background: "#111120", border: "1px solid rgba(255,255,255,0.055)", borderRadius: "8px", padding: "14px", color: "var(--white)", cursor: "pointer" }}>
                    <div style={{ ...mono, fontSize: "10px", letterSpacing: "0.12em", color: "var(--gold-dim)", marginBottom: "6px" }}>CREATOR TOOL</div>
                    <div style={{ ...disp, fontSize: "26px", color: "var(--gold)" }}>{tool.title}</div>
                    <div style={{ fontSize: "12px", color: "var(--dim)", marginTop: "8px" }}>{tool.desc}</div>
                  </button>
                ))}
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
                    <button type="button" onClick={saveSettings} disabled={settingsSaving} style={{ border: "none", borderRadius: "6px", padding: "10px 14px", background: "var(--gold)", color: "#120c00", ...mono, fontSize: "11px", letterSpacing: "0.1em", cursor: "pointer" }}>{settingsSaving ? "SAVING" : "SAVE"}</button>
                  </div>
                  {settingsMsg && <div style={{ marginTop: "8px", color: settingsMsg.includes("saved") ? "var(--gold)" : "#ff6a6a", fontSize: "12px" }}>{settingsMsg}</div>}
                </div>

                <div style={{ border: "1px solid rgba(255,82,82,0.35)", background: "rgba(255,82,82,0.09)", borderRadius: "8px", padding: "14px" }}>
                  <div style={{ ...mono, fontSize: "10px", letterSpacing: "0.12em", color: "#ff7a7a" }}>DANGER ZONE</div>
                  <div style={{ fontSize: "13px", color: "#ffb3b3", marginTop: "6px" }}>Delete account action is UI-only for now.</div>
                  <button type="button" onClick={() => window.confirm("Delete account? This is a UI-only action right now.")} style={{ marginTop: "8px", border: "1px solid rgba(255,82,82,0.5)", borderRadius: "6px", padding: "8px 12px", background: "transparent", color: "#ff9b9b", ...mono, fontSize: "11px", letterSpacing: "0.1em", cursor: "pointer" }}>DELETE ACCOUNT</button>
                </div>
              </div>
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
          body:has(#db-cursor) * { cursor: none !important; }
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
