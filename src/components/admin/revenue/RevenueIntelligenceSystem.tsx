import React, { useState, useEffect, useMemo } from 'react';
import { Brain, ChevronRight } from 'lucide-react';
import { PlatformStats, Creator, t, Spinner, Card, SectionLabel, TierPill, StatusPill, $f } from '../shared';

export function RevenueIntelligenceSystem({ stats }: { stats: PlatformStats | null }) {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetch('/api/admin/transactions?limit=100').then(r => r.json()), fetch('/api/admin/creators?limit=100').then(r => r.json())]).then(([txData, crData]) => { setTransactions(txData.transactions || []); setCreators(crData.creators || []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const topCreators = useMemo(() => [...creators].sort((a, b) => b.stats.total_volume - a.stats.total_volume).slice(0, 10), [creators]);
  const totalVol = topCreators.reduce((s, c) => s + c.stats.total_volume, 0) || 1;
  const failedTx = transactions.filter(tx => tx.status === 'failed');
  const pendingTx = transactions.filter(tx => tx.status === 'pending');
  const leakAmount = failedTx.reduce((s, tx) => s + (tx.amount || 0), 0);

  const insights = useMemo(() => {
    const list: string[] = [];
    if (stats) {
      const topC = topCreators[0];
      if (topC) list.push(`${topC.display_name} accounts for ${((topC.stats.total_volume / Math.max(stats.finances.totalGMV, 1)) * 100).toFixed(1)}% of total GMV — concentration risk.`);
      if (failedTx.length > 5) list.push(`${failedTx.length} failed transactions detected. ${$f(leakAmount)} in lost revenue.`);
      const noSale = creators.filter(c => c.stats.fan_count > 10 && c.stats.transaction_count === 0);
      if (noSale.length > 0) list.push(`${noSale.length} creators have 10+ fans but zero sales — prime upsell targets.`);
      if (stats.finances.gmvGrowth < 0) list.push(`GMV declined ${Math.abs(stats.finances.gmvGrowth).toFixed(1)}% — review creator acquisition and content quality.`);
    }
    return list;
  }, [stats, topCreators, failedTx, creators, leakAmount]);

  if (loading) return <Spinner />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {insights.length > 0 && (
        <Card style={{ background: `linear-gradient(135deg, ${t.card} 0%, rgba(200,169,110,0.04) 100%)`, border: `1px solid rgba(200,169,110,0.15)` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}><Brain size={13} style={{ color: t.gold }} /><SectionLabel>Intelligence Insights</SectionLabel></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {insights.map((ins, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <ChevronRight size={12} style={{ color: t.gold, marginTop: 2, flexShrink: 0 }} />
                <span style={{ fontFamily: t.sans, fontSize: 13, color: t.muted, lineHeight: 1.5 }}>{ins}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <Card>
          <SectionLabel>Revenue Attribution — Top Creators</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {topCreators.map((c, i) => {
              const pct = Math.round((c.stats.total_volume / totalVol) * 100);
              return (
                <div key={c.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontFamily: t.mono, fontSize: 10, color: t.goldDim, width: 18 }}>#{i + 1}</span>
                      <span style={{ fontFamily: t.sans, fontSize: 13, color: t.white }}>{c.display_name}</span>
                      <TierPill tier={c.tier} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontFamily: t.mono, fontSize: 11, color: t.muted }}>{pct}%</span>
                      <span style={{ fontFamily: t.mono, fontSize: 12, color: t.gold }}>{$f(c.stats.total_volume)}</span>
                    </div>
                  </div>
                  <div style={{ height: 3, background: t.faint, borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: i === 0 ? t.gold : i < 3 ? t.goldDim : 'rgba(200,169,110,0.25)', borderRadius: 2 }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card style={{ border: failedTx.length > 0 ? `1px solid rgba(224,85,85,0.2)` : `1px solid ${t.rim}` }}>
            <SectionLabel>Revenue Leak Detection</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div><div style={{ fontFamily: t.mono, fontSize: 9, color: t.dim, textTransform: 'uppercase' as const, letterSpacing: '0.12em', marginBottom: 6 }}>Failed Tx</div><div style={{ fontFamily: t.serif, fontSize: 28, color: t.red, fontWeight: 300 }}>{failedTx.length}</div></div>
              <div><div style={{ fontFamily: t.mono, fontSize: 9, color: t.dim, textTransform: 'uppercase' as const, letterSpacing: '0.12em', marginBottom: 6 }}>Pending</div><div style={{ fontFamily: t.serif, fontSize: 28, color: t.amber, fontWeight: 300 }}>{pendingTx.length}</div></div>
              <div><div style={{ fontFamily: t.mono, fontSize: 9, color: t.dim, textTransform: 'uppercase' as const, letterSpacing: '0.12em', marginBottom: 6 }}>Lost Rev</div><div style={{ fontFamily: t.serif, fontSize: 28, color: t.red, fontWeight: 300 }}>{$f(leakAmount)}</div></div>
            </div>
            {failedTx.length > 0 && <div style={{ marginTop: 12, padding: '8px 12px', background: t.redD, borderRadius: 6, fontFamily: t.mono, fontSize: 10, color: t.red }}>ACTION: Review payment gateway logs and retry failed transactions</div>}
          </Card>
          <Card style={{ padding: 0, overflow: 'hidden', flex: 1 }}>
            <div style={{ padding: '12px 16px', borderBottom: `1px solid ${t.rim}` }}><SectionLabel>Recent Transactions</SectionLabel></div>
            <div style={{ maxHeight: 220, overflowY: 'auto' }}>
              {transactions.slice(0, 20).map(tx => (
                <div key={tx.id} style={{ padding: '10px 16px', borderBottom: `1px solid ${t.rim}`, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: t.sans, fontSize: 12, color: t.white, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.creator?.display_name || 'Unknown'}</div>
                    <div style={{ fontFamily: t.mono, fontSize: 10, color: t.dim }}>{tx.content?.title || 'Content'}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontFamily: t.mono, fontSize: 12, color: tx.status === 'success' ? t.green : tx.status === 'failed' ? t.red : t.amber }}>{$f(tx.amount)}</div>
                    <StatusPill status={tx.status} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
