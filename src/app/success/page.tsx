"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function SuccessContent() {
  const params = useSearchParams();
  const type = params.get("type") ?? "purchase";
  const amount = params.get("amount");
  const item = params.get("item");
  const [visible, setVisible] = useState(false);
  useEffect(() => { setTimeout(() => setVisible(true), 80); }, []);

  const messages: Record<string, { title: string; sub: string; cta: string; href: string }> = {
    purchase:  { title: "Payment confirmed.",  sub: item ? `You unlocked: ${item}` : "Your payment went through.",          cta: "View Dashboard →",  href: "/dashboard" },
    booking:   { title: "Booking confirmed.",  sub: "Your session is locked in. Check your email for details.",             cta: "Back to Empire →",  href: "/dashboard" },
    waitlist:  { title: "You're in.",          sub: "Founding operator spot reserved. We'll be in touch before anyone else.",cta: "Back to Home →",    href: "/" },
  };
  const msg = messages[type] ?? messages.purchase;

  return (
    <div style={{ position: "fixed", inset: 0, background: "#020203", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-body,'Outfit',sans-serif)" }}>
      <style>{`
        .sw { text-align:center; max-width:480px; padding:0 24px; transition:opacity 0.8s cubic-bezier(0.16,1,0.3,1),transform 0.8s cubic-bezier(0.16,1,0.3,1); }
        .wordmark { font-family:var(--font-mono,'DM Mono',monospace); font-size:11px; letter-spacing:0.3em; text-transform:uppercase; color:#c8a96e; margin-bottom:48px; }
        .check-circle { width:64px; height:64px; border-radius:50%; border:1px solid rgba(80,212,138,0.3); background:rgba(80,212,138,0.08); display:flex; align-items:center; justify-content:center; margin:0 auto 28px; font-size:28px; color:#50d48a; }
        .stitle { font-family:var(--font-display,'Cormorant Garamond',serif); font-size:clamp(32px,5vw,48px); font-weight:300; color:rgba(255,255,255,0.92); letter-spacing:-0.02em; margin:0 0 12px; }
        .samount { font-family:var(--font-mono,'DM Mono',monospace); font-size:32px; font-weight:500; color:#c8a96e; margin:20px 0; letter-spacing:-0.02em; }
        .ssub { font-size:15px; color:rgba(255,255,255,0.4); font-weight:300; line-height:1.7; }
        .sdiv { height:1px; background:linear-gradient(90deg,transparent,rgba(255,255,255,0.07),transparent); margin:28px 0; }
        .sbtn { display:inline-block; font-family:var(--font-mono,'DM Mono',monospace); font-size:11px; letter-spacing:0.18em; text-transform:uppercase; background:#c8a96e; color:#0a0800; border-radius:3px; padding:14px 32px; text-decoration:none; transition:opacity 0.2s; }
        .sbtn:hover { opacity:0.85; }
      `}</style>
      <div className="sw" style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(20px)" }}>
        <div className="wordmark">Mansas Moguls</div>
        <div className="check-circle">✓</div>
        <h1 className="stitle">{msg.title}</h1>
        {amount && <div className="samount">${amount}</div>}
        <p className="ssub">{msg.sub}</p>
        <div className="sdiv" />
        <a href={msg.href} className="sbtn">{msg.cta}</a>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return <Suspense fallback={null}><SuccessContent /></Suspense>;
}
