'use client';
 
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface ContentTest {
  name: string;
  status: 'ok' | 'error' | 'no-access';
  count: number | null;
  error: string | null;
}

export default function DebugContent() {
  const [tables, setTables] = useState<ContentTest[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    testContent();
  }, []);

  const testContent = async () => {
    const supabase = createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    setUser(authUser);

    const tests: ContentTest[] = [];

    const contentTables = [
      'content_items',
      'content_items_v2',
      'fan_codes',
      'fan_codes_v2',
      'collab_proposals',
      'fan_messages',
      'creator_vault_pins',
    ];

    for (const table of contentTables) {
      try {
        const { data: _data, error, count } = await supabase.from(table).select('*', { count: 'exact', head: true });
        tests.push({
          name: table,
          status: error ? (error.message.includes('policy') ? 'no-access' : 'error') : 'ok',
          count: count,
          error: error?.message || null,
        });
      } catch (e: any) {
        tests.push({ name: table, status: 'error', count: null, error: e.message });
      }
    }

    setTables(tests);
    setLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#020203', color: 'rgba(255,255,255,0.92)', padding: '48px 24px', fontFamily: 'var(--font-body, Outfit), sans-serif' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <a href="/debug" style={{ fontSize: 12, color: 'rgba(200,169,110,0.6)', textDecoration: 'none', fontFamily: 'var(--font-mono, DM Mono), monospace' }}>&larr; Back to Debug</a>
        <h1 style={{ fontSize: 32, fontWeight: 300, fontFamily: 'var(--font-display, Cormorant), serif', color: '#c8a96e', marginTop: 16, marginBottom: 8 }}>Content Management Debug</h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-mono, DM Mono), monospace', marginBottom: 32 }}>
          Test content CRUD, fan codes, and media management
        </p>

        {!user && (
          <div style={{ padding: '16px 20px', background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.2)', borderRadius: 8, marginBottom: 24 }}>
            <p style={{ fontSize: 13, color: '#eab308' }}>Not authenticated. Content queries require an authenticated session.</p>
          </div>
        )}

        {/* Content Tables */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)', marginBottom: 12, fontFamily: 'var(--font-mono, DM Mono), monospace' }}>Content Tables</div>
          {loading ? (
            <p style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-mono, DM Mono), monospace' }}>Testing...</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {tables.map((t, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
                  background: '#0d0d18', border: '1px solid rgba(255,255,255,0.055)', borderRadius: 6,
                }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                    background: t.status === 'ok' ? '#22c55e' : t.status === 'no-access' ? '#eab308' : '#ef4444',
                  }} />
                  <div style={{ flex: 1, fontSize: 13, fontFamily: 'var(--font-mono, DM Mono), monospace', color: 'rgba(255,255,255,0.85)' }}>{t.name}</div>
                  {t.count !== null && (
                    <div style={{ fontSize: 12, color: 'rgba(200,169,110,0.5)', fontFamily: 'var(--font-mono, DM Mono), monospace' }}>{t.count} rows</div>
                  )}
                  <div style={{
                    fontSize: 11, fontFamily: 'var(--font-mono, DM Mono), monospace', padding: '2px 8px', borderRadius: 4,
                    background: t.status === 'ok' ? 'rgba(34,197,94,0.1)' : t.status === 'no-access' ? 'rgba(234,179,8,0.1)' : 'rgba(239,68,68,0.1)',
                    color: t.status === 'ok' ? '#22c55e' : t.status === 'no-access' ? '#eab308' : '#ef4444',
                  }}>
                    {t.status === 'ok' ? 'OK' : t.status === 'no-access' ? 'RLS' : 'ERR'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Content Features */}
        <div style={{ padding: '20px', background: '#0d0d18', border: '1px solid rgba(255,255,255,0.055)', borderRadius: 8, marginBottom: 24 }}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)', marginBottom: 12, fontFamily: 'var(--font-mono, DM Mono), monospace' }}>Content Features</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
            {[
              { feature: 'Scheduling', field: 'scheduled_for', status: 'Active' },
              { feature: 'Burn Mode', field: 'burn_mode', status: 'Active' },
              { feature: 'Auto-Share', field: 'auto_shared', status: 'Active' },
              { feature: 'Content Type', field: 'type', status: 'Active' },
              { feature: 'Free Content', field: 'is_free', status: 'Active' },
              { feature: 'Thumbnails', field: 'thumbnail_url', status: 'Active' },
              { feature: 'Access Count', field: 'access_count', status: 'Active' },
              { feature: 'Earnings', field: 'earnings', status: 'Active' },
            ].map(f => (
              <div key={f.feature} style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: 6 }}>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>{f.feature}</div>
                <div style={{ fontSize: 11, fontFamily: 'var(--font-mono, DM Mono), monospace', color: 'rgba(200,169,110,0.4)', marginTop: 2 }}>{f.field}</div>
              </div>
            ))}
          </div>
        </div>

        <button onClick={testContent} style={{ padding: '10px 20px', background: 'rgba(200,169,110,0.15)', border: '1px solid rgba(200,169,110,0.3)', borderRadius: 6, color: '#c8a96e', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-mono, DM Mono), monospace' }}>
          Re-test Tables
        </button>
      </div>
    </div>
  );
}
