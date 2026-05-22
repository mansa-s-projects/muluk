"use client";

import React, { useEffect, useState } from "react";

const mono = { fontFamily: "var(--font-mono, 'DM Mono', monospace)" } as const;
const gold = { color: "var(--gold, #c8a96e)" } as const;
const muted = { color: "var(--muted, rgba(255,255,255,0.45))" } as const;
const dim = { color: "var(--dim, rgba(255,255,255,0.22))" } as const;
const disp = { fontFamily: "var(--font-display, serif)" } as const;

export default function WaitlistPage() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>(".wl-anim");
    els.forEach((el, i) => {
      el.style.opacity = "0";
      el.style.transform = "translateY(16px)";
      el.style.transition = `opacity 0.7s cubic-bezier(0.25,0.46,0.45,0.94) ${i * 0.12 + 0.15}s, transform 0.7s cubic-bezier(0.25,0.46,0.45,0.94) ${i * 0.12 + 0.15}s`;
      requestAnimationFrame(() => {
        el.style.opacity = "1";
        el.style.transform = "translateY(0)";
      });
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      setErrorMsg("Enter a valid email address.");
      setState("error");
      return;
    }
    setState("loading");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(j.error ?? "Something went wrong.");
      }
      setState("success");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong.");
      setState("error");
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "60px 24px",
        position: "relative",
        overflow: "hidden",
        background: "var(--bg, #020203)",
      }}
    >
      {/* ambient orb */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          width: "700px",
          height: "700px",
          borderRadius: "50%",
          background: "radial-gradient(circle at center, rgba(200,169,110,0.06) 0%, transparent 65%)",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          pointerEvents: "none",
        }}
      />

      {/* horizontal accent */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: "50%",
          left: 0,
          right: 0,
          height: "1px",
          background: "linear-gradient(90deg, transparent 0%, rgba(200,169,110,0.12) 30%, rgba(200,169,110,0.12) 70%, transparent 100%)",
          pointerEvents: "none",
        }}
      />

      {/* eyebrow */}
      <div
        className="wl-anim"
        style={{ ...mono, display: "inline-flex", alignItems: "center", gap: "12px", fontSize: "10px", letterSpacing: "0.3em", textTransform: "uppercase" as const, ...gold, marginBottom: "48px" }}
      >
        <span style={{ display: "block", width: "40px", height: "1px", background: "linear-gradient(90deg, transparent, rgba(200,169,110,0.4))" }} />
        Invite Only — Join the Waitlist
        <span style={{ display: "block", width: "40px", height: "1px", background: "linear-gradient(270deg, transparent, rgba(200,169,110,0.4))" }} />
      </div>

      {/* title */}
      <h1
        className="wl-anim"
        style={{ ...disp, fontSize: "clamp(64px, 11vw, 148px)", fontWeight: 300, fontStyle: "italic", lineHeight: 0.88, letterSpacing: "-0.01em", ...gold, margin: "0 0 28px" }}
      >
        MULUK
      </h1>

      {/* tagline */}
      <p
        className="wl-anim"
        style={{ ...disp, fontSize: "clamp(16px, 2.4vw, 28px)", fontWeight: 300, fontStyle: "italic", ...muted, margin: "0 0 20px", letterSpacing: "0.04em" }}
      >
        The platform they were afraid to build.
      </p>

      {/* description */}
      <p
        className="wl-anim"
        style={{ fontFamily: "var(--font-body)", maxWidth: "460px", fontSize: "clamp(14px, 1.5vw, 16px)", fontWeight: 300, lineHeight: 1.85, ...muted, margin: "0 auto 52px" }}
      >
        Members with <strong style={{ ...gold, fontWeight: 400 }}>zero accounts</strong>. Payments that{" "}
        <strong style={{ ...gold, fontWeight: 400 }}>split automatically</strong>. Creators who keep{" "}
        <strong style={{ ...gold, fontWeight: 400 }}>88% or more</strong>.
      </p>

      {/* waitlist form */}
      <div className="wl-anim" style={{ width: "100%", maxWidth: "440px", margin: "0 auto" }}>
        {state === "success" ? (
          <div
            style={{
              padding: "28px 32px",
              background: "rgba(200,169,110,0.06)",
              border: "1px solid rgba(200,169,110,0.2)",
              borderRadius: "8px",
            }}
          >
            <div style={{ ...disp, fontSize: "22px", fontWeight: 300, fontStyle: "italic", ...gold, marginBottom: "8px" }}>
              You&apos;re on the list.
            </div>
            <p style={{ ...mono, fontSize: "11px", letterSpacing: "0.1em", ...dim, margin: 0 }}>
              We&apos;ll reach out when your access is ready.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ display: "flex", gap: "0" }}>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); if (state === "error") setState("idle"); }}
                placeholder="your@email.com"
                required
                style={{
                  flex: 1,
                  padding: "13px 18px",
                  background: "rgba(255,255,255,0.04)",
                  border: `1px solid ${state === "error" ? "rgba(239,68,68,0.4)" : "rgba(255,255,255,0.1)"}`,
                  borderRight: "none",
                  borderRadius: "4px 0 0 4px",
                  color: "rgba(255,255,255,0.9)",
                  fontSize: "14px",
                  fontFamily: "var(--font-body)",
                  outline: "none",
                }}
                onFocus={(e) => { e.target.style.borderColor = "rgba(200,169,110,0.4)"; }}
                onBlur={(e) => { e.target.style.borderColor = state === "error" ? "rgba(239,68,68,0.4)" : "rgba(255,255,255,0.1)"; }}
              />
              <button
                type="submit"
                disabled={state === "loading"}
                style={{
                  padding: "13px 24px",
                  background: "var(--gold, #c8a96e)",
                  border: "1px solid var(--gold, #c8a96e)",
                  borderRadius: "0 4px 4px 0",
                  color: "#0a0800",
                  ...mono,
                  fontSize: "11px",
                  fontWeight: 600,
                  letterSpacing: "0.15em",
                  textTransform: "uppercase" as const,
                  cursor: state === "loading" ? "not-allowed" : "pointer",
                  opacity: state === "loading" ? 0.6 : 1,
                  transition: "opacity 0.2s",
                  whiteSpace: "nowrap",
                }}
              >
                {state === "loading" ? "…" : "Request Access"}
              </button>
            </div>

            {state === "error" && (
              <p style={{ ...mono, fontSize: "11px", color: "rgba(239,68,68,0.8)", margin: "0", letterSpacing: "0.06em" }}>
                {errorMsg}
              </p>
            )}

            <p style={{ ...mono, fontSize: "9px", letterSpacing: "0.12em", ...dim, margin: "4px 0 0" }}>
              No spam. Access granted in waves.
            </p>
          </form>
        )}
      </div>

      {/* stats */}
      <div
        className="wl-anim"
        style={{ display: "flex", justifyContent: "center", marginTop: "72px" }}
      >
        {[["8–12%", "Platform cut"], ["∞", "Expansion network"], ["0", "Member data required"]].map(([num, label], i) => (
          <div key={i} style={{ padding: "0 40px", textAlign: "center", borderLeft: i > 0 ? "1px solid rgba(255,255,255,0.08)" : "none" }}>
            <span style={{ display: "block", ...disp, fontSize: "28px", fontWeight: 300, ...gold, lineHeight: 1, marginBottom: "6px" }}>{num}</span>
            <span style={{ ...mono, fontSize: "9px", letterSpacing: "0.2em", textTransform: "uppercase" as const, ...dim }}>{label}</span>
          </div>
        ))}
      </div>

      {/* footer */}
      <div
        style={{
          position: "absolute",
          bottom: "40px",
          left: 0,
          right: 0,
          textAlign: "center",
          ...mono,
          fontSize: "9px",
          letterSpacing: "0.25em",
          textTransform: "uppercase",
          ...dim,
        }}
      >
        © 2025 MULUK
      </div>
    </div>
  );
}
