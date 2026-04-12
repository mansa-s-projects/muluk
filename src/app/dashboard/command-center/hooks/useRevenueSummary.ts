"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { bestDayRevenue } from "@/app/dashboard/_lib/helpers";
import type { DashboardStats } from "@/app/dashboard/_lib/types";

export function useRevenueSummary(userId: string) {
  const supabase = createClient();
  const [stats, setStats] = useState<DashboardStats>({
    todayRevenue: 0,
    totalMembers: 0,
    onlineNow: 0,
    bestDayRevenue: 0,
  });
  const [atRisk, setAtRisk] = useState(0);
  const [hotOnline, setHotOnline] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      purchasesRes,
      allPurchasesRes,
      membersRes,
      presenceRes,
      atRiskRes,
    ] = await Promise.allSettled([
      supabase
        .from("purchases")
        .select("amount")
        .eq("creator_id", userId)
        .eq("status", "completed")
        .gte("created_at", today.toISOString()),
      supabase
        .from("purchases")
        .select("amount, created_at")
        .eq("creator_id", userId)
        .eq("status", "completed"),
      supabase
        .from("memberships")
        .select("fan_id", { count: "exact", head: true })
        .eq("creator_id", userId)
        .eq("is_active", true),
      supabase
        .from("presence")
        .select("user_id", { count: "exact", head: true })
        .eq("creator_id", userId)
        .eq("is_online", true),
      supabase
        .from("v_at_risk")
        .select("fan_id", { count: "exact", head: true })
        .eq("creator_id", userId),
    ]);

    const todayRevenue =
      purchasesRes.status === "fulfilled"
        ? (purchasesRes.value.data ?? []).reduce((s, p) => s + p.amount, 0)
        : 0;

    const allPurchases =
      allPurchasesRes.status === "fulfilled"
        ? (allPurchasesRes.value.data ?? [])
        : [];

    const best = bestDayRevenue(allPurchases);
    const totalMembers =
      membersRes.status === "fulfilled"
        ? (membersRes.value.count ?? 0)
        : 0;
    const onlineNow =
      presenceRes.status === "fulfilled"
        ? (presenceRes.value.count ?? 0)
        : 0;
    const atRiskCount =
      atRiskRes.status === "fulfilled"
        ? (atRiskRes.value.count ?? 0)
        : 0;

    // Hot members currently online
    const hotRes = await supabase
      .from("v_most_active")
      .select("fan_id", { count: "exact", head: true })
      .eq("creator_id", userId)
      .eq("status", "hot");

    setStats({
      todayRevenue,
      totalMembers,
      onlineNow,
      bestDayRevenue: best,
    });
    setAtRisk(atRiskCount);
    setHotOnline(hotRes.count ?? 0);
    setLoading(false);
  }, [userId, supabase]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { stats, atRisk, hotOnline, loading, refresh };
}
