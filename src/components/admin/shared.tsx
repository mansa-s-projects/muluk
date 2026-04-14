import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';

// TYPES
export interface FanRow {
  id?: string;
  fan_code_id: string;
  code: string;
  display_name: string | null;
  email: string | null;
  lifetime_spend: number;
  purchase_count: number;
  last_purchase_at: string | null;
  created_at: string;
  is_online?: boolean;
  creator_name?: string;
  creator_handle?: string;
  content_title?: string;
  payment_method?: string;
  last_seen_at?: string;
  paid_at?: string;
}
export interface PlatformStats {
  users: {
    totalCreators: number; approvedCreators: number; pendingApplications: number;
    totalFans: number; newCreatorsThisPeriod: number; newFansThisPeriod: number;
    tierDistribution: { cipher: number; legend: number; apex: number };
    creatorGrowth: number; fanGrowth: number;
  };
  content: { totalItems: number; activeItems: number; newItemsThisPeriod: number; averagePrice: number; contentGrowth: number };
  finances: {
    totalGMV: number; periodGMV: number; totalPlatformFees: number;
    totalCreatorEarnings: number; totalTransactions: number; periodTransactions: number;
    averageTransactionValue: number; gmvGrowth: number;
  };
  engagement: { totalMessages: number; periodMessages: number; activeBans: number };
  period: { days: number; since: string; generatedAt: string };
}
export interface Creator {
  id: string; user_id: string; display_name: string; handle: string;
  email: string; status: string; tier: string; created_at: string;
  referral_handle?: string;
  ban_status: { is_active: boolean; ban_type: string; reason: string } | null;
  stats: { content_count: number; fan_count: number; transaction_count: number; total_volume: number };
}
export interface RealtimeEvent {
  id: string; event_type: string; user_id: string; user_type: string;
  metadata: Record<string, unknown>; severity: 'info' | 'warning' | 'critical'; created_at: string;
}
export type System = 'overview' | 'creator-intel' | 'revenue-intel' | 'risk' | 'funnel' | 'creators' | 'fans' | 'messages' | 'audit';

export interface ActionModalData {
  type: string;
  target?: Creator;
  targets?: Creator[];
  amount?: number;
}

// SCORE ENGINE
export function scoreCreator(c: Creator) {
  const { content_count: cc, fan_count: fc, transaction_count: tc, total_volume: tv } = c.stats;
  const daysSince = (Date.now() - new Date(c.created_at).getTime()) / 86400000;
  const cvr = fc > 0 ? (tc / fc) * 100 : 0;
  const engagement = Math.min(100, Math.max(0, Math.round(cvr * 0.6 + Math.min(cc, 15) / 15 * 25 + Math.min(fc, 50) / 50 * 15)));
  const expectedTx = Math.max((daysSince / 30) * 2, 0.5);
  const txRate = tc / expectedTx;
  const churnRisk = Math.min(100, Math.max(0, Math.round(100 - txRate * 40 - engagement * 0.3)));
  const health = Math.min(100, Math.max(0, Math.round(engagement * 0.5 + (100 - churnRisk) * 0.3 + Math.min(tv / 50000, 1) * 20)));
  const revTrend: 'up' | 'flat' | 'down' = tv > 0 && tc > 0 ? (tv / tc > 2000 ? 'up' : 'flat') : 'down';
  let lifecycle: 'new' | 'growing' | 'established' | 'at_risk' | 'dormant';
  if (daysSince < 7) lifecycle = 'new';
  else if (churnRisk > 75 && daysSince > 30) lifecycle = tc === 0 ? 'dormant' : 'at_risk';
  else if (tv > 50000) lifecycle = 'established';
  else lifecycle = 'growing';
  const anomaly: string | null = fc > 50 && tc === 0 ? 'no_conversion' : tv > 0 && churnRisk > 80 ? 'high_value_at_risk' : null;
  return { engagement, churnRisk, health, revTrend, lifecycle, anomaly };
}

