'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

const DEBUG_SECTIONS = [
  { href: '/debug/env', label: 'Environment & Config', desc: 'Validate env vars, Supabase URL/key, API keys' },
  { href: '/debug/auth', label: 'Authentication', desc: 'Test Supabase auth, session, user data' },
  { href: '/debug/database', label: 'Database & RLS', desc: 'Test table access, RLS policies, queries' },
  { href: '/debug/api', label: 'API Routes', desc: 'Test all API endpoint health & responses' },
  { href: '/debug/social', label: 'Social OAuth', desc: 'Test platform connections (Twitter, IG, TikTok, YT, Telegram)' },
  { href: '/debug/ai', label: 'AI Router', desc: 'Test OpenRouter routes, streaming, and costs' },
  { href: '/debug/email', label: 'Email (Resend)', desc: 'Test email delivery, templates, API key' },
  { href: '/debug/analytics', label: 'Analytics (PostHog)', desc: 'Test event tracking, session recording' },
  { href: '/debug/monetization', label: 'Monetization', desc: 'Test fan codes, fee splits, tier limits' },
  { href: '/debug/content', label: 'Content Management', desc: 'Test content CRUD, scheduling, burn mode' },
  { href: '/debug/dashboard', label: 'Dashboard Data', desc: 'Test dashboard queries, stats, charts' },
  { href: '/debug/health', label: 'System Health', desc: 'Overall system health, uptime, performance' },
];

export default function DebugIndex() {
  const [timestamp, setTimestamp] = useState('');

  useEffect(() => {
    setTimestamp(new Date().toISOString());
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#020203', color: 'rgba(255,255,255,0.92)', padding: '48px 24px', fontFamily: 'var(--font-body, Outfit), sans-serif' }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <div style={{ marginBottom: 8, fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-mono, DM Mono), monospace' }}>
          MULUK // DEBUG CONSOLE
        </div>
        <h1 style={{ fontSize: 36, fontWeight: 300, fontFamily: 'var(--font-display, Cormorant), serif', color: '#c8a96e', marginBottom: 8 }}>
          Debug Dashboard
        </h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 40, fontFamily: 'var(--font-mono, DM Mono), monospace' }}>
          {timestamp}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {DEBUG_SECTIONS.map((s, i) => (
            <Link key={s.href} href={s.href} style={{
              display: 'block',
              padding: '20px 24px',
              background: '#0d0d18',
              border: '1px solid rgba(255,255,255,0.055)',
              borderRadius: 8,
              textDecoration: 'none',
              transition: 'border-color 0.2s, background 0.2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(200,169,110,0.3)'; e.currentTarget.style.background = '#111120'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.055)'; e.currentTarget.style.background = '#0d0d18'; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: 11, fontFamily: 'var(--font-mono, DM Mono), monospace', color: 'rgba(200,169,110,0.6)' }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span style={{ fontSize: 15, fontWeight: 500, color: 'rgba(255,255,255,0.92)' }}>
                  {s.label}
                </span>
              </div>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', lineHeight: 1.5, fontFamily: 'var(--font-mono, DM Mono), monospace' }}>
                {s.desc}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
