'use client';
import { useState } from 'react';

export default function DebugMonetization() {
  const [testAmount, setTestAmount] = useState('1000');
  const [results, setResults] = useState<any>(null);

  const calculateSplits = () => {
    const amount = parseFloat(testAmount) || 0;
    const cents = Math.round(amount * 100);

    const tiers = ['Cipher', 'Legend', 'Apex'];
    const fees = { Cipher: 0.12, Legend: 0.10, Apex: 0.08 };

    const splits = tiers.map(tier => {
      const fee = fees[tier as keyof typeof fees];
      const platformFee = Math.round(cents * fee);
      const creatorEarnings = cents - platformFee;
      return {
        tier,
        fee: `${(fee * 100).toFixed(0)}%`,
        platformFee: (platformFee / 100).toFixed(2),
        creatorEarnings: (creatorEarnings / 100).toFixed(2),
      };
    });

    setResults({ amount: amount.toFixed(2), splits });
  };

  return (
    <div style={{ minHeight: '100vh', background: '#020203', color: 'rgba(255,255,255,0.92)', padding: '48px 24px', fontFamily: 'var(--font-body, Outfit), sans-serif' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <a href="/debug" style={{ fontSize: 12, color: 'rgba(200,169,110,0.6)', textDecoration: 'none', fontFamily: 'var(--font-mono, DM Mono), monospace' }}>&larr; Back to Debug</a>
        <h1 style={{ fontSize: 32, fontWeight: 300, fontFamily: 'var(--font-display, Cormorant), serif', color: '#c8a96e', marginTop: 16, marginBottom: 8 }}>Monetization Debug</h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-mono, DM Mono), monospace', marginBottom: 32 }}>
          Test fan codes, fee splits, tier limits, and pricing
        </p>

        {/* Fee Split Calculator */}
        <div style={{ padding: '24px', background: '#0d0d18', border: '1px solid rgba(255,255,255,0.055)', borderRadius: 8, marginBottom: 24 }}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)', marginBottom: 16, fontFamily: 'var(--font-mono, DM Mono), monospace' }}>Fee Split Calculator</div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-mono, DM Mono), monospace', display: 'block', marginBottom: 6 }}>Amount (USD)</label>
              <input
                type="number"
                value={testAmount}
                onChange={e => setTestAmount(e.target.value)}
                style={{
                  width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 6, color: 'rgba(255,255,255,0.9)', fontSize: 14, fontFamily: 'var(--font-mono, DM Mono), monospace', outline: 'none',
                }}
              />
            </div>
            <button onClick={calculateSplits} style={{ padding: '10px 24px', background: 'rgba(200,169,110,0.15)', border: '1px solid rgba(200,169,110,0.3)', borderRadius: 6, color: '#c8a96e', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-mono, DM Mono), monospace', alignSelf: 'flex-end' }}>
              Calculate
            </button>
          </div>

          {results && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {results.splits.map((s: any) => (
                <div key={s.tier} style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 8 }}>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>{s.tier} ({s.fee} fee)</div>
                  <div style={{ fontSize: 24, fontWeight: 300, color: '#c8a96e', fontFamily: 'var(--font-mono, DM Mono), monospace' }}>${s.creatorEarnings}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--font-mono, DM Mono), monospace', marginTop: 4 }}>Platform: ${s.platformFee}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Fan Code Format */}
        <div style={{ padding: '20px', background: '#0d0d18', border: '1px solid rgba(255,255,255,0.055)', borderRadius: 8, marginBottom: 24 }}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)', marginBottom: 12, fontFamily: 'var(--font-mono, DM Mono), monospace' }}>Fan Code System</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.02)', borderRadius: 6 }}>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>Format</div>
              <div style={{ fontSize: 14, fontFamily: 'var(--font-mono, DM Mono), monospace', color: '#c8a96e' }}>FAN-XXXXXXXXXX</div>
            </div>
            <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.02)', borderRadius: 6 }}>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>Batch Limit</div>
              <div style={{ fontSize: 14, fontFamily: 'var(--font-mono, DM Mono), monospace', color: '#c8a96e' }}>1-50 per request</div>
            </div>
            <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.02)', borderRadius: 6 }}>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>Cipher Tier Limit</div>
              <div style={{ fontSize: 14, fontFamily: 'var(--font-mono, DM Mono), monospace', color: '#c8a96e' }}>500 codes</div>
            </div>
            <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.02)', borderRadius: 6 }}>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>Legend/Apex Limit</div>
              <div style={{ fontSize: 14, fontFamily: 'var(--font-mono, DM Mono), monospace', color: '#c8a96e' }}>Unlimited</div>
            </div>
          </div>
        </div>

        {/* Pricing tiers */}
        <div style={{ padding: '20px', background: '#0d0d18', border: '1px solid rgba(255,255,255,0.055)', borderRadius: 8 }}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)', marginBottom: 12, fontFamily: 'var(--font-mono, DM Mono), monospace' }}>Tier Comparison</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-mono, DM Mono), monospace', fontWeight: 400 }}>Tier</th>
                <th style={{ textAlign: 'right', padding: '8px 12px', fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-mono, DM Mono), monospace', fontWeight: 400 }}>Fee</th>
                <th style={{ textAlign: 'right', padding: '8px 12px', fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-mono, DM Mono), monospace', fontWeight: 400 }}>Code Limit</th>
                <th style={{ textAlign: 'right', padding: '8px 12px', fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-mono, DM Mono), monospace', fontWeight: 400 }}>Payout</th>
              </tr>
            </thead>
            <tbody>
              {[
                { tier: 'Cipher', fee: '12%', limit: '500', payout: '88%' },
                { tier: 'Legend', fee: '10%', limit: 'Unlimited', payout: '90%' },
                { tier: 'Apex', fee: '8%', limit: 'Unlimited', payout: '92%' },
              ].map(t => (
                <tr key={t.tier} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '10px 12px', fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>{t.tier}</td>
                  <td style={{ padding: '10px 12px', fontSize: 13, color: '#ef4444', textAlign: 'right', fontFamily: 'var(--font-mono, DM Mono), monospace' }}>{t.fee}</td>
                  <td style={{ padding: '10px 12px', fontSize: 13, color: 'rgba(255,255,255,0.5)', textAlign: 'right', fontFamily: 'var(--font-mono, DM Mono), monospace' }}>{t.limit}</td>
                  <td style={{ padding: '10px 12px', fontSize: 13, color: '#22c55e', textAlign: 'right', fontFamily: 'var(--font-mono, DM Mono), monospace' }}>{t.payout}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
