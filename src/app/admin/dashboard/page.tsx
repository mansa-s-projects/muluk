'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { LayoutDashboard, Users, BarChart2, Shield, AlertTriangle, RefreshCw, Crosshair, Target, Brain, Radio, MessageSquare, ClipboardList } from 'lucide-react';
import { System, PlatformStats, RealtimeEvent, t, ActionModal, fetchJsonOrThrow, $f } from '@/components/admin/shared';

// Import newly refactored systems
import { OverviewSystem } from '@/components/admin/overview/OverviewSystem';
import { CreatorIntelligenceSystem } from '@/components/admin/creators/CreatorIntelligenceSystem';
import { CreatorsTableSystem } from '@/components/admin/creators/CreatorsTableSystem';
import { RevenueIntelligenceSystem } from '@/components/admin/revenue/RevenueIntelligenceSystem';
import { RiskModerationSystem } from '@/components/admin/risk/RiskModerationSystem';
import { AuditLogsSystem } from '@/components/admin/risk/AuditLogsSystem';
import { GrowthFunnelSystem } from '@/components/admin/growth/GrowthFunnelSystem';
import { SubscribedFansSystem } from '@/components/admin/community/SubscribedFansSystem';
import { SystemMessagesSystem } from '@/components/admin/community/SystemMessagesSystem';

const NAV_ITEMS = [
  { id: 'overview' as System, label: 'Command Center', sub: 'Live Overview', Icon: LayoutDashboard },
  { id: 'creator-intel' as System, label: 'Creator Intel', sub: 'Scores & Signals', Icon: Brain },
  { id: 'creators' as System, label: 'All Creators', sub: 'Table & Actions', Icon: Users },
  { id: 'fans' as System, label: 'Subscribed Fans', sub: 'Online Status', Icon: Radio },
  { id: 'revenue-intel' as System, label: 'Revenue Intel', sub: 'Attribution & Leaks', Icon: BarChart2 },
  { id: 'risk' as System, label: 'Risk & Moderation', sub: 'Fraud & Anomalies', Icon: Crosshair },
  { id: 'funnel' as System, label: 'Growth Funnel', sub: 'PostHog & Automation', Icon: Target },
  { id: 'messages' as System, label: 'Messages', sub: 'Broadcast & History', Icon: MessageSquare },
  { id: 'audit' as System, label: 'Audit Logs', sub: 'Admin Actions', Icon: ClipboardList },
];

