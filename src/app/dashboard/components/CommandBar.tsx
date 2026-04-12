"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { GOLD, G, mono, body } from "@/app/dashboard/_lib/tokens";

interface Command {
  id: string;
  icon: string;
  label: string;
  description: string;
  action: () => void;
  keywords: string[];
}

interface Props {
  userId: string;
}

export function CommandBar({ userId }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands: Command[] = [
    {
      id: "msg",
      icon: "◎",
      label: "Message a member",
      description: "Open Direct Line",
      keywords: ["message", "dm", "chat", "send"],
      action: () => { router.push("/dashboard/direct-line"); close(); },
    },
    {
      id: "drop",
      icon: "▲",
      label: "Create a drop",
      description: "Launch limited-slot offer in Vault",
      keywords: ["drop", "create", "launch", "slot", "offer"],
      action: () => { router.push("/dashboard/vault"); close(); },
    },
    {
      id: "offer",
      icon: "◈",
      label: "Send offer to member",
      description: "Open Direct Line with offer template",
      keywords: ["offer", "blast", "mass", "hot"],
      action: () => { router.push("/dashboard/direct-line"); close(); },
    },
    {
      id: "members",
      icon: "◍",
      label: "View members",
      description: "Browse your member list",
      keywords: ["member", "fan", "list", "browse"],
      action: () => { router.push("/dashboard/members"); close(); },
    },
    {
      id: "vault",
      icon: "▦",
      label: "Open Vault",
      description: "Manage assets and drops",
      keywords: ["vault", "content", "assets", "drops", "monetize"],
      action: () => { router.push("/dashboard/vault"); close(); },
    },
    {
      id: "earnings",
      icon: "◈",
      label: "View earnings",
      description: "Check your revenue signals",
      keywords: ["earnings", "signals", "revenue", "money", "payout"],
      action: () => { router.push("/dashboard/signals"); close(); },
    },
  ];

  const filtered = query
    ? commands.filter(
        (c) =>
          c.label.toLowerCase().includes(query.toLowerCase()) ||
          c.keywords.some((k) => k.includes(query.toLowerCase()))
      )
    : commands;

  function close() {
    setOpen(false);
    setQuery("");
    setSelected(0);
  }

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      // Open on "/" when not in an input/textarea
      if (
        e.key === "/" &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement)
      ) {
        e.preventDefault();
        setOpen(true);
        return;
      }
      // Close on Escape
      if (e.key === "Escape") { close(); return; }
      if (!open) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelected((s) => Math.min(s + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelected((s) => Math.max(s - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        filtered[selected]?.action();
      }
    },
    [open, filtered, selected]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 10);
  }, [open]);

  // Reset selection when query changes
  useEffect(() => { setSelected(0); }, [query]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        title='Press "/" to open command bar'
        style={{
          display: "flex", alignItems: "center", gap: "6px",
          padding: "5px 10px",
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "6px",
          color: "rgba(255,255,255,0.3)",
          fontSize: "11px",
          cursor: "pointer",
          ...mono,
        }}
      >
        <span style={{ fontSize: "12px" }}>◈</span>
        <span style={{ letterSpacing: "0.05em" }}>Command</span>
        <span style={{
          padding: "1px 5px",
          background: "rgba(255,255,255,0.06)",
          borderRadius: "3px",
          fontSize: "9px",
          letterSpacing: "0.1em",
        }}>
          /
        </span>
      </button>
    );
  }

  return (
    <div
      style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(6px)",
        display: "grid", placeItems: "start center",
        paddingTop: "15vh",
        zIndex: 1000,
      }}
      onClick={(e) => e.target === e.currentTarget && close()}
    >
      <div style={{
        width: "100%", maxWidth: "520px", margin: "0 20px",
        background: "#0f0f0f",
        border: "1px solid rgba(200,169,110,0.2)",
        borderRadius: "12px",
        overflow: "hidden",
        boxShadow: "0 24px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(200,169,110,0.05)",
      }}>
        {/* Search input */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <span style={{ ...mono, fontSize: "14px", color: GOLD }}>◈</span>
          <input
            ref={inputRef}
            type="text"
            placeholder='Type a command or search…'
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              flex: 1, background: "transparent", border: "none", outline: "none",
              color: "#fff", fontSize: "14px", ...body,
            }}
          />
          <span style={{ ...mono, fontSize: "10px", color: "rgba(255,255,255,0.2)", cursor: "pointer" }} onClick={close}>
            ESC
          </span>
        </div>

        {/* Commands */}
        <div>
          {filtered.length === 0 ? (
            <div style={{ padding: "24px", textAlign: "center", ...body, fontSize: "13px", color: "rgba(255,255,255,0.2)" }}>
              No commands match &quot;{query}&quot;
            </div>
          ) : (
            filtered.map((cmd, i) => (
              <button
                key={cmd.id}
                type="button"
                onClick={cmd.action}
                style={{
                  width: "100%", textAlign: "left",
                  display: "flex", alignItems: "center", gap: "14px",
                  padding: "13px 18px",
                  background: i === selected ? "rgba(200,169,110,0.07)" : "transparent",
                  border: "none",
                  borderLeft: `2px solid ${i === selected ? GOLD : "transparent"}`,
                  borderBottom: "1px solid rgba(255,255,255,0.04)",
                  cursor: "pointer",
                  transition: "background 0.1s",
                }}
                onMouseEnter={() => setSelected(i)}
              >
                <span style={{ ...mono, fontSize: "16px", color: i === selected ? GOLD : "rgba(255,255,255,0.3)", flexShrink: 0 }}>
                  {cmd.icon}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ ...body, fontSize: "13px", color: i === selected ? "#fff" : "rgba(255,255,255,0.7)", fontWeight: 500 }}>
                    {cmd.label}
                  </div>
                  <div style={{ ...body, fontSize: "11px", color: "rgba(255,255,255,0.3)", marginTop: "1px" }}>
                    {cmd.description}
                  </div>
                </div>
                {i === selected && (
                  <span style={{ ...mono, fontSize: "9px", color: "rgba(255,255,255,0.25)", flexShrink: 0, letterSpacing: "0.1em" }}>
                    ENTER
                  </span>
                )}
              </button>
            ))
          )}
        </div>

        {/* Footer hint */}
        <div style={{ padding: "10px 18px", borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", gap: "16px" }}>
          {[["↑↓", "navigate"], ["↵", "execute"], ["esc", "close"]].map(([key, label]) => (
            <div key={key} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <span style={{ ...mono, fontSize: "9px", color: "rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.05)", padding: "2px 5px", borderRadius: "3px" }}>{key}</span>
              <span style={{ ...body, fontSize: "9px", color: "rgba(255,255,255,0.2)" }}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
