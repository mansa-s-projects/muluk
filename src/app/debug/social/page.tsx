'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

interface SocialConnection {
  platform: string;
  platform_username: string | null;
  follower_count: number | null;
  connected: boolean;
  has_tokens: boolean;
}

const PLATFORMS = [
  { name: 'Twitter', connectPath: '/api/auth/twitter/connect', icon: '𝕏' },
  { name: 'Instagram', connectPath: '/api/auth/instagram/connect', icon: '📷' },
  { name: 'TikTok', connectPath: '/api/auth/tiktok/connect', icon: '🎵' },
  { name: 'YouTube', connectPath: '/api/auth/youtube/connect', icon: '▶' },
  { name: 'Telegram', connectPath: '/api/auth/telegram/connect', icon: '✈' },
];

export default function DebugSocial() {
  const [connections, setConnections] = useState<SocialConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (cancelled) return;
        setUser(authUser);

        if (!authUser) {
          setLoading(false);
          return;
        }

        const { data: socialData } = await supabase
          .from('social_connections')
          .select('*');

        const conns: SocialConnection[] = PLATFORMS.map(p => {
          const existing = socialData?.find((s: Record<string, unknown>) => (s.platform as string)?.toLowerCase() === p.name.toLowerCase());
          return {
            platform: p.name,
            platform_username: existing?.platform_username || null,
            follower_count: existing?.follower_count || null,
            connected: !!existing,
            has_tokens: !!(existing?.access_token),
          };
        });

        if (!cancelled) {
          setConnections(conns);
          setLoading(false);
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#020203', color: 'rgba(255,255,255,0.92)', padding: '48px 24px', fontFamily: 'var(--font-body, Outfit), sans-serif' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <a href="/debug" style={{ fontSize: 12, color: 'rgba(200,169,110,0.6)', textDecoration: 'none', fontFamily: 'var(--font-mono, DM Mono), monospace' }}>&larr; Back to Debug</a>
        <h1 style={{ fontSize: 32, fontWeight: 300, fontFamily: 'var(--font-display, Cormorant), serif', color: '#c8a96e', marginTop: 16, marginBottom: 8 }}>Social OAuth Debug</h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-mono, DM Mono), monospace', marginBottom: 32 }}>
          Test social platform connections and OAuth flows
        </p>

        {!user && (
          <div style={{ padding: '16px 20px', background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.2)', borderRadius: 8, marginBottom: 24 }}>
            <p style={{ fontSize: 13, color: '#eab308' }}>Not authenticated. Log in to test social connections.</p>
          </div>
        )}

        {loading ? (
          <p style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-mono, DM Mono), monospace' }}>Loading connections...</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {PLATFORMS.map((platform) => {
              const conn = connections.find(c => c.platform === platform.name);
              return (
                <div key={platform.name} style={{
                  display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px',
                  background: '#0d0d18', border: `1px solid ${conn?.connected ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.055)'}`, borderRadius: 8,
                }}>
                  <div style={{ fontSize: 24, width: 40, textAlign: 'center' }}>{platform.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.9)' }}>{platform.name}</div>
                    {conn?.connected ? (
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-mono, DM Mono), monospace', marginTop: 2 }}>
                        @{conn.platform_username || 'unknown'} {conn.follower_count ? `| ${conn.follower_count.toLocaleString()} followers` : ''}
                      </div>
                    ) : (
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--font-mono, DM Mono), monospace', marginTop: 2 }}>Not connected</div>
                    )}
                  </div>
                  <div style={{
                    padding: '4px 10px', borderRadius: 4, fontSize: 11, fontFamily: 'var(--font-mono, DM Mono), monospace',
                    background: conn?.connected ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.05)',
                    color: conn?.connected ? '#22c55e' : 'rgba(255,255,255,0.3)',
                  }}>
                    {conn?.connected ? 'Connected' : 'Disconnected'}
                  </div>
                  <a href={platform.connectPath} style={{
                    padding: '8px 16px', background: 'rgba(200,169,110,0.15)', border: '1px solid rgba(200,169,110,0.3)',
                    borderRadius: 6, color: '#c8a96e', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-mono, DM Mono), monospace',
                    textDecoration: 'none', display: 'inline-block',
                  }}>
                    {conn?.connected ? 'Reconnect' : 'Connect'}
                  </a>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ marginTop: 32, padding: '16px 20px', background: '#0d0d18', border: '1px solid rgba(255,255,255,0.055)', borderRadius: 8 }}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)', marginBottom: 8, fontFamily: 'var(--font-mono, DM Mono), monospace' }}>OAuth Callback Routes</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
            {['twitter', 'instagram', 'tiktok', 'youtube', 'telegram'].map(p => (
              <div key={p} style={{ fontSize: 12, fontFamily: 'var(--font-mono, DM Mono), monospace', color: 'rgba(255,255,255,0.35)' }}>
                /api/auth/{p}/callback
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
