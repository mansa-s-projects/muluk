import React, { useState, useEffect } from 'react';
import { MessageSquare, Send } from 'lucide-react';
import { Card, SectionLabel, Spinner, t, StatusPill, ago } from '../shared';

export function SystemMessagesSystem() {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [content, setContent] = useState('');
  const [targetTier, setTargetTier] = useState('all');
  const [sent, setSent] = useState(false);
  useEffect(() => {
    fetch('/api/admin/messages?limit=50').then(r => r.json()).then(d => { setMessages(d.messages || []); setLoading(false); }).catch(() => setLoading(false));
  }, []);
  const sendBroadcast = async () => {
    if (!content.trim()) return;
    setSending(true);
    try {
      const r = await fetch('/api/admin/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: content.trim(), target_tier: targetTier, type: 'broadcast' }),
      });
      if (r.ok) { setSent(true); setContent(''); setTimeout(() => setSent(false), 3000); fetch('/api/admin/messages?limit=50').then(r => r.json()).then(d => setMessages(d.messages || [])); }
    } catch {}
    setSending(false);
  };
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Card>
          <SectionLabel>Send Broadcast Message</SectionLabel>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            {(['all', 'cipher', 'legend', 'apex'] as const).map(tier => (
              <button key={tier} onClick={() => setTargetTier(tier)} style={{ flex: 1, padding: '8px 0', borderRadius: 5, background: targetTier === tier ? t.goldGlow : t.faint, border: `1px solid ${targetTier === tier ? t.gold : t.rim}`, color: targetTier === tier ? t.gold : t.muted, fontFamily: t.mono, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase' as const, cursor: 'pointer' }}>{tier}</button>
            ))}
          </div>
          <div style={{ fontFamily: t.mono, fontSize: 10, color: t.dim, marginBottom: 8 }}>
            Targeting: <span style={{ color: t.gold }}>{targetTier === 'all' ? 'ALL CREATORS' : `${targetTier.toUpperCase()} TIER ONLY`}</span>
          </div>
          <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Write your broadcast message to creators..." rows={6} style={{ width: '100%', padding: '12px 14px', background: t.ink, border: `1px solid ${t.rim2}`, borderRadius: 7, color: t.white, fontFamily: t.sans, fontSize: 13, resize: 'none', outline: 'none', boxSizing: 'border-box', marginBottom: 12 }} />
          <button onClick={sendBroadcast} disabled={!content.trim() || sending} style={{ width: '100%', padding: '12px 0', background: sent ? t.greenD : t.goldGlow, border: `1px solid ${sent ? t.green : t.gold}`, borderRadius: 7, color: sent ? t.green : t.gold, fontFamily: t.mono, fontSize: 11, letterSpacing: '0.16em', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: !content.trim() || sending ? 0.4 : 1, transition: 'all 0.2s' }}>
            <Send size={13} />
            {sent ? 'MESSAGE SENT ✓' : sending ? 'SENDING...' : 'SEND BROADCAST'}
          </button>
        </Card>
        <Card>
          <SectionLabel>Broadcast Guidelines</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { icon: '🎯', text: 'Use Prince tier for standard creator onboarding' },
              { icon: '📢', text: 'All tier sends to every creator on the platform' },
              { icon: '⚠️', text: 'Messages are logged in admin audit trail' },
              { icon: '🔔', text: 'Messages trigger creator dashboard notifications' },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 10px', background: t.faint, borderRadius: 6 }}>
                <span style={{ fontSize: 13 }}>{item.icon}</span>
                <span style={{ fontFamily: t.sans, fontSize: 12, color: t.muted }}>{item.text}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: `1px solid ${t.rim}`, display: 'flex', alignItems: 'center', gap: 8 }}>
          <MessageSquare size={13} style={{ color: t.gold }} />
          <span style={{ fontFamily: t.mono, fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: t.muted }}>Recent Message History</span>
        </div>
        {loading ? <Spinner /> : (
          <div style={{ maxHeight: 600, overflowY: 'auto' }}>
            {messages.length === 0 ? (
              <div style={{ padding: '32px 18px', textAlign: 'center', fontFamily: t.sans, fontSize: 13, color: t.dim }}>No messages yet</div>
            ) : messages.map(msg => (
              <div key={msg.id} style={{ padding: '14px 18px', borderBottom: `1px solid ${t.rim}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                  <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' as const }}>
                    {msg.creator && <span style={{ fontFamily: t.sans, fontSize: 12, color: t.white }}>{msg.creator.display_name}</span>}
                    <StatusPill status={msg.sender_type === 'admin' ? 'active' : 'pending'} />
                  </div>
                  <span style={{ fontFamily: t.mono, fontSize: 10, color: t.dim, flexShrink: 0 }}>{ago(msg.created_at)}</span>
                </div>
                <div style={{ fontFamily: t.sans, fontSize: 13, color: t.muted, lineHeight: 1.5 }}>{msg.content}</div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
