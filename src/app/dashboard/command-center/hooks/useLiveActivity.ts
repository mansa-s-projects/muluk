"use client";

import { useState, useCallback, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRealtime } from "@/app/dashboard/_lib/useRealtime";
import type { FeedEvent } from "@/app/dashboard/_lib/types";

const MAX_FEED = 20;

export function useLiveActivity(userId: string) {
  const supabase = createClient();
  const [feed, setFeed] = useState<FeedEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const loadInitial = useCallback(async () => {
    const { data } = await supabase
      .from("events")
      .select("id, type, user_id, metadata, created_at")
      .eq("creator_id", userId)
      .order("created_at", { ascending: false })
      .limit(MAX_FEED);

    setFeed((data ?? []) as FeedEvent[]);
    setLoading(false);
  }, [userId, supabase]);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  // Only subscribe to events — not all tables
  useRealtime<FeedEvent>({
    channel: `live-activity-${userId}`,
    table: "events",
    event: "INSERT",
    filter: `creator_id=eq.${userId}`,
    onEvent: (payload) => {
      const newEvent = payload.new as FeedEvent;
      setFeed((prev) => [newEvent, ...prev].slice(0, MAX_FEED));
    },
  });

  return { feed, loading };
}
