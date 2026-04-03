'use client';
/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/immutability, react-hooks/set-state-in-effect */
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface DashboardQuery {
  name: string;
  status: 'ok' | 'error' | 'no-data';
  rowCount: number | null;
  error: string | null;
  elapsed: number | null;
}

export default function DebugDashboard() {
  const [queries, setQueries] = useState<DashboardQuery[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    testDashboard();
  }, []);

  const testDashboard = async () => {
    const supabase = createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    setUser(authUser);

    if (!authUser) {
      setLoading(false);
      return;
    }

    const userId = authUser.id;
    const results: DashboardQuery[] = [];

    const testQuery = async (name: string, queryFn: () => PromiseLike<any>) => {
      const start = performance.now();
      try {
        const { data, error, count } = await queryFn();
        const elapsed = Math.round(performance.now() - start);
        results.push({
          name,
          status: error ? 'error' : (data?.length === 0 && count === 0) ? 'no-data' : 'ok',
          rowCount: count ?? data?.length ?? null,
          error: error?.message || null,
          elapsed,
        });
      } catch (e: any) {
        results.push({ name, status: 'error', rowCount: null, error: e.message, elapsed: Math.round(performance.now() - start) });
      }
    };

    // Test the same queries dashboard page.tsx uses
    await testQuery('creator_applications (profile)', () =>
      supabase.from('creator_applications').select('*').eq('user_id', userId).single()
    );

    await testQuery('creator_wallets', () =>
      supabase.from('creator_wallets').select('*').eq('creator_id', userId)
    );

    await testQuery('fan_codes (V1)', () =>
      supabase.from('fan_codes').select('*').eq('creator_id', userId)
    );

    await testQuery('transactions (V1)', () =>
      supabase.from('transactions').select('*').eq('creator_id', userId)
    );

    await testQuery('content_items', () =>
      supabase.from('content_items').select('*').eq('creator_id', userId)
    );

    await testQuery('social_connections', () =>
      supabase.from('social_connections').select('*').eq('user_id', userId)
    );

    await testQuery('withdrawal_requests', () =>
      supabase.from('withdrawal_requests').select('*').eq('creator_id', userId)
    );

    await testQuery('content_items_v2', () =>
      supabase.from('content_items_v2').select('*').eq('creator_id', userId)
    );

    await testQuery('fan_codes_v2', () =>
      supabase.from('fan_codes_v2').select('*').eq('creator_id', userId)
    );

    await testQuery('transactions_v2', () =>
      supabase.from('transactions_v2').select('*').eq('creator_id', userId)
    );

    await testQuery('creator_payout_settings', () =>
      supabase.from('creator_payout_settings').select('*').eq('user_id', userId)
    );

    await testQuery('creator_notification_settings', () =>
      supabase.from('creator_notification_settings').select('*').eq('user_id', userId)
    );

    setQueries(results);
    setLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#020203', color: 'rgba(255,255,255,0.92)', padding: '48px 24px', fontFamily: 'var(--font-body, Outfit), sans-serif' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <a href="/debug" style={{ fontSize: 12, color: 'rgba(200,169,110,0.6)', textDecoration: 'none', fontFamily: 'var(--font-mono, DM Mono), monospace' }}>&larr; Back to Debug</a>
        <h1 style={{ fontSize: 32, fontWeight: 300, fontFamily: 'var(--font-display, Cormorant), serif', color: '#c8a96e', marginTop: 16, marginBottom: 8 }}>Dashboard Data Debug</h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-mono, DM Mono), monospace', marginBottom: 32 }}>
          Test all dashboard data queries and response times
        </p>

        {!user && (
          <div style={{ padding: '16px 20px', background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.2)', borderRadius: 8, marginBottom: 24 }}>
            <p style={{ fontSize: 13, color: '#eab308' }}>Not authenticated. Dashboard queries require an authenticated session.</p>
          </div>
        )}

        <button onClick={testDashboard} disabled={loading} style={{
          padding: '10px 20px', background: 'rgba(200,169,110,0.15)', border: '1px solid rgba(200,169,110,0.3)',
          borderRadius: 6, color: '#c8a96e', fontSize: 13, cursor: loading ? 'wait' : 'pointer',
          fontFamily: 'var(--font-mono, DM Mono), monospace', marginBottom: 24,
        }}>
          {loading ? 'Running Queries...' : 'Re-test Dashboard Queries'}
        </button>

        {queries.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {queries.map((q, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
                background: '#0d0d18', border: '1px solid rgba(255,255,255,0.055)', borderRadius: 6,
              }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                  background: q.status === 'ok' ? '#22c55e' : q.status === 'no-data' ? '#eab308' : '#ef4444',
                }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontFamily: 'var(--font-mono, DM Mono), monospace', color: 'rgba(255,255,255,0.85)' }}>{q.name}</div>
                  {q.error && <div style={{ fontSize: 11, color: '#ef4444', fontFamily: 'var(--font-mono, DM Mono), monospace', marginTop: 2 }}>{q.error}</div>}
                </div>
                {q.rowCount !== null && (
                  <div style={{ fontSize: 11, color: 'rgba(200,169,110,0.5)', fontFamily: 'var(--font-mono, DM Mono), monospace' }}>{q.rowCount} rows</div>
                )}
                {q.elapsed !== null && (
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--font-mono, DM Mono), monospace' }}>{q.elapsed}ms</div>
                )}
                <div style={{
                  fontSize: 11, fontFamily: 'var(--font-mono, DM Mono), monospace', padding: '2px 8px', borderRadius: 4,
                  background: q.status === 'ok' ? 'rgba(34,197,94,0.1)' : q.status === 'no-data' ? 'rgba(234,179,8,0.1)' : 'rgba(239,68,68,0.1)',
                  color: q.status === 'ok' ? '#22c55e' : q.status === 'no-data' ? '#eab308' : '#ef4444',
                }}>
                  {q.status === 'ok' ? 'OK' : q.status === 'no-data' ? 'EMPTY' : 'ERR'}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Dashboard Data Layer Info */}
        <div style={{ marginTop: 32, padding: '20px', background: '#0d0d18', border: '1px solid rgba(255,255,255,0.055)', borderRadius: 8 }}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)', marginBottom: 12, fontFamily: 'var(--font-mono, DM Mono), monospace' }}>Dashboard V2 Functions (src/lib/dashboard-v2.ts)</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 6 }}>
            {[
              'getCreatorDashboardOverview',
              'getCreatorContentStats',
              'getCreatorFanStats',
              'getCreatorEarningsStats',
              'getCreatorRecentTransactions',
              'getPriceOptimizerData',
              'getToolGating',
              'getV2ChartData',
            ].map(fn => (
              <div key={fn} style={{ fontSize: 12, fontFamily: 'var(--font-mono, DM Mono), monospace', color: 'rgba(200,169,110,0.5)', padding: '6px 10px', background: 'rgba(255,255,255,0.02)', borderRadius: 4 }}>
                {fn}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
