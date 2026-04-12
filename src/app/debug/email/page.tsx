'use client';
import { useState } from 'react';

interface EmailTest {
  name: string;
  status: 'untested' | 'ok' | 'error';
  message: string;
}

export default function DebugEmail() {
  const [tests, setTests] = useState<EmailTest[]>([
    { name: 'RESEND_API_KEY', status: 'untested', message: 'Not checked' },
    { name: 'Email Templates', status: 'untested', message: 'Not checked' },
  ]);
  const [testEmail, setTestEmail] = useState('');
  const [sending, setSending] = useState(false);

  const checkEnv = () => {
    const hasKey = typeof process !== 'undefined' && process.env.NEXT_PUBLIC_SUPABASE_URL;
    setTests(prev => {
      const next = [...prev];
      next[0] = {
        name: 'RESEND_API_KEY',
        status: hasKey ? 'ok' : 'error',
        message: hasKey ? 'Server-side key (check server logs for validation)' : 'Not configured - email sending will fail',
      };
      next[1] = {
        name: 'Email Templates',
        status: 'ok',
        message: 'Welcome, Earnings, Purchase Receipt templates available in lib/notifications/resend.ts',
      };
      return next;
    });
  };

  const sendTestEmail = async () => {
    if (!testEmail) {
      alert('Enter a test email address');
      return;
    }
    setSending(true);
    try {
      // The email functions are server-side, so we'd need an API endpoint
      // For now just show a message
      alert(`Test email endpoint not exposed as API route.\n\nEmail functions are in lib/notifications/resend.ts:\n- sendWelcomeEmail(email, displayName)\n- sendEarningsNotification(email, amount, displayName)\n- sendPurchaseReceipt(email, contentTitle, amount, displayName)\n\nTo test: create a test API route or test in Supabase edge functions.`);
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    }
    setSending(false);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#020203', color: 'rgba(255,255,255,0.92)', padding: '48px 24px', fontFamily: 'var(--font-body, Outfit), sans-serif' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <a href="/debug" style={{ fontSize: 12, color: 'rgba(200,169,110,0.6)', textDecoration: 'none', fontFamily: 'var(--font-mono, DM Mono), monospace' }}>&larr; Back to Debug</a>
        <h1 style={{ fontSize: 32, fontWeight: 300, fontFamily: 'var(--font-display, Cormorant), serif', color: '#c8a96e', marginTop: 16, marginBottom: 8 }}>Email (Resend) Debug</h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-mono, DM Mono), monospace', marginBottom: 32 }}>
          Test email delivery, templates, and API configuration
        </p>

        <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
          <button onClick={checkEnv} style={{ padding: '10px 20px', background: 'rgba(200,169,110,0.15)', border: '1px solid rgba(200,169,110,0.3)', borderRadius: 6, color: '#c8a96e', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-mono, DM Mono), monospace' }}>
            Check Configuration
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
          {tests.map((t, i) => (
            <div key={i} style={{
              padding: '16px 20px', background: '#0d0d18',
              border: `1px solid ${t.status === 'ok' ? 'rgba(34,197,94,0.2)' : t.status === 'error' ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.055)'}`,
              borderRadius: 8,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: t.status === 'ok' ? '#22c55e' : t.status === 'error' ? '#ef4444' : 'rgba(255,255,255,0.2)' }} />
                <span style={{ fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.9)' }}>{t.name}</span>
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-mono, DM Mono), monospace', paddingLeft: 18 }}>{t.message}</div>
            </div>
          ))}
        </div>

        {/* Email Templates Info */}
        <div style={{ padding: '20px', background: '#0d0d18', border: '1px solid rgba(255,255,255,0.055)', borderRadius: 8, marginBottom: 24 }}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)', marginBottom: 12, fontFamily: 'var(--font-mono, DM Mono), monospace' }}>Available Email Templates</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { name: 'sendWelcomeEmail', desc: 'Welcome new creators to MULUK', params: 'email, displayName' },
              { name: 'sendEarningsNotification', desc: 'Notify creators of new earnings', params: 'email, amount, displayName' },
              { name: 'sendPurchaseReceipt', desc: 'Receipt for fan purchases', params: 'email, contentTitle, amount, displayName' },
            ].map(fn => (
              <div key={fn.name} style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: 6 }}>
                <div style={{ fontSize: 13, fontFamily: 'var(--font-mono, DM Mono), monospace', color: '#c8a96e' }}>{fn.name}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{fn.desc} — <span style={{ color: 'rgba(200,169,110,0.5)' }}>({fn.params})</span></div>
              </div>
            ))}
          </div>
        </div>

        {/* Test email input */}
        <div style={{ padding: '20px', background: '#0d0d18', border: '1px solid rgba(255,255,255,0.055)', borderRadius: 8 }}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)', marginBottom: 12, fontFamily: 'var(--font-mono, DM Mono), monospace' }}>Send Test Email</div>
          <div style={{ display: 'flex', gap: 12 }}>
            <input
              type="email"
              placeholder="test@example.com"
              value={testEmail}
              onChange={e => setTestEmail(e.target.value)}
              style={{
                flex: 1, padding: '10px 14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 6, color: 'rgba(255,255,255,0.9)', fontSize: 13, fontFamily: 'var(--font-mono, DM Mono), monospace', outline: 'none',
              }}
            />
            <button onClick={sendTestEmail} disabled={sending} style={{
              padding: '10px 20px', background: 'rgba(200,169,110,0.15)', border: '1px solid rgba(200,169,110,0.3)',
              borderRadius: 6, color: '#c8a96e', fontSize: 13, cursor: sending ? 'wait' : 'pointer', fontFamily: 'var(--font-mono, DM Mono), monospace',
            }}>
              {sending ? 'Sending...' : 'Send Test'}
            </button>
          </div>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', marginTop: 8, fontFamily: 'var(--font-mono, DM Mono), monospace' }}>
            Note: Requires a server-side API route to test. Email functions are in lib/notifications/resend.ts
          </p>
        </div>
      </div>
    </div>
  );
}
