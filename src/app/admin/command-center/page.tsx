'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  LayoutDashboard, Users, DollarSign, Shield, TrendingUp,
  AlertTriangle, Activity, MessageSquare, Ban, Search,
  RefreshCw, Eye, X, ChevronRight, Zap, Target, BarChart2,
  Clock, ArrowUpRight, ArrowDownRight, ExternalLink,
  Brain, Star, Filter, Crosshair, Radio, Layers,
  Send, Download, FileText, UserMinus, UserCheck, Wallet, Mail, Link, UserPlus, ClipboardList
} from 'lucide-react';

// TYPES
interface PlatformStats {
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
interface Creator {
  id: string; user_id: string; display_name: string; handle: string;
  email: string; status: string; tier: string; created_at: string;
  referral_handle?: string;
  ban_status: { is_active: boolean; ban_type: string; reason: string } | null;
  stats: { content_count: number; fan_count: number; transaction_count: number; total_volume: number };
}
interface RealtimeEvent {
  id: string; event_type: string; user_id: string; user_type: string;
  metadata: any; severity: 'info' | 'warning' | 'critical'; created_at: string;
}
type System = 'overview' | 'creator-intel' | 'revenue-intel' | 'risk' | 'funnel' | 'creators' | 'fans' | 'messages' | 'audit';

// SCORE ENGINE
function scoreCreator(c: Creator) {
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
const $f = (cents: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(cents / 100);
const numf = (n: number) => n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}K` : String(n);
const ago = (d: string) => { const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000); return s < 60 ? `${s}s` : s < 3600 ? `${Math.floor(s / 60)}m` : s < 86400 ? `${Math.floor(s / 3600)}h` : `${Math.floor(s / 86400)}d`; };

// DESIGN TOKENS
const t = {
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
function ScoreBar({ v, color }: { v: number; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 3, background: t.faint, borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: `${v}%`, height: '100%', background: color, borderRadius: 2, transition: 'width 0.9s ease' }} />
      </div>
      <span style={{ fontFamily: t.mono, fontSize: 10, color: t.muted, minWidth: 26, textAlign: 'right' }}>{v}</span>
    </div>
  );
}
function Pill({ label, color, bg }: { label: string; color: string; bg: string }) {
  return <span style={{ fontFamily: t.mono, fontSize: 9, fontWeight: 500, letterSpacing: '0.15em', textTransform: 'uppercase' as const, padding: '3px 7px', borderRadius: 3, color, background: bg }}>{label}</span>;
}
function LifecyclePill({ stage }: { stage: string }) {
  const map: Record<string, [string, string]> = { new: [t.blue, t.blueD], growing: [t.green, t.greenD], established: [t.gold, t.goldGlow], at_risk: [t.amber, t.amberD], dormant: [t.muted, t.faint] };
  const [color, bg] = map[stage] || [t.muted, t.faint];
  return <Pill label={stage.replace('_', ' ')} color={color} bg={bg} />;
}
function SeverityDot({ sev }: { sev: string }) {
  const c = sev === 'critical' ? t.red : sev === 'warning' ? t.amber : t.blue;
  return <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: c, boxShadow: `0 0 5px ${c}`, flexShrink: 0 }} />;
}
function TierPill({ tier }: { tier: string }) {
  const displayMap: Record<string, string> = { apex: 'Emperor', legend: 'King', cipher: 'Prince' };
  const map: Record<string, [string, string]> = { apex: [t.purple, t.purpleD], legend: [t.blue, t.blueD], cipher: [t.gold, t.goldGlow] };
  const [color, bg] = map[tier] || [t.muted, t.faint];
  return <Pill label={displayMap[tier] ?? tier} color={color} bg={bg} />;
}
function StatusPill({ status }: { status: string }) {
  const map: Record<string, [string, string]> = { approved: [t.green, t.greenD], pending: [t.amber, t.amberD], rejected: [t.red, t.redD], suspended: [t.red, t.redD], active: [t.green, t.greenD], success: [t.green, t.greenD], failed: [t.red, t.redD] };
  const [color, bg] = map[status] || [t.muted, t.faint];
  return <Pill label={status} color={color} bg={bg} />;
}
function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ background: t.card, border: `1px solid ${t.rim}`, borderRadius: 10, padding: '18px 20px', ...style }}>{children}</div>;
}
function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontFamily: t.mono, fontSize: 9, letterSpacing: '0.28em', textTransform: 'uppercase' as const, color: t.goldDim, marginBottom: 14 }}>{children}</div>;
}
function Spinner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 0' }}>
      <RefreshCw size={18} style={{ color: t.gold, animation: 'spin 1s linear infinite' }} />
    </div>
  );
}

async function fetchJsonOrThrow<T>(url: string, init?: RequestInit): Promise<T> {
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

function GMVTicker({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<number | null>(null);
  useEffect(() => {
    if (ref.current !== null) {
      clearInterval(ref.current);
      ref.current = null;
    }

    if (value === 0) {
      setDisplay(0);
      return;
    }

    let curr = 0;
    const step = value / 60;
    ref.current = setInterval(() => {
      curr += step;
      if (curr >= value) {
        setDisplay(value);
        if (ref.current !== null) {
          clearInterval(ref.current);
          ref.current = null;
        }
        return;
      }
      setDisplay(Math.floor(curr));
    }, 16) as unknown as number;

    return () => {
      if (ref.current !== null) {
        clearInterval(ref.current);
        ref.current = null;
      }
    };
  }, [value]);
  return <span style={{ fontFamily: t.serif, fontSize: 42, fontWeight: 300, color: t.goldBright, letterSpacing: '-0.02em', lineHeight: 1 }}>{$f(display)}</span>;
}

// ACTION MODAL
function ActionModal({ modal, onClose, onSuccess }: { modal: any; onClose: () => void; onSuccess: () => void }) {
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
      const body: any = { action: modal.type, targetType: 'creator', targetId: modal.target?.user_id, reason: reason || 'Admin action' };
      if (modal.type === 'ban_creator') body.details = { duration_days: 30 };
      if (modal.type === 'change_tier') body.details = { tier };
      if (modal.type === 'force_withdrawal') body.details = { amount: modal.amount, method: 'manual' };
      if (modal.type === 'ban_creators_bulk') {
        body.details = { duration_days: 30, targets: (modal.targets || []).map((x: any) => x.user_id) };
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

// SYSTEM 1: OVERVIEW
function OverviewSystem({ stats, events, onAction }: { stats: PlatformStats | null; events: RealtimeEvent[]; onAction: (m: any) => void }) {
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

// SYSTEM 2: CREATOR INTELLIGENCE
function CreatorIntelligenceSystem({ onAction }: { onAction: (m: any) => void }) {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'churn' | 'revenue' | 'engagement' | 'health'>('churn');
  const [filter, setFilter] = useState<'all' | 'at_risk' | 'dormant' | 'no_conversion'>('all');
  const [selected, setSelected] = useState<Creator | null>(null);
  const [details, setDetails] = useState<any>(null);
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
      const d = await fetchJsonOrThrow<{ success?: boolean; profile?: unknown }>(`/api/admin/creators/${c.user_id}`);
      if (d.success && d.profile) {
        setDetails(d.profile);
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
        <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} style={{ padding: '9px 12px', background: t.surface, border: `1px solid ${t.rim2}`, borderRadius: 6, color: t.white, fontFamily: t.mono, fontSize: 11, outline: 'none' }}>
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
                    {revTrend === 'up' && <ArrowUpRight size={14} style={{ color: t.green }} />}
                    {revTrend === 'down' && <ArrowDownRight size={14} style={{ color: t.red }} />}
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
                        <span style={{ fontFamily: t.mono, fontSize: 11, color: t.goldDim }}>cipher.so/r/</span>
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
                    { label: 'Total Volume', value: $f((details.transactions || []).reduce((s: number, tx: any) => s + (tx.status === 'success' ? (tx.amount || 0) : 0), 0)), color: t.gold },
                  ].map(s => (
                    <Card key={s.label} style={{ padding: 14, border: s.label === 'Fans' ? `1px solid ${t.blue}33` : undefined }}>
                      <div style={{ fontFamily: t.mono, fontSize: 9, color: t.dim, textTransform: 'uppercase' as const, letterSpacing: '0.15em', marginBottom: 6 }}>{s.label}</div>
                      <div style={{ fontFamily: t.serif, fontSize: 26, fontWeight: 300, color: s.color }}>{s.value ?? '—'}</div>
                    </Card>
                  ))}
                </div>
                {/* Wallet + Withdraw */}
                {details.wallet && (() => {
                  const bal = details.wallet.balance || 0;
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
                {details.socials?.length > 0 && (
                  <Card><SectionLabel>Connected Socials</SectionLabel>
                    <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6 }}>
                      {details.socials.map((s: any) => <div key={s.platform} style={{ padding: '5px 10px', background: t.faint, borderRadius: 5, fontFamily: t.mono, fontSize: 10, color: t.muted }}><span style={{ textTransform: 'capitalize' }}>{s.platform}</span> · <span style={{ color: t.gold }}>{numf(s.follower_count || 0)}</span></div>)}
                    </div>
                  </Card>
                )}
                {/* Admin Notes */}
                {details.notes?.length > 0 && (
                  <Card style={{ padding: 14 }}><SectionLabel>Admin Notes ({details.notes.length})</SectionLabel>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 160, overflowY: 'auto' }}>
                      {details.notes.slice(0, 5).map((n: any) => (
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

// SYSTEM 3: REVENUE INTELLIGENCE
function RevenueIntelligenceSystem({ stats }: { stats: PlatformStats | null }) {
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

// SYSTEM 4: RISK & MODERATION
function RiskModerationSystem({ events, onAction }: { events: RealtimeEvent[]; onAction: (m: any) => void }) {
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

// SYSTEM 5: GROWTH FUNNEL
function GrowthFunnelSystem({ stats }: { stats: PlatformStats | null }) {
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
    { event: 'feature_radio_played', desc: 'Creator played CIPHER Radio', why: 'Product engagement signal' },
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

// SYSTEM 6: CREATORS TABLE
function CreatorsTableSystem({ onAction }: { onAction: (m: any) => void }) {
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

// SYSTEM 7: SYSTEM MESSAGES
function SystemMessagesSystem() {
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

// SYSTEM 8: AUDIT LOGS
function AuditLogsSystem() {
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

// SUBSCRIBED FANS SYSTEM
interface FanRow {
  id: string; code: string; payment_method: string | null; paid_at: string | null;
  last_seen_at: string | null; is_online: boolean;
  content_id: string; content_title: string;
  creator_id: string | null; creator_name: string; creator_handle: string | null;
}
function SubscribedFansSystem() {
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
        f.creator_name.toLowerCase().includes(q) ||
        (f.creator_handle ?? '').toLowerCase().includes(q) ||
        f.content_title.toLowerCase().includes(q)
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

// SIDEBAR
const NAV_ITEMS = [
  { id: 'overview' as System, label: 'Command Center', sub: 'Live Overview', Icon: LayoutDashboard },
  { id: 'creator-intel' as System, label: 'Creator Intel', sub: 'Scores & Signals', Icon: Brain },
  { id: 'creators' as System, label: 'All Creators', sub: 'Table & Actions', Icon: Users },
  { id: 'fans' as System, label: 'Subscribed Fans', sub: 'Online Status', Icon: Radio },
  { id: 'revenue-intel' as System, label: 'Revenue Intel', sub: 'Attribution & Leaks', Icon: BarChart2 },
  { id: 'risk' as System, label: 'Risk & Moderation', sub: 'Fraud & Anomalies', Icon: Crosshair },
  { id: 'funnel' as System, label: 'Growth Funnel', sub: 'PostHog & Automation', Icon: Target },
  { id: 'messages' as System, label: 'Messages', sub: 'Broadcast & History', Icon: MessageSquare },
  { id: 'audit' as System, label: 'Audit Logs', sub: 'Admin Actions', Icon: ClipboardList },
];
function Sidebar({ active, onNav, incidentCount }: { active: System; onNav: (s: System) => void; incidentCount: number }) {
  return (
    <aside style={{ width: 220, background: t.deep, borderRight: `1px solid ${t.rim}`, display: 'flex', flexDirection: 'column', height: '100vh', position: 'sticky', top: 0, flexShrink: 0 }}>
      <div style={{ padding: '24px 20px 20px', borderBottom: `1px solid ${t.rim}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 7, background: `linear-gradient(135deg, ${t.gold}, ${t.goldDim})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Shield size={15} style={{ color: '#0a0800' }} /></div>
          <div><div style={{ fontFamily: t.serif, fontSize: 16, letterSpacing: '0.1em', color: t.gold, fontWeight: 300 }}>CIPHER</div><div style={{ fontFamily: t.mono, fontSize: 8, letterSpacing: '0.25em', color: t.goldDim, textTransform: 'uppercase' as const }}>God Mode</div></div>
        </div>
      </div>
      <nav style={{ flex: 1, padding: '16px 10px', overflowY: 'auto' }}>
        {NAV_ITEMS.map(item => {
          const isActive = active === item.id;
          return (
            <button key={item.id} onClick={() => onNav(item.id)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 7, marginBottom: 3, background: isActive ? t.goldGlow : 'transparent', border: `1px solid ${isActive ? 'rgba(200,169,110,0.2)' : 'transparent'}`, cursor: 'pointer', textAlign: 'left', position: 'relative' }}>
              <item.Icon size={14} style={{ color: isActive ? t.gold : t.dim, flexShrink: 0 }} />
              <div>
                <div style={{ fontFamily: t.sans, fontSize: 12, fontWeight: 500, color: isActive ? t.gold : t.muted, lineHeight: 1.2 }}>{item.label}</div>
                <div style={{ fontFamily: t.mono, fontSize: 9, color: isActive ? t.goldDim : t.faint, letterSpacing: '0.08em', marginTop: 1 }}>{item.sub}</div>
              </div>
              {item.id === 'risk' && incidentCount > 0 && <span style={{ position: 'absolute', top: 6, right: 6, width: 6, height: 6, borderRadius: '50%', background: t.red, boxShadow: `0 0 4px ${t.red}` }} />}
            </button>
          );
        })}
      </nav>
      <div style={{ padding: '14px 16px', borderTop: `1px solid ${t.rim}`, display: 'flex', alignItems: 'center', gap: 7 }}>
        <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: t.green, boxShadow: `0 0 5px ${t.green}`, animation: 'livepulse 2s infinite' }} />
        <span style={{ fontFamily: t.mono, fontSize: 9, color: t.dim, letterSpacing: '0.15em', textTransform: 'uppercase' as const }}>Systems Nominal</span>
      </div>
    </aside>
  );
}

// ROOT
export default function AdminCommandCenter() {
  const supabase = createClient();
  const [system, setSystem] = useState<System>('overview');
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [events, setEvents] = useState<RealtimeEvent[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [actionModal, setActionModal] = useState<any>(null);
  const fetchStats = useCallback(async () => {
    try { const r = await fetch('/api/admin/stats?days=30'); const d = await r.json(); if (d.success) setStats(d.stats); } catch {}
    setStatsLoading(false); setLastRefresh(new Date());
  }, []);
  const fetchEvents = useCallback(async () => {
    try { const r = await fetch('/api/admin/activity?limit=100'); const d = await r.json(); setEvents(d.events || []); } catch {}
  }, []);
  useEffect(() => {
    fetchStats(); fetchEvents();
    const interval = setInterval(fetchEvents, 30000);
    return () => clearInterval(interval);
  }, [fetchStats, fetchEvents]);
  useEffect(() => {
    const sub = supabase.channel('cmd_center_realtime').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'admin_realtime_events' }, payload => {
      setEvents(prev => [payload.new as RealtimeEvent, ...prev].slice(0, 100));
    }).subscribe();
    return () => { sub.unsubscribe(); };
  }, [supabase]);
  const incidentCount = events.filter(e => e.severity === 'critical' || e.severity === 'warning').length;
  const currentNav = NAV_ITEMS.find(n => n.id === system)!;
  return (
    <div style={{ display: 'flex', height: '100vh', background: t.void, color: t.white, fontFamily: t.sans, overflow: 'hidden' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes livepulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(200,169,110,0.2); border-radius: 2px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(200,169,110,0.4); }
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Outfit:wght@300;400;500;600&family=DM+Mono:wght@300;400;500&display=swap');
      `}</style>
      <Sidebar active={system} onNav={setSystem} incidentCount={incidentCount} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <header style={{ background: t.deep, borderBottom: `1px solid ${t.rim}`, padding: '14px 28px', display: 'flex', alignItems: 'center', gap: 20, flexShrink: 0 }}>
          <div>
            <h1 style={{ fontFamily: t.serif, fontSize: 22, fontWeight: 300, color: t.white, margin: 0, lineHeight: 1.2 }}>{currentNav?.label}</h1>
            <div style={{ fontFamily: t.mono, fontSize: 9, letterSpacing: '0.2em', color: t.goldDim, textTransform: 'uppercase', marginTop: 2 }}>{currentNav?.sub}</div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
            {stats && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px', background: t.goldGlow, border: `1px solid rgba(200,169,110,0.2)`, borderRadius: 6 }}>
                <span style={{ fontFamily: t.mono, fontSize: 10, color: t.goldDim }}>GMV</span>
                <span style={{ fontFamily: t.mono, fontSize: 13, color: t.gold, fontWeight: 500 }}>{$f(stats.finances.totalGMV)}</span>
              </div>
            )}
            {incidentCount > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 14px', background: t.redD, border: `1px solid ${t.red}33`, borderRadius: 6 }}>
                <AlertTriangle size={12} style={{ color: t.red }} />
                <span style={{ fontFamily: t.mono, fontSize: 10, color: t.red }}>{incidentCount} incidents</span>
              </div>
            )}
            <button onClick={() => { fetchStats(); fetchEvents(); }} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: t.faint, border: `1px solid ${t.rim}`, borderRadius: 6, color: t.muted, fontFamily: t.mono, fontSize: 10, letterSpacing: '0.12em', cursor: 'pointer' }}>
              <RefreshCw size={11} /> REFRESH
            </button>
            <span style={{ fontFamily: t.mono, fontSize: 9, color: t.dim }}>{lastRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </header>
        <main style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
          {statsLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 12 }}>
              <RefreshCw size={20} style={{ color: t.gold, animation: 'spin 1s linear infinite' }} />
              <span style={{ fontFamily: t.mono, fontSize: 11, color: t.goldDim, letterSpacing: '0.2em' }}>LOADING COMMAND CENTER</span>
            </div>
          ) : (
            <>
              {system === 'overview' && <OverviewSystem stats={stats} events={events} onAction={setActionModal} />}
              {system === 'creator-intel' && <CreatorIntelligenceSystem onAction={setActionModal} />}
              {system === 'revenue-intel' && <RevenueIntelligenceSystem stats={stats} />}
              {system === 'risk' && <RiskModerationSystem events={events} onAction={setActionModal} />}
              {system === 'funnel' && <GrowthFunnelSystem stats={stats} />}
              {system === 'creators' && <CreatorsTableSystem onAction={setActionModal} />}
              {system === 'fans' && <SubscribedFansSystem />}
              {system === 'messages' && <SystemMessagesSystem />}
              {system === 'audit' && <AuditLogsSystem />}
            </>
          )}
        </main>
      </div>
      {actionModal && <ActionModal modal={actionModal} onClose={() => setActionModal(null)} onSuccess={() => { fetchStats(); fetchEvents(); }} />}
    </div>
  );
}
