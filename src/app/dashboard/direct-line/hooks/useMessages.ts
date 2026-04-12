"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRealtime } from "@/app/dashboard/_lib/useRealtime";
import type { Message } from "@/app/dashboard/_lib/types";

export function useMessages(userId: string, fanId: string | null) {
  const supabase = createClient();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async (fid: string) => {
    setLoading(true);
    const { data } = await supabase
      .from("messages")
      .select("id, sender_id, body, is_read, created_at")
      .or(`and(sender_id.eq.${userId},recipient_id.eq.${fid}),and(sender_id.eq.${fid},recipient_id.eq.${userId})`)
      .order("created_at", { ascending: true });

    setMessages((data ?? []) as Message[]);
    setLoading(false);
  }, [userId, supabase]);

  useEffect(() => {
    if (!fanId) { setMessages([]); return; }
    load(fanId);
  }, [fanId, load]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Realtime: only subscribe to messages table
  useRealtime<Message>({
    channel: `msgs-${userId}-${fanId ?? "none"}`,
    table: "messages",
    event: "INSERT",
    filter: `recipient_id=eq.${userId}`,
    enabled: !!fanId,
    onEvent: (payload) => {
      const msg = payload.new as Message;
      if (msg.sender_id === fanId) {
        setMessages((prev) => [...prev, msg]);
      }
    },
  });

  const send = useCallback(async (body: string) => {
    if (!fanId || !body.trim() || sending) return;
    setSending(true);

    const optimistic: Message = {
      id: crypto.randomUUID(),
      sender_id: userId,
      body,
      is_read: false,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);

    const { error } = await supabase.from("messages").insert({
      sender_id: userId,
      recipient_id: fanId,
      creator_id: userId,
      body,
    });

    if (error) {
      // Roll back optimistic update
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
    }
    setSending(false);
  }, [fanId, userId, sending, supabase]);

  return { messages, loading, sending, send, bottomRef };
}
