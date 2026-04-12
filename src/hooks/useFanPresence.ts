"use client";

import { useEffect, useRef, useCallback } from "react";

const HEARTBEAT_INTERVAL_MS = 30_000; // 30 seconds
const MIN_HEARTBEAT_GAP_MS = 25_000;  // debounce — don't double-fire within 25s

type ActivityType =
  | "page_view"
  | "vault_view"
  | "tip_click"
  | "message_open"
  | "booking_view"
  | "series_view"
  | "content_unlock"
  | "checkout_open";

interface UseFanPresenceOptions {
  /** The fan's FAN-XXXXXXXXXX code */
  code: string | null | undefined;
  /** Current page path for presence tracking (e.g. "/creator-handle") */
  currentPage?: string;
  /** Stable session identifier (generate once per tab, store in sessionStorage) */
  sessionId?: string;
}

interface LogActivityOptions {
  contentId?: string;
  page?: string;
  metadata?: Record<string, unknown>;
}

interface UseFanPresenceReturn {
  /** Fire an activity event. Fire-and-forget — never throws. */
  logActivity: (type: ActivityType, opts?: LogActivityOptions) => void;
}

/**
 * Fan-side hook that maintains a presence heartbeat and exposes logActivity().
 * Drop into any fan-facing page component that has the fan code available.
 *
 * @example
 * const { logActivity } = useFanPresence({ code: fanCode, currentPage: pathname });
 * // On vault open:
 * logActivity("vault_view", { contentId: item.id });
 */
export function useFanPresence({
  code,
  currentPage,
  sessionId,
}: UseFanPresenceOptions): UseFanPresenceReturn {
  const lastHeartbeatRef = useRef<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const sendHeartbeat = useCallback(() => {
    if (!code) return;
    const now = Date.now();
    if (now - lastHeartbeatRef.current < MIN_HEARTBEAT_GAP_MS) return;
    lastHeartbeatRef.current = now;

    // Fire-and-forget — never block the UI
    fetch("/api/fan/presence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        page: currentPage ?? (typeof window !== "undefined" ? window.location.pathname : undefined),
        session_id: sessionId,
      }),
    }).catch(() => {
      // Silent failure — presence is best-effort
    });
  }, [code, currentPage, sessionId]);

  useEffect(() => {
    if (!code) return;

    // Send immediately on mount
    sendHeartbeat();

    // Then every 30 seconds
    intervalRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [code, sendHeartbeat]);

  const logActivity = useCallback(
    (type: ActivityType, opts: LogActivityOptions = {}) => {
      if (!code) return;

      fetch("/api/fan/activity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          activity_type: type,
          page: opts.page ?? (typeof window !== "undefined" ? window.location.pathname : undefined),
          content_id: opts.contentId,
          metadata: opts.metadata ?? {},
        }),
      }).catch(() => {
        // Silent failure
      });
    },
    [code]
  );

  return { logActivity };
}
