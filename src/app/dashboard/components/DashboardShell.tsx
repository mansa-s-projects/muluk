"use client";

import React, { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { CreatorProvider } from "@/app/dashboard/context/CreatorContext";

// ─── Design tokens ──────────────────────────────────────────────────────────
const mono = { fontFamily: "var(--font-mono, 'DM Mono', monospace)" } as const;
const disp = { fontFamily: "var(--font-display, 'Cormorant Garamond', serif)" } as const;

// ─── Nav structure ───────────────────────────────────────────────────────────
const NAV_GROUPS = [
  {
    label: "MAKE MONEY",
    items: [
      { key: "signals",  label: "Signal Board", href: "/dashboard/signals",     icon: "◈" },
      { key: "vault",    label: "Vault",         href: "/dashboard/vault",       icon: "▦" },
      { key: "bookings", label: "1:1 Bookings",  href: "/dashboard/bookings",   icon: "◷" },
      { key: "series",   label: "Series",         href: "/dashboard/series",     icon: "▤" },
      { key: "tips",     label: "Tip Jar",         href: "/dashboard/tips",      icon: "▲" },
    ],
  },
  {
    label: "GROW",
    items: [
      { key: "rate-card", label: "Rate Card", href: "/dashboard/rate-card", icon: "◫" },
      { key: "referrals", label: "Referrals", href: "/dashboard/referrals", icon: "◍" },
    ],
  },
  {
    label: "MANAGE",
    items: [
      { key: "commissions", label: "Commissions", href: "/dashboard/commissions", icon: "◉" },
      { key: "deals",       label: "Brand Deals",  href: "/dashboard/deals",       icon: "◎" },
    ],
  },
  {
    label: "INTELLIGENCE",
    items: [
      { key: "presence", label: "Live Fans", href: "/dashboard/presence", icon: "◌" },
    ],
  },
] as const;

// ─── Types ────────────────────────────────────────────────────────────────────
type Props = {
  children: React.ReactNode;
  userEmail: string;
  userId: string;
  handle?: string;
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function DashboardShell({ children, userEmail, userId, handle }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Sidebar */}
      <aside
        style={{
          width: "220px",
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          background: "rgba(8,8,15,0.98)",
          borderRight: "1px solid rgba(255,255,255,0.055)",
          display: "flex",
          flexDirection: "column",
          zIndex: 100,
          backdropFilter: "blur(12px)",
          overflowY: "auto",
          minHeight: 0,
        }}
      >
        {/* Logo */}
        <div
          style={{
            padding: "24px 20px",
            borderBottom: "1px solid rgba(255,255,255,0.055)",
            flexShrink: 0,
          }}
        >
          <Link
            href="/dashboard"
            style={{
              ...mono,
              fontSize: "13px",
              fontWeight: 500,
              letterSpacing: "0.3em",
              color: "var(--gold, #c8a96e)",
              textDecoration: "none",
              display: "block",
              marginBottom: "3px",
            }}
          >
            CIPHER
          </Link>
          <div
            style={{
              ...mono,
              fontSize: "10px",
              color: "rgba(255,255,255,0.22)",
              letterSpacing: "0.12em",
            }}
          >
            Creator OS
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "8px 0", overflowY: "auto", minHeight: 0 }}>
          {/* Workspace home */}
          <NavLink href="/dashboard" active={isActive("/dashboard")}>
            Workspace
          </NavLink>

          {/* Grouped tool nav */}
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              {/* Group label */}
              <div
                style={{
                  padding: "14px 20px 5px",
                  ...mono,
                  fontSize: "9px",
                  letterSpacing: "0.18em",
                  color: "rgba(200,169,110,0.4)",
                }}
              >
                {group.label}
              </div>
              {group.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "10px 20px",
                      fontSize: "13px",
                      color: active ? "var(--gold, #c8a96e)" : "rgba(255,255,255,0.48)",
                      background: active ? "rgba(200,169,110,0.07)" : "transparent",
                      borderRight: `2px solid ${active ? "var(--gold, #c8a96e)" : "transparent"}`,
                      textDecoration: "none",
                      transition: "all 0.15s",
                      fontFamily: active ? "var(--font-mono, 'DM Mono', monospace)" : "var(--font-body, 'Outfit', sans-serif)",
                      letterSpacing: active ? "0.06em" : "0",
                      fontWeight: active ? 500 : 300,
                    }}
                    onMouseEnter={(e) => {
                      if (!active) {
                        e.currentTarget.style.color = "rgba(200,169,110,0.8)";
                        e.currentTarget.style.background = "rgba(200,169,110,0.04)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!active) {
                        e.currentTarget.style.color = "rgba(255,255,255,0.48)";
                        e.currentTarget.style.background = "transparent";
                      }
                    }}
                  >
                    <span
                      style={{
                        fontSize: "10px",
                        color: active ? "var(--gold, #c8a96e)" : "rgba(255,255,255,0.22)",
                        flexShrink: 0,
                      }}
                    >
                      {item.icon}
                    </span>
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Profile / sign-out */}
        <div
          style={{
            borderTop: "1px solid rgba(255,255,255,0.055)",
            padding: "10px 12px",
            position: "relative",
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            onClick={() => setProfileMenuOpen((v) => !v)}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: "9px",
              background: profileMenuOpen ? "rgba(200,169,110,0.07)" : "transparent",
              border: `1px solid ${profileMenuOpen ? "rgba(200,169,110,0.22)" : "rgba(255,255,255,0.07)"}`,
              borderRadius: "6px",
              padding: "8px 10px",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            <div
              style={{
                width: "26px",
                height: "26px",
                borderRadius: "50%",
                border: "1px solid rgba(200,169,110,0.35)",
                background: "rgba(200,169,110,0.12)",
                display: "grid",
                placeItems: "center",
                ...mono,
                color: "var(--gold, #c8a96e)",
                fontSize: "11px",
                flexShrink: 0,
              }}
            >
              {(userEmail[0] || "C").toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
              <div
                style={{
                  fontSize: "11px",
                  color: "rgba(255,255,255,0.48)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {userEmail}
              </div>
              {handle && (
                <div
                  style={{
                    ...mono,
                    fontSize: "8px",
                    color: "rgba(200,169,110,0.5)",
                    letterSpacing: "0.14em",
                    marginTop: "2px",
                  }}
                >
                  @{handle}
                </div>
              )}
            </div>
            <svg
              viewBox="0 0 10 6"
              width="9"
              height="9"
              fill="none"
              style={{
                color: "rgba(255,255,255,0.22)",
                flexShrink: 0,
                transform: profileMenuOpen ? "rotate(180deg)" : "none",
                transition: "transform 0.15s",
              }}
            >
              <path
                d="M1 1l4 4 4-4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          {profileMenuOpen && (
            <div
              style={{
                position: "absolute",
                bottom: "calc(100% + 6px)",
                left: "12px",
                right: "12px",
                background: "#0d0d18",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "8px",
                overflow: "hidden",
                zIndex: 110,
              }}
            >
              {handle && (
                <Link
                  href={`/${handle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "9px",
                    padding: "10px 12px",
                    borderBottom: "1px solid rgba(255,255,255,0.06)",
                    color: "rgba(255,255,255,0.48)",
                    fontSize: "12px",
                    textDecoration: "none",
                  }}
                >
                  <svg
                    viewBox="0 0 16 16"
                    width="13"
                    height="13"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    aria-hidden="true"
                  >
                    <path d="M7 2H3a1 1 0 00-1 1v10a1 1 0 001 1h10a1 1 0 001-1V9" strokeLinecap="round" />
                    <path d="M10 2h4v4M14 2L7 9" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  View public page
                </Link>
              )}
              <Link
                href="/dashboard?section=settings"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "9px",
                  padding: "10px 12px",
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                  color: "rgba(255,255,255,0.48)",
                  fontSize: "12px",
                  textDecoration: "none",
                }}
              >
                <svg
                  viewBox="0 0 16 16"
                  width="13"
                  height="13"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  aria-hidden="true"
                >
                  <circle cx="8" cy="8" r="2.5" />
                  <path d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3.05 3.05l1.06 1.06M11.89 11.89l1.06 1.06M12.95 3.05l-1.06 1.06M4.11 11.89l-1.06 1.06" />
                </svg>
                Settings
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                disabled={signingOut}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: "9px",
                  padding: "10px 12px",
                  background: "transparent",
                  border: "none",
                  color: "rgba(255,255,255,0.22)",
                  fontSize: "12px",
                  cursor: signingOut ? "not-allowed" : "pointer",
                  textAlign: "left",
                }}
              >
                <svg
                  viewBox="0 0 16 16"
                  width="13"
                  height="13"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  aria-hidden="true"
                >
                  <path
                    d="M10 8H2M6 5l-3 3 3 3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path d="M6 2h7a1 1 0 011 1v10a1 1 0 01-1 1H6" strokeLinecap="round" />
                </svg>
                {signingOut ? "Signing out…" : "Sign out"}
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main content offset */}
      <div style={{ marginLeft: "220px" }}>
        <CreatorProvider userId={userId} userEmail={userEmail} handle={handle ?? ""}>
          {children}
        </CreatorProvider>
      </div>
    </>
  );
}

// ─── Small helper ─────────────────────────────────────────────────────────────
function NavLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      style={{
        display: "flex",
        alignItems: "center",
        padding: "10px 20px",
        fontSize: "13px",
        color: active ? "var(--gold, #c8a96e)" : "rgba(255,255,255,0.48)",
        background: active ? "rgba(200,169,110,0.07)" : "transparent",
        borderRight: `2px solid ${active ? "var(--gold, #c8a96e)" : "transparent"}`,
        textDecoration: "none",
        transition: "all 0.15s",
        fontFamily: active ? "var(--font-mono, 'DM Mono', monospace)" : "var(--font-body, 'Outfit', sans-serif)",
        fontWeight: active ? 500 : 300,
        letterSpacing: active ? "0.06em" : "0",
      }}
    >
      {children}
    </Link>
  );
}