function Sidebar({ active, onNav, incidentCount }: { active: System; onNav: (s: System) => void; incidentCount: number }) {
  return (
    <aside style={{ width: 220, background: t.deep, borderRight: `1px solid ${t.rim}`, display: 'flex', flexDirection: 'column', height: '100vh', position: 'sticky', top: 0, flexShrink: 0 }}>
      <div style={{ padding: '24px 20px 20px', borderBottom: `1px solid ${t.rim}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 7, background: `linear-gradient(135deg, ${t.gold}, ${t.goldDim})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield size={15} style={{ color: '#0a0800' }} />
          </div>
          <div>
            <div style={{ fontFamily: t.serif, fontSize: 16, letterSpacing: '0.1em', color: t.gold, fontWeight: 300 }}>MULUK</div>
            <div style={{ fontFamily: t.mono, fontSize: 8, letterSpacing: '0.25em', color: t.goldDim, textTransform: 'uppercase' }}>God Mode</div>
          </div>
        </div>
      </div>
      <nav style={{ flex: 1, padding: '16px 10px', overflowY: 'auto' }}>
        {NAV_ITEMS.map((item) => {
          const isActive = active === item.id;
          return (
            <button key={item.id} onClick={() => onNav(item.id)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 7, marginBottom: 3, background: isActive ? t.goldGlow : 'transparent', border: `1px solid ${isActive ? 'rgba(200,169,110,0.2)' : 'transparent'}`, cursor: 'pointer', textAlign: 'left', position: 'relative' }}>
              <item.Icon size={14} style={{ color: isActive ? t.gold : t.dim, flexShrink: 0 }} />
              <div>
                <div style={{ fontFamily: t.sans, fontSize: 12, fontWeight: 500, color: isActive ? t.gold : t.muted, lineHeight: 1.2 }}>{item.label}</div>
                <div style={{ fontFamily: t.mono, fontSize: 9, color: isActive ? t.goldDim : t.faint, letterSpacing: '0.08em', marginTop: 1 }}>{item.sub}</div>
              </div>
              {item.id === 'risk' && incidentCount > 0 && <span style={{ position: 'absolute', top: 6, right: 6, width: 6, height: 6, borderRadius: '50%', background: t.red, boxShadow: `0 0 4px ${t.red}` }} />}
            </button>
          );
        })}
      </nav>
      <div style={{ padding: '14px 16px', borderTop: `1px solid ${t.rim}`, display: 'flex', alignItems: 'center', gap: 7 }}>
        <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: t.green, boxShadow: `0 0 5px ${t.green}`, animation: 'livepulse 2s infinite' }} />
        <span style={{ fontFamily: t.mono, fontSize: 9, color: t.dim, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Systems Nominal</span>
      </div>
    </aside>
  );
}

export default function AdminDashboard() {
  const supabase = createClient();
  const [system, setSystem] = useState<System>('overview');
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [events, setEvents] = useState<RealtimeEvent[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [actionModal, setActionModal] = useState<any>(null);

  const fetchStats = useCallback(async () => {
    try { const d = await fetchJsonOrThrow<{ success?: boolean; stats?: PlatformStats }>('/api/admin/stats?days=30'); if (d.success && d.stats) setStats(d.stats); } catch {}
    setStatsLoading(false); setLastRefresh(new Date());
  }, []);

  const fetchEvents = useCallback(async () => {
    try { const d = await fetchJsonOrThrow<{ events?: RealtimeEvent[] }>('/api/admin/activity?limit=100'); setEvents(d.events || []); } catch {}
  }, []);

  useEffect(() => {
    fetchStats(); fetchEvents();
    const interval = setInterval(fetchEvents, 30000);
    return () => clearInterval(interval);
  }, [fetchStats, fetchEvents]);

  useEffect(() => {
    const sub = supabase.channel('dashboard_realtime').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'admin_realtime_events' }, payload => {
      setEvents(prev => [payload.new as RealtimeEvent, ...prev].slice(0, 100));
    }).subscribe();
    return () => { sub.unsubscribe(); };
  }, [supabase]);

  const incidentCount = events.filter(e => e.severity === 'critical' || e.severity === 'warning').length;
  const currentNav = NAV_ITEMS.find(n => n.id === system)!;

  return (
    <div style={{ display: 'flex', height: '100vh', background: t.void, color: t.white, fontFamily: t.sans, overflow: 'hidden' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes livepulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(200,169,110,0.2); border-radius: 2px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(200,169,110,0.4); }
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Outfit:wght@300;400;500;600&family=DM+Mono:wght@300;400;500&display=swap');
      `}</style>
      <Sidebar active={system} onNav={setSystem} incidentCount={incidentCount} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <header style={{ background: t.deep, borderBottom: `1px solid ${t.rim}`, padding: '14px 28px', display: 'flex', alignItems: 'center', gap: 20, flexShrink: 0 }}>
          <div>
            <h1 style={{ fontFamily: t.serif, fontSize: 22, fontWeight: 300, color: t.white, margin: 0, lineHeight: 1.2 }}>{currentNav?.label}</h1>
            <div style={{ fontFamily: t.mono, fontSize: 9, letterSpacing: '0.2em', color: t.goldDim, textTransform: 'uppercase', marginTop: 2 }}>{currentNav?.sub}</div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
            {stats && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px', background: t.goldGlow, border: `1px solid rgba(200,169,110,0.2)`, borderRadius: 6 }}>
                <span style={{ fontFamily: t.mono, fontSize: 10, color: t.goldDim }}>GMV</span>
                <span style={{ fontFamily: t.mono, fontSize: 13, color: t.gold, fontWeight: 500 }}>{$f(stats.finances.totalGMV)}</span>
              </div>
            )}
            {incidentCount > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 14px', background: t.redD, border: `1px solid ${t.red}33`, borderRadius: 6 }}>
                <AlertTriangle size={12} style={{ color: t.red }} />
                <span style={{ fontFamily: t.mono, fontSize: 10, color: t.red }}>{incidentCount} incidents</span>
              </div>
            )}
            <button onClick={() => { fetchStats(); fetchEvents(); }} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: t.faint, border: `1px solid ${t.rim}`, borderRadius: 6, color: t.muted, fontFamily: t.mono, fontSize: 10, letterSpacing: '0.12em', cursor: 'pointer' }}>
              <RefreshCw size={11} /> REFRESH
            </button>
            <span style={{ fontFamily: t.mono, fontSize: 9, color: t.dim }}>{lastRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </header>
        <main style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
          {statsLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 12 }}>
              <div style={{ width: 24, height: 24, border: `3px solid ${t.gold}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              <span style={{ fontFamily: t.mono, fontSize: 11, color: t.goldDim, letterSpacing: '0.2em' }}>LOADING DASHBOARD</span>
            </div>
          ) : (
            <>
              {system === 'overview' && <OverviewSystem stats={stats} events={events} onAction={setActionModal} />}
              {system === 'creator-intel' && <CreatorIntelligenceSystem onAction={setActionModal} />}
              {system === 'revenue-intel' && <RevenueIntelligenceSystem stats={stats} />}
              {system === 'risk' && <RiskModerationSystem events={events} onAction={setActionModal} />}
              {system === 'funnel' && <GrowthFunnelSystem stats={stats} />}
              {system === 'creators' && <CreatorsTableSystem onAction={setActionModal} />}
              {system === 'fans' && <SubscribedFansSystem />}
              {system === 'messages' && <SystemMessagesSystem />}
              {system === 'audit' && <AuditLogsSystem />}
            </>
          )}
        </main>
      </div>
      {actionModal && <ActionModal modal={actionModal} onClose={() => setActionModal(null)} onSuccess={() => { fetchStats(); fetchEvents(); }} />}
    </div>
  );
}
