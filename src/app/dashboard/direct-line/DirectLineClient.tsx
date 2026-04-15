"use client";

import { useState, useEffect, useRef } from "react";

const mono = { fontFamily: "var(--font-mono, 'DM Mono', monospace)" } as const;

interface Message {
  id: string;
  fan_code: string;
  content: string;
  from_creator: boolean;
  read_at: string | null;
  created_at: string;
}

interface Props {
  initialMessages: Message[];
  creatorId: string;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

function groupByFan(messages: Message[]) {
  const map = new Map<string, Message[]>();
  for (const msg of messages) {
    if (!map.has(msg.fan_code)) map.set(msg.fan_code, []);
    map.get(msg.fan_code)!.push(msg);
  }
  return Array.from(map.entries()).map(([fan_code, msgs]) => ({
    fan_code,
    messages: msgs.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
    last_at: msgs[0]?.created_at ?? "",
    unread: msgs.filter((m) => !m.from_creator && !m.read_at).length,
  })).sort((a, b) => new Date(b.last_at).getTime() - new Date(a.last_at).getTime());
}

export default function DirectLineClient({ initialMessages, creatorId }: Props) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [activeFan, setActiveFan] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const threads = groupByFan(messages);
  const activeThread = threads.find((t) => t.fan_code === activeFan);

  // Auto-select first thread
  useEffect(() => {
    if (!activeFan && threads.length > 0) setActiveFan(threads[0].fan_code);
  }, [threads.length]);

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeFan, messages.length]);

  // Pick up ?fan= query param
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const fan = params.get("fan");
    if (fan) setActiveFan(fan);
  }, []);

  async function sendMessage() {
    if (!draft.trim() || !activeFan) return;
    setSending(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fanCode: activeFan, content: draft.trim(), asFan: false }),
      });
      if (res.ok) {
        const json = await res.json();
        setMessages((prev) => [...prev, json.message]);
        setDraft("");
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "var(--void, #08080f)" }}>

      {/* Header */}
      <div style={{ padding: "20px 24px", borderBottom: "1px solid rgba(255,255,255,0.055)", flexShrink: 0 }}>
        <h1 style={{ ...mono, fontSize: "1.25rem", fontWeight: 500, color: "#fff", margin: 0, letterSpacing: "0.05em" }}>Direct Line</h1>
        <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "12px", marginTop: "3px" }}>{threads.length} conversation{threads.length !== 1 ? "s" : ""}</p>
      </div>

      {threads.length === 0 ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "12px", color: "rgba(255,255,255,0.25)" }}>
          <div style={{ ...mono, fontSize: "32px" }}>◎</div>
          <p style={{ fontSize: "14px" }}>No messages yet.</p>
          <p style={{ fontSize: "12px" }}>When fans message you, they'll appear here.</p>
        </div>
      ) : (
        <div style={{ flex: 1, display: "grid", gridTemplateColumns: "260px 1fr", minHeight: 0 }}>

          {/* Thread list */}
          <div style={{ borderRight: "1px solid rgba(255,255,255,0.055)", overflowY: "auto" }}>
            {threads.map((t) => (
              <button
                key={t.fan_code}
                onClick={() => setActiveFan(t.fan_code)}
                style={{
                  width: "100%", textAlign: "left", padding: "14px 16px", background: activeFan === t.fan_code ? "rgba(200,169,110,0.07)" : "transparent",
                  borderRight: `2px solid ${activeFan === t.fan_code ? "#c8a96e" : "transparent"}`,
                  border: "none", borderBottom: "1px solid rgba(255,255,255,0.04)", cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ ...mono, fontSize: "12px", color: activeFan === t.fan_code ? "#c8a96e" : "rgba(255,255,255,0.65)", letterSpacing: "0.06em" }}>{t.fan_code}</span>
                  <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)" }}>{timeAgo(t.last_at)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "4px" }}>
                  <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "160px" }}>
                    {t.messages[t.messages.length - 1]?.content ?? ""}
                  </span>
                  {t.unread > 0 && (
                    <span style={{ ...mono, fontSize: "9px", background: "#c8a96e", color: "#08080f", borderRadius: "10px", padding: "1px 6px" }}>{t.unread}</span>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Message pane */}
          <div style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
            {activeThread ? (
              <>
                <div style={{ padding: "12px 20px", borderBottom: "1px solid rgba(255,255,255,0.055)", flexShrink: 0 }}>
                  <span style={{ ...mono, fontSize: "12px", color: "#c8a96e", letterSpacing: "0.08em" }}>{activeThread.fan_code}</span>
                </div>

                <div style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: "10px" }}>
                  {activeThread.messages.map((msg) => (
                    <div key={msg.id} style={{ display: "flex", justifyContent: msg.from_creator ? "flex-end" : "flex-start" }}>
                      <div style={{
                        maxWidth: "72%", padding: "10px 14px", borderRadius: "10px",
                        background: msg.from_creator ? "rgba(200,169,110,0.15)" : "rgba(255,255,255,0.06)",
                        border: `1px solid ${msg.from_creator ? "rgba(200,169,110,0.25)" : "rgba(255,255,255,0.08)"}`,
                      }}>
                        <p style={{ margin: 0, fontSize: "13px", color: "rgba(255,255,255,0.8)", lineHeight: 1.5 }}>{msg.content}</p>
                        <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.25)", marginTop: "4px", display: "block" }}>{timeAgo(msg.created_at)}</span>
                      </div>
                    </div>
                  ))}
                  <div ref={bottomRef} />
                </div>

                <div style={{ padding: "14px 20px", borderTop: "1px solid rgba(255,255,255,0.055)", display: "flex", gap: "10px", flexShrink: 0 }}>
                  <input
                    type="text"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                    placeholder="Reply to fan…"
                    style={{ flex: 1, padding: "10px 14px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", color: "#fff", fontSize: "13px", outline: "none" }}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={sending || !draft.trim()}
                    style={{ ...mono, fontSize: "11px", padding: "10px 16px", background: "rgba(200,169,110,0.15)", border: "1px solid rgba(200,169,110,0.3)", color: "#c8a96e", borderRadius: "6px", cursor: "pointer", letterSpacing: "0.06em", opacity: (!draft.trim() || sending) ? 0.5 : 1 }}
                  >
                    {sending ? "…" : "Send"}
                  </button>
                </div>
              </>
            ) : (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.2)", fontSize: "13px" }}>
                Select a conversation
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
