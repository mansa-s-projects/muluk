"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRealtime } from "@/app/dashboard/_lib/useRealtime";
import type { Drop } from "@/app/dashboard/_lib/types";

export interface DropSocialProof {
  viewersNow: number;
  lastPurchaseAt: string | null;
}

export function useVaultDrops(userId: string) {
  const supabase = createClient();
  const [activeDrops, setActiveDrops] = useState<Drop[]>([]);
  const [pastDrops, setPastDrops] = useState<Drop[]>([]);
  const [socialProof, setSocialProof] = useState<Record<string, DropSocialProof>>({});
  const [loading, setLoading] = useState(true);

  const loadSocialProof = useCallback(async (dropId: string) => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60_000).toISOString();
    const [{ count }, { data: lastPurchase }] = await Promise.all([
      supabase
        .from("events")
        .select("id", { count: "exact", head: true })
        .eq("type", "drop_click")
        .contains("metadata", { drop_id: dropId })
        .gte("created_at", fiveMinAgo),
      supabase
        .from("purchases")
        .select("created_at")
        .contains("metadata", { drop_id: dropId })
        .order("created_at", { ascending: false })
        .limit(1),
    ]);
    setSocialProof((prev) => ({
      ...prev,
      [dropId]: {
        viewersNow: count ?? 0,
        lastPurchaseAt: lastPurchase?.[0]?.created_at ?? null,
      },
    }));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadDrops = useCallback(async () => {
    const now = new Date().toISOString();
    const [{ data: active }, { data: past }] = await Promise.all([
      supabase
        .from("drops")
        .select("id, title, description, price, max_slots, slots_taken, expires_at, is_active, created_at")
        .eq("creator_id", userId)
        .eq("is_active", true)
        .gt("expires_at", now)
        .order("created_at", { ascending: false }),
      supabase
        .from("drops")
        .select("id, title, description, price, max_slots, slots_taken, expires_at, is_active, created_at")
        .eq("creator_id", userId)
        .or(`is_active.eq.false,expires_at.lte.${now}`)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);
    setActiveDrops(active ?? []);
    setPastDrops(past ?? []);
    (active ?? []).forEach((d) => loadSocialProof(d.id));
    setLoading(false);
  }, [userId, loadSocialProof]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadDrops(); }, [loadDrops]);

  useRealtime({
    channel: `vault-drops-${userId}`,
    table: "purchases",
    event: "INSERT",
    filter: `creator_id=eq.${userId}`,
    onEvent: () => loadDrops(),
  });

  const create = useCallback(async (data: {
    title: string;
    description: string;
    price: number;
    max_slots: number;
    expires_at: string;
  }): Promise<string | null> => {
    const { error } = await supabase.from("drops").insert({
      creator_id: userId,
      ...data,
      slots_taken: 0,
      is_active: true,
    });
    if (!error) await loadDrops();
    return error?.message ?? null;
  }, [userId, loadDrops]); // eslint-disable-line react-hooks/exhaustive-deps

  const deactivate = useCallback(async (dropId: string) => {
    await supabase
      .from("drops")
      .update({ is_active: false })
      .eq("id", dropId)
      .eq("creator_id", userId);
    await loadDrops();
  }, [userId, loadDrops]); // eslint-disable-line react-hooks/exhaustive-deps

  return { activeDrops, pastDrops, socialProof, loading, create, deactivate, refresh: loadDrops };
}
