"use client";

import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Member, RadarTab } from "@/app/dashboard/_lib/types";

const VIEW_MAP: Record<RadarTab, string> = {
  top_spenders: "v_top_spenders",
  most_active: "v_most_active",
  at_risk: "v_at_risk",
  likely_convert: "v_likely_to_convert",
};

export function useRadar(userId: string) {
  const supabase = createClient();
  const [tab, setTab] = useState<RadarTab>("top_spenders");
  const [data, setData] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [cache, setCache] = useState<Partial<Record<RadarTab, Member[]>>>({});

  const load = useCallback(
    async (t: RadarTab) => {
      if (cache[t]) {
        setData(cache[t]!);
        return;
      }
      setLoading(true);
      const { data: rows } = await supabase
        .from(VIEW_MAP[t])
        .select(
          "fan_id, display_name, avatar_url, total_spent, purchase_count, last_active_at, score, status"
        )
        .eq("creator_id", userId)
        .limit(10);

      const members = (rows ?? []) as Member[];
      setCache((prev) => ({ ...prev, [t]: members }));
      setData(members);
      setLoading(false);
    },
    [userId, cache, supabase]
  );

  const switchTab = useCallback(
    (t: RadarTab) => {
      setTab(t);
      load(t);
    },
    [load]
  );

  /** Call on mount to load initial tab */
  const init = useCallback(() => load(tab), [load, tab]);

  return { tab, data, loading, switchTab, init };
}
