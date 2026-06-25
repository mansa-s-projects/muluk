"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const NAV = [
  {
    group: "Empire",
    items: [
      { href: "/dashboard",              icon: "⬡", label: "Overview" },
      { href: "/dashboard/intelligence", icon: "◈", label: "Intelligence" },
      { href: "/dashboard/war-room",     icon: "◎", label: "War Room" },
    ],
  },
  {
    group: "Audience",
    items: [
      { href: "/dashboard/integrations", icon: "⌁", label: "Integrations" },
      { href: "/dashboard/messages", icon: "✦", label: "Messages" },
      { href: "/dashboard/social", icon: "⇪", label: "Share" },
    ],
  },
  {
    group: "Revenue",
    items: [
      { href: "/dashboard/affiliates",   icon: "◆", label: "Affiliates" },
    ],
  },
  {
    group: "Strategy",
    items: [
      { href: "/strategy-room",          icon: "◎", label: "Strategy Room" },
      { href: "/workflows",              icon: "⇒", label: "Workflows" },
      { href: "/reports",                icon: "▦", label: "Reports" },
      { href: "/dashboard/voices",       icon: "◌", label: "Voice Lab" },
      { href: "/dashboard/release",      icon: "↗", label: "Release" },
    ],
  },
  {
    group: "Account",
    items: [
      { href: "/settings",               icon: "⚙", label: "Settings" },
      { href: "/settings/social",        icon: "⌘", label: "Social Accounts" },
    ],
  },
];

type Props = {
  children: React.ReactNode;
  userEmail: string;
};

