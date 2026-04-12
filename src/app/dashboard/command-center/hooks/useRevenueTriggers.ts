"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RevenueTrigger } from "@/app/dashboard/_lib/types";

const MAX_TRIGGERS = 5;

export function useRevenueTriggers(userId: string) {
  const supabase = createClient();
  const [triggers, setTriggers] = useState<RevenueTrigger[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    const now = new Date().toISOString();
    const { data } = await supabase
      .from("revenue_triggers")
      .select("id, trigger_type, message, metadata, priority, expires_at, created_at")
      .eq("creator_id", userId)
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .order("priority", { ascending: false })
      .limit(MAX_TRIGGERS);

    setTriggers((data ?? []) as RevenueTrigger[]);
    setLoading(false);
  }, [userId, supabase]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { triggers, loading, refresh: fetch };
}
