'use client';
import { useState } from 'react';

interface ApiTest {
  name: string;
  method: string;
  path: string;
  status: 'untested' | 'ok' | 'error' | 'unauthorized';
  httpStatus: number | null;
  responseTime: number | null;
  error: string | null;
}

const API_ROUTES: { name: string; method: string; path: string }[] = [
  { name: 'Waitlist Signup', method: 'POST', path: '/api/waitlist' },
  { name: 'Creator Application', method: 'POST', path: '/api/apply' },
  { name: 'Dashboard Notifications', method: 'GET', path: '/api/dashboard/notifications' },
  { name: 'Fan Code Generate', method: 'POST', path: '/api/fans/generate' },
  { name: 'Ghostwrite AI', method: 'POST', path: '/api/ai/ghostwrite' },
  { name: 'AI Onboarding Analyze', method: 'POST', path: '/api/ai/onboarding/analyze' },
  { name: 'AI Dynamic Pricing', method: 'POST', path: '/api/ai/monetization/dynamic-pricing' },
  { name: 'AI Daily Brief', method: 'GET', path: '/api/ai/copilot/daily-brief' },
  { name: 'AI Fan Personas', method: 'GET', path: '/api/ai/fans/personas' },
  { name: 'AI Content Ideas', method: 'POST', path: '/api/ai/content/ideas' },
  { name: 'Marketing Agent', method: 'POST', path: '/api/marketing-agent' },
  { name: 'Social Auto-Share', method: 'POST', path: '/api/social/auto-share' },
  { name: 'Bio Tool', method: 'POST', path: '/api/tools/bio' },
  { name: 'Caption Tool', method: 'POST', path: '/api/tools/caption' },
  { name: 'Predict Tool', method: 'POST', path: '/api/tools/predict' },
  { name: 'Referral Update', method: 'GET', path: '/api/referral/update-handle' },
  { name: 'Admin Applications', method: 'GET', path: '/api/admin/applications' },
  { name: 'V2 Earnings', method: 'GET', path: '/api/v2/earnings' },
  { name: 'V2 Content Create', method: 'POST', path: '/api/v2/content/create' },
  { name: 'V2 Crypto Initiate', method: 'POST', path: '/api/v2/crypto/initiate' },
  { name: 'V2 Unlock', method: 'GET', path: '/api/v2/unlock/[code]' },
  { name: 'Vault Setup', method: 'POST', path: '/api/vault/setup' },
  { name: 'Messages', method: 'GET', path: '/api/messages' },
  { name: 'Notifications Send', method: 'POST', path: '/api/notifications/send' },
  { name: 'Upload', method: 'POST', path: '/api/upload' },
];

