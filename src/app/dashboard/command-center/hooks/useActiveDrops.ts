"use client";

import { useState, useCallback, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRealtime } from "@/app/dashboard/_lib/useRealtime";
import type { Drop } from "@/app/dashboard/_lib/types";

export function useActiveDrops(userId: string) {
  const supabase = createClient();
  const [drops, setDrops] = useState<Drop[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("drops")
      .select("id, title, price, max_slots, slots_taken, expires_at, description, is_active, created_at")
      .eq("creator_id", userId)
      .eq("is_active", true)
      .gt("expires_at", new Date().toISOString())
      .order("expires_at", { ascending: true });

    setDrops((data ?? []) as Drop[]);
    setLoading(false);
  }, [userId, supabase]);

  useEffect(() => {
    load();
  }, [load]);

  // Keep slot counts live via purchases realtime
  useRealtime({
    channel: `active-drops-${userId}`,
    table: "purchases",
    event: "INSERT",
    filter: `creator_id=eq.${userId}`,
    onEvent: () => {
      // Re-fetch drop state when a purchase lands
      load();
    },
  });

  return { drops, loading, refresh: load };
}
