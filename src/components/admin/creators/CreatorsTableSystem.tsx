import React, { useState, useEffect, useMemo } from 'react';
import { Search, Download, Ban, UserPlus } from 'lucide-react';
import { Creator, t, fetchJsonOrThrow, Spinner, Card, TierPill, StatusPill, Pill, numf, $f } from '../shared';

export function CreatorsTableSystem({ onAction }: { onAction: (m: any) => void }) {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [tierFilter, setTierFilter] = useState('all');
  const [selected, setSelected] = useState<string[]>([]);
  const [listError, setListError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams({ limit: '200', ...(statusFilter !== 'all' && { status: statusFilter }), ...(tierFilter !== 'all' && { tier: tierFilter }) });
    (async () => {
      try {
        setListError(null);
        const d = await fetchJsonOrThrow<{ creators?: Creator[] }>(`/api/admin/creators?${params}`);
        setCreators(d.creators || []);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load creators';
        console.error('Failed to load creators table:', message);
        setListError(message);
      } finally {
        setLoading(false);
      }
    })();
  }, [statusFilter, tierFilter]);

  const filtered = useMemo(() => {
    if (!search) return creators;
    const q = search.toLowerCase();
    return creators.filter(c => c.display_name?.toLowerCase().includes(q) || c.handle?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q));
  }, [creators, search]);

  const toggleSelect = (id: string) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleAll = () => setSelected(selected.length === filtered.length ? [] : filtered.map(c => c.user_id));
  
  const exportCSV = () => {
    const rows = [['Name', 'Handle', 'Email', 'Tier', 'Status', 'Fans', 'Sales', 'Revenue', 'Referral Handle', 'Joined']];
    filtered.forEach(c => rows.push([c.display_name, c.handle, c.email, c.tier, c.status, String(c.stats.fan_count), String(c.stats.transaction_count), String(c.stats.total_volume / 100), c.referral_handle || '', c.created_at?.slice(0, 10)]));
    const escapeCsv = (value: unknown) => {
      const s = value == null ? '' : String(value);
      return `"${s.replace(/"/g, '""')}"`;
    };
    const csv = rows.map(r => r.map(f => escapeCsv(f)).join(',')).join('\n');
    const a = document.createElement('a'); a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv); a.download = 'creators.csv'; a.click();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' as const }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
          <Search size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: t.dim }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, handle or email..." style={{ width: '100%', paddingLeft: 36, paddingRight: 14, paddingTop: 9, paddingBottom: 9, background: t.surface, border: `1px solid ${t.rim2}`, borderRadius: 6, color: t.white, fontFamily: t.sans, fontSize: 13, outline: 'none', boxSizing: 'border-box' as const }} />
        </div>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setLoading(true); }} style={{ padding: '9px 12px', background: t.surface, border: `1px solid ${t.rim2}`, borderRadius: 6, color: t.white, fontFamily: t.mono, fontSize: 11, outline: 'none' }}>
          <option value="all">All Status</option><option value="approved">Approved</option><option value="pending">Pending</option><option value="rejected">Rejected</option><option value="suspended">Suspended</option>
        </select>
        <select value={tierFilter} onChange={e => { setTierFilter(e.target.value); setLoading(true); }} style={{ padding: '9px 12px', background: t.surface, border: `1px solid ${t.rim2}`, borderRadius: 6, color: t.white, fontFamily: t.mono, fontSize: 11, outline: 'none' }}>
          <option value="all">All Tiers</option><option value="cipher">Prince</option><option value="legend">King</option><option value="apex">Emperor</option>
        </select>
        <button onClick={exportCSV} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', background: t.faint, border: `1px solid ${t.rim}`, borderRadius: 6, color: t.muted, fontFamily: t.mono, fontSize: 10, letterSpacing: '0.12em', cursor: 'pointer' }}>
          <Download size={12} /> EXPORT CSV
        </button>
        {selected.length > 0 && (
          <>
            <button onClick={() => {
              const targets = selected
                .map(id => creators.find(x => x.user_id === id))
                .filter(Boolean);
              if (targets.length > 0) {
                onAction({ type: 'ban_creators_bulk', targets });
              }
              setSelected([]);
            }} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', background: t.redD, border: `1px solid ${t.red}22`, borderRadius: 6, color: t.red, fontFamily: t.mono, fontSize: 10, letterSpacing: '0.12em', cursor: 'pointer' }}>
              <Ban size={12} /> BAN {selected.length}
            </button>
            <span style={{ fontFamily: t.mono, fontSize: 10, color: t.muted }}>{selected.length} selected</span>
          </>
        )}
      </div>
      {/* Table */}
      {loading ? <Spinner /> : listError ? (
        <Card>
          <div style={{ color: t.red, fontFamily: t.sans, fontSize: 13 }}>Failed to load creators: {listError}</div>
        </Card>
      ) : (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${t.rim}` }}>
                  <th style={{ padding: '10px 14px', textAlign: 'left' as const }}>
                    <input type="checkbox" checked={selected.length === filtered.length && filtered.length > 0} onChange={toggleAll} style={{ accentColor: t.gold, cursor: 'pointer' }} />
                  </th>
                  {['Creator', 'Email', 'Fans', 'Revenue', 'Sales', 'Referral Handle', 'Tier', 'Status', 'Joined', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left' as const, fontFamily: t.mono, fontSize: 9, letterSpacing: '0.15em', color: t.dim, textTransform: 'uppercase' as const, whiteSpace: 'nowrap' as const }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.id} style={{ borderBottom: `1px solid ${t.rim}`, background: selected.includes(c.user_id) ? t.goldFaint : 'transparent' }}>
                    <td style={{ padding: '10px 14px' }}>
                      <input type="checkbox" checked={selected.includes(c.user_id)} onChange={() => toggleSelect(c.user_id)} style={{ accentColor: t.gold, cursor: 'pointer' }} />
                    </td>
                    <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' as const }}>
                      <div style={{ fontFamily: t.sans, fontSize: 13, color: t.white, fontWeight: 500 }}>{c.display_name || '—'}</div>
                      <div style={{ fontFamily: t.mono, fontSize: 10, color: t.goldDim }}>@{c.handle}</div>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ fontFamily: t.mono, fontSize: 11, color: t.dim }}>{c.email}</div>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ fontFamily: t.serif, fontSize: 18, color: t.blue, fontWeight: 300 }}>{numf(c.stats.fan_count)}</span>
                        {c.stats.fan_count > 0 && <UserPlus size={11} style={{ color: t.blue }} />}
                      </div>
                    </td>
                    <td style={{ padding: '10px 14px', fontFamily: t.mono, fontSize: 12, color: t.gold, whiteSpace: 'nowrap' as const }}>{$f(c.stats.total_volume)}</td>
                    <td style={{ padding: '10px 14px', fontFamily: t.mono, fontSize: 12, color: t.muted }}>{c.stats.transaction_count}</td>
                    <td style={{ padding: '10px 14px' }}>
                      {c.referral_handle ? (
                        <div style={{ fontFamily: t.mono, fontSize: 10, color: t.gold, background: t.goldFaint, padding: '3px 8px', borderRadius: 4, display: 'inline-block' }}>/{c.referral_handle}</div>
                      ) : <span style={{ color: t.dim, fontSize: 11 }}>—</span>}
                    </td>
                    <td style={{ padding: '10px 14px' }}><TierPill tier={c.tier} /></td>
                    <td style={{ padding: '10px 14px' }}>
                      {c.ban_status?.is_active ? <Pill label="banned" color={t.red} bg={t.redD} /> : <StatusPill status={c.status} />}
                    </td>
                    <td style={{ padding: '10px 14px', fontFamily: t.mono, fontSize: 10, color: t.dim, whiteSpace: 'nowrap' as const }}>{c.created_at?.slice(0, 10)}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', gap: 5 }}>
                        <button onClick={() => onAction({ type: 'add_note', target: c })} style={{ padding: '5px 8px', background: t.faint, border: `1px solid ${t.rim}`, borderRadius: 4, color: t.muted, fontFamily: t.mono, fontSize: 9, cursor: 'pointer' }}>NOTE</button>
                        <button onClick={() => onAction({ type: 'change_tier', target: c })} style={{ padding: '5px 8px', background: t.goldGlow, border: `1px solid ${t.gold}33`, borderRadius: 4, color: t.gold, fontFamily: t.mono, fontSize: 9, cursor: 'pointer' }}>TIER</button>
                        {c.ban_status?.is_active
                          ? <button onClick={() => onAction({ type: 'unban_creator', target: c })} style={{ padding: '5px 8px', background: t.greenD, border: `1px solid ${t.green}33`, borderRadius: 4, color: t.green, fontFamily: t.mono, fontSize: 9, cursor: 'pointer' }}>UNBAN</button>
                          : <button onClick={() => onAction({ type: 'ban_creator', target: c })} style={{ padding: '5px 8px', background: t.redD, border: `1px solid ${t.red}22`, borderRadius: 4, color: t.red, fontFamily: t.mono, fontSize: 9, cursor: 'pointer' }}>BAN</button>
                        }
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && <div style={{ padding: '32px', textAlign: 'center', fontFamily: t.sans, fontSize: 13, color: t.dim }}>No creators found</div>}
          </div>
          <div style={{ padding: '10px 16px', borderTop: `1px solid ${t.rim}`, fontFamily: t.mono, fontSize: 10, color: t.dim }}>
            Showing {filtered.length} of {creators.length} creators
          </div>
        </Card>
      )}
    </div>
  );
}
