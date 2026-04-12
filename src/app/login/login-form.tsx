"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { identifyUser, track } from "@/lib/analytics/track";

const panelStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: "460px",
  margin: "0 auto",
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "6px",
  padding: "32px",
  boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "rgba(255,255,255,0.02)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: "4px",
  color: "var(--white)",
  padding: "14px 16px",
  fontSize: "14px",
  outline: "none",
};

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">(
    searchParams.get("mode") === "signup" ? "signup" : "login"
  );
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const nextPath = searchParams.get("next") || "/dashboard";

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    const supabase = createClient();
    const action =
      mode === "login"
        ? supabase.auth.signInWithPassword({ email, password })
        : supabase.auth.signUp({ email, password });

    const { data: authDataFromAction, error: authError } = await action;

    setLoading(false);

    if (authError) {
      setError(authError.message);
      return;
    }

    if (mode === "signup") {
      // If signup immediately yields a user session, attach referral attribution now.
      if (authDataFromAction.user) {
        void fetch("/api/referrals/attach", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ source: "signup" }),
        }).catch(() => {});
      }

      setMessage("Account created. If email confirmation is enabled, check your inbox before signing in.");
      track.signedUp({ email });
      return;
    }

    // Identify the user in PostHog after successful login
    const { data: authData } = await supabase.auth.getUser();
    if (authData.user) {
      identifyUser(authData.user.id, { email: authData.user.email ?? email });
      track.signedIn({ email });

      void fetch("/api/referrals/attach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "login" }),
      }).catch(() => {});
    }

    router.replace(nextPath);
    router.refresh();
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        background:
          "radial-gradient(circle at top, rgba(200,169,110,0.14), transparent 32%), var(--void)",
      }}
    >
      <div style={panelStyle}>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "10px",
            letterSpacing: "0.24em",
            textTransform: "uppercase",
            color: "var(--gold-dim)",
            marginBottom: "18px",
          }}
        >
          CIPHER Access
        </div>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "42px",
            fontWeight: 300,
            fontStyle: "italic",
            color: "var(--gold)",
            marginBottom: "10px",
          }}
        >
          {mode === "login" ? "Login" : "Create account"}
        </h1>
        <p style={{ color: "var(--muted)", lineHeight: 1.7, marginBottom: "28px" }}>
          Use email and password to access your private creator dashboard.
        </p>

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: "16px" }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            style={inputStyle}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            style={inputStyle}
            required
            minLength={6}
          />

          {error ? (
            <div style={{ color: "rgba(240,120,120,0.95)", fontSize: "13px" }}>{error}</div>
          ) : null}
          {message ? (
            <div style={{ color: "var(--gold-bright)", fontSize: "13px" }}>{message}</div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            style={{
              background: "var(--gold)",
              color: "#0a0800",
              border: "none",
              borderRadius: "4px",
              padding: "15px 18px",
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Please wait" : mode === "login" ? "Login" : "Create account"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setMode((current) => (current === "login" ? "signup" : "login"));
            setError("");
            setMessage("");
          }}
          style={{
            marginTop: "16px",
            background: "transparent",
            border: "none",
            color: "var(--muted)",
            fontSize: "13px",
          }}
        >
          {mode === "login" ? "Need an account? Sign up" : "Already have an account? Log in"}
        </button>
      </div>
    </main>
  );
}