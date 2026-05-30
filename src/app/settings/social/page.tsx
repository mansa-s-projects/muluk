"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Connection = {
  platform: "instagram" | "tiktok" | "twitter" | "youtube" | "telegram";
  connected: boolean;
  username?: string;
  followers?: number;
};

const platforms: Array<{ key: Connection["platform"]; label: string; connectPath: string }> = [
  { key: "instagram", label: "Instagram", connectPath: "/api/auth/instagram/connect?next=/settings/social" },
  { key: "tiktok", label: "TikTok", connectPath: "/api/auth/tiktok/connect?next=/settings/social" },
  { key: "twitter", label: "Twitter/X", connectPath: "/api/auth/twitter/connect?next=/settings/social" },
  { key: "youtube", label: "YouTube", connectPath: "/api/auth/youtube/connect?next=/settings/social" },
  { key: "telegram", label: "Telegram", connectPath: "/api/auth/telegram/connect?next=/settings/social" },
];

export default function SocialSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connections, setConnections] = useState<Connection[]>([]);

  useEffect(() => {
    async function loadConnections() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/social/connections");
        const data = (await response.json()) as { error?: string; connections?: Connection[] };

        if (response.status === 401) {
          setNeedsLogin(true);
          setLoading(false);
          return;
        }

        if (!response.ok) {
          setError(data.error || "Unable to load social connections.");
          setLoading(false);
          return;
        }

        setConnections(data.connections || []);
      } catch {
        setError("Network error while loading connections.");
      } finally {
        setLoading(false);
      }
    }

    void loadConnections();
  }, []);

  if (loading) {
    return <main className="simple-page"><h1>Connect Social Accounts</h1><p>Loading social status...</p></main>;
  }

  if (needsLogin) {
    return (
      <main className="simple-page" style={{ maxWidth: 640 }}>
        <h1>Connect Social Accounts</h1>
        <p>You need to sign in before connecting social accounts.</p>
        <p><Link href="/login">Go to login</Link></p>
      </main>
    );
  }

  return (
    <main className="simple-page" style={{ maxWidth: 760 }}>
      <h1>Connect Social Accounts</h1>
      <p>Connect channels to enrich onboarding intelligence and recommendations.</p>

      <div style={{ display: "grid", gap: 10, marginTop: 18 }}>
        {platforms.map(platform => {
          const connected = connections.find(c => c.platform === platform.key);
          return (
            <div key={platform.key} style={{ border: "1px solid #e2e2e2", borderRadius: 8, padding: 12 }}>
              <p style={{ margin: "0 0 8px 0", fontWeight: 600 }}>{platform.label}</p>
              <p style={{ margin: "0 0 10px 0", color: "#4a4a4a" }}>
                {connected
                  ? `Connected${connected.username ? ` as @${connected.username}` : ""}${typeof connected.followers === "number" ? ` • ${connected.followers.toLocaleString()} followers` : ""}`
                  : "Not connected"}
              </p>
              <a href={platform.connectPath} style={{ padding: "8px 10px", border: "1px solid #d0d0d0", borderRadius: 6, display: "inline-block" }}>
                {connected ? "Reconnect" : "Connect"}
              </a>
            </div>
          );
        })}
      </div>

      {error ? <p style={{ color: "#a62424", marginTop: 10 }}>{error}</p> : null}
      <p style={{ marginTop: 16 }}><Link href="/dashboard">Continue to dashboard</Link></p>
    </main>
  );
}