// UTILS
export const $f = (cents: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(cents / 100);
export const numf = (n: number) => n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}K` : String(n);
export const ago = (d: string) => { const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000); return s < 60 ? `${s}s` : s < 3600 ? `${Math.floor(s / 60)}m` : s < 86400 ? `${Math.floor(s / 3600)}h` : `${Math.floor(s / 86400)}d`; };

export async function fetchJsonOrThrow<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message =
      typeof payload === 'object' && payload && 'error' in payload
        ? String((payload as { error?: unknown }).error ?? `HTTP ${response.status}`)
        : `HTTP ${response.status}`;
    throw new Error(message);
  }

  if (payload === null) {
    throw new Error(`Invalid or empty JSON response (status ${response.status}) for ${url}`);
  }

  return payload as T;
}

// DESIGN TOKENS
export const t = {
  void: '#020203', ink: '#060610', deep: '#09090f', surface: '#0d0d18',
  lift: '#111122', card: '#0f0f1e', card2: '#141430',
  rim: 'rgba(255,255,255,0.055)', rim2: 'rgba(255,255,255,0.09)', rim3: 'rgba(255,255,255,0.14)',
  gold: '#c8a96e', goldBright: '#e8cc90', goldDim: '#7a6030', goldFaint: '#2e1e08', goldGlow: 'rgba(200,169,110,0.12)',
  white: 'rgba(255,255,255,0.92)', muted: 'rgba(255,255,255,0.48)', dim: 'rgba(255,255,255,0.22)', faint: 'rgba(255,255,255,0.10)',
  green: '#50d48a', greenD: 'rgba(80,212,138,0.12)',
  red: '#e05555', redD: 'rgba(224,85,85,0.12)',
  blue: '#5b8de8', blueD: 'rgba(91,141,232,0.12)',
  amber: '#e8a830', amberD: 'rgba(232,168,48,0.12)',
  purple: '#a078e0', purpleD: 'rgba(160,120,224,0.12)',
  mono: "'DM Mono', monospace" as const,
  serif: "'Cormorant Garamond', serif" as const,
  sans: "'Outfit', sans-serif" as const,
};

// MICRO COMPONENTS
export function ScoreBar({ v, color }: { v: number; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 3, background: t.faint, borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: `${v}%`, height: '100%', background: color, borderRadius: 2, transition: 'width 0.9s ease' }} />
      </div>
      <span style={{ fontFamily: t.mono, fontSize: 10, color: t.muted, minWidth: 26, textAlign: 'right' }}>{v}</span>
    </div>
  );
}

export function Pill({ label, color, bg }: { label: string; color: string; bg: string }) {
  return <span style={{ fontFamily: t.mono, fontSize: 9, fontWeight: 500, letterSpacing: '0.15em', textTransform: 'uppercase' as const, padding: '3px 7px', borderRadius: 3, color, background: bg }}>{label}</span>;
}

export function LifecyclePill({ stage }: { stage: string }) {
  const map: Record<string, [string, string]> = { new: [t.blue, t.blueD], growing: [t.green, t.greenD], established: [t.gold, t.goldGlow], at_risk: [t.amber, t.amberD], dormant: [t.muted, t.faint] };
  const [color, bg] = map[stage] || [t.muted, t.faint];
  return <Pill label={stage.replace('_', ' ')} color={color} bg={bg} />;
}

export function SeverityDot({ sev }: { sev: string }) {
  const c = sev === 'critical' ? t.red : sev === 'warning' ? t.amber : t.blue;
  return <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: c, boxShadow: `0 0 5px ${c}`, flexShrink: 0 }} />;
}

export function TierPill({ tier }: { tier: string }) {
  const displayMap: Record<string, string> = { apex: 'Emperor', legend: 'King', cipher: 'Prince' };
  const map: Record<string, [string, string]> = { apex: [t.purple, t.purpleD], legend: [t.blue, t.blueD], cipher: [t.gold, t.goldGlow] };
  const [color, bg] = map[tier] || [t.muted, t.faint];
  return <Pill label={displayMap[tier] ?? tier} color={color} bg={bg} />;
}

export function StatusPill({ status }: { status: string }) {
  const map: Record<string, [string, string]> = { approved: [t.green, t.greenD], pending: [t.amber, t.amberD], rejected: [t.red, t.redD], suspended: [t.red, t.redD], active: [t.green, t.greenD], success: [t.green, t.greenD], failed: [t.red, t.redD] };
  const [color, bg] = map[status] || [t.muted, t.faint];
  return <Pill label={status} color={color} bg={bg} />;
}

export function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ background: t.card, border: `1px solid ${t.rim}`, borderRadius: 10, padding: '18px 20px', ...style }}>{children}</div>;
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontFamily: t.mono, fontSize: 9, letterSpacing: '0.28em', textTransform: 'uppercase' as const, color: t.goldDim, marginBottom: 14 }}>{children}</div>;
}

export function Spinner({ style }: { style?: React.CSSProperties }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 0', ...style }}>
      <div style={{ width: 18, height: 18, border: `2px solid ${t.gold}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
    </div>
  );
}

