"use client";

import { useEffect, useMemo, useState } from "react";

type Message = {
  id: string;
  supporter_code: string;
  content: string;
  from_creator: boolean | null;
  created_at: string;
};

function fmtTime(value: string): string {
  const dt = new Date(value);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(dt);
}

export default function DashboardMessagesPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [suggesting, setSuggesting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/messages");
      if (!res.ok) throw new Error("Failed to load messages");
      const json = (await res.json()) as { messages: Message[] };
      const sorted = [...(json.messages ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at));
      setMessages(sorted);
      setSelectedCode(prev => prev ?? sorted[0]?.supporter_code ?? null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const threads = useMemo(() => {
    const map = new Map<string, Message[]>();
    for (const message of messages) {
      const key = message.supporter_code.toUpperCase();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(message);
    }
    return Array.from(map.entries()).map(([supporter_code, thread]) => ({
      supporter_code,
      thread: thread.sort((a, b) => a.created_at.localeCompare(b.created_at)),
      latest: thread[0],
    }));
  }, [messages]);

  const activeThread = useMemo(() => {
    const code = selectedCode?.toUpperCase();
    if (!code) return [] as Message[];
    return messages
      .filter(message => message.supporter_code.toUpperCase() === code)
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
  }, [messages, selectedCode]);

  const latestSignal = useMemo(() => {
    const supporterMessage = [...activeThread].reverse().find(message => !message.from_creator);
    return supporterMessage?.content || activeThread[activeThread.length - 1]?.content || "";
  }, [activeThread]);

  const suggestReplies = async () => {
    const code = selectedCode?.trim();
    if (!code) return;
    setSuggesting(true);
    try {
      const res = await fetch("/api/ai/direct-line/suggest-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supporterCode: code, latestMessage: latestSignal, tone: "warm" }),
      });
      if (!res.ok) throw new Error("Failed to generate suggestions");
      const json = (await res.json()) as { suggestions?: string[] };
      setSuggestions((json.suggestions ?? []).slice(0, 3));
    } finally {
      setSuggesting(false);
    }
  };

  const sendReply = async (content: string) => {
    const code = selectedCode?.trim();
    if (!code || !content.trim()) return;
    setSending(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ SupporterCode: code, content, asSupporter: false }),
      });
      if (!res.ok) throw new Error("Failed to send reply");
      setDraft("");
      setSuggestions([]);
      await load();
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="messages-page">
      <style>{`
        *{box-sizing:border-box}
        .messages-page{min-height:100vh;background:#020203;padding:32px;font-family:var(--font-body,'Outfit',sans-serif);color:rgba(255,255,255,0.88)}
        .top{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;margin-bottom:22px}
        .eyebrow{font-family:var(--font-mono,'DM Mono',monospace);font-size:10px;letter-spacing:0.28em;text-transform:uppercase;color:#7a6030;margin-bottom:8px}
        .title{font-family:var(--font-display,'Cormorant Garamond',serif);font-size:clamp(30px,4vw,52px);font-weight:300;line-height:1;margin:0}
        .sub{margin-top:8px;color:rgba(255,255,255,0.32);font-size:13px}
        .btn{font-family:var(--font-mono,'DM Mono',monospace);font-size:9px;letter-spacing:0.16em;text-transform:uppercase;border:none;border-radius:3px;padding:10px 14px;cursor:pointer}
        .btn-gold{background:#c8a96e;color:#090603}
        .btn-ghost{background:transparent;border:1px solid rgba(255,255,255,0.08);color:rgba(255,255,255,0.55)}
        .layout{display:grid;grid-template-columns:320px 1fr;gap:14px;align-items:start}
        @media(max-width:980px){.layout{grid-template-columns:1fr}}
        .card{background:#0f0f1e;border:1px solid rgba(255,255,255,0.055);border-radius:10px;overflow:hidden}
        .card-hd{padding:16px 18px;border-bottom:1px solid rgba(255,255,255,0.05);display:flex;align-items:center;justify-content:space-between}
        .card-label{font-family:var(--font-mono,'DM Mono',monospace);font-size:9px;letter-spacing:0.22em;text-transform:uppercase;color:rgba(255,255,255,0.28)}
        .thread-list{max-height:78vh;overflow:auto}
        .thread-item{padding:14px 18px;border-bottom:1px solid rgba(255,255,255,0.04);cursor:pointer;transition:background 0.15s}
        .thread-item:hover{background:rgba(255,255,255,0.02)}
        .thread-item.active{background:rgba(200,169,110,0.06)}
        .thread-code{font-family:var(--font-mono,'DM Mono',monospace);font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:#c8a96e}
        .thread-snippet{margin-top:8px;font-size:13px;line-height:1.6;color:rgba(255,255,255,0.6)}
        .thread-meta{margin-top:10px;font-family:var(--font-mono,'DM Mono',monospace);font-size:9px;color:rgba(255,255,255,0.25)}
        .thread-pane{display:flex;flex-direction:column;min-height:78vh}
        .thread-messages{flex:1;padding:18px;display:flex;flex-direction:column;gap:12px;max-height:58vh;overflow:auto}
        .msg{max-width:82%;padding:12px 14px;border-radius:8px;font-size:13px;line-height:1.7;font-weight:300}
        .msg.creator{align-self:flex-end;background:rgba(200,169,110,0.1);border:1px solid rgba(200,169,110,0.15);color:rgba(255,255,255,0.85)}
        .msg.supporter{align-self:flex-start;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07);color:rgba(255,255,255,0.72)}
        .composer{padding:18px;border-top:1px solid rgba(255,255,255,0.05)}
        .textarea{width:100%;min-height:110px;border-radius:8px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);color:rgba(255,255,255,0.85);padding:14px;font-family:var(--font-body,'Outfit',sans-serif);font-size:13px;line-height:1.7;resize:vertical;outline:none}
        .textarea:focus{border-color:rgba(200,169,110,0.35)}
        .row{display:flex;gap:10px;align-items:center;justify-content:space-between;margin-top:12px;flex-wrap:wrap}
        .suggestions{display:flex;flex-direction:column;gap:8px;margin-top:14px}
        .suggestion{padding:12px 14px;border-radius:8px;border:1px solid rgba(200,169,110,0.14);background:rgba(200,169,110,0.04);color:rgba(255,255,255,0.72);font-size:13px;line-height:1.6;cursor:pointer;text-align:left}
        .empty{padding:34px 18px;color:rgba(255,255,255,0.22);font-size:14px;line-height:1.8;text-align:center}
      `}</style>

      <div className="top">
        <div>
          <div className="eyebrow">Supporter Inbox</div>
          <h1 className="title">Direct Line</h1>
          <div className="sub">Review supporter threads, generate reply drafts, and send responses from one place.</div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-ghost" onClick={() => void load()} disabled={loading}>Reload</button>
          <button className="btn btn-gold" onClick={() => void suggestReplies()} disabled={!selectedCode || suggesting || activeThread.length === 0}>
            {suggesting ? "Suggesting..." : "AI Reply"}
          </button>
        </div>
      </div>

      <div className="layout">
        <div className="card">
          <div className="card-hd">
            <div className="card-label">Threads</div>
            <div className="card-label">{threads.length}</div>
          </div>
          <div className="thread-list">
            {loading ? (
              <div className="empty">Loading inbox…</div>
            ) : threads.length === 0 ? (
              <div className="empty">No supporter messages yet. Once messages arrive, they will appear here.</div>
            ) : (
              threads.map(({ supporter_code, thread }) => {
                const latest = thread[thread.length - 1];
                const active = supporter_code === selectedCode?.toUpperCase();
                return (
                  <div key={supporter_code} className={`thread-item ${active ? "active" : ""}`} onClick={() => setSelectedCode(supporter_code)}>
                    <div className="thread-code">{supporter_code}</div>
                    <div className="thread-snippet">{latest?.content}</div>
                    <div className="thread-meta">{thread.length} messages · {latest ? fmtTime(latest.created_at) : "—"}</div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="card thread-pane">
          <div className="card-hd">
            <div className="card-label">Conversation</div>
            <div className="card-label">{selectedCode ?? "None selected"}</div>
          </div>
          <div className="thread-messages">
            {!selectedCode ? (
              <div className="empty">Select a supporter thread to view the conversation and generate replies.</div>
            ) : activeThread.length === 0 ? (
              <div className="empty">No messages in this thread.</div>
            ) : (
              activeThread.map(message => (
                <div key={message.id} className={`msg ${message.from_creator ? "creator" : "supporter"}`}>
                  {message.content}
                </div>
              ))
            )}
          </div>

          <div className="composer">
            <textarea
              className="textarea"
              placeholder={selectedCode ? "Write a reply to this supporter..." : "Select a thread first"}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              disabled={!selectedCode || sending}
            />

            {suggestions.length > 0 && (
              <div className="suggestions">
                {suggestions.map((suggestion, index) => (
                  <button key={`${index}-${suggestion}`} className="suggestion" onClick={() => setDraft(suggestion)}>
                    {suggestion}
                  </button>
                ))}
              </div>
            )}

            <div className="row">
              <div className="card-label">
                {selectedCode ? `${activeThread.length} messages in thread` : "No thread selected"}
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button className="btn btn-ghost" onClick={() => setDraft("")} disabled={!draft}>
                  Clear
                </button>
                <button className="btn btn-gold" onClick={() => void sendReply(draft)} disabled={!selectedCode || !draft.trim() || sending}>
                  {sending ? "Sending..." : "Send Reply"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
