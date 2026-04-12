"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Member, FilterTab } from "@/app/dashboard/_lib/types";

const SELECT_FIELDS =
  "fan_id, display_name, avatar_url, total_spent, purchase_count, last_active_at, last_event_at, score, status, churn_label";

export function useMembers(userId: string) {
  const supabase = createClient();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterTab>("all");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (s: string, f: FilterTab) => {
    setLoading(true);
    try {
      // at_risk has its own purpose-built view ordered by total_spent DESC
      const view = f === "at_risk" ? "v_at_risk" : "v_most_active";

      let q = supabase
        .from(view)
        .select(SELECT_FIELDS)
        .eq("creator_id", userId)
        .order("total_spent", { ascending: false })
        .limit(100);

      // v_at_risk is pre-filtered; apply status filter only for other tabs
      if (f !== "all" && f !== "at_risk") {
        q = q.eq("status", f);
      }

      const { data } = await q;
      let rows = (data ?? []) as Member[];

      if (s) {
        const lower = s.toLowerCase();
        rows = rows.filter((m) => m.display_name?.toLowerCase().includes(lower));
      }

      setMembers(rows);
    } catch {
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, [userId, supabase]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => load(search, filter), search ? 250 : 0);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search, filter, load]);

  const totalSpent = members.reduce((s, m) => s + m.total_spent, 0);

  const tagVip = useCallback(async (fanId: string) => {
    await supabase
      .from("memberships")
      .update({ tier: "vip" })
      .eq("creator_id", userId)
      .eq("fan_id", fanId);
    setMembers((prev) =>
      prev.map((m) => (m.fan_id === fanId ? { ...m, tier: "vip" } : m))
    );
  }, [userId, supabase]);

  return { members, loading, search, setSearch, filter, setFilter, totalSpent, tagVip };
}
