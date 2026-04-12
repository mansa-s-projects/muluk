"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { TodayAction } from "@/app/dashboard/_lib/types";

export function useTodayAction(userId: string) {
  const supabase = createClient();
  const [action, setAction] = useState<TodayAction | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    const { data, error } = await supabase.rpc("get_today_action", {
      p_creator_id: userId,
    });
    if (!error && Array.isArray(data) && data.length > 0) {
      setAction(data[0] as TodayAction);
    }
    setLoading(false);
  }, [userId, supabase]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { action, loading, refresh: fetch };
}
