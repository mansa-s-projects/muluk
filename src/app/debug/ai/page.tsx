'use client';
import { useState, useEffect } from 'react';

interface TestResult {
  route: string;
  method: string;
  status: 'pending' | 'running' | 'ok' | 'error';
  response?: string;
  elapsed?: number;
  error?: string;
}

type RouteResponse = {
  success?: boolean;
  error?: string;
  analysis?: { niche?: string };
  recommendation?: { optimalPrice?: string };
  brief?: { mood?: string };
  personas?: Record<string, unknown>;
  savedToCalendar?: number;
  voice?: { name?: string; voice_id?: string };
};

const getErrorMessage = (err: unknown): string => {
  if (err instanceof Error) return err.message;
  return 'Unknown error';
};

const AI_ROUTES: TestResult[] = [
  { route: '/api/ai/ghostwrite', method: 'POST', status: 'pending' },
  { route: '/api/ai/onboarding/analyze', method: 'POST', status: 'pending' },
  { route: '/api/ai/monetization/dynamic-pricing', method: 'POST', status: 'pending' },
  { route: '/api/ai/copilot/daily-brief', method: 'GET', status: 'pending' },
  { route: '/api/ai/fans/personas', method: 'GET', status: 'pending' },
  { route: '/api/ai/content/ideas', method: 'POST', status: 'pending' },
  { route: '/api/ai/voice/clone', method: 'POST', status: 'pending' },
  { route: '/api/ai/voice/tts', method: 'POST', status: 'pending' },
];

const ROUTE_CONFIGS = {
  '/api/ai/ghostwrite': {
    body: { prompt: 'Write a test sentence about CIPHER platform.', tier: 'balanced' },
    parse: (r: RouteResponse) => r.success ? 'Response received' : r.error,
  },
  '/api/ai/onboarding/analyze': {
    body: {
      interests: ['luxury', 'fashion'],
      contentTypes: ['photos', 'videos'],
      experience: 'beginner',
      currentPlatforms: ['instagram'],
      followerCounts: { instagram: 10000 },
      goals: ['monetize', 'grow'],
    },
    parse: (r: RouteResponse) => r.success ? `Niche: ${r.analysis?.niche}` : r.error,
  },
  '/api/ai/monetization/dynamic-pricing': {
    body: { contentType: 'unlock', contentQuality: 'standard', exclusivity: 'standard' },
    parse: (r: RouteResponse) => r.success ? `Price: ${r.recommendation?.optimalPrice}` : r.error,
  },
  '/api/ai/copilot/daily-brief': {
    body: null,
    parse: (r: RouteResponse) => r.success ? `Mood: ${r.brief?.mood}` : r.error,
  },
  '/api/ai/fans/personas': {
    body: null,
    parse: (r: RouteResponse) => r.success ? `Personas: ${Object.keys(r.personas || {}).join(', ')}` : r.error,
  },
  '/api/ai/content/ideas': {
    body: { count: 3, contentPillars: ['lifestyle'], trendingTopics: ['fashion'] },
    parse: (r: RouteResponse) => r.success ? `Ideas: ${r.savedToCalendar} saved` : r.error,
  },
  '/api/ai/voice/clone': {
    body: null,
    parse: (r: RouteResponse) => r.success ? `Voice cloned: ${r.voice?.name}` : r.error,
  },
  '/api/ai/voice/tts': {
    body: { text: 'Hello from CIPHER', voiceId: 'rachel' },
    parse: (r: RouteResponse) => r.success ? 'Audio generated' : r.error,
  },
};

