import React, { useState, useEffect, useMemo } from 'react';
import { Search, Eye, AlertTriangle, Star, Ban, X, Mail, Link, Wallet, UserCheck, FileText } from 'lucide-react';
import { Creator, ActionModalData, t, fetchJsonOrThrow, scoreCreator, ScoreBar, LifecyclePill, TierPill, Pill, Card, SectionLabel, Spinner, numf, $f, ago } from '../shared';

interface Transaction {
  status: string;
  amount: number;
}

interface SocialAccount {
  platform: string;
  follower_count?: number;
}

interface AdminNote {
  id: string;
  note: string;
  created_at: string;
}

interface CreatorDetails {
  creator?: { email?: string; referral_handle?: string };
  stats?: { totalContent?: number; totalFans?: number; totalTransactions?: number; isCurrentlyBanned?: boolean };
  wallet?: { balance?: number; total_earnings?: number };
  transactions?: Transaction[];
  socials?: SocialAccount[];
  notes?: AdminNote[];
}

export function CreatorIntelligenceSystem({ onAction }: { onAction: (m: ActionModalData) => void }) {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'churn' | 'revenue' | 'engagement' | 'health'>('churn');
  const [filter, setFilter] = useState<'all' | 'at_risk' | 'dormant' | 'no_conversion'>('all');
  const [selected, setSelected] = useState<Creator | null>(null);
  const [details, setDetails] = useState<CreatorDetails | null>(null);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setListError(null);
        const d = await fetchJsonOrThrow<{ creators?: Creator[] }>('/api/admin/creators?limit=100');
        setCreators(d.creators || []);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load creators';
        console.error('Failed to load creators:', message);
        setListError(message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const viewDetails = async (c: Creator) => {
    setSelected(c);
    setDetails(null);
    setDetailsError(null);
    try {
      const d = await fetchJsonOrThrow<{ success?: boolean; profile?: CreatorDetails }>(`/api/admin/creators/${c.user_id}`);
      if (d.success && d.profile) {
        setDetails(d.profile as unknown as CreatorDetails & Record<string, unknown>);
      } else {
        setDetailsError('Failed to load creator details');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load creator details';
      console.error('viewDetails failed:', { creatorId: c.user_id, error: message });
      setDetailsError(message);
    }
  };

  const scored = useMemo(() => creators.map(c => ({ ...c, intel: scoreCreator(c) })), [creators]);
  
  const filtered = useMemo(() => {
    let list = scored;
    if (search) list = list.filter(c => c.display_name.toLowerCase().includes(search.toLowerCase()) || c.handle.toLowerCase().includes(search.toLowerCase()));
    if (filter === 'at_risk') list = list.filter(c => c.intel.lifecycle === 'at_risk');
    if (filter === 'dormant') list = list.filter(c => c.intel.lifecycle === 'dormant');
    if (filter === 'no_conversion') list = list.filter(c => c.intel.anomaly === 'no_conversion');
    return [...list].sort((a, b) => sortBy === 'churn' ? b.intel.churnRisk - a.intel.churnRisk : sortBy === 'revenue' ? b.stats.total_volume - a.stats.total_volume : sortBy === 'engagement' ? b.intel.engagement - a.intel.engagement : b.intel.health - a.intel.health);
  }, [scored, search, sortBy, filter]);

  const alerts = scored.filter(c => c.intel.churnRisk > 75 || c.intel.anomaly);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {alerts.length > 0 && (
        <div style={{ background: t.amberD, border: `1px solid ${t.amber}`, borderRadius: 8, padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <AlertTriangle size={14} style={{ color: t.amber, flexShrink: 0 }} />
          <span style={{ fontFamily: t.sans, fontSize: 13, color: t.amber }}><strong>{alerts.length}</strong> creators flagged — {alerts.filter(c => c.intel.anomaly === 'no_conversion').length} fans without sales, {alerts.filter(c => c.intel.churnRisk > 75).length} high churn risk</span>
        </div>
      )}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' as const }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 260 }}>
          <Search size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: t.dim }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search creators..." style={{ width: '100%', paddingLeft: 36, paddingRight: 14, paddingTop: 10, paddingBottom: 10, background: t.surface, border: `1px solid ${t.rim2}`, borderRadius: 6, color: t.white, fontFamily: t.sans, fontSize: 13, outline: 'none', boxSizing: 'border-box' as const }} />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['all', 'at_risk', 'dormant', 'no_conversion'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{ padding: '8px 14px', borderRadius: 6, background: filter === f ? t.goldGlow : t.faint, border: `1px solid ${filter === f ? t.gold : t.rim}`, color: filter === f ? t.gold : t.muted, fontFamily: t.mono, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase' as const, cursor: 'pointer' }}>{f.replace('_', ' ')}</button>
          ))}
        </div>
        <select value={sortBy} onChange={e => setSortBy(e.target.value as 'churn' | 'revenue' | 'engagement' | 'health')} style={{ padding: '9px 12px', background: t.surface, border: `1px solid ${t.rim2}`, borderRadius: 6, color: t.white, fontFamily: t.mono, fontSize: 11, outline: 'none' }}>
          <option value="churn">Sort: Churn Risk</option><option value="revenue">Sort: Revenue</option><option value="engagement">Sort: Engagement</option><option value="health">Sort: Health</option>
        </select>
      </div>
      {loading ? <Spinner /> : listError ? (
        <Card>
          <div style={{ color: t.red, fontFamily: t.sans, fontSize: 13 }}>Failed to load creators: {listError}</div>
        </Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 12 }}>
          {filtered.map(creator => {
            const { engagement, churnRisk, health, revTrend, lifecycle, anomaly } = creator.intel;
            const engColor = engagement > 60 ? t.green : engagement > 30 ? t.amber : t.red;
            const churnColor = churnRisk > 70 ? t.red : churnRisk > 40 ? t.amber : t.green;
            const healthColor = health > 60 ? t.green : health > 30 ? t.amber : t.red;
            return (
              <div key={creator.id} style={{ background: t.card, border: `1px solid ${anomaly ? t.amber : t.rim}`, borderRadius: 10, padding: '16px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
                  <div style={{ width: 38, height: 38, borderRadius: '50%', background: `linear-gradient(135deg, ${t.goldGlow}, ${t.faint})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: t.serif, fontSize: 16, color: t.gold, flexShrink: 0 }}>{creator.display_name?.[0] || '?'}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: t.sans, fontSize: 14, fontWeight: 500, color: t.white, marginBottom: 3 }}>{creator.display_name}</div>
                    <div style={{ fontFamily: t.mono, fontSize: 10, color: t.goldDim }}>@{creator.handle}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}><LifecyclePill stage={lifecycle} /><TierPill tier={creator.tier} /></div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 14 }}>
                  <div><div style={{ fontFamily: t.mono, fontSize: 9, letterSpacing: '0.15em', color: t.dim, marginBottom: 4, textTransform: 'uppercase' as const }}>Engagement</div><ScoreBar v={engagement} color={engColor} /></div>
                  <div><div style={{ fontFamily: t.mono, fontSize: 9, letterSpacing: '0.15em', color: t.dim, marginBottom: 4, textTransform: 'uppercase' as const }}>Churn Risk</div><ScoreBar v={churnRisk} color={churnColor} /></div>
                  <div><div style={{ fontFamily: t.mono, fontSize: 9, letterSpacing: '0.15em', color: t.dim, marginBottom: 4, textTransform: 'uppercase' as const }}>Health Score</div><ScoreBar v={health} color={healthColor} /></div>
                </div>
                <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
                  <div><div style={{ fontFamily: t.mono, fontSize: 9, color: t.dim, textTransform: 'uppercase' as const, letterSpacing: '0.12em' }}>Revenue</div><div style={{ fontFamily: t.mono, fontSize: 13, color: t.gold }}>{$f(creator.stats.total_volume)}</div></div>
                  <div><div style={{ fontFamily: t.mono, fontSize: 9, color: t.dim, textTransform: 'uppercase' as const, letterSpacing: '0.12em' }}>Fans</div><div style={{ fontFamily: t.mono, fontSize: 13, color: t.white }}>{creator.stats.fan_count}</div></div>
                  <div><div style={{ fontFamily: t.mono, fontSize: 9, color: t.dim, textTransform: 'uppercase' as const, letterSpacing: '0.12em' }}>Sales</div><div style={{ fontFamily: t.mono, fontSize: 13, color: t.white }}>{creator.stats.transaction_count}</div></div>
                  <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
                    {revTrend === 'up' && <span style={{ fontFamily: t.mono, fontSize: 12, color: t.green }}>↗</span>}
                    {revTrend === 'down' && <span style={{ fontFamily: t.mono, fontSize: 12, color: t.red }}>↘</span>}
                    {revTrend === 'flat' && <span style={{ fontFamily: t.mono, fontSize: 12, color: t.muted }}>—</span>}
                  </div>
                </div>
                {anomaly && <div style={{ background: t.amberD, border: `1px solid rgba(232,168,48,0.2)`, borderRadius: 6, padding: '6px 10px', marginBottom: 12, fontFamily: t.mono, fontSize: 10, color: t.amber, letterSpacing: '0.08em' }}>⚠ {anomaly === 'no_conversion' ? 'FANS WITHOUT SALES — pricing or visibility issue' : 'HIGH-VALUE AT RISK — immediate attention needed'}</div>}
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => viewDetails(creator)} style={{ flex: 1, padding: '7px 0', background: t.faint, border: `1px solid ${t.rim}`, borderRadius: 5, color: t.muted, fontFamily: t.mono, fontSize: 9, letterSpacing: '0.12em', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}><Eye size={11} /> PROFILE</button>
                  <button onClick={() => onAction({ type: 'add_note', target: creator })} style={{ flex: 1, padding: '7px 0', background: t.faint, border: `1px solid ${t.rim}`, borderRadius: 5, color: t.muted, fontFamily: t.mono, fontSize: 9, letterSpacing: '0.12em', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}><AlertTriangle size={11} /> NOTE</button>
                  <button onClick={() => onAction({ type: 'change_tier', target: creator })} style={{ flex: 1, padding: '7px 0', background: t.faint, border: `1px solid ${t.rim}`, borderRadius: 5, color: t.muted, fontFamily: t.mono, fontSize: 9, letterSpacing: '0.12em', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}><Star size={11} /> TIER</button>
                  {!creator.ban_status?.is_active && <button onClick={() => onAction({ type: 'ban_creator', target: creator })} style={{ padding: '7px 10px', background: t.redD, border: `1px solid rgba(224,85,85,0.2)`, borderRadius: 5, color: t.red, fontFamily: t.mono, fontSize: 9, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}><Ban size={11} /></button>}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {selected && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 80, display: 'flex', justifyContent: 'flex-end', background: 'rgba(2,2,3,0.7)', backdropFilter: 'blur(4px)' }} onClick={e => { if (e.target === e.currentTarget) setSelected(null); }}>
          <div style={{ width: 520, background: t.deep, borderLeft: `1px solid ${t.rim2}`, overflowY: 'auto', padding: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <span style={{ fontFamily: t.serif, fontSize: 22, fontWeight: 300 }}>{selected.display_name}</span>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: t.muted, cursor: 'pointer', padding: 4 }}><X size={16} /></button>
            </div>
            {detailsError ? (
              <Card style={{ padding: 14 }}>
                <div style={{ color: t.red, fontFamily: t.sans, fontSize: 13, marginBottom: 10 }}>{detailsError}</div>
                <button onClick={() => selected && viewDetails(selected)} style={{ padding: '8px 12px', background: t.faint, border: `1px solid ${t.rim}`, borderRadius: 6, color: t.muted, fontFamily: t.mono, fontSize: 10, letterSpacing: '0.12em', cursor: 'pointer' }}>RETRY</button>
              </Card>
            ) : !details ? <Spinner /> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                {/* Email + Referral */}
                <Card style={{ padding: 14 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Mail size={12} style={{ color: t.dim, flexShrink: 0 }} />
                      <span style={{ fontFamily: t.mono, fontSize: 11, color: t.muted }}>{details.creator?.email || selected.email || '—'}</span>
                    </div>
                    {details.creator?.referral_handle && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Link size={12} style={{ color: t.goldDim, flexShrink: 0 }} />
                        <span style={{ fontFamily: t.mono, fontSize: 11, color: t.goldDim }}>muluk.vip/r/</span>
                        <span style={{ fontFamily: t.mono, fontSize: 11, color: t.gold }}>{details.creator.referral_handle}</span>
                        <Pill label="referral link" color={t.goldDim} bg={t.goldFaint} />
                      </div>
                    )}
                    {!details.creator?.referral_handle && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Link size={12} style={{ color: t.dim, flexShrink: 0 }} />
                        <span style={{ fontFamily: t.mono, fontSize: 10, color: t.dim }}>No custom referral handle yet (unlocks at $1,000 earnings)</span>
                      </div>
                    )}
                  </div>
                </Card>
                {/* Stats grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[
                    { label: 'Content Items', value: details.stats?.totalContent, color: t.white },
                    { label: 'Fans', value: details.stats?.totalFans, color: t.blue },
                    { label: 'Sales', value: details.stats?.totalTransactions, color: t.white },
                    { label: 'Total Volume', value: $f((details.transactions || []).reduce((s: number, tx: Transaction) => s + (tx.status === 'success' ? (tx.amount || 0) : 0), 0)), color: t.gold },
                  ].map(s => (
                    <Card key={s.label} style={{ padding: 14, border: s.label === 'Fans' ? `1px solid ${t.blue}33` : undefined }}>
                      <div style={{ fontFamily: t.mono, fontSize: 9, color: t.dim, textTransform: 'uppercase' as const, letterSpacing: '0.15em', marginBottom: 6 }}>{s.label}</div>
                      <div style={{ fontFamily: t.serif, fontSize: 26, fontWeight: 300, color: s.color }}>{s.value ?? '—'}</div>
                    </Card>
                  ))}
                </div>
                {/* Wallet + Withdraw */}
                {details.wallet && (() => {
                  const bal = details.wallet?.balance || 0;
                  const canWithdraw = bal > 0;
                  return (
                    <Card style={{ border: canWithdraw ? `1px solid ${t.green}33` : `1px solid ${t.rim}` }}>
                      <SectionLabel>Wallet</SectionLabel>
                      <div style={{ display: 'flex', gap: 20, marginBottom: 14 }}>
                        <div>
                          <div style={{ fontFamily: t.mono, fontSize: 9, color: t.dim, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 4 }}>Current Balance</div>
                          <div style={{ fontFamily: t.serif, fontSize: 28, fontWeight: 300, color: canWithdraw ? t.green : t.muted }}>{$f(bal)}</div>
                        </div>
                        <div>
                          <div style={{ fontFamily: t.mono, fontSize: 9, color: t.dim, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 4 }}>Total Earned</div>
                          <div style={{ fontFamily: t.serif, fontSize: 28, fontWeight: 300, color: t.gold }}>{$f(details.wallet.total_earnings || 0)}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => canWithdraw && onAction({ type: 'force_withdrawal', target: selected, amount: bal })}
                        disabled={!canWithdraw}
                        style={{
                          width: '100%', padding: '11px 0', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                          background: canWithdraw ? t.greenD : t.faint,
                          border: `1px solid ${canWithdraw ? t.green : t.rim}`,
                          color: canWithdraw ? t.green : t.dim,
                          fontFamily: t.mono, fontSize: 11, letterSpacing: '0.14em',
                          cursor: canWithdraw ? 'pointer' : 'not-allowed',
                          opacity: canWithdraw ? 1 : 0.45,
                          transition: 'all 0.2s ease',
                        }}
                      >
                        <Wallet size={13} />
                        {canWithdraw ? `PROCESS WITHDRAWAL — ${$f(bal)}` : 'WITHDRAWAL UNAVAILABLE — ZERO BALANCE'}
                      </button>
                    </Card>
                  );
                })()}
                {/* Socials */}
                {(details.socials?.length ?? 0) > 0 && (
                  <Card><SectionLabel>Connected Socials</SectionLabel>
                    <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6 }}>
                      {(details.socials || []).map((s: SocialAccount) => <div key={s.platform} style={{ padding: '5px 10px', background: t.faint, borderRadius: 5, fontFamily: t.mono, fontSize: 10, color: t.muted }}><span style={{ textTransform: 'capitalize' }}>{s.platform}</span> · <span style={{ color: t.gold }}>{numf(s.follower_count || 0)}</span></div>)}
                    </div>
                  </Card>
                )}
                {/* Admin Notes */}
                {(details.notes?.length ?? 0) > 0 && (
                  <Card style={{ padding: 14 }}><SectionLabel>Admin Notes ({details.notes?.length})</SectionLabel>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 160, overflowY: 'auto' }}>
                      {(details.notes || []).slice(0, 5).map((n: AdminNote) => (
                        <div key={n.id} style={{ padding: '8px 10px', background: t.faint, borderRadius: 6, borderLeft: `2px solid ${t.goldDim}` }}>
                          <div style={{ fontFamily: t.sans, fontSize: 12, color: t.muted, marginBottom: 3 }}>{n.note}</div>
                          <div style={{ fontFamily: t.mono, fontSize: 9, color: t.dim }}>{ago(n.created_at)}</div>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
                {/* Action buttons */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
                  {details.stats?.isCurrentlyBanned ? (
                    <button onClick={() => { onAction({ type: 'unban_creator', target: selected }); setSelected(null); }} style={{ flex: 1, minWidth: 130, padding: '10px 0', background: t.greenD, border: `1px solid ${t.green}`, borderRadius: 6, color: t.green, fontFamily: t.mono, fontSize: 10, letterSpacing: '0.12em', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <UserCheck size={12} /> LIFT BAN
                    </button>
                  ) : (
                    <button onClick={() => { onAction({ type: 'ban_creator', target: selected }); setSelected(null); }} style={{ flex: 1, minWidth: 130, padding: '10px 0', background: t.redD, border: `1px solid ${t.red}`, borderRadius: 6, color: t.red, fontFamily: t.mono, fontSize: 10, letterSpacing: '0.12em', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <Ban size={12} /> BAN CREATOR
                    </button>
                  )}
                  <button onClick={() => { onAction({ type: 'change_tier', target: selected }); setSelected(null); }} style={{ flex: 1, minWidth: 130, padding: '10px 0', background: t.goldGlow, border: `1px solid ${t.gold}`, borderRadius: 6, color: t.gold, fontFamily: t.mono, fontSize: 10, letterSpacing: '0.12em', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <Star size={12} /> CHANGE TIER
                  </button>
                  <button onClick={() => { onAction({ type: 'add_note', target: selected }); setSelected(null); }} style={{ padding: '10px 14px', background: t.faint, border: `1px solid ${t.rim}`, borderRadius: 6, color: t.muted, fontFamily: t.mono, fontSize: 10, letterSpacing: '0.12em', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <FileText size={12} /> NOTE
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
