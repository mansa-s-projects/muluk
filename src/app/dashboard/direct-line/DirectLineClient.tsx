"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const mono = { fontFamily: "var(--font-mono, 'DM Mono', monospace)" } as const;
const body = { fontFamily: "var(--font-body, 'Outfit', sans-serif)" } as const;
const display = { fontFamily: "var(--font-display, 'Cormorant Garamond', serif)" } as const;

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

interface Thread {
  fan_code: string;
  messages: Message[];
  last_at: string;
  unread: number;
}

interface SendMessageResponse {
  message: Message;
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

function groupByFan(messages: Message[]): Thread[] {
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

function isMessage(value: unknown): value is Message {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<Message>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.fan_code === "string" &&
    typeof candidate.content === "string" &&
    typeof candidate.from_creator === "boolean" &&
    typeof candidate.created_at === "string"
  );
}

function EmptyState() {
  return (
    <div className="dl-empty">
      <div className="dl-empty-mark">◎</div>
      <h2 className="dl-empty-title">No messages yet</h2>
      <p className="dl-empty-sub">When fans message you, conversations appear here instantly.</p>
    </div>
  );
}

function ThreadList({
  threads,
  activeFan,
  onSelect,
}: {
  threads: Thread[];
  activeFan: string | null;
  onSelect: (fanCode: string) => void;
}) {
  return (
    <aside className="dl-list">
      {threads.map((thread) => {
        const active = thread.fan_code === activeFan;
        const latest = thread.messages[thread.messages.length - 1]?.content ?? "";
        return (
          <button
            key={thread.fan_code}
            onClick={() => onSelect(thread.fan_code)}
            className={`dl-thread ${active ? "is-active" : ""}`}
            type="button"
          >
            <div className="dl-thread-top">
              <span className="dl-fan">{thread.fan_code}</span>
              <span className="dl-time">{timeAgo(thread.last_at)}</span>
            </div>
            <div className="dl-thread-bottom">
              <span className="dl-preview">{latest}</span>
              {thread.unread > 0 ? <span className="dl-unread">{thread.unread}</span> : null}
            </div>
          </button>
        );
      })}
    </aside>
  );
}

function MessageBubble({ message }: { message: Message }) {
  return (
    <div className={`dl-msg-row ${message.from_creator ? "mine" : "theirs"}`}>
      <div className={`dl-msg ${message.from_creator ? "mine" : "theirs"}`}>
        <p className="dl-msg-text">{message.content}</p>
        <span className="dl-msg-time">{timeAgo(message.created_at)}</span>
      </div>
    </div>
  );
}

export default function DirectLineClient({ initialMessages, creatorId }: Props) {
  void creatorId;
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [activeFan, setActiveFan] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [isNarrow, setIsNarrow] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const threads = useMemo(() => groupByFan(messages), [messages]);
  const activeThread = threads.find((t) => t.fan_code === activeFan);

  // Auto-select first thread
  useEffect(() => {
    if (!activeFan && threads.length > 0) setActiveFan(threads[0].fan_code);
  }, [threads.length]);

  useEffect(() => {
    const activeWindow = typeof window === "undefined" ? null : window;
    if (!activeWindow) return;

    const media = window.matchMedia("(max-width: 900px)");
    const update = () => setIsNarrow(media.matches);

    const params = new URLSearchParams(activeWindow.location.search);
    const fan = params.get("fan");
    if (fan) setActiveFan(fan);

    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeFan, messages.length]);

  async function sendMessage() {
    if (!draft.trim() || !activeFan) return;
    setSending(true);
    setSendError(null);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fanCode: activeFan, content: draft.trim(), asFan: false }),
      });

      if (!res.ok) {
        throw new Error(`Message send failed with status ${res.status}`);
      }

      const json = (await res.json()) as SendMessageResponse;
      if (!isMessage(json.message)) {
        throw new Error("Invalid message payload returned from API");
      }

      setMessages((prev) => [...prev, json.message]);
      setDraft("");
    } catch {
      setSendError("Message failed to send. Please try again.");
    } finally {
      setSending(false);
    }
  }

  const showThreadPane = !isNarrow || !!activeThread;
  const showListPane = !isNarrow || !activeThread;

  return (
    <div className="dl-shell">
      <div className="dl-header">
        <div>
          <p className="dl-eyebrow" style={mono}>Direct Line</p>
          <h1 className="dl-title" style={display}>Private Conversations</h1>
          <p className="dl-sub" style={body}>
            {threads.length} conversation{threads.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {threads.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="dl-grid">
          {showListPane ? (
            <ThreadList threads={threads} activeFan={activeFan} onSelect={setActiveFan} />
          ) : null}

          {showThreadPane ? (
            <section className="dl-pane">
              {activeThread ? (
                <>
                  <div className="dl-pane-header">
                    {isNarrow ? (
                      <button className="dl-back" type="button" onClick={() => setActiveFan(null)}>
                        Back
                      </button>
                    ) : null}
                    <span className="dl-pane-fan">{activeThread.fan_code}</span>
                  </div>

                  <div className="dl-messages">
                    {activeThread.messages.map((message) => (
                      <MessageBubble key={message.id} message={message} />
                    ))}
                    <div ref={bottomRef} />
                  </div>

                  <div className="dl-compose">
                    {sendError ? <p className="dl-error">{sendError}</p> : null}
                    <input
                      type="text"
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      onKeyDown={(event) => event.key === "Enter" && !event.shiftKey && sendMessage()}
                      placeholder="Reply to fan..."
                      className="dl-input"
                    />
                    <button
                      onClick={sendMessage}
                      disabled={sending || !draft.trim()}
                      className="dl-send"
                      type="button"
                    >
                      {sending ? "Sending" : "Send"}
                    </button>
                  </div>
                </>
              ) : (
                <div className="dl-select">Select a conversation</div>
              )}
            </section>
          ) : null}
        </div>
      )}

      <style jsx>{`
        .dl-shell {
          min-height: calc(100vh - 120px);
          background:
            radial-gradient(1300px 520px at 100% -120px, rgba(200, 169, 110, 0.08), transparent 55%),
            radial-gradient(800px 420px at -10% 100%, rgba(200, 169, 110, 0.06), transparent 60%),
            #020203;
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 14px;
          overflow: hidden;
          position: relative;
        }

        .dl-shell::before {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.05'/%3E%3C/svg%3E");
          opacity: 0.22;
          z-index: 1;
        }

        .dl-header,
        .dl-grid,
        .dl-empty {
          position: relative;
          z-index: 2;
        }

        .dl-header {
          padding: 24px 28px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          background: rgba(9, 9, 15, 0.72);
          backdrop-filter: blur(6px);
        }

        .dl-eyebrow {
          margin: 0;
          color: rgba(200, 169, 110, 0.78);
          letter-spacing: 0.25em;
          text-transform: uppercase;
          font-size: 10px;
        }

        .dl-title {
          margin: 6px 0 0;
          color: rgba(255, 255, 255, 0.95);
          font-size: clamp(34px, 6vw, 52px);
          line-height: 0.96;
          font-weight: 300;
          letter-spacing: -0.02em;
        }

        .dl-sub {
          margin: 10px 0 0;
          color: rgba(255, 255, 255, 0.56);
          font-size: 13px;
        }

        .dl-empty {
          min-height: 56vh;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          gap: 12px;
          padding: 30px;
          text-align: center;
        }

        .dl-empty-mark {
          color: #c8a96e;
          font-size: 44px;
          line-height: 1;
          font-family: var(--font-mono, 'DM Mono', monospace);
        }

        .dl-empty-title {
          margin: 0;
          color: rgba(255, 255, 255, 0.86);
          font-size: 22px;
          font-family: var(--font-display, 'Cormorant Garamond', serif);
          font-weight: 400;
        }

        .dl-empty-sub {
          margin: 0;
          color: rgba(255, 255, 255, 0.42);
          font-size: 13px;
          font-family: var(--font-body, 'Outfit', sans-serif);
        }

        .dl-grid {
          min-height: 62vh;
          display: grid;
          grid-template-columns: 300px 1fr;
        }

        .dl-list {
          border-right: 1px solid rgba(255, 255, 255, 0.06);
          background: rgba(13, 13, 24, 0.82);
          overflow-y: auto;
          max-height: 100%;
        }

        .dl-thread {
          width: 100%;
          text-align: left;
          background: transparent;
          border: 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          color: inherit;
          padding: 14px 16px;
          cursor: pointer;
          transition: background 180ms ease, border-color 180ms ease;
        }

        .dl-thread:hover {
          background: rgba(255, 255, 255, 0.03);
        }

        .dl-thread.is-active {
          background: rgba(200, 169, 110, 0.09);
          border-left: 2px solid rgba(200, 169, 110, 0.84);
          padding-left: 14px;
        }

        .dl-thread-top,
        .dl-thread-bottom {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .dl-fan {
          color: rgba(255, 255, 255, 0.75);
          font-size: 11px;
          letter-spacing: 0.09em;
          font-family: var(--font-mono, 'DM Mono', monospace);
        }

        .dl-thread.is-active .dl-fan {
          color: #c8a96e;
        }

        .dl-time {
          color: rgba(255, 255, 255, 0.35);
          font-size: 10px;
          font-family: var(--font-mono, 'DM Mono', monospace);
        }

        .dl-thread-bottom {
          margin-top: 6px;
        }

        .dl-preview {
          max-width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: rgba(255, 255, 255, 0.42);
          font-size: 12px;
          font-family: var(--font-body, 'Outfit', sans-serif);
        }

        .dl-unread {
          color: #070705;
          background: #c8a96e;
          border-radius: 999px;
          min-width: 20px;
          text-align: center;
          padding: 2px 6px;
          font-size: 9px;
          letter-spacing: 0.08em;
          font-family: var(--font-mono, 'DM Mono', monospace);
        }

        .dl-pane {
          display: flex;
          flex-direction: column;
          min-height: 0;
          background: rgba(6, 6, 16, 0.82);
        }

        .dl-pane-header {
          min-height: 52px;
          padding: 12px 18px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .dl-back {
          border: 1px solid rgba(200, 169, 110, 0.32);
          background: rgba(200, 169, 110, 0.09);
          color: #c8a96e;
          border-radius: 3px;
          padding: 6px 10px;
          font-size: 10px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          font-family: var(--font-mono, 'DM Mono', monospace);
        }

        .dl-pane-fan {
          color: #c8a96e;
          letter-spacing: 0.13em;
          font-size: 11px;
          font-family: var(--font-mono, 'DM Mono', monospace);
        }

        .dl-messages {
          padding: 18px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          overflow-y: auto;
          flex: 1;
        }

        .dl-msg-row {
          display: flex;
        }

        .dl-msg-row.mine {
          justify-content: flex-end;
        }

        .dl-msg-row.theirs {
          justify-content: flex-start;
        }

        .dl-msg {
          max-width: min(74%, 620px);
          border-radius: 10px;
          padding: 11px 14px;
          border: 1px solid;
        }

        .dl-msg.mine {
          background: rgba(200, 169, 110, 0.14);
          border-color: rgba(200, 169, 110, 0.28);
        }

        .dl-msg.theirs {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(255, 255, 255, 0.1);
        }

        .dl-msg-text {
          margin: 0;
          color: rgba(255, 255, 255, 0.87);
          font-size: 13px;
          line-height: 1.5;
          font-family: var(--font-body, 'Outfit', sans-serif);
          white-space: pre-wrap;
        }

        .dl-msg-time {
          display: block;
          margin-top: 5px;
          color: rgba(255, 255, 255, 0.32);
          font-size: 10px;
          font-family: var(--font-mono, 'DM Mono', monospace);
        }

        .dl-compose {
          padding: 14px 18px;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 10px;
          background: rgba(9, 9, 15, 0.65);
        }

        .dl-error {
          margin: 0;
          width: 100%;
          color: #e37f7f;
          font-size: 12px;
          font-family: var(--font-body, 'Outfit', sans-serif);
        }

        .dl-input {
          flex: 1;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 4px;
          color: rgba(255, 255, 255, 0.92);
          padding: 12px 12px;
          font-size: 13px;
          font-family: var(--font-body, 'Outfit', sans-serif);
          outline: none;
        }

        .dl-input:focus {
          border-color: rgba(200, 169, 110, 0.5);
          box-shadow: 0 0 0 2px rgba(200, 169, 110, 0.1);
        }

        .dl-send {
          border: 1px solid rgba(200, 169, 110, 0.32);
          border-radius: 3px;
          background: rgba(200, 169, 110, 0.12);
          color: #c8a96e;
          padding: 12px 16px;
          min-width: 104px;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          font-size: 10px;
          font-family: var(--font-mono, 'DM Mono', monospace);
          cursor: pointer;
          transition: opacity 180ms ease, background 180ms ease;
        }

        .dl-send:hover:not(:disabled) {
          background: rgba(200, 169, 110, 0.2);
        }

        .dl-send:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .dl-select {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(255, 255, 255, 0.3);
          font-size: 13px;
          font-family: var(--font-body, 'Outfit', sans-serif);
        }

        @media (max-width: 900px) {
          .dl-shell {
            min-height: calc(100vh - 96px);
          }

          .dl-header {
            padding: 18px 18px 16px;
          }

          .dl-title {
            font-size: clamp(28px, 9vw, 38px);
          }

          .dl-grid {
            display: block;
          }

          .dl-list,
          .dl-pane {
            min-height: 60vh;
          }

          .dl-msg {
            max-width: 86%;
          }

          .dl-compose {
            padding: 12px;
          }

          .dl-send {
            min-width: 92px;
          }
        }
      `}</style>
    </div>
  );
}
