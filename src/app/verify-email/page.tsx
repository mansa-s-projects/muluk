"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function VerifyEmailPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"checking" | "verified" | "error">("checking");

  useEffect(() => {
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        setStatus("verified");
        setTimeout(() => router.push("/onboarding"), 1500);
      }
    });
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email_confirmed_at) {
        setStatus("verified");
        setTimeout(() => router.push("/onboarding"), 1500);
      }
    });
    return () => subscription.unsubscribe();
  }, [router]);

  return (
    <div style={{ position: "fixed", inset: 0, background: "#020203", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-body,'Outfit',sans-serif)" }}>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        .vbox { text-align:center; max-width:440px; padding:0 24px; animation:fadeIn 0.6s ease; }
        .wordmark { font-family:var(--font-mono,'DM Mono',monospace); font-size:12px; letter-spacing:0.3em; text-transform:uppercase; color:#c8a96e; margin-bottom:40px; }
        .vtitle { font-family:var(--font-display,'Cormorant Garamond',serif); font-size:36px; font-weight:300; color:rgba(255,255,255,0.92); margin:0 0 12px; letter-spacing:-0.02em; }
        .vsub { font-size:14px; color:rgba(255,255,255,0.4); font-weight:300; line-height:1.7; }
        .dot { width:10px; height:10px; border-radius:50%; background:#c8a96e; display:inline-block; animation:pulse 1.5s ease-in-out infinite; margin-right:8px; }
        .vbtn { display:inline-block; margin-top:28px; font-family:var(--font-mono,'DM Mono',monospace); font-size:11px; letter-spacing:0.18em; text-transform:uppercase; background:#c8a96e; color:#0a0800; border-radius:3px; padding:12px 28px; text-decoration:none; }
      `}</style>
      <div className="vbox">
        <div className="wordmark">Mansas Moguls</div>
        {status === "checking" && (
          <>
            <div style={{ fontSize: 48, marginBottom: 24 }}>✉️</div>
            <h1 className="vtitle">Check your email.</h1>
            <p className="vsub">We sent a confirmation link to your inbox.<br />Click it to activate your empire.</p>
            <p style={{ marginTop: 24, color: "rgba(255,255,255,0.2)", fontSize: 12 }}>
              <span className="dot" />Waiting for confirmation…
            </p>
          </>
        )}
        {status === "verified" && (
          <>
            <div style={{ color: "#50d48a", fontSize: 52, marginBottom: 16 }}>✓</div>
            <h1 className="vtitle">Email verified.</h1>
            <p className="vsub">Taking you to your empire setup…</p>
          </>
        )}
        {status === "error" && (
          <>
            <h1 className="vtitle">Something went wrong.</h1>
            <p className="vsub">The link may have expired. Try signing up again.</p>
            <a href="/signup" className="vbtn">Back to Signup →</a>
          </>
        )}
      </div>
    </div>
  );
}
