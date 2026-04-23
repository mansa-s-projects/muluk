'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Shield, AlertTriangle, RefreshCw, Activity, Zap, TrendingUp, Users, DollarSign, Radio } from 'lucide-react';
import Link from 'next/link';

// ─── Theme tokens (inlined from shared) ───────────────────────────────────────
const t = {
  void: '#060610',
  deep: '#0d0d18',
  rim: 'rgba(255,255,255,0.06)',
  rim2: 'rgba(255,255,255,0.09)',
  gold: '#c8a96e',
  goldDim: 'rgba(200,169,110,0.5)',
  goldGlow: 'rgba(200,169,110,0.08)',
  white: '#fff',
  dim: 'rgba(255,255,255,0.35)',
  muted: 'rgba(255,255,255,0.22)',
  faint: 'rgba(255,255,255,0.03)',
  green: '#22c55e',
  red: '#ef4444',
  redD: 'rgba(239,68,68,0.1)',
  sans: "var(--font-body, 'Outfit', sans-serif)",
  mono: "var(--font-mono, 'DM Mono', monospace)",
  serif: "var(--font-display, serif)",
};

// ─── Types (inlined from shared) ───────────────────────────────────────────────
interface PlatformStats {
  users: { totalFans: number; activeCreators: number; totalCreators: number; pendingApplications: number; onlineFans?: number };
  finances: { totalGMV: number; revenue30d: number; totalTransactions: number };
}

interface RealtimeEvent {
  id?: number;
  event_type: string;
  message?: string;
  severity: 'info' | 'warning' | 'critical';
  created_at: string;
}

