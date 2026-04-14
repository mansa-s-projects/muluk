import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, Activity, RefreshCw } from 'lucide-react';
import { FanRow, fetchJsonOrThrow, Spinner, numf, t, Card, ago } from '../shared';

export function SubscribedFansSystem() {
  const [fans, setFans] = useState<FanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterOnline, setFilterOnline] = useState<'all' | 'online' | 'offline'>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await fetchJsonOrThrow<{ fans: FanRow[]; total: number; online_count: number }>('/api/admin/fans?limit=500');
      setFans(data.fans);
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load fans');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, [autoRefresh, load]);

  const filtered = useMemo(() => {
    let list = fans;
    if (filterOnline === 'online') list = list.filter(f => f.is_online);
    if (filterOnline === 'offline') list = list.filter(f => !f.is_online);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(f =>
        f.code.toLowerCase().includes(q) ||
        (f.creator_name?.toLowerCase() ?? '').includes(q) ||
        (f.creator_handle ?? '').toLowerCase().includes(q) ||
        (f.content_title?.toLowerCase() ?? '').includes(q)
      );
    }
    return list;
  }, [fans, search, filterOnline]);

  const onlineCount = fans.filter(f => f.is_online).length;
  const offlineCount = fans.length - onlineCount;

  if (loading) return <Spinner />;
  if (error) return <div style={{ padding: 32, fontFamily: t.sans, fontSize: 13, color: t.red }}>{error}</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        <Card>
          <div style={{ fontFamily: t.mono, fontSize: 9, letterSpacing: '0.2em', color: t.goldDim, marginBottom: 8, textTransform: 'uppercase' as const }}>Total Fans</div>
          <div style={{ fontFamily: t.serif, fontSize: 36, fontWeight: 300, color: t.white }}>{numf(fans.length)}</div>
        </Card>
        <Card>
          <div style={{ fontFamily: t.mono, fontSize: 9, letterSpacing: '0.2em', color: t.goldDim, marginBottom: 8, textTransform: 'uppercase' as const }}>Online Now</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: t.green, boxShadow: `0 0 8px ${t.green}`, animation: 'livepulse 2s infinite', flexShrink: 0 }} />
            <span style={{ fontFamily: t.serif, fontSize: 36, fontWeight: 300, color: t.green }}>{numf(onlineCount)}</span>
          </div>
        </Card>
        <Card>
          <div style={{ fontFamily: t.mono, fontSize: 9, letterSpacing: '0.2em', color: t.goldDim, marginBottom: 8, textTransform: 'uppercase' as const }}>Offline</div>
          <div style={{ fontFamily: t.serif, fontSize: 36, fontWeight: 300, color: t.muted }}>{numf(offlineCount)}</div>
        </Card>
      </div>

      {/* Controls */}
      <Card style={{ padding: '12px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' as const }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search size={12} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: t.dim }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search fans, creators, content…"
              style={{ width: '100%', background: t.lift, border: `1px solid ${t.rim}`, borderRadius: 6, padding: '8px 10px 8px 30px', color: t.white, fontFamily: t.sans, fontSize: 12, outline: 'none' }}
            />
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['all', 'online', 'offline'] as const).map(f => (
              <button key={f} onClick={() => setFilterOnline(f)}
                style={{ padding: '7px 14px', borderRadius: 5, fontFamily: t.mono, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase' as const, cursor: 'pointer', border: `1px solid ${filterOnline === f ? t.gold : t.rim}`, background: filterOnline === f ? t.goldGlow : 'transparent', color: filterOnline === f ? t.gold : t.dim }}>
                {f}
              </button>
            ))}
          </div>
          <button onClick={() => setAutoRefresh(p => !p)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 5, border: `1px solid ${autoRefresh ? t.green + '55' : t.rim}`, background: autoRefresh ? t.greenD : 'transparent', color: autoRefresh ? t.green : t.dim, fontFamily: t.mono, fontSize: 10, letterSpacing: '0.1em', cursor: 'pointer' }}>
            <Activity size={11} /> {autoRefresh ? 'LIVE' : 'PAUSED'}
          </button>
          <button onClick={load} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 5, border: `1px solid ${t.rim}`, background: 'transparent', color: t.dim, fontFamily: t.mono, fontSize: 10, letterSpacing: '0.1em', cursor: 'pointer' }}>
            <RefreshCw size={11} /> REFRESH
          </button>
        </div>
      </Card>

      {/* Fan table */}
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: `1px solid ${t.rim}`, fontFamily: t.mono, fontSize: 9, color: t.goldDim, letterSpacing: '0.2em', textTransform: 'uppercase' as const }}>
          {filtered.length} fans {search || filterOnline !== 'all' ? `(filtered from ${fans.length})` : ''}
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${t.rim}` }}>
                {['Status', 'Fan Code', 'Creator', 'Content', 'Method', 'Last Seen', 'Joined'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontFamily: t.mono, fontSize: 9, color: t.goldDim, letterSpacing: '0.18em', textTransform: 'uppercase' as const, whiteSpace: 'nowrap' as const, fontWeight: 400 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(fan => (
                <tr key={fan.id} style={{ borderBottom: `1px solid ${t.rim}`, transition: 'background 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = t.lift)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <td style={{ padding: '10px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: fan.is_online ? t.green : t.dim, boxShadow: fan.is_online ? `0 0 6px ${t.green}` : 'none', animation: fan.is_online ? 'livepulse 2s infinite' : 'none' }} />
                      <span style={{ fontFamily: t.mono, fontSize: 9, color: fan.is_online ? t.green : t.dim, letterSpacing: '0.1em' }}>{fan.is_online ? 'ONLINE' : 'OFFLINE'}</span>
                    </div>
                  </td>
                  <td style={{ padding: '10px 16px', fontFamily: t.mono, fontSize: 11, color: t.muted, letterSpacing: '0.05em' }}>{fan.code}</td>
                  <td style={{ padding: '10px 16px' }}>
                    <div style={{ fontFamily: t.sans, fontSize: 12, color: t.white }}>{fan.creator_name}</div>
                    {fan.creator_handle && <div style={{ fontFamily: t.mono, fontSize: 9, color: t.goldDim, marginTop: 2 }}>@{fan.creator_handle}</div>}
                  </td>
                  <td style={{ padding: '10px 16px', fontFamily: t.sans, fontSize: 12, color: t.muted, maxWidth: 200 }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{fan.content_title}</div>
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    {fan.payment_method ? <span style={{ fontFamily: t.mono, fontSize: 9, padding: '3px 7px', borderRadius: 3, background: t.blueD, color: t.blue }}>{fan.payment_method}</span> : <span style={{ color: t.dim, fontFamily: t.mono, fontSize: 10 }}>—</span>}
                  </td>
                  <td style={{ padding: '10px 16px', fontFamily: t.mono, fontSize: 10, color: fan.is_online ? t.green : t.dim, whiteSpace: 'nowrap' as const }}>
                    {fan.last_seen_at ? ago(fan.last_seen_at) + ' ago' : 'Never'}
                  </td>
                  <td style={{ padding: '10px 16px', fontFamily: t.mono, fontSize: 10, color: t.dim, whiteSpace: 'nowrap' as const }}>
                    {fan.paid_at ? ago(fan.paid_at) + ' ago' : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div style={{ padding: '48px 32px', textAlign: 'center', fontFamily: t.sans, fontSize: 13, color: t.dim }}>
              {fans.length === 0 ? 'No paid fans yet — they appear here once they unlock content.' : 'No fans match this filter.'}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