export default function DashboardShell({ children, userEmail }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="ds-root">
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        .ds-root{display:flex;min-height:100vh;background:#020203;font-family:var(--font-body,'Outfit',sans-serif)}

        /* ── Sidebar ── */
        .ds-sidebar{
          width:220px;flex-shrink:0;
          background:#09090f;
          border-right:1px solid rgba(255,255,255,0.055);
          display:flex;flex-direction:column;
          position:sticky;top:0;height:100vh;overflow-y:auto;
          scrollbar-width:none;
        }
        .ds-sidebar::-webkit-scrollbar{display:none}

        .ds-brand{
          display:flex;align-items:center;gap:10px;
          padding:20px 18px 16px;
          border-bottom:1px solid rgba(255,255,255,0.055);
          text-decoration:none;
        }
        .ds-brand-img{
          width:28px;height:28px;border-radius:4px;overflow:hidden;
          position:relative;flex-shrink:0;
        }
        .ds-brand-name{
          font-family:var(--font-mono,'DM Mono',monospace);
          font-size:11px;font-weight:500;letter-spacing:0.12em;
          text-transform:uppercase;color:rgba(255,255,255,0.7);
        }

        .ds-nav{flex:1;padding:12px 0}

        .ds-group{margin-bottom:4px}
        .ds-group-label{
          font-family:var(--font-mono,'DM Mono',monospace);
          font-size:8px;font-weight:500;letter-spacing:0.28em;text-transform:uppercase;
          color:rgba(255,255,255,0.2);
          padding:10px 18px 4px;
        }

        .ds-link{
          display:flex;align-items:center;gap:10px;
          padding:8px 18px;
          font-size:13px;font-weight:400;
          color:rgba(255,255,255,0.42);
          text-decoration:none;
          border-radius:0;
          transition:color 0.15s,background 0.15s;
          position:relative;
        }
        .ds-link:hover{color:rgba(255,255,255,0.75);background:rgba(255,255,255,0.03)}
        .ds-link.active{
          color:rgba(255,255,255,0.92);
          background:rgba(200,169,110,0.06);
        }
        .ds-link.active::before{
          content:'';position:absolute;left:0;top:0;bottom:0;width:2px;
          background:#c8a96e;border-radius:0 2px 2px 0;
        }
        .ds-icon{
          font-size:14px;width:18px;text-align:center;flex-shrink:0;
          color:rgba(255,255,255,0.25);
        }
        .ds-link.active .ds-icon{color:#c8a96e}
        .ds-link:hover .ds-icon{color:rgba(255,255,255,0.55)}

        .ds-sidebar-footer{
          padding:14px 18px;
          border-top:1px solid rgba(255,255,255,0.055);
          display:flex;flex-direction:column;gap:8px;
        }
        .ds-sync-btn{
          width:100%;
          font-family:var(--font-mono,'DM Mono',monospace);
          font-size:9px;letter-spacing:0.18em;text-transform:uppercase;
          background:rgba(200,169,110,0.08);color:#c8a96e;
          border:1px solid rgba(200,169,110,0.18);border-radius:3px;
          padding:9px;cursor:pointer;transition:background 0.2s;
        }
        .ds-sync-btn:hover{background:rgba(200,169,110,0.14)}
        .ds-user-email{
          font-size:10px;color:rgba(255,255,255,0.25);
          overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
          letter-spacing:0;
        }
        .ds-signout-btn{
          width:100%;
          font-family:var(--font-mono,'DM Mono',monospace);
          font-size:9px;letter-spacing:0.15em;text-transform:uppercase;
          background:transparent;color:rgba(255,255,255,0.22);
          border:1px solid rgba(255,255,255,0.07);border-radius:3px;
          padding:8px;cursor:pointer;transition:all 0.15s;text-align:center;
        }
        .ds-signout-btn:hover:not(:disabled){color:rgba(200,169,110,0.8);border-color:rgba(200,169,110,0.25)}
        .ds-signout-btn:disabled{opacity:0.5;cursor:not-allowed}

        /* ── Main content ── */
        .ds-main{
          flex:1;min-width:0;
          overflow-y:auto;
          position:relative;
        }

        /* ── Top bar ── */
        .ds-topbar{
          position:sticky;top:0;z-index:10;
          display:flex;align-items:center;justify-content:space-between;
          padding:0 32px;height:52px;
          background:rgba(9,9,15,0.85);
          backdrop-filter:blur(12px);
          border-bottom:1px solid rgba(255,255,255,0.045);
        }
        .ds-breadcrumb{
          font-family:var(--font-mono,'DM Mono',monospace);
          font-size:10px;letter-spacing:0.15em;text-transform:uppercase;
          color:rgba(255,255,255,0.3);
        }
        .ds-breadcrumb span{color:rgba(255,255,255,0.55)}
        .ds-topbar-actions{display:flex;align-items:center;gap:12px}
        .ds-topbar-link{
          font-family:var(--font-mono,'DM Mono',monospace);
          font-size:9px;letter-spacing:0.15em;text-transform:uppercase;
          color:rgba(255,255,255,0.3);text-decoration:none;
          transition:color 0.2s;
        }
        .ds-topbar-link:hover{color:rgba(255,255,255,0.65)}

        /* ── Mobile: hide sidebar, show bottom nav ── */
        @media(max-width:768px){
          .ds-sidebar{display:none}
          .ds-main{padding-bottom:60px}
          .ds-mobile-nav{
            display:flex;
            position:fixed;bottom:0;left:0;right:0;z-index:50;
            background:#09090f;border-top:1px solid rgba(255,255,255,0.055);
            padding:8px 0 env(safe-area-inset-bottom,8px);
          }
          .ds-mobile-link{
            flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;
            font-size:8px;font-family:var(--font-mono,'DM Mono',monospace);
            letter-spacing:0.12em;text-transform:uppercase;
            color:rgba(255,255,255,0.3);text-decoration:none;padding:4px 0;
            transition:color 0.15s;
          }
          .ds-mobile-link.active{color:#c8a96e}
          .ds-mobile-link .ds-icon{font-size:18px;width:auto}
        }
        @media(min-width:769px){
          .ds-mobile-nav{display:none}
        }
      `}</style>

      {/* Sidebar */}
      <aside className="ds-sidebar">
        <Link href="/dashboard" className="ds-brand">
          <span className="ds-brand-img">
            <Image src="/Images/branding/Logo.png" alt="Mansas Moguls" fill sizes="28px" style={{ objectFit: "cover" }} />
          </span>
          <span className="ds-brand-name">Moguls</span>
        </Link>

        <nav className="ds-nav">
          {NAV.map((group) => (
            <div key={group.group} className="ds-group">
              <div className="ds-group-label">{group.group}</div>
              {group.items.map((item) => {
                const exact = item.href === "/dashboard";
                const active = exact ? pathname === item.href : pathname.startsWith(item.href);
                return (
                  <Link key={item.href} href={item.href} className={`ds-link ${active ? "active" : ""}`}>
                    <span className="ds-icon">{item.icon}</span>
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="ds-sidebar-footer">
          <button
            className="ds-sync-btn"
            onClick={() => void fetch("/api/social/sync", { method: "POST" })}
          >
            ↻ Sync All Platforms
          </button>
          <div className="ds-user-email">{userEmail}</div>
          <button
            className="ds-signout-btn"
            onClick={() => void handleSignOut()}
            disabled={signingOut}
          >
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="ds-main">
        {/* Topbar */}
        <div className="ds-topbar">
          <div className="ds-breadcrumb">
            Mansas Moguls &nbsp;/&nbsp; <span>
              {NAV.flatMap(g => g.items).find(i => i.href === pathname)?.label ??
               NAV.flatMap(g => g.items).find(i => pathname.startsWith(i.href) && i.href !== "/dashboard")?.label ??
               "Dashboard"}
            </span>
          </div>
          <div className="ds-topbar-actions">
            <Link href="/settings" className="ds-topbar-link">Settings</Link>
            <button
              className="ds-topbar-link"
              onClick={() => void handleSignOut()}
              disabled={signingOut}
              style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(200,169,110,0.6)", fontFamily: "var(--font-mono,'DM Mono',monospace)", fontSize: "9px", letterSpacing: "0.15em", textTransform: "uppercase" }}
            >
              {signingOut ? "…" : "Sign Out"}
            </button>
          </div>
        </div>

        {/* Page content */}
        {children}
      </div>

      {/* Mobile bottom nav */}
      <nav className="ds-mobile-nav">
        {[
          { href: "/dashboard",              icon: "⬡", label: "Home" },
          { href: "/dashboard/intelligence", icon: "◈", label: "Intel" },
          { href: "/dashboard/war-room",     icon: "◎", label: "War" },
          { href: "/dashboard/messages",     icon: "✦", label: "Inbox" },
          { href: "/dashboard/integrations", icon: "⌁", label: "Connect" },
          { href: "/dashboard/social",       icon: "⇪", label: "Share" },
          { href: "/dashboard/affiliates",   icon: "◆", label: "Brands" },
          { href: "/dashboard/voices",      icon: "◌", label: "Voice" },
          { href: "/dashboard/release",     icon: "↗", label: "Deploy" },
          { href: "/settings",               icon: "⚙", label: "Settings" },
        ].map((item) => {
          const active = item.href === "/dashboard" ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href} className={`ds-mobile-link ${active ? "active" : ""}`}>
              <span className="ds-icon">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
