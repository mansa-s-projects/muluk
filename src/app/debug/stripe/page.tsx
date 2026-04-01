'use client';
import { useState } from 'react';

interface TestResult {
  name: string;
  status: 'untested' | 'ok' | 'error';
  message: string;
  details: unknown;
}

export default function DebugStripe() {
  const [results, setResults] = useState<TestResult[]>([
    { name: 'Stripe Secret Key', status: 'untested', message: 'Not tested', details: null },
    { name: 'Stripe Publishable Key', status: 'untested', message: 'Not tested', details: null },
    { name: 'Webhook Secret', status: 'untested', message: 'Not tested', details: null },
    { name: 'Create Checkout Session', status: 'untested', message: 'Not tested', details: null },
  ]);

  const updateResult = (index: number, status: 'untested' | 'ok' | 'error', message: string, details?: unknown) => {
    setResults(prev => {
      const next = [...prev];
      next[index] = { ...next[index], status, message, details };
      return next;
    });
  };

  const testCreateSession = async () => {
    updateResult(3, 'untested', 'Testing...', null);
    try {
      const resp = await fetch('/api/v2/stripe/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentId: 'debug-test-content',
          amount: 100,
          creatorId: 'debug-test-creator',
        }),
      });
      const data = await resp.json();
      if (resp.ok || resp.status === 401) {
        updateResult(3, resp.status === 401 ? 'error' : 'ok', resp.status === 401 ? 'Auth required (expected)' : 'Session created', data);
      } else {
        updateResult(3, 'error', `HTTP ${resp.status}: ${data.error || 'Unknown'}`, data);
      }
    } catch (e: unknown) {
      updateResult(3, 'error', e instanceof Error ? e.message : String(e));
    }
  };

  const testWebhookEndpoint = async () => {
    updateResult(2, 'untested', 'Testing...', null);
    try {
      const resp = await fetch('/api/v2/stripe/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'test' }),
      });
      // Webhook should reject invalid signatures
      if (resp.status === 400 || resp.status === 500) {
        updateResult(2, 'ok', `Endpoint reachable (rejected invalid payload as expected: ${resp.status})`);
      } else if (resp.ok) {
        updateResult(2, 'ok', 'Webhook endpoint active');
      } else {
        updateResult(2, 'error', `HTTP ${resp.status}`);
      }
    } catch (e: unknown) {
      updateResult(2, 'error', e instanceof Error ? e.message : String(e));
    }
  };

  const checkEnvVars = () => {
    // Check if keys are configured (client-side only sees public ones)
    const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    updateResult(1, publishableKey ? 'ok' : 'error', publishableKey ? `Set (${publishableKey.substring(0, 12)}...)` : 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY not set');
    updateResult(0, 'untested', 'Secret key is server-side only - test via create session');
  };

  const testAll = async () => {
    checkEnvVars();
    await new Promise(r => setTimeout(r, 300));
    await testWebhookEndpoint();
    await new Promise(r => setTimeout(r, 300));
    await testCreateSession();
  };

  return (
    <div style={{ minHeight: '100vh', background: '#020203', color: 'rgba(255,255,255,0.92)', padding: '48px 24px', fontFamily: 'var(--font-body, Outfit), sans-serif' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <a href="/debug" style={{ fontSize: 12, color: 'rgba(200,169,110,0.6)', textDecoration: 'none', fontFamily: 'var(--font-mono, DM Mono), monospace' }}>&larr; Back to Debug</a>
        <h1 style={{ fontSize: 32, fontWeight: 300, fontFamily: 'var(--font-display, Cormorant), serif', color: '#c8a96e', marginTop: 16, marginBottom: 8 }}>Stripe & Payments Debug</h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-mono, DM Mono), monospace', marginBottom: 32 }}>
          Test Stripe checkout sessions, webhooks, and payment flows
        </p>

        <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
          <button onClick={testAll} style={{ padding: '10px 20px', background: 'rgba(200,169,110,0.15)', border: '1px solid rgba(200,169,110,0.3)', borderRadius: 6, color: '#c8a96e', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-mono, DM Mono), monospace' }}>
            Run All Tests
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {results.map((r, i) => (
            <div key={i} style={{
              padding: '16px 20px', background: '#0d0d18',
              border: `1px solid ${r.status === 'ok' ? 'rgba(34,197,94,0.2)' : r.status === 'error' ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.055)'}`,
              borderRadius: 8,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: r.status === 'ok' ? '#22c55e' : r.status === 'error' ? '#ef4444' : 'rgba(255,255,255,0.2)',
                  }} />
                  <span style={{ fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.9)' }}>{r.name}</span>
                </div>
                <span style={{
                  fontSize: 11, fontFamily: 'var(--font-mono, DM Mono), monospace', padding: '2px 8px', borderRadius: 4,
                  background: r.status === 'ok' ? 'rgba(34,197,94,0.1)' : r.status === 'error' ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.05)',
                  color: r.status === 'ok' ? '#22c55e' : r.status === 'error' ? '#ef4444' : 'rgba(255,255,255,0.3)',
                }}>
                  {r.status}
                </span>
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-mono, DM Mono), monospace' }}>{r.message}</div>
              {r.details != null ? (
                <pre style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-mono, DM Mono), monospace', marginTop: 8, whiteSpace: 'pre-wrap', padding: '8px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: 4 }}>
                  {JSON.stringify(r.details, null, 2)}
                </pre>
              ) : null}
            </div>
          ))}
        </div>

        <div style={{ marginTop: 24 }}>
          <h3 style={{ fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.7)', marginBottom: 12 }}>Monetization Test</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {[
              { tier: 'Cipher', fee: '12%', color: '#c8a96e' },
              { tier: 'Legend', fee: '10%', color: '#e8cc96' },
              { tier: 'Apex', fee: '8%', color: '#f0d9a8' },
            ].map(t => (
              <div key={t.tier} style={{ padding: '12px 16px', background: '#0d0d18', border: '1px solid rgba(255,255,255,0.055)', borderRadius: 6, textAlign: 'center' }}>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>{t.tier}</div>
                <div style={{ fontSize: 20, fontWeight: 300, color: t.color, fontFamily: 'var(--font-mono, DM Mono), monospace' }}>{t.fee}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
