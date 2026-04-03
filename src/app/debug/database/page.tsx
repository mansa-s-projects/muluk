'use client';
/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/immutability, react-hooks/set-state-in-effect */
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface TableTest {
  table: string;
  status: 'ok' | 'error' | 'no-access';
  count: number | null;
  error: string | null;
  rlsEnabled: boolean | null;
}

const TABLES = [
  'creator_applications',
  'creator_wallets',
  'fan_codes',
  'transactions',
  'content_items',
  'withdrawal_requests',
  'social_connections',
  'creator_vault_pins',
  'fan_messages',
  'collab_proposals',
  'activity_log',
  'admin_users',
  'content_items_v2',
  'fan_codes_v2',
  'transactions_v2',
  'creator_payout_settings',
  'creator_notification_settings',
];

export default function DebugDatabase() {
  const [tests, setTests] = useState<TableTest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    testTables();
  }, []);

  const testTables = async () => {
    const supabase = createClient();
    const results: TableTest[] = [];

    for (const table of TABLES) {
      try {
        const { data, error, count } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });

        if (error) {
          results.push({
            table,
            status: error.message.includes('RLS') || error.message.includes('policy') ? 'no-access' : 'error',
            count: null,
            error: error.message,
            rlsEnabled: error.message.includes('RLS') || error.message.includes('policy') ? true : null,
          });
        } else {
          results.push({
            table,
            status: 'ok',
            count: count,
            error: null,
            rlsEnabled: true,
          });
        }
      } catch (e: any) {
        results.push({ table, status: 'error', count: null, error: e.message, rlsEnabled: null });
      }
    }

    setTests(results);
    setLoading(false);
  };

  // Test RLS by checking if we can read own data vs all data
  const testRLS = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      alert('Must be authenticated to test RLS');
      return;
    }

    const results: string[] = [];

    // Test creator_applications RLS
    const { data: apps, error: appError } = await supabase.from('creator_applications').select('*');
    results.push(`creator_applications: ${appError ? 'BLOCKED - ' + appError.message : `OK (${apps?.length || 0} rows visible)`}`);

    // Test creator_wallets RLS
    const { data: wallets, error: walletError } = await supabase.from('creator_wallets').select('*');
    results.push(`creator_wallets: ${walletError ? 'BLOCKED - ' + walletError.message : `OK (${wallets?.length || 0} rows visible)`}`);

    // Test fan_codes RLS
    const { data: codes, error: codesError } = await supabase.from('fan_codes').select('*');
    results.push(`fan_codes: ${codesError ? 'BLOCKED - ' + codesError.message : `OK (${codes?.length || 0} rows visible)`}`);

    // Test transactions RLS
    const { data: txns, error: txnError } = await supabase.from('transactions').select('*');
    results.push(`transactions: ${txnError ? 'BLOCKED - ' + txnError.message : `OK (${txns?.length || 0} rows visible)`}`);

    alert(results.join('\n'));
  };

  const okCount = tests.filter(t => t.status === 'ok').length;
  const noAccessCount = tests.filter(t => t.status === 'no-access').length;
  const errorCount = tests.filter(t => t.status === 'error').length;

  return (
    <div style={{ minHeight: '100vh', background: '#020203', color: 'rgba(255,255,255,0.92)', padding: '48px 24px', fontFamily: 'var(--font-body, Outfit), sans-serif' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <a href="/debug" style={{ fontSize: 12, color: 'rgba(200,169,110,0.6)', textDecoration: 'none', fontFamily: 'var(--font-mono, DM Mono), monospace' }}>&larr; Back to Debug</a>
        <h1 style={{ fontSize: 32, fontWeight: 300, fontFamily: 'var(--font-display, Cormorant), serif', color: '#c8a96e', marginTop: 16, marginBottom: 8 }}>Database & RLS Debug</h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-mono, DM Mono), monospace', marginBottom: 32 }}>
          Test table access, RLS policies, and query performance
        </p>

        {!loading && (
          <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
            <div style={{ padding: '12px 20px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 6, fontSize: 14, color: '#22c55e' }}>
              {okCount} Accessible
            </div>
            <div style={{ padding: '12px 20px', background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.2)', borderRadius: 6, fontSize: 14, color: '#eab308' }}>
              {noAccessCount} RLS Protected
            </div>
            <div style={{ padding: '12px 20px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, fontSize: 14, color: '#ef4444' }}>
              {errorCount} Errors
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
          <button onClick={testTables} style={{ padding: '10px 20px', background: 'rgba(200,169,110,0.15)', border: '1px solid rgba(200,169,110,0.3)', borderRadius: 6, color: '#c8a96e', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-mono, DM Mono), monospace' }}>
            Re-test Tables
          </button>
          <button onClick={testRLS} style={{ padding: '10px 20px', background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 6, color: '#8b5cf6', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-mono, DM Mono), monospace' }}>
            Test RLS Policies
          </button>
        </div>

        {loading ? (
          <p style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-mono, DM Mono), monospace' }}>Testing tables...</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {tests.map((t, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
                background: '#0d0d18', border: '1px solid rgba(255,255,255,0.055)', borderRadius: 6,
              }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                  background: t.status === 'ok' ? '#22c55e' : t.status === 'no-access' ? '#eab308' : '#ef4444',
                }} />
                <div style={{ flex: 1, fontSize: 13, fontFamily: 'var(--font-mono, DM Mono), monospace', color: 'rgba(255,255,255,0.85)' }}>
                  {t.table}
                </div>
                {t.count !== null && (
                  <div style={{ fontSize: 12, color: 'rgba(200,169,110,0.6)', fontFamily: 'var(--font-mono, DM Mono), monospace' }}>
                    {t.count} rows
                  </div>
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
    </div>
  );
}
