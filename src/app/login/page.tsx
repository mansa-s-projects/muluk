"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError) {
      setError(signInError.message || "Unable to sign in.");
      setLoading(false);
      return;
    }

    setMessage("Signed in successfully. Redirecting to dashboard...");
    router.push("/dashboard");
  }

  return (
    <main className="simple-page" style={{ maxWidth: 520 }}>
      <h1>Login</h1>
      <p>Access the GC Sovereign AI executive workspace.</p>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12, marginTop: 18 }}>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          style={{ padding: "10px 12px", border: "1px solid #d9d9d9", borderRadius: 6 }}
        />

        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          style={{ padding: "10px 12px", border: "1px solid #d9d9d9", borderRadius: 6 }}
        />

        <button type="submit" disabled={loading} style={{ marginTop: 8, padding: "10px 14px" }}>
          {loading ? "Signing in..." : "Sign in"}
        </button>

        {error ? <p style={{ color: "#a62424", margin: 0 }}>{error}</p> : null}
        {message ? <p style={{ color: "#1f7a2e", margin: 0 }}>{message}</p> : null}
      </form>
    </main>
  );
}