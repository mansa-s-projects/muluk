"use client";

import { useTransition, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

export default function AdminLoginPage() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  async function adminLoginAction(formData: FormData): Promise<{ error?: string }> {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const data = await res.json();
      return { error: data.message || "Invalid credentials" };
    }

    return { error: undefined };
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await adminLoginAction(formData);
      if (result?.error) {
        setError(result.error);
      } else {
        // Refresh the session so the updated JWT (with app_metadata.role) is
        // picked up by the middleware and admin layout before navigation.
        const supabase = createClient();
        await supabase.auth.refreshSession();
        window.location.href = "/admin/applications";
      }
    });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#060610] px-4">
      {/* Ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(200,169,110,0.10) 0%, transparent 70%)",
        }}
      />

      <div className="relative w-full max-w-md">
        {/* Gold top line */}
        <div
          aria-hidden
          className="absolute top-0 left-8 right-8 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(200,169,110,0.6), transparent)",
          }}
        />

        <div className="rounded-2xl border border-white/[0.07] bg-[#0f0f1e] shadow-2xl px-10 py-12">
          {/* Logo */}
          <div className="text-center mb-10">
            <div
              className="mx-auto mb-4 w-11 h-11 rounded-full flex items-center justify-center text-xl"
              style={{
                background:
                  "linear-gradient(135deg, rgba(200,169,110,0.18), rgba(200,169,110,0.04))",
                border: "1px solid rgba(200,169,110,0.28)",
                color: "#c8a96e",
              }}
            >
              ✦
            </div>
            <h1
              className="text-3xl font-light tracking-widest mb-1"
              style={{ color: "#c8a96e", fontFamily: "var(--font-display, serif)" }}
            >
              MULUK
            </h1>
            <p className="text-[10px] tracking-[0.3em] uppercase text-white/30 font-mono">
              Admin Access
            </p>
          </div>

          {/* Error banner */}
          {error && (
            <div
              role="alert"
              className="mb-6 px-4 py-3 rounded-lg text-sm text-red-400 border"
              style={{
                background: "rgba(224,85,85,0.08)",
                borderColor: "rgba(224,85,85,0.22)",
              }}
            >
              {error}
            </div>
          )}

          {/* Login form */}
          <form ref={formRef} onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div className="space-y-1.5">
              <label
                htmlFor="admin-email"
                className="block text-[10px] tracking-[0.2em] uppercase text-white/35 font-mono"
              >
                Email
              </label>
              <input
                id="admin-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                disabled={isPending}
                className="w-full px-4 py-3 rounded-md text-sm text-white/90 bg-white/[0.03] border border-white/[0.09] outline-none transition-all placeholder:text-white/20 focus:border-[rgba(200,169,110,0.4)] focus:ring-2 focus:ring-[rgba(200,169,110,0.07)] disabled:opacity-50"
                placeholder="you@example.com"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="admin-password"
                className="block text-[10px] tracking-[0.2em] uppercase text-white/35 font-mono"
              >
                Password
              </label>
              <input
                id="admin-password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                disabled={isPending}
                className="w-full px-4 py-3 rounded-md text-sm text-white/90 bg-white/[0.03] border border-white/[0.09] outline-none transition-all placeholder:text-white/20 focus:border-[rgba(200,169,110,0.4)] focus:ring-2 focus:ring-[rgba(200,169,110,0.07)] disabled:opacity-50"
                placeholder="••••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full py-3 mt-2 rounded-md text-[11px] tracking-[0.18em] uppercase font-mono font-semibold transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                background: isPending ? "rgba(200,169,110,0.10)" : "#c8a96e",
                color: isPending ? "#c8a96e" : "#0a0800",
                border: "1px solid #c8a96e",
              }}
            >
              {isPending ? "Verifying…" : "Sign In"}
            </button>
          </form>

          {/* Footer */}
          <p className="mt-8 text-center text-[9px] tracking-[0.12em] uppercase text-white/20 font-mono">
            Admin access is restricted and monitored.
          </p>
        </div>
      </div>
    </div>
  );
}