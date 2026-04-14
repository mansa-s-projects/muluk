import React from 'react';
import { ArrowUpRight, ArrowDownRight, AlertTriangle, Radio } from 'lucide-react';
import { PlatformStats, RealtimeEvent, t, numf, $f, ago, Card, SectionLabel, Spinner, GMVTicker, Pill, SeverityDot } from '../shared';

export function OverviewSystem({ stats, events, onAction }: { stats: PlatformStats | null; events: RealtimeEvent[]; onAction: (m: any) => void }) {
  if (!stats) return <Spinner />;
  const incidents = events.filter(e => e.severity === 'critical' || e.severity === 'warning').slice(0, 8);
  const liveActivity = events.slice(0, 20);
  const revenuePoints = [0.3, 0.5, 0.4, 0.7, 0.6, 0.8, 0.75, 0.9, 1.0].map(x => Math.round(x * stats.finances.periodGMV / 9));
  const healthBreakdown = [
    { label: 'Emperor Tier', count: stats.users.tierDistribution.apex, color: t.purple, pct: Math.round((stats.users.tierDistribution.apex / Math.max(stats.users.totalCreators, 1)) * 100) },
    { label: 'King Tier', count: stats.users.tierDistribution.legend, color: t.blue, pct: Math.round((stats.users.tierDistribution.legend / Math.max(stats.users.totalCreators, 1)) * 100) },
    { label: 'Prince Tier', count: stats.users.tierDistribution.cipher, color: t.gold, pct: Math.round((stats.users.tierDistribution.cipher / Math.max(stats.users.totalCreators, 1)) * 100) },
    { label: 'Pending', count: stats.users.pendingApplications, color: t.amber, pct: Math.round((stats.users.pendingApplications / Math.max(stats.users.totalCreators, 1)) * 100) },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16 }}>
        <Card style={{ background: `linear-gradient(135deg, ${t.card} 0%, ${t.goldFaint} 100%)`, border: `1px solid rgba(200,169,110,0.18)` }}>
          <SectionLabel>Live GMV</SectionLabel>
          <GMVTicker value={stats.finances.totalGMV} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
            <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: t.green, boxShadow: `0 0 6px ${t.green}`, animation: 'livepulse 2s infinite' }} />
            <span style={{ fontFamily: t.mono, fontSize: 10, color: t.muted }}>LIVE PLATFORM REVENUE</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
            {stats.finances.gmvGrowth >= 0 ? <ArrowUpRight size={13} style={{ color: t.green }} /> : <ArrowDownRight size={13} style={{ color: t.red }} />}
            <span style={{ fontFamily: t.mono, fontSize: 11, color: stats.finances.gmvGrowth >= 0 ? t.green : t.red }}>{Math.abs(stats.finances.gmvGrowth).toFixed(1)}%</span>
            <span style={{ fontFamily: t.mono, fontSize: 10, color: t.dim }}>vs prev period</span>
          </div>
        </Card>
        <Card>
          <SectionLabel>Creators</SectionLabel>
          <div style={{ fontFamily: t.serif, fontSize: 38, fontWeight: 300, color: t.white, lineHeight: 1 }}>{numf(stats.users.totalCreators)}</div>
          <div style={{ fontFamily: t.mono, fontSize: 11, color: t.muted, marginTop: 8 }}>{stats.users.approvedCreators} approved · <span style={{ color: t.amber }}>{stats.users.pendingApplications} pending</span></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
            {stats.users.creatorGrowth >= 0 ? <ArrowUpRight size={13} style={{ color: t.green }} /> : <ArrowDownRight size={13} style={{ color: t.red }} />}
            <span style={{ fontFamily: t.mono, fontSize: 11, color: stats.users.creatorGrowth >= 0 ? t.green : t.red }}>{Math.abs(stats.users.creatorGrowth).toFixed(1)}%</span>
          </div>
        </Card>
        <Card>
          <SectionLabel>Fans</SectionLabel>
          <div style={{ fontFamily: t.serif, fontSize: 38, fontWeight: 300, color: t.white, lineHeight: 1 }}>{numf(stats.users.totalFans)}</div>
          <div style={{ fontFamily: t.mono, fontSize: 11, color: t.muted, marginTop: 8 }}>{stats.users.newFansThisPeriod} new this period</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
            {stats.users.fanGrowth >= 0 ? <ArrowUpRight size={13} style={{ color: t.green }} /> : <ArrowDownRight size={13} style={{ color: t.red }} />}
            <span style={{ fontFamily: t.mono, fontSize: 11, color: stats.users.fanGrowth >= 0 ? t.green : t.red }}>{Math.abs(stats.users.fanGrowth).toFixed(1)}%</span>
          </div>
        </Card>
        <Card>
          <SectionLabel>Platform Fees</SectionLabel>
          <div style={{ fontFamily: t.serif, fontSize: 38, fontWeight: 300, color: t.green, lineHeight: 1 }}>{$f(stats.finances.totalPlatformFees)}</div>
          <div style={{ fontFamily: t.mono, fontSize: 11, color: t.muted, marginTop: 8 }}>{stats.finances.totalTransactions} total transactions</div>
          <div style={{ fontFamily: t.mono, fontSize: 11, color: t.dim, marginTop: 4 }}>avg {$f(stats.finances.averageTransactionValue)} per sale</div>
        </Card>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>
        <Card>
          <SectionLabel>Revenue Trend — {stats.period.days}D</SectionLabel>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 64 }}>
            {revenuePoints.map((v, i) => { const max = Math.max(...revenuePoints, 1); const h = Math.max((v / max) * 60, 3); const isLast = i === revenuePoints.length - 1; return <div key={i} style={{ flex: 1, height: `${h}px`, borderRadius: '2px 2px 0 0', background: isLast ? t.gold : `rgba(200,169,110,${0.15 + (i / revenuePoints.length) * 0.4})`, transition: 'height 0.5s ease' }} />; })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontFamily: t.mono, fontSize: 10, color: t.dim }}>
            <span>{new Date(stats.period.since).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
            <span style={{ color: t.gold }}>{$f(stats.finances.periodGMV)} this period</span>
            <span>Today</span>
          </div>
        </Card>
        <Card>
          <SectionLabel>Creator Health Distribution</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {healthBreakdown.map(row => (
              <div key={row.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontFamily: t.sans, fontSize: 12, color: t.muted }}>{row.label}</span>
                  <span style={{ fontFamily: t.mono, fontSize: 11, color: row.color }}>{row.count}</span>
                </div>
                <div style={{ height: 4, background: t.faint, borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ width: `${row.pct}%`, height: '100%', background: row.color, borderRadius: 2 }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 16 }}>
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: `1px solid ${t.rim}`, display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={13} style={{ color: t.red }} />
            <span style={{ fontFamily: t.mono, fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: t.muted }}>Active Incidents</span>
            {incidents.length > 0 && <span style={{ marginLeft: 'auto', fontFamily: t.mono, fontSize: 10, color: t.red, background: t.redD, padding: '2px 7px', borderRadius: 10 }}>{incidents.length}</span>}
          </div>
          <div style={{ maxHeight: 320, overflowY: 'auto' }}>
            {incidents.length === 0 ? <div style={{ padding: '24px 18px', fontFamily: t.sans, fontSize: 13, color: t.dim, textAlign: 'center' }}>No active incidents</div> : incidents.map(ev => (
              <div key={ev.id} style={{ padding: '12px 18px', borderBottom: `1px solid ${t.rim}`, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <SeverityDot sev={ev.severity} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: t.sans, fontSize: 12, color: t.white, textTransform: 'capitalize', marginBottom: 2 }}>{ev.event_type.replace(/_/g, ' ')}</div>
                  <div style={{ fontFamily: t.mono, fontSize: 10, color: t.dim }}>{ago(ev.created_at)} · {ev.user_type}</div>
                </div>
                <Pill label={ev.severity} color={ev.severity === 'critical' ? t.red : t.amber} bg={ev.severity === 'critical' ? t.redD : t.amberD} />
              </div>
            ))}
          </div>
        </Card>
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: `1px solid ${t.rim}`, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Radio size={13} style={{ color: t.green }} />
            <span style={{ fontFamily: t.mono, fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: t.muted }}>Live Activity Stream</span>
            <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: t.green, boxShadow: `0 0 5px ${t.green}`, marginLeft: 4, animation: 'livepulse 2s infinite' }} />
          </div>
          <div style={{ maxHeight: 320, overflowY: 'auto' }}>
            {liveActivity.length === 0 ? <div style={{ padding: '24px 18px', fontFamily: t.sans, fontSize: 13, color: t.dim, textAlign: 'center' }}>Waiting for events...</div> : liveActivity.map(ev => (
              <div key={ev.id} style={{ padding: '10px 18px', borderBottom: `1px solid ${t.rim}`, display: 'flex', alignItems: 'center', gap: 12 }}>
                <SeverityDot sev={ev.severity} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontFamily: t.sans, fontSize: 12, color: t.white, textTransform: 'capitalize' }}>{ev.event_type.replace(/_/g, ' ')}</span>
                  <span style={{ fontFamily: t.mono, fontSize: 10, color: t.dim, marginLeft: 8 }}>{ev.user_type} · {ev.user_id?.slice(0, 6)}...</span>
                </div>
                <span style={{ fontFamily: t.mono, fontSize: 10, color: t.dim, flexShrink: 0 }}>{ago(ev.created_at)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
