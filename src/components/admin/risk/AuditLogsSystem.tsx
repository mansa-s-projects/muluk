import React, { useState, useEffect } from 'react';
import { ClipboardList } from 'lucide-react';
import { t, Card, Spinner, ago } from '../shared';

export function AuditLogsSystem() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [uniqueActions, setUniqueActions] = useState<string[]>([]);
  useEffect(() => {
    const params = new URLSearchParams({ limit: '100', ...(actionFilter && { action: actionFilter }) });
    fetch(`/api/admin/audit-logs?${params}`).then(r => r.json()).then(d => {
      setLogs(d.logs || []);
      if (d.uniqueActions) setUniqueActions(d.uniqueActions);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [actionFilter]);
  const actionColor = (action: string) => {
    if (action.includes('ban')) return t.red;
    if (action.includes('unban') || action.includes('approve')) return t.green;
    if (action.includes('tier') || action.includes('withdraw')) return t.gold;
    if (action.includes('message') || action.includes('note') || action.includes('warn')) return t.amber;
    return t.muted;
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <ClipboardList size={16} style={{ color: t.gold }} />
        <span style={{ fontFamily: t.serif, fontSize: 18, fontWeight: 300, color: t.white }}>Admin Audit Trail</span>
        <span style={{ fontFamily: t.mono, fontSize: 10, color: t.dim, marginLeft: 'auto' }}>Every admin action is immutably logged</span>
        <select value={actionFilter} onChange={e => { setActionFilter(e.target.value); setLoading(true); }} style={{ padding: '8px 12px', background: t.surface, border: `1px solid ${t.rim2}`, borderRadius: 6, color: t.white, fontFamily: t.mono, fontSize: 11, outline: 'none' }}>
          <option value="">All Actions</option>
          {uniqueActions.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>
      {loading ? <Spinner /> : (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${t.rim}` }}>
                  {['Time', 'Action', 'Target Type', 'Target ID', 'Details'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left' as const, fontFamily: t.mono, fontSize: 9, letterSpacing: '0.15em', color: t.dim, textTransform: 'uppercase' as const, whiteSpace: 'nowrap' as const }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id} style={{ borderBottom: `1px solid ${t.rim}` }}>
                    <td style={{ padding: '10px 16px', fontFamily: t.mono, fontSize: 10, color: t.dim, whiteSpace: 'nowrap' as const }}>{ago(log.created_at)}</td>
                    <td style={{ padding: '10px 16px' }}>
                      <span style={{ fontFamily: t.mono, fontSize: 10, color: actionColor(log.action), background: actionColor(log.action) + '18', padding: '3px 8px', borderRadius: 4 }}>
                        {log.action.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td style={{ padding: '10px 16px', fontFamily: t.mono, fontSize: 10, color: t.muted }}>{log.target_type}</td>
                    <td style={{ padding: '10px 16px', fontFamily: t.mono, fontSize: 10, color: t.dim }}>{log.target_id?.slice(0, 8)}...</td>
                    <td style={{ padding: '10px 16px', fontFamily: t.sans, fontSize: 12, color: t.muted, maxWidth: 300 }}>
                      {log.details?.reason ? <span>{log.details.reason}</span> : log.details ? <span style={{ color: t.dim }}>{JSON.stringify(log.details).slice(0, 80)}</span> : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {logs.length === 0 && <div style={{ padding: '32px', textAlign: 'center', fontFamily: t.sans, fontSize: 13, color: t.dim }}>No audit logs found</div>}
          </div>
          <div style={{ padding: '10px 16px', borderTop: `1px solid ${t.rim}`, fontFamily: t.mono, fontSize: 10, color: t.dim }}>
            {logs.length} entries
          </div>
        </Card>
      )}
    </div>
  );
}