export default function DebugApi() {
  const [tests, setTests] = useState<ApiTest[]>(API_ROUTES.map(r => ({ ...r, status: 'untested', httpStatus: null, responseTime: null, error: null })));
  const [testing, setTesting] = useState(false);

  const getErrorMessage = (err: unknown): string => {
    if (err instanceof Error) return err.message;
    return 'Unknown error';
  };

  const testRoute = async (index: number) => {
    const route = API_ROUTES[index];
    const start = performance.now();

    try {
      const resp = await fetch(route.path, {
        method: route.method,
        headers: { 'Content-Type': 'application/json' },
        body: route.method === 'POST' ? JSON.stringify({}) : undefined,
        signal: AbortSignal.timeout(10000),
      });

      const elapsed = Math.round(performance.now() - start);

      setTests(prev => {
        const next = [...prev];
        next[index] = {
          ...next[index],
          status: resp.ok ? 'ok' : resp.status === 401 ? 'unauthorized' : 'error',
          httpStatus: resp.status,
          responseTime: elapsed,
          error: resp.ok ? null : `HTTP ${resp.status}`,
        };
        return next;
      });
    } catch (e: unknown) {
      const elapsed = Math.round(performance.now() - start);
      setTests(prev => {
        const next = [...prev];
        next[index] = {
          ...next[index],
          status: 'error',
          httpStatus: null,
          responseTime: elapsed,
          error: getErrorMessage(e),
        };
        return next;
      });
    }
  };

  const testAll = async () => {
    setTesting(true);
    for (let i = 0; i < API_ROUTES.length; i++) {
      await testRoute(i);
      await new Promise(r => setTimeout(r, 200)); // small delay between requests
    }
    setTesting(false);
  };

  const okCount = tests.filter(t => t.status === 'ok').length;
  const authCount = tests.filter(t => t.status === 'unauthorized').length;
  const errorCount = tests.filter(t => t.status === 'error').length;
  const untestedCount = tests.filter(t => t.status === 'untested').length;

  return (
    <div style={{ minHeight: '100vh', background: '#020203', color: 'rgba(255,255,255,0.92)', padding: '48px 24px', fontFamily: 'var(--font-body, Outfit), sans-serif' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <a href="/debug" style={{ fontSize: 12, color: 'rgba(200,169,110,0.6)', textDecoration: 'none', fontFamily: 'var(--font-mono, DM Mono), monospace' }}>&larr; Back to Debug</a>
        <h1 style={{ fontSize: 32, fontWeight: 300, fontFamily: 'var(--font-display, Cormorant), serif', color: '#c8a96e', marginTop: 16, marginBottom: 8 }}>API Routes Debug</h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-mono, DM Mono), monospace', marginBottom: 32 }}>
          Test all API endpoint health and response times
        </p>

        <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
          <div style={{ padding: '12px 20px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 6, fontSize: 14, color: '#22c55e' }}>{okCount} OK</div>
          <div style={{ padding: '12px 20px', background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 6, fontSize: 14, color: '#8b5cf6' }}>{authCount} Auth Required</div>
          <div style={{ padding: '12px 20px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, fontSize: 14, color: '#ef4444' }}>{errorCount} Error</div>
          <div style={{ padding: '12px 20px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>{untestedCount} Untested</div>
        </div>

        <button onClick={testAll} disabled={testing} style={{
          padding: '12px 24px', background: testing ? 'rgba(200,169,110,0.05)' : 'rgba(200,169,110,0.15)',
          border: '1px solid rgba(200,169,110,0.3)', borderRadius: 6, color: testing ? 'rgba(200,169,110,0.4)' : '#c8a96e',
          fontSize: 13, cursor: testing ? 'wait' : 'pointer', fontFamily: 'var(--font-mono, DM Mono), monospace', marginBottom: 24,
        }}>
          {testing ? 'Testing All Routes...' : 'Test All Routes'}
        </button>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {tests.map((t, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
              background: '#0d0d18', border: '1px solid rgba(255,255,255,0.055)', borderRadius: 6,
            }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                background: t.status === 'ok' ? '#22c55e' : t.status === 'unauthorized' ? '#8b5cf6' : t.status === 'error' ? '#ef4444' : 'rgba(255,255,255,0.2)',
              }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>{t.name}</div>
                <div style={{ fontSize: 11, fontFamily: 'var(--font-mono, DM Mono), monospace', color: 'rgba(255,255,255,0.35)' }}>{t.method} {t.path}</div>
              </div>
              {t.responseTime !== null && (
                <div style={{ fontSize: 11, fontFamily: 'var(--font-mono, DM Mono), monospace', color: 'rgba(200,169,110,0.5)' }}>{t.responseTime}ms</div>
              )}
              <div style={{
                fontSize: 11, fontFamily: 'var(--font-mono, DM Mono), monospace', padding: '2px 8px', borderRadius: 4,
                background: t.status === 'ok' ? 'rgba(34,197,94,0.1)' : t.status === 'unauthorized' ? 'rgba(139,92,246,0.1)' : t.status === 'error' ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.05)',
                color: t.status === 'ok' ? '#22c55e' : t.status === 'unauthorized' ? '#8b5cf6' : t.status === 'error' ? '#ef4444' : 'rgba(255,255,255,0.3)',
              }}>
                {t.httpStatus || t.status}
              </div>
              <button onClick={() => testRoute(i)} style={{
                padding: '4px 10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 4, color: 'rgba(255,255,255,0.4)', fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font-mono, DM Mono), monospace',
              }}>
                Test
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
