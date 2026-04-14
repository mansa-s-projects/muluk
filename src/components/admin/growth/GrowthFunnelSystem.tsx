import React, { useMemo } from 'react';
import { Target, Zap } from 'lucide-react';
import { PlatformStats, t, Card, SectionLabel, Spinner, numf, $f } from '../shared';

export function GrowthFunnelSystem({ stats }: { stats: PlatformStats | null }) {
  const funnelSteps = useMemo(() => {
    if (!stats) return [];
    const total = stats.users.totalCreators + stats.users.totalFans;
    return [
      { step: 'Platform Signups', count: total, insight: 'Track UTM sources to identify top acquisition channels', phEvent: 'user_signup' },
      { step: 'Creators Applied', count: stats.users.totalCreators, insight: `${Math.round((stats.users.totalCreators / Math.max(total, 1)) * 100)}% signup-to-application rate`, phEvent: 'creator_applied' },
      { step: 'Creators Approved', count: stats.users.approvedCreators, insight: `${Math.round((stats.users.approvedCreators / Math.max(stats.users.totalCreators, 1)) * 100)}% approval rate`, phEvent: 'creator_approved' },
      { step: 'Content Created', count: stats.content.totalItems, insight: `${Math.round((stats.content.totalItems / Math.max(stats.users.approvedCreators, 1)) * 100)}% content creation rate`, phEvent: 'content_published' },
      { step: 'Transactions Completed', count: stats.finances.totalTransactions, insight: `${$f(stats.finances.averageTransactionValue)} avg transaction value`, phEvent: 'payment_success' },
    ];
  }, [stats]);
  const posthogEvents = [
    { event: 'onboarding_step_1_complete', desc: 'Basic profile filled', why: 'Ensures creator has minimum viable presence' },
    { event: 'onboarding_step_2_complete', desc: 'Social account connected', why: 'Validates creator authenticity and reach' },
    { event: 'onboarding_step_3_complete', desc: 'First content item created', why: 'Signals creator intent to monetize' },
    { event: 'content_first_sale', desc: 'First transaction on any content item', why: 'Activation event — most predictive of long-term retention' },
    { event: 'fan_acquired_first', desc: 'First fan via creator link', why: 'Validates creator promotion activity' },
    { event: 'churn_signal_30d', desc: 'No login or activity in 30 days', why: 'Immediate re-engagement candidate' },
    { event: 'feature_vault_used', desc: 'Creator used vault feature', why: 'High-value feature engagement signal' },
    { event: 'feature_radio_played', desc: 'Creator played MULUK Radio', why: 'Product engagement signal' },
  ];
  const automations = [
    { name: 'Auto-Flag Risky Creators', trigger: 'Churn risk > 80 + no activity in 14d', action: 'Add admin note + flag for review + queue re-engagement email', color: t.amber },
    { name: 'Revenue Drop Alert', trigger: 'GMV drops >20% week-over-week', action: 'Notify admin + generate AI brief + surface top 3 causes', color: t.red },
    { name: 'Conversion Opportunity', trigger: 'Creator has 20+ fans but 0 sales for 7+ days', action: 'Recommend pricing strategy + auto-send coaching email', color: t.blue },
    { name: 'Funnel Drop Detection', trigger: 'Signup-to-application rate drops below 40%', action: 'Alert + auto-analyze which onboarding step has highest drop-off', color: t.purple },
  ];
  if (!stats) return <Spinner />;
  const maxCount = Math.max(...funnelSteps.map(s => s.count), 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <Card>
        <SectionLabel>Creator Activation Funnel</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {funnelSteps.map((step, i) => {
            const pct = Math.round((step.count / maxCount) * 100);
            const dropout = i > 0 ? funnelSteps[i - 1].count - step.count : 0;
            const dropPct = i > 0 ? Math.round((dropout / Math.max(funnelSteps[i - 1].count, 1)) * 100) : 0;
            return (
              <div key={step.step}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 6 }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: t.goldGlow, border: `1px solid ${t.gold}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: t.mono, fontSize: 10, color: t.gold, flexShrink: 0 }}>{i + 1}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                      <span style={{ fontFamily: t.sans, fontSize: 14, color: t.white }}>{step.step}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {dropPct > 0 && <span style={{ fontFamily: t.mono, fontSize: 10, color: t.red }}>−{dropPct}% drop</span>}
                        <span style={{ fontFamily: t.mono, fontSize: 13, color: t.gold }}>{numf(step.count)}</span>
                        <span style={{ fontFamily: t.mono, fontSize: 10, color: t.dim, minWidth: 32, textAlign: 'right' }}>{pct}%</span>
                      </div>
                    </div>
                    <div style={{ height: 6, background: t.faint, borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: `linear-gradient(90deg, ${t.gold}, ${t.goldDim})`, borderRadius: 3, transition: 'width 0.8s ease' }} />
                    </div>
                    <div style={{ fontFamily: t.sans, fontSize: 11, color: t.dim, marginTop: 4 }}>{step.insight}</div>
                  </div>
                </div>
                {i < funnelSteps.length - 1 && dropout > 0 && (
                  <div style={{ marginLeft: 38, display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0 6px' }}>
                    <div style={{ width: 1, height: 14, background: t.rim2 }} />
                    <span style={{ fontFamily: t.mono, fontSize: 10, color: t.red }}>{numf(dropout)} dropped off before &quot;{funnelSteps[i + 1].step}&quot;</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}><Target size={13} style={{ color: t.gold }} /><SectionLabel>PostHog Event Tracking Plan</SectionLabel></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {posthogEvents.map(ev => (
              <div key={ev.event} style={{ padding: '10px 12px', background: t.faint, borderRadius: 7, borderLeft: `2px solid ${t.goldDim}` }}>
                <div style={{ fontFamily: t.mono, fontSize: 10, color: t.gold, marginBottom: 4, letterSpacing: '0.05em' }}>{ev.event}</div>
                <div style={{ fontFamily: t.sans, fontSize: 12, color: t.muted, marginBottom: 3 }}>{ev.desc}</div>
                <div style={{ fontFamily: t.sans, fontSize: 11, color: t.dim, fontStyle: 'italic' }}>Why: {ev.why}</div>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}><Zap size={13} style={{ color: t.gold }} /><SectionLabel>Automation Layer</SectionLabel></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {automations.map(auto => (
              <div key={auto.name} style={{ padding: '12px 14px', background: t.faint, borderRadius: 7, borderLeft: `2px solid ${auto.color}` }}>
                <div style={{ fontFamily: t.sans, fontSize: 13, color: t.white, fontWeight: 500, marginBottom: 6 }}>{auto.name}</div>
                <div style={{ fontFamily: t.mono, fontSize: 9, color: t.dim, textTransform: 'uppercase' as const, letterSpacing: '0.12em', marginBottom: 3 }}>Trigger</div>
                <div style={{ fontFamily: t.sans, fontSize: 11, color: t.muted, marginBottom: 6 }}>{auto.trigger}</div>
                <div style={{ fontFamily: t.mono, fontSize: 9, color: t.dim, textTransform: 'uppercase' as const, letterSpacing: '0.12em', marginBottom: 3 }}>Action</div>
                <div style={{ fontFamily: t.sans, fontSize: 11, color: auto.color }}>{auto.action}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
