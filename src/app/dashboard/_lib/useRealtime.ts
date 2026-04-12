"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

type PgEvent = "INSERT" | "UPDATE" | "DELETE" | "*";

interface UseRealtimeOptions<T extends Record<string, unknown>> {
  /** Unique channel name — must be stable across renders */
  channel: string;
  table: string;
  event?: PgEvent;
  /** e.g. "creator_id=eq.abc123" */
  filter?: string;
  onEvent: (payload: RealtimePostgresChangesPayload<T>) => void;
  enabled?: boolean;
}

/**
 * Generic Supabase realtime hook.
 * Subscribes on mount, cleans up on unmount.
 * Only subscribes to: purchases, messages, presence, events.
 */
export function useRealtime<T extends Record<string, unknown>>({
  channel,
  table,
  event = "*",
  filter,
  onEvent,
  enabled = true,
}: UseRealtimeOptions<T>) {
  const supabase = createClient();
  // Keep a stable ref to the callback so the subscription doesn't re-fire on every render
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    if (!enabled) return;

    const ch = supabase.channel(channel).on(
      "postgres_changes" as Parameters<typeof ch.on>[0],
      {
        event,
        schema: "public",
        table,
        ...(filter ? { filter } : {}),
      } as Parameters<typeof ch.on>[1],
      (payload) => {
        onEventRef.current(payload as RealtimePostgresChangesPayload<T>);
      }
    );

    ch.subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel, table, event, filter, enabled]);
}
