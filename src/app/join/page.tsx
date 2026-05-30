"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function JoinPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [type, setType] = useState<"creator" | "supporter">("creator");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, type, source: "join_page" }),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error || "Failed to join access queue.");
        setLoading(false);
        return;
      }

      router.push("/success?flow=join");
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  return (
    <main className="simple-page" style={{ maxWidth: 640 }}>
      <h1>Join Access Queue</h1>
      <p>Reserve early access and receive onboarding priority updates.</p>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12, marginTop: 18 }}>
        <label htmlFor="join-email">Email</label>
        <input
          id="join-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          style={{ padding: "10px 12px", border: "1px solid #d9d9d9", borderRadius: 6 }}
        />

        <label htmlFor="join-type">I am joining as</label>
        <select
          id="join-type"
          value={type}
          onChange={e => setType(e.target.value as "creator" | "supporter")}
          style={{ padding: "10px 12px", border: "1px solid #d9d9d9", borderRadius: 6 }}
        >
          <option value="creator">Creator / Operator</option>
          <option value="supporter">Supporter</option>
        </select>

        <button type="submit" disabled={loading} style={{ marginTop: 8, padding: "10px 14px" }}>
          {loading ? "Joining..." : "Join queue"}
        </button>

        {error ? <p style={{ color: "#a62424", margin: 0 }}>{error}</p> : null}
      </form>
    </main>
  );
}
