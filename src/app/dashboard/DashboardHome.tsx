"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

import { useRevenueSummary }   from "./command-center/hooks/useRevenueSummary";
import { useRadar }            from "./command-center/hooks/useRadar";
import { useLiveActivity }     from "./command-center/hooks/useLiveActivity";
import { useActiveDrops }      from "./command-center/hooks/useActiveDrops";
import { useTodayAction }      from "./command-center/hooks/useTodayAction";
import { useRevenueTriggers }  from "./command-center/hooks/useRevenueTriggers";

import { TodayActionCard }      from "./command-center/components/TodayActionCard";
import { RevenueTriggersPanel } from "./command-center/components/RevenueTriggersPanel";
import { LiveActivityFeed }     from "./command-center/components/LiveActivityFeed";
import { HighValueRadar }       from "./command-center/components/HighValueRadar";
import { ActiveDrops }          from "./command-center/components/ActiveDrops";
import { StatusBar }            from "./command-center/components/StatusBar";
import { CreateDropModal }      from "./vault/components/CreateDropModal";

import { fmt }              from "./_lib/helpers";
import { GOLD, mono, body } from "./_lib/tokens";
import type { FeedEvent }   from "./_lib/types";

export default function DashboardHome({ userId }: { userId: string }) {
  const router = useRouter();
  const [showCreateDrop, setShowCreateDrop] = useState(false);
  const [focusMode, setFocusMode] = useState(false);

  const { stats, refresh: refreshStats } = useRevenueSummary(userId);
  const radar    = useRadar(userId);
  const { feed, loading: feedLoading } = useLiveActivity(userId);
  const { drops, loading: dropsLoading, refresh: refreshDrops } = useActiveDrops(userId);
  const { action }    = useTodayAction(userId);
  const { triggers, refresh: refreshTriggers } = useRevenueTriggers(userId);

  useEffect(() => { radar.init(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFeedItemClick = useCallback((item: FeedEvent) => {
    if (item.type === "message")
      router.push(`/dashboard/direct-line?to=${item.user_id}`);
    else if (item.type === "purchase" || item.type === "drop_click")
      router.push("/dashboard/vault");
    else
      router.push("/dashboard/members");
  }, [router]);

  const handleDropCreated = useCallback(() => {
    setShowCreateDrop(false);
    refreshDrops();
    refreshStats();
    refreshTriggers();
  }, [refreshDrops, refreshStats, refreshTriggers]);

  // ── Focus mode ───────────────────────────────────────────────────────────────
  if (focusMode) {
    return (
      <div style={{ padding: "24px 28px", maxWidth: "800px", margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "32px" }}>
          <div style={{ ...mono, fontSize: "11px", letterSpacing: "0.2em", color: GOLD }}>FOCUS MODE</div>
          <button
            type="button"
            onClick={() => setFocusMode(false)}
            style={{ ...mono, fontSize: "10px", color: "rgba(255,255,255,0.35)", background: "transparent", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "6px", padding: "5px 12px", cursor: "pointer" }}
          >
            EXIT FOCUS
          </button>
        </div>
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <div style={{ ...mono, fontSize: "56px", color: GOLD, fontWeight: 200, letterSpacing: "-0.02em", lineHeight: 1 }}>
            {fmt(stats.todayRevenue)}
          </div>
          <div style={{ ...body, fontSize: "13px", color: "rgba(255,255,255,0.3)", marginTop: "8px" }}>
            today · {stats.onlineNow} online now
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <HighValueRadar tab={radar.tab} data={radar.data.slice(0, 5)} loading={radar.loading} onTabChange={radar.switchTab} />
          <ActiveDrops drops={drops.slice(0, 1)} loading={false} onCreateDrop={() => setShowCreateDrop(true)} />
        </div>
        {showCreateDrop && (
          <CreateDropModal userId={userId} onClose={() => setShowCreateDrop(false)} onCreated={handleDropCreated} />
        )}
      </div>
    );
  }

  // ── Full dashboard ───────────────────────────────────────────────────────────
  return (
    <div style={{ padding: "24px 28px", maxWidth: "1280px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
        <div>
          <h1 style={{ ...mono, fontSize: "11px", letterSpacing: "0.22em", color: GOLD, margin: "0 0 2px" }}>
            DASHBOARD
          </h1>
          <p style={{ ...body, fontSize: "12px", color: "rgba(255,255,255,0.25)", margin: 0 }}>
            Today&apos;s revenue intelligence
          </p>
        </div>
        <button
          type="button"
          onClick={() => setFocusMode(true)}
          style={{ ...mono, fontSize: "10px", letterSpacing: "0.12em", color: "rgba(255,255,255,0.35)", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "6px", padding: "6px 12px", cursor: "pointer" }}
        >
          FOCUS MODE
        </button>
      </div>

      <div style={{ marginBottom: "20px" }}>
        <StatusBar stats={stats} />
      </div>

      <div style={{ marginBottom: "20px" }}>
        <TodayActionCard
          stats={stats}
          action={action}
          onCreateDrop={() => setShowCreateDrop(true)}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
        <RevenueTriggersPanel triggers={triggers} />
        <LiveActivityFeed feed={feed} loading={feedLoading} onItemClick={handleFeedItemClick} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: "16px" }}>
        <HighValueRadar tab={radar.tab} data={radar.data} loading={radar.loading} onTabChange={radar.switchTab} />
        <ActiveDrops drops={drops} loading={dropsLoading} onCreateDrop={() => setShowCreateDrop(true)} />
      </div>

      {showCreateDrop && (
        <CreateDropModal userId={userId} onClose={() => setShowCreateDrop(false)} onCreated={handleDropCreated} />
      )}
    </div>
  );
}
