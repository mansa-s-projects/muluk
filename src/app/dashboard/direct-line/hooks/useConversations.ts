"use client";

import { useState, useCallback, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRealtime } from "@/app/dashboard/_lib/useRealtime";
import type { Conversation } from "@/app/dashboard/_lib/types";

export function useConversations(userId: string) {
  const supabase = createClient();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: msgData } = await supabase
        .from("messages")
        .select("sender_id, body, created_at, is_read")
        .eq("recipient_id", userId)
        .order("created_at", { ascending: false });

      if (!msgData) { setConversations([]); return; }

      // Deduplicate — keep latest message per sender
      const seen = new Map<string, typeof msgData[0]>();
      for (const m of msgData) {
        if (!seen.has(m.sender_id)) seen.set(m.sender_id, m);
      }

      const fanIds = Array.from(seen.keys());
      if (fanIds.length === 0) { setConversations([]); return; }

      // Fetch profiles + behavior in parallel
      // NOTE: behavior_scores uses fan_id (not user_id) as the FK column
      const [profilesRes, scoresRes, membershipsRes] = await Promise.allSettled([
        supabase.from("profiles").select("id, display_name, avatar_url").in("id", fanIds),
        supabase
          .from("behavior_scores")
          .select("fan_id, status, churn_label")
          .eq("creator_id", userId)
          .in("fan_id", fanIds),
        supabase
          .from("memberships")
          .select("fan_id, total_spent")
          .eq("creator_id", userId)
          .in("fan_id", fanIds),
      ]);

      const profiles = profilesRes.status === "fulfilled" ? (profilesRes.value.data ?? []) : [];
      const scores   = scoresRes.status   === "fulfilled" ? (scoresRes.value.data   ?? []) : [];
      const mems     = membershipsRes.status === "fulfilled" ? (membershipsRes.value.data ?? []) : [];

      const profileMap = Object.fromEntries(profiles.map((p) => [p.id, p]));
      const statusMap  = Object.fromEntries(
        scores.map((s) => [s.fan_id, s.status as Conversation["status"]])
      );
      const spendMap   = Object.fromEntries(mems.map((m) => [m.fan_id, m.total_spent as number]));

      const unreadCounts: Record<string, number> = {};
      for (const m of msgData) {
        if (!m.is_read) unreadCounts[m.sender_id] = (unreadCounts[m.sender_id] ?? 0) + 1;
      }

      const convs: Conversation[] = fanIds.map((fid) => {
        const latest  = seen.get(fid)!;
        const profile = profileMap[fid] ?? {};
        return {
          fan_id: fid,
          display_name: profile.display_name ?? null,
          avatar_url: profile.avatar_url ?? null,
          total_spent: spendMap[fid] ?? 0,
          status: statusMap[fid] ?? "cold",
          last_message: latest.body,
          last_message_at: latest.created_at,
          unread_count: unreadCounts[fid] ?? 0,
        };
      });

      convs.sort(
        (a, b) =>
          new Date(b.last_message_at ?? 0).getTime() -
          new Date(a.last_message_at ?? 0).getTime()
      );
      setConversations(convs);
    } finally {
      setLoading(false);
    }
  }, [userId, supabase]);

  useEffect(() => { load(); }, [load]);

  useRealtime({
    channel: `convs-${userId}`,
    table: "messages",
    event: "INSERT",
    filter: `recipient_id=eq.${userId}`,
    onEvent: () => load(),
  });

  const markRead = useCallback(async (fanId: string) => {
    await supabase
      .from("messages")
      .update({ is_read: true })
      .eq("recipient_id", userId)
      .eq("sender_id", fanId)
      .eq("is_read", false);

    setConversations((prev) =>
      prev.map((c) => (c.fan_id === fanId ? { ...c, unread_count: 0 } : c))
    );
  }, [userId, supabase]);

  return { conversations, loading, refresh: load, markRead };
}