export default function DebugAi() {
  const [tests, setTests] = useState<TestResult[]>(AI_ROUTES);
  const [envStatus, setEnvStatus] = useState<{openrouter?: boolean; openai?: boolean}>({});

  useEffect(() => {
    checkEnvStatus();
  }, []);

  const checkEnvStatus = async () => {
    try {
      const res = await fetch('/debug/api?check=env');
      const data = await res.json();
      setEnvStatus(data.env);
    } catch (e) {
      console.error('Failed to check env:', e);
    }
  };

  const testRoute = async (index: number) => {
    const route = tests[index];
    const start = performance.now();
    
    setTests(prev => {
      const next = [...prev];
      next[index] = { ...next[index], status: 'running', response: '' };
      return next;
    });

    try {
      const config = ROUTE_CONFIGS[route.route as keyof typeof ROUTE_CONFIGS];
      const options: RequestInit = {
        method: route.method,
        headers: { 'Content-Type': 'application/json' },
      };

      if (route.method === 'POST' && config?.body) {
        options.body = JSON.stringify(config.body);
      }

      const resp = await fetch(route.route, options);
      const elapsed = Math.round(performance.now() - start);

      if (resp.status === 401) {
        setTests(prev => {
          const next = [...prev];
          next[index] = { ...next[index], status: 'error', elapsed, error: 'Unauthorized (need login)' };
          return next;
        });
        return;
      }

      const data = (await resp.json().catch(() => ({}))) as RouteResponse;

      setTests(prev => {
        const next = [...prev];
        next[index] = {
          ...next[index],
          status: resp.ok ? 'ok' : 'error',
          elapsed,
          response: config?.parse(data) || JSON.stringify(data).slice(0, 200),
          error: !resp.ok ? data.error || `HTTP ${resp.status}` : undefined,
        };
        return next;
      });
    } catch (e: unknown) {
      setTests(prev => {
        const next = [...prev];
        next[index] = { ...next[index], status: 'error', error: getErrorMessage(e), elapsed: Math.round(performance.now() - start) };
        return next;
      });
    }
  };

  const testAll = async () => {
    for (let i = 0; i < tests.length; i++) {
      await testRoute(i);
      await new Promise(r => setTimeout(r, 500));
    }
  };

  const pendingCount = tests.filter(t => t.status === 'pending').length;
  const runningCount = tests.filter(t => t.status === 'running').length;
  const okCount = tests.filter(t => t.status === 'ok').length;
  const errorCount = tests.filter(t => t.status === 'error').length;

  return (
    <div style={{ minHeight: '100vh', background: '#020203', color: 'rgba(255,255,255,0.92)', padding: '48px 24px', fontFamily: 'var(--font-body, Outfit), sans-serif' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <a href="/debug" style={{ fontSize: 12, color: 'rgba(200,169,110,0.6)', textDecoration: 'none', fontFamily: 'var(--font-mono, DM Mono), monospace' }}>&larr; Back to Debug</a>
        <h1 style={{ fontSize: 32, fontWeight: 300, fontFamily: 'var(--font-display, Cormorant), serif', color: '#c8a96e', marginTop: 16, marginBottom: 8 }}>AI Routes Debug</h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-mono, DM Mono), monospace', marginBottom: 24 }}>
          Test all AI endpoints (requires authentication)
        </p>

        <div style={{ display: 'flex', gap: 12, marginBottom: 24, alignItems: 'center' }}>
          <button 
            onClick={testAll} 
            disabled={runningCount > 0}
            style={{ 
              padding: '10px 20px', 
              background: 'rgba(200,169,110,0.15)', 
              border: '1px solid rgba(200,169,110,0.3)', 
              borderRadius: 6, 
              color: '#c8a96e', 
              fontSize: 13, 
              cursor: runningCount > 0 ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font-mono, DM Mono), monospace',
              opacity: runningCount > 0 ? 0.5 : 1,
            }}
          >
            Test All Routes
          </button>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-mono, DM Mono), monospace' }}>
            {pendingCount > 0 && `Pending: ${pendingCount}`}
            {runningCount > 0 && ` | Running: ${runningCount}`}
            {okCount > 0 && ` | OK: ${okCount}`}
            {errorCount > 0 && ` | Errors: ${errorCount}`}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {tests.map((test, i) => (
            <div key={test.route} style={{
              padding: '16px 20px', 
              background: '#0d0d18',
              border: `1px solid ${test.status === 'ok' ? 'rgba(34,197,94,0.2)' : test.status === 'error' ? 'rgba(239,68,68,0.2)' : test.status === 'running' ? 'rgba(234,179,8,0.2)' : 'rgba(255,255,255,0.055)'}`,
              borderRadius: 8,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ 
                    fontSize: 10, 
                    padding: '2px 6px', 
                    background: test.method === 'GET' ? 'rgba(59,130,246,0.2)' : 'rgba(168,85,247,0.2)',
                    color: test.method === 'GET' ? '#60a5fa' : '#c084fc',
                    borderRadius: 4,
                    fontFamily: 'var(--font-mono, DM Mono), monospace',
                  }}>
                    {test.method}
                  </span>
                  <span style={{ fontSize: 13, fontFamily: 'var(--font-mono, DM Mono), monospace', color: 'rgba(255,255,255,0.8)' }}>
                    {test.route}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {test.elapsed !== undefined && (
                    <span style={{ fontSize: 11, color: 'rgba(200,169,110,0.5)', fontFamily: 'var(--font-mono, DM Mono), monospace' }}>
                      {test.elapsed}ms
                    </span>
                  )}
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: test.status === 'ok' ? '#22c55e' : test.status === 'error' ? '#ef4444' : test.status === 'running' ? '#eab308' : 'rgba(255,255,255,0.2)',
                    boxShadow: test.status === 'running' ? '0 0 6px rgba(234,179,8,0.5)' : 'none',
                  }} />
                  <button 
                    onClick={() => testRoute(i)}
                    disabled={test.status === 'running'}
                    style={{
                      padding: '4px 10px', 
                      background: 'rgba(200,169,110,0.1)', 
                      border: '1px solid rgba(200,169,110,0.2)',
                      borderRadius: 4, 
                      color: '#c8a96e', 
                      fontSize: 11, 
                      cursor: test.status === 'running' ? 'not-allowed' : 'pointer',
                      fontFamily: 'var(--font-mono, DM Mono), monospace',
                      opacity: test.status === 'running' ? 0.5 : 1,
                    }}
                  >
                    {test.status === 'running' ? 'Running...' : test.status === 'pending' ? 'Test' : 'Retry'}
                  </button>
                </div>
              </div>
              {(test.response || test.error) && (
                <div style={{
                  marginTop: 12,
                  padding: '10px 14px', 
                  background: test.status === 'error' ? 'rgba(239,68,68,0.05)' : 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.04)', 
                  borderRadius: 6,
                  fontSize: 12, 
                  color: test.status === 'error' ? '#ef4444' : 'rgba(255,255,255,0.6)',
                  fontFamily: 'var(--font-mono, DM Mono), monospace',
                }}>
                  {test.error ? `Error: ${test.error}` : test.response}
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={{ marginTop: 32, padding: '16px 20px', background: '#0d0d18', borderRadius: 8, border: '1px solid rgba(255,255,255,0.055)' }}>
          <h3 style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.7)', marginBottom: 12, fontFamily: 'var(--font-mono, DM Mono), monospace' }}>
            AI Router Configuration
          </h3>
          <div style={{ fontSize: 12, fontFamily: 'var(--font-mono, DM Mono), monospace', color: 'rgba(255,255,255,0.5)' }}>
            <p style={{ marginBottom: 8 }}>OpenRouter: <span style={{ color: envStatus.openrouter ? '#22c55e' : '#ef4444' }}>{envStatus.openrouter ? '✓ Configured' : '✗ Missing'}</span></p>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <div><span style={{ color: '#60a5fa' }}>fast:</span> gpt-4o-mini</div>
              <div><span style={{ color: '#c084fc' }}>balanced:</span> gemini-flash-1.5</div>
              <div><span style={{ color: '#c8a96e' }}>premium:</span> claude-3.5-sonnet</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}