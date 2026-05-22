'use client';
import { useState } from 'react';

interface AnalyticsState {
  posthogKey: string | null;
  posthogHost: string | null;
  isLoaded: boolean;
  eventsLogged: string[];
}

type PosthogLike = {
  capture: (event: string, properties?: Record<string, unknown>) => void;
};

const getPosthogClient = (): PosthogLike | null => {
  if (typeof window === 'undefined') return null;
  const candidate = (window as Window & { posthog?: PosthogLike }).posthog;
  if (!candidate || typeof candidate.capture !== 'function') return null;
  return candidate;
};

const getErrorMessage = (err: unknown): string => {
  if (err instanceof Error) return err.message;
  return 'Unknown error';
};

export default function DebugAnalytics() {
  const [state, setState] = useState<AnalyticsState>(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY || null;
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com';
    return {
      posthogKey: key,
      posthogHost: host,
      isLoaded: !!getPosthogClient(),
      eventsLogged: [],
    };
  });
  const [testEventName, setTestEventName] = useState('debug_test_event');

  const sendTestEvent = () => {
    try {
      const ph = getPosthogClient();
      if (ph && ph.capture) {
        ph.capture(testEventName, { test: true, timestamp: Date.now(), source: 'debug_page' });
        setState(prev => ({ ...prev, eventsLogged: [...prev.eventsLogged, testEventName] }));
        alert(`Event "${testEventName}" sent to PostHog`);
      } else {
        alert('PostHog not loaded in browser. Check NEXT_PUBLIC_POSTHOG_KEY configuration.');
      }
    } catch (e: unknown) {
      alert(`Error: ${getErrorMessage(e)}`);
    }
  };

  const trackPageView = () => {
    try {
      const ph = getPosthogClient();
      if (ph && ph.capture) {
        ph.capture('$pageview', { $current_url: window.location.href });
        setState(prev => ({ ...prev, eventsLogged: [...prev.eventsLogged, '$pageview'] }));
        alert('Page view tracked');
      } else {
        alert('PostHog not loaded');
      }
    } catch (e: unknown) {
      alert(`Error: ${getErrorMessage(e)}`);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#020203', color: 'rgba(255,255,255,0.92)', padding: '48px 24px', fontFamily: 'var(--font-body, Outfit), sans-serif' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <a href="/debug" style={{ fontSize: 12, color: 'rgba(200,169,110,0.6)', textDecoration: 'none', fontFamily: 'var(--font-mono, DM Mono), monospace' }}>&larr; Back to Debug</a>
        <h1 style={{ fontSize: 32, fontWeight: 300, fontFamily: 'var(--font-display, Cormorant), serif', color: '#c8a96e', marginTop: 16, marginBottom: 8 }}>Analytics (PostHog) Debug</h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-mono, DM Mono), monospace', marginBottom: 32 }}>
          Test event tracking, session recording, and analytics configuration
        </p>

        {/* Configuration */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
          <div style={{ padding: '16px 20px', background: '#0d0d18', border: `1px solid ${state.posthogKey ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`, borderRadius: 8 }}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)', marginBottom: 6, fontFamily: 'var(--font-mono, DM Mono), monospace' }}>PostHog Key</div>
            <div style={{ fontSize: 14, color: state.posthogKey ? '#22c55e' : '#ef4444' }}>{state.posthogKey ? `${state.posthogKey.substring(0, 12)}...` : 'NOT SET'}</div>
          </div>
          <div style={{ padding: '16px 20px', background: '#0d0d18', border: `1px solid ${state.isLoaded ? 'rgba(34,197,94,0.2)' : 'rgba(234,179,8,0.2)'}`, borderRadius: 8 }}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)', marginBottom: 6, fontFamily: 'var(--font-mono, DM Mono), monospace' }}>SDK Loaded</div>
            <div style={{ fontSize: 14, color: state.isLoaded ? '#22c55e' : '#eab308' }}>{state.isLoaded ? 'Yes' : 'No (check key)'}</div>
          </div>
        </div>

        {/* Trackable events */}
        <div style={{ padding: '20px', background: '#0d0d18', border: '1px solid rgba(255,255,255,0.055)', borderRadius: 8, marginBottom: 24 }}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)', marginBottom: 12, fontFamily: 'var(--font-mono, DM Mono), monospace' }}>Available Tracking Functions (src/lib/analytics/posthog.ts)</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 6 }}>
            {[
              'identifyUser', 'trackVisitor', 'trackSignUp', 'trackLogin',
              'trackContentUpload', 'trackContentPurchase', 'trackPaymentSuccess',
              'trackPaymentFailure', 'trackCreatorEarnings', 'trackWithdrawalRequest',
              'trackReferralClick', 'trackSocialShare', 'trackButtonClick',
              'trackError', 'trackAdminAction',
            ].map(fn => (
              <div key={fn} style={{ fontSize: 12, fontFamily: 'var(--font-mono, DM Mono), monospace', color: 'rgba(200,169,110,0.5)', padding: '4px 8px', background: 'rgba(255,255,255,0.02)', borderRadius: 4 }}>
                {fn}
              </div>
            ))}
          </div>
        </div>

        {/* Test events */}
        <div style={{ padding: '20px', background: '#0d0d18', border: '1px solid rgba(255,255,255,0.055)', borderRadius: 8, marginBottom: 24 }}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)', marginBottom: 12, fontFamily: 'var(--font-mono, DM Mono), monospace' }}>Send Test Events</div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
            <input
              type="text"
              value={testEventName}
              onChange={e => setTestEventName(e.target.value)}
              placeholder="Event name"
              style={{
                flex: 1, padding: '10px 14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 6, color: 'rgba(255,255,255,0.9)', fontSize: 13, fontFamily: 'var(--font-mono, DM Mono), monospace', outline: 'none',
              }}
            />
            <button onClick={sendTestEvent} style={{ padding: '10px 20px', background: 'rgba(200,169,110,0.15)', border: '1px solid rgba(200,169,110,0.3)', borderRadius: 6, color: '#c8a96e', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-mono, DM Mono), monospace' }}>
              Send Event
            </button>
            <button onClick={trackPageView} style={{ padding: '10px 20px', background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 6, color: '#8b5cf6', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-mono, DM Mono), monospace' }}>
              Track Pageview
            </button>
          </div>
          {state.eventsLogged.length > 0 && (
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-mono, DM Mono), monospace' }}>
              Events sent: {state.eventsLogged.join(', ')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
