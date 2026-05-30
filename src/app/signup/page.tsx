"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const { error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/verify-email`,
      },
    });

    if (signUpError) {
      setError(signUpError.message || "Unable to create account.");
      setLoading(false);
      return;
    }

    router.push(`/verify-email?email=${encodeURIComponent(email.trim())}`);
  }

  return (
    <main className="simple-page" style={{ maxWidth: 520 }}>
      <h1>Signup</h1>
      <p>Create your operator account to continue onboarding.</p>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12, marginTop: 18 }}>
        <label htmlFor="signup-email">Email</label>
        <input
          id="signup-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          style={{ padding: "10px 12px", border: "1px solid #d9d9d9", borderRadius: 6 }}
        />

        <label htmlFor="signup-password">Password</label>
        <input
          id="signup-password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          style={{ padding: "10px 12px", border: "1px solid #d9d9d9", borderRadius: 6 }}
        />

        <button type="submit" disabled={loading} style={{ marginTop: 8, padding: "10px 14px" }}>
          {loading ? "Creating account..." : "Create account"}
        </button>

        {error ? <p style={{ color: "#a62424", margin: 0 }}>{error}</p> : null}
      </form>
    </main>
  );
}
