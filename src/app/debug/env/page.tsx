'use client';
import { useEffect, useState } from 'react';

interface CheckResult {
  name: string;
  status: 'ok' | 'warn' | 'error';
  value: string;
  message: string;
}

export default function DebugEnv() {
  const [checks, setChecks] = useState<CheckResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    runChecks();
  }, []);

  const runChecks = async () => {
    const results: CheckResult[] = [];

    // Test Supabase connection
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

      results.push({
        name: 'NEXT_PUBLIC_SUPABASE_URL',
        status: supabaseUrl ? 'ok' : 'error',
        value: supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : 'MISSING',
        message: supabaseUrl ? 'Set' : 'Required for database/auth',
      });

      results.push({
        name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
        status: supabaseKey ? (supabaseKey.startsWith('eyJ') ? 'ok' : 'warn') : 'error',
        value: supabaseKey ? `${supabaseKey.substring(0, 12)}...` : 'MISSING',
        message: supabaseKey ? (supabaseKey.startsWith('eyJ') ? 'Valid JWT format' : 'Unexpected format') : 'Required for database/auth',
      });

      // Test Supabase reachability
      if (supabaseUrl) {
        try {
          const resp = await fetch(`${supabaseUrl}/rest/v1/`, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
          results.push({
            name: 'Supabase Reachability',
            status: resp.ok || resp.status === 200 || resp.status === 401 ? 'ok' : 'warn',
            value: `HTTP ${resp.status}`,
            message: resp.ok || resp.status === 200 || resp.status === 401 ? 'Reachable' : 'Unexpected response',
          });
        } catch (e: any) {
          results.push({
            name: 'Supabase Reachability',
            status: 'error',
            value: 'FAILED',
            message: e.message || 'Cannot reach Supabase',
          });
        }
      }
    } catch (e: any) {
      results.push({ name: 'Supabase Config', status: 'error', value: 'ERROR', message: e.message });
    }

    // Check other env vars (existence only, no values shown)
    const envChecks = [
      { name: 'RESEND_API_KEY', required: false },
      { name: 'OPENAI_API_KEY', required: false },
      { name: 'OPENROUTER_API_KEY', required: false },
      { name: 'NEXT_PUBLIC_POSTHOG_KEY', required: false },
      { name: 'NEXT_PUBLIC_SITE_URL', required: false },
      { name: 'TOKEN_ENCRYPTION_KEY', required: false },
      { name: 'TWITTER_CLIENT_ID', required: false },
      { name: 'TWITTER_CLIENT_SECRET', required: false },
      { name: 'TIKTOK_CLIENT_KEY', required: false },
      { name: 'TIKTOK_CLIENT_SECRET', required: false },
      { name: 'INSTAGRAM_CLIENT_ID', required: false },
      { name: 'INSTAGRAM_CLIENT_SECRET', required: false },
      { name: 'YOUTUBE_CLIENT_ID', required: false },
      { name: 'YOUTUBE_CLIENT_SECRET', required: false },
      { name: 'TELEGRAM_BOT_TOKEN', required: false },
      { name: 'WHOP_API_KEY', required: false },
      { name: 'WHOP_WEBHOOK_SECRET', required: false },
    ];

    for (const check of envChecks) {
      const val = process.env[check.name];
      results.push({
        name: check.name,
        status: val ? 'ok' : (check.required ? 'error' : 'warn'),
        value: val ? 'SET' : 'NOT SET',
        message: val ? 'Present' : check.required ? 'Required' : 'Optional',
      });
    }

    // Check Node environment
    results.push({
      name: 'NODE_ENV',
      status: 'ok',
      value: process.env.NODE_ENV || 'unknown',
      message: process.env.NODE_ENV === 'development' ? 'Development mode' : 'Production mode',
    });

    setChecks(results);
    setLoading(false);
  };

  const okCount = checks.filter(c => c.status === 'ok').length;
  const warnCount = checks.filter(c => c.status === 'warn').length;
  const errorCount = checks.filter(c => c.status === 'error').length;

  return (
    <div style={{ minHeight: '100vh', background: '#020203', color: 'rgba(255,255,255,0.92)', padding: '48px 24px', fontFamily: 'var(--font-body, Outfit), sans-serif' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <a href="/debug" style={{ fontSize: 12, color: 'rgba(200,169,110,0.6)', textDecoration: 'none', fontFamily: 'var(--font-mono, DM Mono), monospace' }}>&larr; Back to Debug</a>
        <h1 style={{ fontSize: 32, fontWeight: 300, fontFamily: 'var(--font-display, Cormorant), serif', color: '#c8a96e', marginTop: 16, marginBottom: 8 }}>Environment & Config</h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-mono, DM Mono), monospace', marginBottom: 32 }}>
          Validate environment variables and service connectivity
        </p>

        {!loading && (
          <div style={{ display: 'flex', gap: 16, marginBottom: 32 }}>
            <div style={{ padding: '12px 20px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 6, fontSize: 14, color: '#22c55e' }}>
              {okCount} OK
            </div>
            <div style={{ padding: '12px 20px', background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.2)', borderRadius: 6, fontSize: 14, color: '#eab308' }}>
              {warnCount} WARN
            </div>
            <div style={{ padding: '12px 20px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, fontSize: 14, color: '#ef4444' }}>
              {errorCount} ERROR
            </div>
          </div>
        )}

        {loading ? (
          <p style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-mono, DM Mono), monospace' }}>Running checks...</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {checks.map((c, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 16, padding: '12px 16px',
                background: '#0d0d18', border: '1px solid rgba(255,255,255,0.055)', borderRadius: 6,
              }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                  background: c.status === 'ok' ? '#22c55e' : c.status === 'warn' ? '#eab308' : '#ef4444',
                  boxShadow: c.status === 'ok' ? '0 0 6px rgba(34,197,94,0.5)' : c.status === 'warn' ? '0 0 6px rgba(234,179,8,0.5)' : '0 0 6px rgba(239,68,68,0.5)',
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontFamily: 'var(--font-mono, DM Mono), monospace', color: 'rgba(255,255,255,0.85)' }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{c.message}</div>
                </div>
                <div style={{ fontSize: 12, fontFamily: 'var(--font-mono, DM Mono), monospace', color: 'rgba(255,255,255,0.5)', flexShrink: 0 }}>{c.value}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
