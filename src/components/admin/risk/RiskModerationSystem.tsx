import React, { useState, useEffect, useMemo } from 'react';
import { RealtimeEvent, Creator, t, scoreCreator, Card, SectionLabel, SeverityDot, Pill, LifecyclePill, StatusPill, $f, Spinner, ago } from '../shared';

export function RiskModerationSystem({ events, onAction }: { events: RealtimeEvent[]; onAction: (m: any) => void }) {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { fetch('/api/admin/creators?limit=100').then(r => r.json()).then(d => { setCreators(d.creators || []); setLoading(false); }).catch(() => setLoading(false)); }, []);
  const bannedCreators = creators.filter(c => c.ban_status?.is_active);
  const suspendedCreators = creators.filter(c => c.status === 'suspended');
  const riskyCreators = useMemo(() => creators.map(c => ({ ...c, intel: scoreCreator(c) })).filter(c => c.intel.churnRisk > 60 || c.intel.anomaly || c.ban_status?.is_active).sort((a, b) => b.intel.churnRisk - a.intel.churnRisk).slice(0, 20), [creators]);
  const criticalEvents = events.filter(e => e.severity === 'critical');
  const warningEvents = events.filter(e => e.severity === 'warning');
  const severityLevels = [
    { level: 'critical', color: t.red, bg: t.redD, count: criticalEvents.length, trigger: 'Account compromise, payment fraud, ban evasion, ToS violation', action: 'Immediate ban + manual review + notify affected parties', events: criticalEvents.slice(0, 5) },
    { level: 'warning', color: t.amber, bg: t.amberD, count: warningEvents.length, trigger: 'Suspicious activity, unusual transaction spikes, failed auth attempts', action: 'Flag account, add admin note, monitor closely for 48h', events: warningEvents.slice(0, 5) },
    { level: 'info', color: t.blue, bg: t.blueD, count: events.filter(e => e.severity === 'info').length, trigger: 'Normal platform signals, signups, content creation, messages', action: 'Log for analytics, no immediate action required', events: events.filter(e => e.severity === 'info').slice(0, 3) },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        {[{ label: 'Active Bans', value: bannedCreators.length, color: t.red }, { label: 'Suspended', value: suspendedCreators.length, color: t.amber }, { label: 'Critical Events', value: criticalEvents.length, color: t.red }, { label: 'High Risk', value: riskyCreators.filter(c => c.intel.churnRisk > 80).length, color: t.amber }].map(s => (
          <Card key={s.label} style={{ border: `1px solid ${s.color}22` }}>
            <SectionLabel>{s.label}</SectionLabel>
            <div style={{ fontFamily: t.serif, fontSize: 48, fontWeight: 300, color: s.color, lineHeight: 1 }}>{s.value}</div>
          </Card>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {severityLevels.map(sev => (
          <Card key={sev.level} style={{ border: `1px solid ${sev.color}22` }}>
            <div style={{ display: 'flex', gap: 20 }}>
              <div style={{ minWidth: 200 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <SeverityDot sev={sev.level} />
                  <span style={{ fontFamily: t.mono, fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: sev.color }}>{sev.level}</span>
                  <span style={{ fontFamily: t.mono, fontSize: 10, color: sev.color, background: sev.bg, padding: '2px 7px', borderRadius: 10 }}>{sev.count}</span>
                </div>
                <div style={{ fontFamily: t.sans, fontSize: 11, color: t.dim, marginBottom: 6, lineHeight: 1.5 }}><strong style={{ color: t.muted }}>Trigger:</strong> {sev.trigger}</div>
                <div style={{ fontFamily: t.sans, fontSize: 11, color: sev.color, lineHeight: 1.5 }}><strong>Action:</strong> {sev.action}</div>
              </div>
              <div style={{ flex: 1, borderLeft: `1px solid ${t.rim}`, paddingLeft: 20 }}>
                {sev.events.length === 0 ? <div style={{ fontFamily: t.sans, fontSize: 12, color: t.dim, paddingTop: 8 }}>No recent {sev.level} events</div> : sev.events.map(ev => (
                  <div key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: `1px solid ${t.rim}` }}>
                    <span style={{ fontFamily: t.sans, fontSize: 12, color: t.white, flex: 1, textTransform: 'capitalize' }}>{ev.event_type.replace(/_/g, ' ')}</span>
                    <span style={{ fontFamily: t.mono, fontSize: 10, color: t.dim }}>{ago(ev.created_at)}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        ))}
      </div>
      {loading ? <Spinner /> : (
        <Card>
          <SectionLabel>Creator Risk Matrix</SectionLabel>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>{['Creator', 'Churn Risk', 'Lifecycle', 'Revenue', 'Status', 'Anomaly', 'Actions'].map(h => <th key={h} style={{ textAlign: 'left', padding: '8px 14px', fontFamily: t.mono, fontSize: 9, letterSpacing: '0.15em', color: t.dim, textTransform: 'uppercase' as const, borderBottom: `1px solid ${t.rim}` }}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {riskyCreators.map(creator => {
                  const riskColor = creator.intel.churnRisk > 80 ? t.red : creator.intel.churnRisk > 60 ? t.amber : t.muted;
                  return (
                    <tr key={creator.id} style={{ borderBottom: `1px solid ${t.rim}` }}>
                      <td style={{ padding: '10px 14px' }}><div style={{ fontFamily: t.sans, fontSize: 13, color: t.white }}>{creator.display_name}</div><div style={{ fontFamily: t.mono, fontSize: 10, color: t.goldDim }}>@{creator.handle}</div></td>
                      <td style={{ padding: '10px 14px' }}><span style={{ fontFamily: t.mono, fontSize: 12, color: riskColor, fontWeight: 500 }}>{creator.intel.churnRisk}</span><span style={{ fontFamily: t.mono, fontSize: 9, color: t.dim }}>/100</span></td>
                      <td style={{ padding: '10px 14px' }}><LifecyclePill stage={creator.intel.lifecycle} /></td>
                      <td style={{ padding: '10px 14px', fontFamily: t.mono, fontSize: 12, color: t.gold }}>{$f(creator.stats.total_volume)}</td>
                      <td style={{ padding: '10px 14px' }}><StatusPill status={creator.status} /></td>
                      <td style={{ padding: '10px 14px' }}>{creator.intel.anomaly ? <Pill label={creator.intel.anomaly.replace(/_/g, ' ')} color={t.amber} bg={t.amberD} /> : <span style={{ color: t.dim, fontSize: 12 }}>—</span>}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => onAction({ type: 'add_note', target: creator })} style={{ padding: '5px 10px', background: t.faint, border: `1px solid ${t.rim}`, borderRadius: 4, color: t.muted, fontFamily: t.mono, fontSize: 9, cursor: 'pointer' }}>NOTE</button>
                          {!creator.ban_status?.is_active && <button onClick={() => onAction({ type: 'ban_creator', target: creator })} style={{ padding: '5px 10px', background: t.redD, border: `1px solid ${t.red}22`, borderRadius: 4, color: t.red, fontFamily: t.mono, fontSize: 9, cursor: 'pointer' }}>BAN</button>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