export function GMVTicker({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    if (value === 0) {
      setDisplay(0);
      return;
    }

    const startTime = Date.now();
    const duration = 1000;

    const tick = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      setDisplay(Math.floor(value * progress));

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value]);

  return <span style={{ fontFamily: t.serif, fontSize: 42, fontWeight: 300, color: t.goldBright, letterSpacing: '-0.02em', lineHeight: 1 }}>{$f(display)}</span>;
}


export function ActionModal({ modal, onClose, onSuccess }: { modal: ActionModalData; onClose: () => void; onSuccess: () => void }) {
  const [reason, setReason] = useState('');
  const [tier, setTier] = useState('cipher');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // force_withdrawal is instant — no reason required
  const isInstant = modal.type === 'unban_creator' || modal.type === 'force_withdrawal';

  const execute = async () => {
    if (!isInstant && !reason.trim()) return;
    setErrorMessage('');
    setLoading(true);
    try {
      const body: Record<string, unknown> = { action: modal.type, targetType: 'creator', targetId: modal.target?.user_id, reason: reason || 'Admin action' };
      if (modal.type === 'ban_creator') body.details = { duration_days: 30 };
      if (modal.type === 'change_tier') body.details = { tier };
      if (modal.type === 'force_withdrawal') body.details = { amount: modal.amount, method: 'manual' };
      if (modal.type === 'ban_creators_bulk') {
        body.details = { duration_days: 30, targets: (modal.targets || []).map((x: Creator) => x.user_id) };
      }

      const r = await fetch('/api/admin/actions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!r.ok) {
        let msg = `Request failed (${r.status})`;
        try {
          const errJson = await r.json();
          if (errJson?.error) msg = String(errJson.error);
        } catch {}
        throw new Error(msg);
      }
      onSuccess();
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Action failed';
      console.error('Admin action failed:', { action: modal.type, error: message, modal });
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  };

  const titles: Record<string, string> = {
    ban_creator: 'Ban Creator', unban_creator: 'Lift Ban', add_note: 'Admin Note',
    change_tier: 'Change Tier', force_withdrawal: 'Process Withdrawal', ban_creators_bulk: 'Bulk Ban Creators',
  };
  const accentColor = modal.type === 'ban_creator' || modal.type === 'ban_creators_bulk' ? t.red : modal.type === 'unban_creator' ? t.green : modal.type === 'force_withdrawal' ? t.green : t.gold;
  const accentBg = modal.type === 'ban_creator' || modal.type === 'ban_creators_bulk' ? t.redD : modal.type === 'unban_creator' ? t.greenD : modal.type === 'force_withdrawal' ? t.greenD : t.goldGlow;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(2,2,3,0.88)', backdropFilter: 'blur(8px)' }}>
      <div style={{ background: t.surface, border: `1px solid ${t.rim2}`, borderRadius: 12, width: '100%', maxWidth: 440, padding: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <span style={{ fontFamily: t.serif, fontSize: 20, fontWeight: 300 }}>{titles[modal.type] || modal.type}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: t.muted, cursor: 'pointer', padding: 4 }}><X size={16} /></button>
        </div>
        <div style={{ fontFamily: t.mono, fontSize: 11, color: t.muted, marginBottom: 16 }}>
          Target:{' '}
          {modal.type === 'ban_creators_bulk'
            ? <span style={{ color: t.white }}>{(modal.targets || []).length} creators</span>
            : <>
                <span style={{ color: t.white }}>{modal.target?.display_name ?? 'Unknown creator'}</span>{' '}
                <span style={{ color: t.goldDim }}>@{modal.target?.handle ?? 'unknown'}</span>
              </>}
        </div>
        {modal.type === 'change_tier' && (
          <select value={tier} onChange={e => setTier(e.target.value)} style={{ width: '100%', padding: '10px 14px', background: t.ink, border: `1px solid ${t.rim2}`, borderRadius: 6, color: t.white, fontFamily: t.mono, fontSize: 12, marginBottom: 12, outline: 'none' }}>
            <option value="cipher">Prince — 12% fee</option>
            <option value="legend">King — 10% fee</option>
            <option value="apex">Emperor — 8% fee</option>
          </select>
        )}
        {modal.type === 'force_withdrawal' && (
          <div style={{ padding: '12px 14px', background: t.greenD, border: `1px solid ${t.green}33`, borderRadius: 7, marginBottom: 14 }}>
            <div style={{ fontFamily: t.mono, fontSize: 10, color: t.dim, marginBottom: 4 }}>WITHDRAWAL AMOUNT</div>
            <div style={{ fontFamily: t.serif, fontSize: 28, color: t.green, fontWeight: 300 }}>{$f(modal.amount || 0)}</div>
          </div>
        )}
        {modal.type === 'unban_creator' && (
          <div style={{ padding: '10px 14px', background: t.greenD, border: `1px solid ${t.green}33`, borderRadius: 7, marginBottom: 14, fontFamily: t.sans, fontSize: 13, color: t.green }}>
            All active bans will be lifted and creator status restored to approved.
          </div>
        )}
        {!isInstant && (
          <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder={modal.type === 'ban_creator' ? 'Reason for ban...' : modal.type === 'add_note' ? 'Admin note...' : 'Reason...'} style={{ width: '100%', height: 100, padding: '10px 14px', background: t.ink, border: `1px solid ${t.rim2}`, borderRadius: 6, color: t.white, fontFamily: t.sans, fontSize: 13, resize: 'none', outline: 'none', boxSizing: 'border-box', marginBottom: 16 }} />
        )}
        {errorMessage && (
          <div style={{ marginBottom: 10, padding: '8px 10px', borderRadius: 6, background: t.redD, border: `1px solid ${t.red}33`, color: t.red, fontFamily: t.sans, fontSize: 12 }}>
            {errorMessage}
          </div>
        )}
        <div style={{ display: 'flex', gap: 10, marginTop: isInstant ? 8 : 0 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px 0', background: t.faint, border: `1px solid ${t.rim}`, borderRadius: 6, color: t.muted, fontFamily: t.mono, fontSize: 11, letterSpacing: '0.12em', cursor: 'pointer' }}>CANCEL</button>
          <button onClick={execute} disabled={(!isInstant && !reason.trim()) || loading} style={{ flex: 1, padding: '10px 0', background: accentBg, border: `1px solid ${accentColor}`, borderRadius: 6, color: accentColor, fontFamily: t.mono, fontSize: 11, letterSpacing: '0.12em', cursor: 'pointer', opacity: ((!isInstant && !reason.trim()) || loading) ? 0.4 : 1 }}>
            {loading ? 'EXECUTING...' : 'CONFIRM'}
          </button>
        </div>
      </div>
    </div>
  );
}
