"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const mono = { fontFamily: "var(--font-mono, 'DM Mono', monospace)" } as const;

const COMMANDS = [
  { label: "Content",      href: "/dashboard/content",                  group: "Navigate" },
  { label: "Vault",        href: "/dashboard/vault",                    group: "Navigate" },
  { label: "Earnings",     href: "/dashboard/signals",                  group: "Navigate" },
  { label: "Bookings",     href: "/dashboard/bookings",                 group: "Navigate" },
  { label: "Referrals",    href: "/dashboard/referrals",                group: "Navigate" },
  { label: "Analytics",    href: "/dashboard/presence",                 group: "Navigate" },
  { label: "Series",       href: "/dashboard/series",                   group: "Navigate" },
  { label: "Tip Jar",      href: "/dashboard/tips",                     group: "Navigate" },
  { label: "Fans",         href: "/dashboard/members",                  group: "Navigate" },
  { label: "Subscriptions",href: "/dashboard/subscriptions",            group: "Navigate" },
  { label: "Commissions",  href: "/dashboard/commissions",              group: "Navigate" },
  { label: "Brand Deals",  href: "/dashboard/deals",                    group: "Navigate" },
  { label: "Pay Links",    href: "/dashboard/monetization/pay-links",   group: "Navigate" },
  { label: "Pricing",      href: "/dashboard/monetization/pricing",     group: "Navigate" },
  { label: "Settings",     href: "/dashboard/settings",                 group: "Navigate" },
];

type Props = { userId: string };

export function CommandBar({ userId: _userId }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "/") { e.preventDefault(); setOpen(true); }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const filtered = COMMANDS.filter((c) =>
    c.label.toLowerCase().includes(query.toLowerCase())
  );

  if (!open) return null;

  return (
    <div
      onClick={() => setOpen(false)}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 500, display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: "18vh", backdropFilter: "blur(4px)" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: "520px", background: "#0d0d1a", border: "1px solid rgba(200,169,110,0.22)", borderRadius: "12px", overflow: "hidden", boxShadow: "0 24px 60px rgba(0,0,0,0.7)" }}
      >
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Type a command or navigate…"
          style={{ width: "100%", padding: "16px 20px", background: "transparent", border: "none", borderBottom: "1px solid rgba(255,255,255,0.07)", outline: "none", ...mono, fontSize: "14px", color: "rgba(255,255,255,0.85)" }}
        />
        <div style={{ maxHeight: "320px", overflowY: "auto" }}>
          {filtered.length === 0 ? (
            <div style={{ padding: "20px", textAlign: "center", ...mono, fontSize: "11px", color: "rgba(255,255,255,0.25)" }}>No results</div>
          ) : filtered.map((cmd) => (
            <button
              key={cmd.href}
              onClick={() => { router.push(cmd.href); setOpen(false); setQuery(""); }}
              style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(200,169,110,0.07)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.75)", fontFamily: "var(--font-body, 'Outfit', sans-serif)" }}>{cmd.label}</span>
              <span style={{ ...mono, fontSize: "9px", color: "rgba(200,169,110,0.4)", letterSpacing: "0.12em" }}>{cmd.group}</span>
            </button>
          ))}
        </div>
        <div style={{ padding: "10px 20px", borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", gap: "16px" }}>
          <span style={{ ...mono, fontSize: "9px", color: "rgba(255,255,255,0.2)", letterSpacing: "0.1em" }}>↵ GO</span>
          <span style={{ ...mono, fontSize: "9px", color: "rgba(255,255,255,0.2)", letterSpacing: "0.1em" }}>ESC CLOSE</span>
        </div>
      </div>
    </div>
  );
}
