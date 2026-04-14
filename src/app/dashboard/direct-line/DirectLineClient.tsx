"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useConversations } from "./hooks/useConversations";
import { useMessages }      from "./hooks/useMessages";
import { FanContext }        from "./components/FanContext";
import { timeAgoShort, fmt } from "@/app/dashboard/_lib/helpers";
import { GOLD, G, mono, body } from "@/app/dashboard/_lib/tokens";
import type { Conversation, Message } from "@/app/dashboard/_lib/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function initials(name: string | null) {
  if (!name) return "?";
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ name, url, size = 36 }: { name: string | null; url: string | null; size?: number }) {
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: url ? "transparent" : "rgba(200,169,110,0.1)", border: "1px solid rgba(200,169,110,0.18)", display: "grid", placeItems: "center", flexShrink: 0, overflow: "hidden", ...mono, fontSize: size * 0.33, color: GOLD }}>
      {url
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={url} alt={name ?? ""} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        : initials(name)}
    </div>
  );
}

// ─── Conversation Row ─────────────────────────────────────────────────────────
function ConvRow({ conv, active, onClick }: { conv: Conversation; active: boolean; onClick: () => void }) {
  const statusColor = ({ hot: "#ef4444", warm: G, at_risk: "#f97316", cold: "rgba(255,255,255,0.15)" } as Record<string, string>)[conv.status] ?? "rgba(255,255,255,0.15)";
  return (
    <button type="button" onClick={onClick} style={{
      width: "100%", display: "flex", alignItems: "center", gap: "12px",
      padding: "14px 16px",
      background: active ? "rgba(200,169,110,0.06)" : "transparent",
      borderLeft: `2px solid ${active ? GOLD : "transparent"}`,
      border: "none", borderBottom: "1px solid rgba(255,255,255,0.04)",
      cursor: "pointer", textAlign: "left", transition: "background 0.15s",
    }}>
      <div style={{ position: "relative", flexShrink: 0 }}>
        <Avatar name={conv.display_name} url={conv.avatar_url} />
        <span style={{ position: "absolute", bottom: 0, right: 0, width: 8, height: 8, borderRadius: "50%", background: statusColor, border: "1.5px solid #0a0a0a" }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
          <span style={{ ...body, fontSize: "13px", color: active ? "#fff" : "rgba(255,255,255,0.7)", fontWeight: conv.unread_count > 0 ? 600 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "120px" }}>
            {conv.display_name ?? "Anonymous"}
          </span>
          <span style={{ ...mono, fontSize: "10px", color: "rgba(255,255,255,0.25)", flexShrink: 0 }}>
            {timeAgoShort(conv.last_message_at)}
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ ...body, fontSize: "11px", color: "rgba(255,255,255,0.3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "130px" }}>
            {conv.last_message ?? "No messages yet"}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
            <span style={{ ...mono, fontSize: "9px", color: GOLD }}>{fmt(conv.total_spent)}</span>
            {conv.unread_count > 0 && (
              <span style={{ width: 16, height: 16, borderRadius: "50%", background: GOLD, color: "#0a0a0a", fontSize: "9px", display: "grid", placeItems: "center", ...mono, fontWeight: 700 }}>
                {conv.unread_count}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

// ─── Chat Bubble ──────────────────────────────────────────────────────────────
function Bubble({ msg, isOwn }: { msg: Message; isOwn: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: isOwn ? "flex-end" : "flex-start", marginBottom: "8px" }}>
      <div style={{ maxWidth: "68%", padding: "10px 14px", borderRadius: isOwn ? "12px 12px 2px 12px" : "12px 12px 12px 2px", background: isOwn ? "rgba(200,169,110,0.15)" : "#1a1a1a", border: `1px solid ${isOwn ? "rgba(200,169,110,0.2)" : "rgba(255,255,255,0.06)"}` }}>
        <p style={{ ...body, fontSize: "13px", color: isOwn ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.7)", margin: 0, lineHeight: 1.5, wordBreak: "break-word" }}>
          {msg.body}
        </p>
        <span style={{ ...mono, fontSize: "9px", color: "rgba(255,255,255,0.2)", display: "block", textAlign: isOwn ? "right" : "left", marginTop: "4px" }}>
          {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function DirectLineClient({ userId }: { userId: string }) {
  const searchParams = useSearchParams();
  const toParam = searchParams.get("to");
  const isOffer = searchParams.get("offer") === "1";

  const [activeConvId, setActiveConvId] = useState<string | null>(toParam);
  const [newMsg, setNewMsg] = useState(isOffer ? "Hey, I have an exclusive offer for you — " : "");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const { conversations, loading: loadingConvs, markRead } = useConversations(userId);
  const { messages, loading: loadingMsgs, sending, send, bottomRef } = useMessages(userId, activeConvId);

  const activeConv = conversations.find((c) => c.fan_id === activeConvId) ?? null;

  const handleSelectConv = (fanId: string) => {
    setActiveConvId(fanId);
    markRead(fanId);
    setSuggestions([]);
  };

  const handleSend = async () => {
    if (!newMsg.trim()) return;
    const text = newMsg.trim();
    setNewMsg("");
    setSuggestions([]);
    await send(text);
  };

  const handleOffer = () => {
    setNewMsg("Hey, I have an exclusive offer for you — [OFFER: ");
  };

  const handleSuggestReply = async () => {
    if (!activeConv || !messages.length) return;
    setLoadingSuggestions(true);
    setSuggestions([]);
    try {
      const res = await fetch("/api/ai/direct-line/suggest-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fanName: activeConv.display_name ?? "Fan",
          lastMessages: messages.slice(-6).map((m) => ({ body: m.body, isOwn: m.sender_id === userId })),
          fanSpend: activeConv.total_spent ?? 0,
          fanStatus: activeConv.status ?? "unknown",
        }),
      });
      const data = await res.json();
      if (data.suggestions) setSuggestions(data.suggestions);
    } catch {
      // silently fail — non-critical feature
    } finally {
      setLoadingSuggestions(false);
    }
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", height: "calc(100vh - 0px)", overflow: "hidden" }}>

      {/* ── LEFT: Conversation list ──────────────────────────────────── */}
      <div style={{ borderRight: "1px solid rgba(255,255,255,0.07)", display: "flex", flexDirection: "column", background: "#0d0d0d" }}>
        <div style={{ padding: "18px 16px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <h1 style={{ ...mono, fontSize: "10px", letterSpacing: "0.2em", color: GOLD, margin: "0 0 2px" }}>DIRECT LINE</h1>
          <p style={{ ...body, fontSize: "11px", color: "rgba(255,255,255,0.25)", margin: 0 }}>
            {conversations.length} conversation{conversations.length !== 1 ? "s" : ""}
          </p>
        </div>

        <div style={{ flex: 1, overflowY: "auto" }}>
          {loadingConvs ? (
            <div style={{ padding: "32px", textAlign: "center", ...mono, fontSize: "10px", color: "rgba(255,255,255,0.2)", letterSpacing: "0.15em" }}>LOADING…</div>
          ) : conversations.length === 0 ? (
            <div style={{ padding: "32px", textAlign: "center", ...body, fontSize: "13px", color: "rgba(255,255,255,0.2)" }}>No messages yet</div>
          ) : (
            conversations.map((c) => (
              <ConvRow key={c.fan_id} conv={c} active={c.fan_id === activeConvId} onClick={() => handleSelectConv(c.fan_id)} />
            ))
          )}
        </div>
      </div>

      {/* ── CENTER: Chat area ─────────────────────────────────────────── */}
      {activeConv ? (
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          {/* Messages */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {/* Chat header */}
            <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: "12px", background: "#0d0d0d" }}>
              <Avatar name={activeConv.display_name} url={activeConv.avatar_url} size={32} />
              <div>
                <div style={{ ...body, fontSize: "14px", color: "#fff", fontWeight: 500 }}>{activeConv.display_name ?? "Anonymous"}</div>
                <div style={{ ...mono, fontSize: "10px", color: "rgba(255,255,255,0.28)" }}>
                  {fmt(activeConv.total_spent)} spent · {activeConv.status}
                </div>
              </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
              {loadingMsgs ? (
                <div style={{ textAlign: "center", ...mono, fontSize: "10px", color: "rgba(255,255,255,0.2)", letterSpacing: "0.15em" }}>LOADING…</div>
              ) : (
                messages.map((m) => <Bubble key={m.id} msg={m} isOwn={m.sender_id === userId} />)
              )}
              <div ref={bottomRef} />
            </div>

            {/* AI Suggestions */}
            {suggestions.length > 0 && (
              <div style={{ padding: "8px 16px", borderTop: "1px solid rgba(255,255,255,0.04)", background: "#0a0a0a", display: "flex", flexDirection: "column", gap: "6px" }}>
                <div style={{ ...mono, fontSize: "9px", letterSpacing: "0.16em", color: "rgba(200,169,110,0.45)", marginBottom: "2px" }}>AI SUGGESTIONS</div>
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => { setNewMsg(s); setSuggestions([]); }}
                    style={{ textAlign: "left", padding: "8px 12px", background: "rgba(200,169,110,0.04)", border: "1px solid rgba(200,169,110,0.12)", borderRadius: "7px", color: "rgba(255,255,255,0.65)", fontSize: "12px", cursor: "pointer", ...body, lineHeight: 1.5 }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* Composer */}
            <div style={{ padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,0.06)", background: "#0d0d0d" }}>
              <div style={{ display: "flex", gap: "8px", alignItems: "flex-end" }}>
                <button type="button" onClick={handleOffer}
                  style={{ padding: "9px 12px", background: "transparent", border: "1px solid rgba(200,169,110,0.2)", borderRadius: "6px", color: GOLD, fontSize: "11px", cursor: "pointer", ...mono, whiteSpace: "nowrap", flexShrink: 0 }}>
                  + Offer
                </button>
                <button
                  type="button"
                  onClick={handleSuggestReply}
                  disabled={loadingSuggestions || !messages.length}
                  style={{ padding: "9px 12px", background: "transparent", border: "1px solid rgba(200,169,110,0.15)", borderRadius: "6px", color: loadingSuggestions ? "rgba(200,169,110,0.35)" : "rgba(200,169,110,0.6)", fontSize: "11px", cursor: loadingSuggestions || !messages.length ? "not-allowed" : "pointer", ...mono, whiteSpace: "nowrap", flexShrink: 0 }}
                  title="AI suggest reply"
                >
                  {loadingSuggestions ? "…" : "✦ AI"}
                </button>
                <textarea
                  value={newMsg}
                  onChange={(e) => setNewMsg(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder="Type a message… (Enter to send)"
                  rows={2}
                  style={{ flex: 1, padding: "10px 12px", background: "#111", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", color: "#fff", fontSize: "13px", outline: "none", resize: "none", ...body }}
                />
                <button type="button" onClick={handleSend} disabled={sending || !newMsg.trim()}
                  style={{ padding: "9px 18px", background: sending || !newMsg.trim() ? "rgba(200,169,110,0.3)" : GOLD, border: "none", borderRadius: "8px", color: "#0a0a0a", fontSize: "12px", fontWeight: 700, cursor: sending || !newMsg.trim() ? "not-allowed" : "pointer", ...mono, flexShrink: 0 }}>
                  {sending ? "…" : "SEND"}
                </button>
              </div>
            </div>
          </div>

          {/* Right: Fan context panel */}
          <FanContext conv={activeConv} userId={userId} onSendOffer={handleOffer} />
        </div>
      ) : (
        <div style={{ flex: 1, display: "grid", placeItems: "center", background: "#0a0a0a" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ ...mono, fontSize: "24px", color: "rgba(200,169,110,0.2)", marginBottom: "12px" }}>◎</div>
            <p style={{ ...body, fontSize: "14px", color: "rgba(255,255,255,0.2)" }}>Select a conversation</p>
          </div>
        </div>
      )}
    </div>
  );
}
