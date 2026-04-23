'use client';
import { useEffect, useState } from 'react';

interface HealthCheck {
  name: string;
  status: 'ok' | 'warn' | 'error';
  message: string;
  latency: number | null;
}

export default function DebugHealth() {
  const [checks, setChecks] = useState<HealthCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRun, setLastRun] = useState('');

  useEffect(() => {
    runHealthChecks();
  }, []);

  const runHealthChecks = async () => {
    const results: HealthCheck[] = [];

    // 1. Next.js App
    const appStart = performance.now();
    results.push({
      name: 'Next.js Application',
      status: 'ok',
      message: `Running in ${process.env.NODE_ENV || 'unknown'} mode`,
      latency: Math.round(performance.now() - appStart),
    });

    // 2. Supabase
    const supaStart = performance.now();
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      if (supabaseUrl) {
        const resp = await fetch(`${supabaseUrl}/rest/v1/`, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
        results.push({
          name: 'Supabase Connection',
          status: resp.ok || resp.status === 200 || resp.status === 401 ? 'ok' : 'warn',
          message: `HTTP ${resp.status}`,
          latency: Math.round(performance.now() - supaStart),
        });
      } else {
        results.push({ name: 'Supabase Connection', status: 'error', message: 'URL not configured', latency: null });
      }
    } catch (e: any) {
      results.push({ name: 'Supabase Connection', status: 'error', message: e.message, latency: Math.round(performance.now() - supaStart) });
    }

    // 3. Auth
    const authStart = performance.now();
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { error } = await supabase.auth.getSession();
      results.push({
        name: 'Auth Service',
        status: error ? 'warn' : 'ok',
        message: error ? error.message : 'Session check passed',
        latency: Math.round(performance.now() - authStart),
      });
    } catch (e: any) {
      results.push({ name: 'Auth Service', status: 'error', message: e.message, latency: Math.round(performance.now() - authStart) });
    }

    // 4. JavaScript execution
    const jsStart = performance.now();
    try {
      const testArray = Array.from({ length: 10000 }, (_, i) => i * Math.random());
      testArray.sort((a, b) => a - b);
      results.push({
        name: 'JS Execution',
        status: 'ok',
        message: `10k ops: ${Math.round(performance.now() - jsStart)}ms`,
        latency: Math.round(performance.now() - jsStart),
      });
    } catch (e: any) {
      results.push({ name: 'JS Execution', status: 'error', message: e.message, latency: null });
    }

    // 5. Memory (if available)
    try {
      const mem = (performance as any).memory;
      if (mem) {
        const usedMB = Math.round(mem.usedJSHeapSize / 1048576);
        const totalMB = Math.round(mem.totalJSHeapSize / 1048576);
        results.push({
          name: 'Memory Usage',
          status: usedMB > 100 ? 'warn' : 'ok',
          message: `${usedMB}MB / ${totalMB}MB`,
          latency: null,
        });
      } else {
        results.push({ name: 'Memory Usage', status: 'ok', message: 'Not available (non-Chrome)', latency: null });
      }
    } catch {
      results.push({ name: 'Memory Usage', status: 'ok', message: 'Not available', latency: null });
    }

    // 6. Window/Navigator
    results.push({
      name: 'Browser',
      status: 'ok',
      message: `${navigator.userAgent.split(' ').slice(-2).join(' ')}`,
      latency: null,
    });

    // 7. Viewport
    results.push({
      name: 'Viewport',
      status: 'ok',
      message: `${window.innerWidth}x${window.innerHeight} @${window.devicePixelRatio}x`,
      latency: null,
    });

    // 8. Online status
    results.push({
      name: 'Network',
      status: navigator.onLine ? 'ok' : 'error',
      message: navigator.onLine ? 'Online' : 'Offline',
      latency: null,
    });

    setChecks(results);
    setLastRun(new Date().toISOString());
    setLoading(false);
  };

  const okCount = checks.filter(c => c.status === 'ok').length;
  const warnCount = checks.filter(c => c.status === 'warn').length;
  const errorCount = checks.filter(c => c.status === 'error').length;
  const overallStatus = errorCount > 0 ? 'ERROR' : warnCount > 0 ? 'WARNING' : 'HEALTHY';

  return (
    <div style={{ minHeight: '100vh', background: '#020203', color: 'rgba(255,255,255,0.92)', padding: '48px 24px', fontFamily: 'var(--font-body, Outfit), sans-serif' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <a href="/debug" style={{ fontSize: 12, color: 'rgba(200,169,110,0.6)', textDecoration: 'none', fontFamily: 'var(--font-mono, DM Mono), monospace' }}>&larr; Back to Debug</a>
        <h1 style={{ fontSize: 32, fontWeight: 300, fontFamily: 'var(--font-display, Cormorant), serif', color: '#c8a96e', marginTop: 16, marginBottom: 8 }}>System Health</h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-mono, DM Mono), monospace', marginBottom: 32 }}>
          Overall system health, uptime, and performance diagnostics
        </p>

        {/* Overall status */}
        <div style={{
          padding: '24px', marginBottom: 24, borderRadius: 8, textAlign: 'center',
          background: overallStatus === 'HEALTHY' ? 'rgba(34,197,94,0.08)' : overallStatus === 'WARNING' ? 'rgba(234,179,8,0.08)' : 'rgba(239,68,68,0.08)',
          border: `1px solid ${overallStatus === 'HEALTHY' ? 'rgba(34,197,94,0.2)' : overallStatus === 'WARNING' ? 'rgba(234,179,8,0.2)' : 'rgba(239,68,68,0.2)'}`,
        }}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.3)', marginBottom: 8, fontFamily: 'var(--font-mono, DM Mono), monospace' }}>System Status</div>
          <div style={{
            fontSize: 28, fontWeight: 300, fontFamily: 'var(--font-display, Cormorant), serif',
            color: overallStatus === 'HEALTHY' ? '#22c55e' : overallStatus === 'WARNING' ? '#eab308' : '#ef4444',
          }}>
            {overallStatus}
          </div>
          {lastRun && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--font-mono, DM Mono), monospace', marginTop: 8 }}>Last check: {lastRun}</div>}
        </div>

        {/* Counters */}
        {!loading && (
          <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
            <div style={{ padding: '12px 20px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 6, fontSize: 14, color: '#22c55e' }}>{okCount} OK</div>
            <div style={{ padding: '12px 20px', background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.2)', borderRadius: 6, fontSize: 14, color: '#eab308' }}>{warnCount} WARN</div>
            <div style={{ padding: '12px 20px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, fontSize: 14, color: '#ef4444' }}>{errorCount} ERROR</div>
          </div>
        )}

        <button onClick={runHealthChecks} disabled={loading} style={{
          padding: '10px 20px', background: 'rgba(200,169,110,0.15)', border: '1px solid rgba(200,169,110,0.3)',
          borderRadius: 6, color: '#c8a96e', fontSize: 13, cursor: loading ? 'wait' : 'pointer',
          fontFamily: 'var(--font-mono, DM Mono), monospace', marginBottom: 24,
        }}>
          {loading ? 'Running...' : 'Run Health Checks'}
        </button>

        {/* Check results */}
        {checks.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {checks.map((c, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                background: '#0d0d18', border: '1px solid rgba(255,255,255,0.055)', borderRadius: 6,
              }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                  background: c.status === 'ok' ? '#22c55e' : c.status === 'warn' ? '#eab308' : '#ef4444',
                  boxShadow: c.status === 'ok' ? '0 0 6px rgba(34,197,94,0.5)' : c.status === 'warn' ? '0 0 6px rgba(234,179,8,0.5)' : '0 0 6px rgba(239,68,68,0.5)',
                }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.85)' }}>{c.name}</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-mono, DM Mono), monospace', marginTop: 2 }}>{c.message}</div>
                </div>
                {c.latency !== null && (
                  <div style={{ fontSize: 11, color: 'rgba(200,169,110,0.5)', fontFamily: 'var(--font-mono, DM Mono), monospace' }}>{c.latency}ms</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