// ─── Helpers (inlined from shared) ───────────────────────────────────────────
async function fetchJsonOrThrow<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function $f(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

// ─── Live event ticker ────────────────────────────────────────────────────────
function EventTicker({ events }: { events: RealtimeEvent[] }) {
  const recent = events.slice(0, 20);
  return (
    <div style={{ background: t.deep, border: `1px solid ${t.rim}`, borderRadius: 10, overflow: 'hidden' }}>
      <div style={{ padding: '14px 18px', borderBottom: `1px solid ${t.rim}`, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: t.green, boxShadow: `0 0 6px ${t.green}`, animation: 'livepulse 2s infinite', flexShrink: 0 }} />
        <span style={{ fontFamily: t.mono, fontSize: 10, color: t.goldDim, letterSpacing: '0.2em', textTransform: 'uppercase' }}>Live Event Stream</span>
      </div>
      <div style={{ maxHeight: 420, overflowY: 'auto' }}>
        {recent.length === 0 ? (
          <div style={{ padding: '32px 20px', textAlign: 'center', fontFamily: t.mono, fontSize: 10, color: t.dim }}>Awaiting events…</div>
        ) : recent.map((ev, i) => (
          <div key={i} style={{ padding: '12px 18px', borderBottom: `1px solid ${t.rim}`, display: 'flex', alignItems: 'flex-start', gap: 12, opacity: i > 10 ? 0.5 : 1 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: ev.severity === 'critical' ? t.red : ev.severity === 'warning' ? '#f59e0b' : t.gold, marginTop: 5, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: t.sans, fontSize: 12, color: t.white, marginBottom: 2 }}>{ev.message || ev.event_type}</div>
              <div style={{ fontFamily: t.mono, fontSize: 9, color: t.dim }}>{new Date(ev.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── KPI card ─────────────────────────────────────────────────────────────────
function KPI({ label, value, sub, icon: Icon, highlight }: { label: string; value: string; sub?: string; icon: React.ElementType; highlight?: boolean }) {
  return (
    <div style={{ background: t.deep, border: `1px solid ${highlight ? 'rgba(200,169,110,0.3)' : t.rim}`, borderRadius: 10, padding: '20px 22px', position: 'relative', overflow: 'hidden' }}>
      {highlight && <div style={{ position: 'absolute', inset: 0, background: t.goldGlow, pointerEvents: 'none' }} />}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, position: 'relative' }}>
        <Icon size={14} style={{ color: t.goldDim }} />
        <span style={{ fontFamily: t.mono, fontSize: 9, color: t.dim, letterSpacing: '0.18em', textTransform: 'uppercase' }}>{label}</span>
      </div>
      <div style={{ fontFamily: t.mono, fontSize: 26, color: t.gold, fontWeight: 500, lineHeight: 1, position: 'relative' }}>{value}</div>
      {sub && <div style={{ fontFamily: t.sans, fontSize: 11, color: t.dim, marginTop: 6, position: 'relative' }}>{sub}</div>}
    </div>
  );
}

// ─── Incident banner ──────────────────────────────────────────────────────────
function IncidentBanner({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <div style={{ background: t.redD, border: `1px solid ${t.red}44`, borderRadius: 8, padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
      <AlertTriangle size={16} style={{ color: t.red }} />
      <span style={{ fontFamily: t.mono, fontSize: 12, color: t.red, letterSpacing: '0.1em' }}>{count} ACTIVE INCIDENT{count > 1 ? 'S' : ''} — review Risk & Moderation</span>
      <Link href="/admin/applications" style={{ marginLeft: 'auto', fontFamily: t.mono, fontSize: 10, color: t.red, textDecoration: 'underline' }}>VIEW →</Link>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function AdminCommandCenter() {
  const supabase = createClient();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [events, setEvents] = useState<RealtimeEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const fetchStats = useCallback(async () => {
    try {
      const d = await fetchJsonOrThrow<{ success?: boolean; stats?: PlatformStats }>('/api/admin/stats?days=30');
      if (d.success && d.stats) setStats(d.stats);
    } catch {}
    setLoading(false);
    setLastRefresh(new Date());
  }, []);

  const fetchEvents = useCallback(async () => {
    try {
      const d = await fetchJsonOrThrow<{ events?: RealtimeEvent[] }>('/api/admin/activity?limit=50');
      setEvents(d.events || []);
    } catch {}
  }, []);

  useEffect(() => {
    fetchStats();
    fetchEvents();
    const interval = setInterval(fetchEvents, 15000);
    return () => clearInterval(interval);
  }, [fetchStats, fetchEvents]);

  useEffect(() => {
    const sub = supabase.channel('cc_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'admin_realtime_events' }, (payload) => {
        setEvents((prev) => [payload.new as RealtimeEvent, ...prev].slice(0, 50));
      })
      .subscribe();
    return () => { sub.unsubscribe(); };
  }, [supabase]);

  const incidents = events.filter((e) => e.severity === 'critical' || e.severity === 'warning').length;

  return (
    <div style={{ minHeight: '100vh', background: t.void, color: t.white, fontFamily: t.sans }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes livepulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(200,169,110,0.2); border-radius: 2px; }
      `}</style>

      {/* Header */}
      <header style={{ background: t.deep, borderBottom: `1px solid ${t.rim}`, padding: '16px 32px', display: 'flex', alignItems: 'center', gap: 16, position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ width: 32, height: 32, borderRadius: 7, background: `linear-gradient(135deg, ${t.gold}, ${t.goldDim})`, display: 'grid', placeItems: 'center' }}>
          <Shield size={15} style={{ color: '#0a0800' }} />
        </div>
        <div>
          <div style={{ fontFamily: t.serif, fontSize: 18, fontWeight: 300, color: t.white, lineHeight: 1.2 }}>Command Center</div>
          <div style={{ fontFamily: t.mono, fontSize: 9, color: t.goldDim, letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: 1 }}>Real-time Operations</div>
        </div>
        <nav style={{ display: 'flex', gap: 4, marginLeft: 32 }}>
          {[
            { label: 'Command Center', href: '/admin/command-center' },
            { label: 'Applications', href: '/admin/applications' },
          ].map((item) => (
            <Link key={item.href} href={item.href} style={{ fontFamily: t.mono, fontSize: 10, color: t.dim, letterSpacing: '0.1em', padding: '6px 12px', borderRadius: 6, border: `1px solid ${t.rim}`, textDecoration: 'none' }}>
              {item.label}
            </Link>
          ))}
        </nav>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontFamily: t.mono, fontSize: 9, color: t.dim }}>{lastRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
          <button onClick={() => { fetchStats(); fetchEvents(); }} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: t.faint, border: `1px solid ${t.rim}`, borderRadius: 6, color: t.muted, fontFamily: t.mono, fontSize: 10, cursor: 'pointer' }}>
            <RefreshCw size={11} /> REFRESH
          </button>
        </div>
      </header>

      <main style={{ padding: '32px', maxWidth: 1400, margin: '0 auto' }}>
        <IncidentBanner count={incidents} />

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh', flexDirection: 'column', gap: 12 }}>
            <div style={{ width: 24, height: 24, border: `3px solid ${t.gold}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <span style={{ fontFamily: t.mono, fontSize: 11, color: t.goldDim, letterSpacing: '0.2em' }}>LOADING OPERATIONS</span>
          </div>
        ) : (
          <>
            {/* KPI row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
              <KPI label="Total GMV" value={stats ? $f(stats.finances.totalGMV) : '—'} sub="all time" icon={DollarSign} highlight />
              <KPI label="Active Creators" value={stats ? String(stats.users.activeCreators) : '—'} sub={`of ${stats?.users.totalCreators ?? 0} total`} icon={Users} />
              <KPI label="Revenue 30d" value={stats ? $f(stats.finances.revenue30d) : '—'} sub="platform net" icon={TrendingUp} />
              <KPI label="Online Fans" value={stats ? String(stats.users.onlineFans ?? 0) : '—'} sub="right now" icon={Radio} />
            </div>

            {/* Secondary metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
              <KPI label="Total Fans" value={stats ? String(stats.users.totalFans) : '—'} sub="registered" icon={Users} />
              <KPI label="Pending Apps" value={stats ? String(stats.users.pendingApplications) : '—'} sub="awaiting review" icon={Activity} />
              <KPI label="Conversion" value={stats ? `${(stats.users.totalFans > 0 ? (stats.finances.totalTransactions / stats.users.totalFans) * 100 : 0).toFixed(1)}%` : '—'} sub="fan → paid" icon={Zap} />
            </div>

            {/* Event stream + quick links */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20 }}>
              <EventTicker events={events} />

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ fontFamily: t.mono, fontSize: 9, color: t.goldDim, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 4 }}>Quick Nav</div>
                {[
                  { label: 'Command Center', sub: 'Real-time operations', href: '/admin/command-center' },
                  { label: 'Applications', sub: 'Pending creator apps', href: '/admin/applications' },
                ].map((item) => (
                  <Link key={item.label} href={item.href} style={{ display: 'block', padding: '14px 16px', background: t.deep, border: `1px solid ${t.rim}`, borderRadius: 8, textDecoration: 'none', transition: 'border-color 0.15s' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(200,169,110,0.3)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = t.rim; }}
                  >
                    <div style={{ fontFamily: t.sans, fontSize: 13, color: t.white, fontWeight: 500 }}>{item.label}</div>
                    <div style={{ fontFamily: t.mono, fontSize: 9, color: t.dim, marginTop: 3 }}>{item.sub}</div>
                  </Link>
                ))}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
