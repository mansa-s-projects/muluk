"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";

const mono: React.CSSProperties = { fontFamily: "var(--font-mono)" };
const disp: React.CSSProperties = { fontFamily: "var(--font-display)" };
const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

type DailyBrief = {
  mood?: string;
  headline?: string;
  wins?: string[];
  priorities?: Array<{ action?: string; why?: string }>;
  moneyOpportunity?: string;
};

type ContentIdea = {
  title: string;
  monetization: string;
  description: string;
  type: string;
  engagement?: string;
};

type PersonaFan = {
  totalSpent: number;
};

type PersonaInsight = {
  traits?: string;
  strategy?: string;
  messageTemplate?: string;
};

type PersonaData = {
  fans: PersonaFan[];
  insights?: PersonaInsight;
};

type PersonasMap = Record<string, PersonaData>;

type PricingRecommendation = {
  optimalPrice?: string;
  confidence?: string;
  rationale?: string;
  dynamicPricing?: {
    launch?: number;
    standard?: number;
  };
  factors?: string[];
};

type OnboardingSnapshot = {
  niche: string;
  confidence: string;
  pricingRecommendation: string;
  first30Days: string[];
  platformPriority: string[];
  contentPillars: Array<{ name: string; description: string }>;
};

// ─── CIPHER Score ──────────────────────────────────────────────────────────────
export type CipherScoreData = {
  totalEarnings: number;
  fanCount: number;
  contentCount: number;
  withdrawalCount: number;
  retentionRate: number;
};

function calcScore(data: CipherScoreData): { total: number; categories: Array<{ name: string; score: number; max: number }> } {
  const earnings = Math.min(Math.floor((data.totalEarnings / 10000) * 200), 200);
  const fans = Math.min(Math.floor((data.fanCount / 100) * 200), 200);
  const content = Math.min(Math.floor((data.contentCount / 20) * 150), 150);
  const payouts = Math.min(Math.floor((data.withdrawalCount / 5) * 150), 150);
  const retention = Math.min(Math.floor((data.retentionRate / 100) * 300), 300);
  return {
    total: earnings + fans + content + payouts + retention,
    categories: [
      { name: "EARNINGS", score: earnings, max: 200 },
      { name: "FAN BASE", score: fans, max: 200 },
      { name: "CONTENT", score: content, max: 150 },
      { name: "PAYOUTS", score: payouts, max: 150 },
      { name: "RETENTION", score: retention, max: 300 },
    ],
  };
}

export function CipherScore({ data }: { data: CipherScoreData }) {
  const [displayScore, setDisplayScore] = useState(0);
  const { total, categories } = calcScore(data);

  useEffect(() => {
    const start = performance.now();
    const duration = 1200;
    const raf = requestAnimationFrame(function step(now) {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplayScore(Math.round(total * eased));
      if (p < 1) requestAnimationFrame(step);
    });
    return () => cancelAnimationFrame(raf);
  }, [total]);

  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const progress = (displayScore / 1000) * circumference;
  const tier = total >= 800 ? "OBSIDIAN" : total >= 600 ? "GOLD" : total >= 400 ? "SILVER" : total >= 200 ? "BRONZE" : "CIPHER";
  const tierColor = total >= 800 ? "#e8ccff" : total >= 600 ? "#c8a96e" : total >= 400 ? "#a7adb8" : total >= 200 ? "#cd7f32" : "#555";

  return (
    <div style={{ background: "#111120", border: "1px solid rgba(255,255,255,0.055)", borderRadius: "8px", padding: "18px" }}>
      <div style={{ ...mono, fontSize: "10px", letterSpacing: "0.14em", color: "var(--gold-dim)", marginBottom: "14px" }}>CIPHER SCORE</div>
      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "20px", alignItems: "center" }}>
        <div style={{ position: "relative", width: "130px", height: "130px" }}>
          <svg width="130" height="130" style={{ transform: "rotate(-90deg)" }}>
            <circle cx="65" cy="65" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
            <circle
              cx="65" cy="65" r={radius} fill="none"
              stroke={tierColor}
              strokeWidth="10"
              strokeDasharray={`${progress} ${circumference - progress}`}
              strokeLinecap="round"
              style={{ transition: "stroke-dasharray 0.05s linear", filter: `drop-shadow(0 0 8px ${tierColor}55)` }}
            />
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <div style={{ ...disp, fontSize: "36px", color: tierColor, lineHeight: 1 }}>{displayScore}</div>
            <div style={{ ...mono, fontSize: "9px", color: tierColor, letterSpacing: "0.15em", marginTop: "2px" }}>{tier}</div>
          </div>
        </div>
        <div style={{ display: "grid", gap: "8px" }}>
          {categories.map(cat => (
            <div key={cat.name}>
              <div style={{ display: "flex", justifyContent: "space-between", ...mono, fontSize: "9px", color: "var(--dim)", marginBottom: "3px" }}>
                <span>{cat.name}</span>
                <span style={{ color: "var(--gold)" }}>{cat.score}/{cat.max}</span>
              </div>
              <div style={{ height: "4px", background: "rgba(255,255,255,0.06)", borderRadius: "2px", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${(cat.score / cat.max) * 100}%`, background: "linear-gradient(90deg, rgba(200,169,110,0.6), #c8a96e)", borderRadius: "2px", transition: "width 0.8s ease" }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Phantom Mode ──────────────────────────────────────────────────────────────
export function PhantomModeToggle({ userId, initialPhantom }: { userId: string; initialPhantom: boolean }) {
  const [phantom, setPhantom] = useState(initialPhantom);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const toggle = async () => {
    setLoading(true);
    setMsg("");
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("creator_applications")
        .update({ phantom_mode: !phantom })
        .eq("user_id", userId);

      if (error) throw error;
      setPhantom(!phantom);
      setMsg(phantom ? "Phantom mode disabled." : "Phantom mode enabled.");
    } catch (err) {
      console.error("Phantom toggle failed:", err);
      setMsg("Could not update phantom mode.");
    } finally {
      setLoading(false);
      setTimeout(() => setMsg(""), 3000);
    }
  };

  return (
    <div style={{ background: "#111120", border: "1px solid rgba(255,255,255,0.055)", borderRadius: "8px", padding: "18px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
        <div style={{ ...mono, fontSize: "10px", letterSpacing: "0.14em", color: "var(--gold-dim)" }}>PHANTOM MODE</div>
        <button
          onClick={toggle}
          disabled={loading}
          style={{
            width: "44px",
            height: "24px",
            borderRadius: "12px",
            border: "none",
            background: phantom ? "var(--gold)" : "rgba(255,255,255,0.15)",
            position: "relative",
            cursor: "pointer",
            transition: "background 0.2s",
          }}
        >
          <div style={{
            width: "18px",
            height: "18px",
            borderRadius: "50%",
            background: "#fff",
            position: "absolute",
            top: "3px",
            left: phantom ? "23px" : "3px",
            transition: "left 0.2s",
          }} />
        </button>
      </div>
      <div style={{ fontSize: "12px", color: "var(--dim)", lineHeight: 1.6 }}>
        {phantom
          ? "Your identity is hidden. Fans see only your cipher code."
          : "Your profile is visible. Toggle on for anonymous mode."}
      </div>
      {msg && <div style={{ fontSize: "11px", color: "var(--gold)", marginTop: "8px" }}>{msg}</div>}
    </div>
  );
}

// ─── Dark Vault ────────────────────────────────────────────────────────────────
export function DarkVault({ userId, hasPin, onSetup }: { userId: string; hasPin: boolean; onSetup: () => void }) {
  const [open, setOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const setup = async () => {
    if (pin.length < 4) {
      setMsg("PIN must be at least 4 digits");
      return;
    }
    if (pin !== confirmPin) {
      setMsg("PINs do not match");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/vault/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });

      if (!res.ok) throw new Error("Setup failed");
      setMsg("Vault PIN set successfully");
      onSetup();
      setTimeout(() => setOpen(false), 1500);
    } catch (err) {
      setMsg("Could not set PIN");
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <div style={{ background: "#111120", border: "1px solid rgba(255,255,255,0.055)", borderRadius: "8px", padding: "18px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ ...mono, fontSize: "10px", letterSpacing: "0.14em", color: "var(--gold-dim)", marginBottom: "6px" }}>DARK VAULT</div>
            <div style={{ fontSize: "12px", color: "var(--dim)" }}>
              {hasPin ? "PIN protected. Content encrypted at rest." : "Add a PIN to encrypt sensitive content."}
            </div>
          </div>
          <button
            onClick={() => setOpen(true)}
            style={{ padding: "10px 18px", borderRadius: "6px", border: `1px solid ${hasPin ? "rgba(200,169,110,0.3)" : "var(--gold)"}`, background: hasPin ? "transparent" : "var(--gold)", color: hasPin ? "var(--gold)" : "#120c00", ...mono, fontSize: "10px", letterSpacing: "0.1em", cursor: "pointer" }}
          >
            {hasPin ? "CHANGE" : "SETUP"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: "#111120", border: "1px solid rgba(200,169,110,0.3)", borderRadius: "8px", padding: "18px" }}>
      <div style={{ ...mono, fontSize: "10px", letterSpacing: "0.14em", color: "var(--gold-dim)", marginBottom: "14px" }}>SETUP VAULT PIN</div>
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <input
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          placeholder="Enter 4-6 digit PIN"
          value={pin}
          onChange={e => setPin(e.target.value.replace(/\D/g, ""))}
          style={{ padding: "12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", color: "#fff", fontSize: "16px", textAlign: "center", letterSpacing: "0.3em" }}
        />
        <input
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          placeholder="Confirm PIN"
          value={confirmPin}
          onChange={e => setConfirmPin(e.target.value.replace(/\D/g, ""))}
          style={{ padding: "12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", color: "#fff", fontSize: "16px", textAlign: "center", letterSpacing: "0.3em" }}
        />
        {msg && <div style={{ fontSize: "12px", color: msg.includes("success") ? "#4cc88c" : "#ff6a6a", textAlign: "center" }}>{msg}</div>}
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={() => setOpen(false)} style={{ flex: 1, padding: "12px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "var(--dim)", ...mono, fontSize: "11px", cursor: "pointer" }}>CANCEL</button>
          <button onClick={setup} disabled={loading} style={{ flex: 2, padding: "12px", borderRadius: "6px", border: "none", background: "var(--gold)", color: "#120c00", ...mono, fontSize: "11px", fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1 }}>{loading ? "SETTING..." : "SET PIN"}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Cipher Radio ──────────────────────────────────────────────────────────────
export function CipherRadio() {
  const [playing, setPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const tracks = [
    { title: "Midnight Protocol", artist: "CIPHER FM", duration: "3:42" },
    { title: "Neon Drift", artist: "CIPHER FM", duration: "4:15" },
    { title: "Shadow Markets", artist: "CIPHER FM", duration: "3:28" },
  ];

  const toggle = () => {
    setPlaying(!playing);
    // In real implementation, this would control an audio element
  };

  return (
    <div style={{ background: "#111120", border: "1px solid rgba(255,255,255,0.055)", borderRadius: "8px", padding: "18px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
        <div style={{ ...mono, fontSize: "10px", letterSpacing: "0.14em", color: "var(--gold-dim)" }}>CIPHER RADIO</div>
        <div style={{ display: "flex", gap: "6px" }}>
          <span style={{ width: "4px", height: "4px", borderRadius: "50%", background: playing ? "#4cc88c" : "var(--dim)", animation: playing ? "pulse 1s infinite" : "none" }} />
          <span style={{ ...mono, fontSize: "9px", color: playing ? "#4cc88c" : "var(--dim)" }}>{playing ? "LIVE" : "OFFLINE"}</span>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "16px" }}>
        <button
          onClick={toggle}
          style={{ width: "48px", height: "48px", borderRadius: "50%", border: "1px solid var(--gold)", background: playing ? "var(--gold)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
        >
          {playing ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#120c00"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--gold)"><polygon points="5,3 19,12 5,21" /></svg>
          )}
        </button>
        <div>
          <div style={{ ...disp, fontSize: "16px", color: "rgba(255,255,255,0.9)", marginBottom: "2px" }}>{tracks[currentTrack].title}</div>
          <div style={{ ...mono, fontSize: "10px", color: "var(--dim)" }}>{tracks[currentTrack].artist} · {tracks[currentTrack].duration}</div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {tracks.map((track, i) => (
          <button
            key={i}
            onClick={() => setCurrentTrack(i)}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "8px 10px",
              borderRadius: "4px",
              border: "none",
              background: currentTrack === i ? "rgba(200,169,110,0.1)" : "transparent",
              cursor: "pointer",
            }}
          >
            <span style={{ fontSize: "12px", color: currentTrack === i ? "var(--gold)" : "var(--dim)" }}>{track.title}</span>
            {currentTrack === i && playing && (
              <span style={{ display: "flex", gap: "2px" }}>
                {[0,1,2].map(j => <span key={j} style={{ width: "3px", height: "12px", background: "var(--gold)", animation: `eq 0.5s ease-in-out ${j * 0.1}s infinite alternate` }} />)}
              </span>
            )}
          </button>
        ))}
      </div>

      <style>{`
        @keyframes eq { from { height: 4px; } to { height: 14px; } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
      `}</style>
    </div>
  );
}

// ─── Cipher Radio Compact (Sidebar Version) ────────────────────────────────────
export function CipherRadioCompact() {
  const [playing, setPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(0);
  const [expanded, setExpanded] = useState(false);

  const tracks = [
    { title: "Midnight Protocol", artist: "CIPHER FM", duration: "3:42" },
    { title: "Neon Drift", artist: "CIPHER FM", duration: "4:15" },
    { title: "Shadow Markets", artist: "CIPHER FM", duration: "3:28" },
  ];

  const toggle = () => setPlaying(!playing);

  return (
    <div style={{ background: "linear-gradient(135deg, #0f0f1e 0%, #1a1a2e 100%)", border: "1px solid rgba(200,169,110,0.2)", borderRadius: "10px", padding: "12px", position: "relative", overflow: "hidden" }}>
      {/* Ambient glow */}
      <div style={{ position: "absolute", top: "-20px", right: "-20px", width: "60px", height: "60px", background: "radial-gradient(circle, rgba(200,169,110,0.15) 0%, transparent 70%)", borderRadius: "50%", pointerEvents: "none" }} />
      
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <button
          onClick={toggle}
          style={{ 
            width: "36px", 
            height: "36px", 
            borderRadius: "50%", 
            border: "1px solid rgba(200,169,110,0.4)", 
            background: playing ? "var(--gold)" : "transparent", 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center", 
            cursor: "pointer",
            flexShrink: 0,
            transition: "all 0.2s"
          }}
        >
          {playing ? (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="#120c00"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="var(--gold)"><polygon points="5,3 19,12 5,21" /></svg>
          )}
        </button>
        
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "2px" }}>
            <span style={{ 
              width: "4px", 
              height: "4px", 
              borderRadius: "50%", 
              background: playing ? "#4cc88c" : "var(--dim)", 
              animation: playing ? "pulse 1.5s infinite" : "none" 
            }} />
            <span style={{ ...mono, fontSize: "8px", color: playing ? "#4cc88c" : "var(--dim)", letterSpacing: "0.1em" }}>{playing ? "LIVE" : "OFFLINE"}</span>
          </div>
          <div style={{ ...disp, fontSize: "12px", color: "rgba(255,255,255,0.9)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {tracks[currentTrack].title}
          </div>
          <div style={{ ...mono, fontSize: "9px", color: "var(--dim)" }}>{tracks[currentTrack].artist}</div>
        </div>

        <button 
          onClick={() => setExpanded(!expanded)}
          style={{ 
            background: "transparent", 
            border: "none", 
            color: "var(--dim)", 
            cursor: "pointer",
            transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s"
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M7 10l5 5 5-5z"/></svg>
        </button>
      </div>

      {expanded && (
        <div style={{ marginTop: "10px", paddingTop: "10px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          {tracks.map((track, i) => (
            <button
              key={i}
              onClick={() => setCurrentTrack(i)}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                width: "100%",
                padding: "6px 8px",
                borderRadius: "4px",
                border: "none",
                background: currentTrack === i ? "rgba(200,169,110,0.1)" : "transparent",
                cursor: "pointer",
                marginBottom: "4px"
              }}
            >
              <span style={{ fontSize: "11px", color: currentTrack === i ? "var(--gold)" : "var(--dim)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{track.title}</span>
              <span style={{ ...mono, fontSize: "9px", color: "var(--dim)", flexShrink: 0 }}>{track.duration}</span>
            </button>
          ))}
        </div>
      )}

      {playing && (
        <div style={{ 
          position: "absolute", 
          bottom: 0, 
          left: 0, 
          right: 0, 
          height: "2px", 
          background: "linear-gradient(90deg, transparent, var(--gold), transparent)",
          opacity: 0.5
        }} />
      )}

      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
    </div>
  );
}

// ─── AI Daily Brief Widget ─────────────────────────────────────────────────────
export function DailyBriefWidget() {
  const [brief, setBrief] = useState<DailyBrief | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/ai/copilot/daily-brief")
      .then(r => r.json())
      .then(data => {
        setBrief(data.brief);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ background: "#111120", border: "1px solid rgba(255,255,255,0.055)", borderRadius: "12px", padding: "20px" }}>
      <div style={{ ...mono, fontSize: "10px", color: "var(--gold-dim)", marginBottom: "12px" }}>AI CO-PILOT</div>
      <div style={{ color: "var(--dim)", fontSize: "13px" }}>Generating your daily brief...</div>
    </div>
  );

  if (!brief) return null;

  const moodColors: Record<string, string> = {
    celebratory: "#4cc88c",
    calm: "#8dcfff",
    urgent: "#ff6a6a",
    focused: "var(--gold)"
  };
  const moodKey = brief.mood ?? "focused";
  const moodColor = moodColors[moodKey] || "var(--gold)";
  const wins = brief.wins ?? [];
  const priorities = brief.priorities ?? [];

  return (
    <div style={{ background: "linear-gradient(135deg, #0f0f1e 0%, #151528 100%)", border: "1px solid rgba(200,169,110,0.15)", borderRadius: "12px", padding: "20px", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: "-30px", right: "-30px", width: "100px", height: "100px", background: `radial-gradient(circle, ${moodColor}15 0%, transparent 70%)`, borderRadius: "50%" }} />
      
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
        <div>
          <div style={{ ...mono, fontSize: "9px", letterSpacing: "0.2em", color: "var(--gold-dim)", marginBottom: "6px" }}>AI CO-PILOT · DAILY BRIEF</div>
          <div style={{ ...disp, fontSize: "20px", color: "rgba(255,255,255,0.95)", lineHeight: 1.3 }}>{brief.headline}</div>
        </div>
        <div style={{ 
          padding: "4px 10px", 
          borderRadius: "100px", 
          background: `${moodColor}15`,
          border: `1px solid ${moodColor}30`,
          ...mono,
          fontSize: "9px",
          color: moodColor,
          textTransform: "uppercase",
          letterSpacing: "0.1em"
        }}>{brief.mood}</div>
      </div>

      {wins.length > 0 && (
        <div style={{ marginBottom: "16px" }}>
          <div style={{ ...mono, fontSize: "9px", color: "var(--dim)", marginBottom: "8px", letterSpacing: "0.1em" }}>WINS</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {wins.slice(0, 2).map((win: string, i: number) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ color: "#4cc88c", fontSize: "12px" }}>✓</span>
                <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.8)" }}>{win}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {priorities.length > 0 && (
        <div style={{ marginBottom: "16px" }}>
          <div style={{ ...mono, fontSize: "9px", color: "var(--dim)", marginBottom: "8px", letterSpacing: "0.1em" }}>TOP PRIORITY</div>
          <div style={{ background: "rgba(200,169,110,0.08)", border: "1px solid rgba(200,169,110,0.2)", borderRadius: "8px", padding: "12px" }}>
            <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.9)", marginBottom: "6px" }}>{priorities[0]?.action}</div>
            <div style={{ fontSize: "11px", color: "var(--dim)", lineHeight: 1.5 }}>{priorities[0]?.why}</div>
          </div>
        </div>
      )}

      {brief.moneyOpportunity && (
        <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px", background: "rgba(76,200,140,0.08)", border: "1px solid rgba(76,200,140,0.2)", borderRadius: "8px" }}>
          <span style={{ fontSize: "16px" }}>💰</span>
          <div>
            <div style={{ ...mono, fontSize: "9px", color: "#4cc88c", letterSpacing: "0.1em" }}>MONEY OPPORTUNITY</div>
            <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.85)" }}>{brief.moneyOpportunity.slice(0, 80)}...</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── AI Content Ideas Widget ───────────────────────────────────────────────────
export function ContentIdeasWidget() {
  const [ideas, setIdeas] = useState<ContentIdea[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [savingIndex, setSavingIndex] = useState<number | null>(null);
  const [saveMsg, setSaveMsg] = useState("");

  const saveIdeaToPlan = async (idea: ContentIdea, index: number) => {
    setSavingIndex(index);
    setSaveMsg("");
    try {
      const supabase = createClient();
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) throw new Error("You must be signed in.");

      const { error } = await supabase.from("content_plans_v2").insert({
        creator_id: userId,
        title: idea.title,
        description: idea.description,
        plan_type: idea.monetization === "free" ? "unlock" : idea.monetization,
        status: "idea",
        source: "ai",
        metadata: {
          engagement: idea.engagement || null,
          platform: idea.type,
        },
      });

      if (error) throw error;
      setSaveMsg(`Saved "${idea.title}" to your planning board.`);
    } catch (error) {
      setSaveMsg(error instanceof Error ? error.message : "Could not save idea.");
    } finally {
      setSavingIndex(null);
    }
  };

  const generate = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/content/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: 3 })
      });
      const data = await res.json();
      setIdeas(data.ideas || []);
      setExpanded(true);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  return (
    <div style={{ background: "#111120", border: "1px solid rgba(255,255,255,0.055)", borderRadius: "12px", padding: "18px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
        <div style={{ ...mono, fontSize: "10px", letterSpacing: "0.14em", color: "var(--gold-dim)" }}>AI CONTENT IDEAS</div>
        <button 
          onClick={generate}
          disabled={loading}
          style={{ 
            padding: "6px 12px", 
            background: "rgba(200,169,110,0.15)", 
            border: "1px solid rgba(200,169,110,0.3)", 
            borderRadius: "4px", 
            color: "var(--gold)", 
            ...mono, 
            fontSize: "9px", 
            cursor: "pointer",
            opacity: loading ? 0.6 : 1
          }}
        >
          {loading ? "GENERATING..." : "GENERATE"}
        </button>
      </div>

      {ideas.length === 0 && !loading && (
        <div style={{ textAlign: "center", padding: "20px" }}>
          <div style={{ fontSize: "24px", marginBottom: "8px" }}>✨</div>
          <div style={{ fontSize: "12px", color: "var(--dim)", marginBottom: "12px" }}>Stuck on what to create?</div>
          <div style={{ fontSize: "11px", color: "var(--dim)" }}>AI will analyze your niche and suggest 7 days of content.</div>
        </div>
      )}

      {ideas.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {ideas.slice(0, expanded ? ideas.length : 2).map((idea, i) => (
            <div key={i} style={{ padding: "12px", background: "rgba(255,255,255,0.03)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.05)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
                <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.9)", fontWeight: 500 }}>{idea.title}</div>
                <span style={{ 
                  ...mono, 
                  fontSize: "8px", 
                  padding: "2px 6px", 
                  borderRadius: "100px", 
                  background: idea.monetization !== "free" ? "rgba(200,169,110,0.15)" : "rgba(255,255,255,0.08)",
                  color: idea.monetization !== "free" ? "var(--gold)" : "var(--dim)"
                }}>{idea.monetization}</span>
              </div>
              <div style={{ fontSize: "11px", color: "var(--dim)", marginBottom: "8px", lineHeight: 1.5 }}>{idea.description}</div>
              <div style={{ display: "flex", gap: "8px" }}>
                <span style={{ ...mono, fontSize: "8px", color: "var(--dim)" }}>{idea.type}</span>
                <span style={{ color: "rgba(255,255,255,0.2)" }}>·</span>
                <span style={{ ...mono, fontSize: "8px", color: idea.engagement?.includes("high") ? "#4cc88c" : "var(--dim)" }}>{idea.engagement}</span>
              </div>
              <button
                onClick={() => void saveIdeaToPlan(idea, i)}
                disabled={savingIndex === i}
                style={{ marginTop: "10px", padding: "7px 10px", background: "rgba(200,169,110,0.12)", border: "1px solid rgba(200,169,110,0.28)", borderRadius: "6px", color: "var(--gold)", ...mono, fontSize: "9px", cursor: "pointer", opacity: savingIndex === i ? 0.6 : 1 }}
              >
                {savingIndex === i ? "SAVING..." : "ADD TO PLAN"}
              </button>
            </div>
          ))}
          {ideas.length > 2 && (
            <button 
              onClick={() => setExpanded(!expanded)}
              style={{ 
                background: "transparent", 
                border: "none", 
                color: "var(--gold)", 
                ...mono, 
                fontSize: "10px", 
                cursor: "pointer",
                padding: "8px"
              }}
            >
              {expanded ? "SHOW LESS" : `+${ideas.length - 2} MORE`}
            </button>
          )}
        </div>
      )}

      {saveMsg && <div style={{ marginTop: "10px", fontSize: "11px", color: saveMsg.startsWith("Saved") ? "var(--gold)" : "#ff6a6a" }}>{saveMsg}</div>}
    </div>
  );
}

export function OnboardingSnapshotWidget({
  snapshot,
  onOpen,
}: {
  snapshot: OnboardingSnapshot | null;
  onOpen: () => void;
}) {
  return (
    <div style={{ background: "linear-gradient(135deg, #0f0f1e 0%, #151528 100%)", border: "1px solid rgba(200,169,110,0.15)", borderRadius: "12px", padding: "20px", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at top right, rgba(200,169,110,0.08), transparent 45%)", pointerEvents: "none" }} />
      <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-start", marginBottom: "14px" }}>
        <div>
          <div style={{ ...mono, fontSize: "9px", letterSpacing: "0.2em", color: "var(--gold-dim)", marginBottom: "6px" }}>ONBOARDING BEAST AI</div>
          <div style={{ ...disp, fontSize: "22px", color: "rgba(255,255,255,0.94)" }}>{snapshot?.niche || "Build your creator strategy"}</div>
        </div>
        <button onClick={onOpen} style={{ padding: "8px 12px", background: "rgba(200,169,110,0.14)", border: "1px solid rgba(200,169,110,0.28)", borderRadius: "6px", color: "var(--gold)", ...mono, fontSize: "9px", cursor: "pointer" }}>
          {snapshot ? "REFINE" : "START"}
        </button>
      </div>

      {!snapshot && (
        <div style={{ fontSize: "12px", color: "var(--dim)", lineHeight: 1.6 }}>
          Run one onboarding strategy pass to generate your niche, pricing angle, content pillars, and 30-day growth plan.
        </div>
      )}

      {snapshot && (
        <div style={{ display: "grid", gap: "12px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div style={{ padding: "10px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
              <div style={{ ...mono, fontSize: "8px", color: "var(--gold-dim)", marginBottom: "4px" }}>CONFIDENCE</div>
              <div style={{ fontSize: "13px", color: "var(--white)" }}>{snapshot.confidence || "-"}</div>
            </div>
            <div style={{ padding: "10px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
              <div style={{ ...mono, fontSize: "8px", color: "var(--gold-dim)", marginBottom: "4px" }}>STARTING PRICE</div>
              <div style={{ fontSize: "13px", color: "var(--white)" }}>{snapshot.pricingRecommendation || "-"}</div>
            </div>
          </div>

          <div>
            <div style={{ ...mono, fontSize: "8px", color: "var(--gold-dim)", marginBottom: "6px" }}>FIRST 30 DAYS</div>
            <div style={{ display: "grid", gap: "6px" }}>
              {snapshot.first30Days.slice(0, 3).map((step, index) => (
                <div key={`${step}-${index}`} style={{ fontSize: "12px", color: "var(--muted)", lineHeight: 1.5 }}>{step}</div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Fan Personas Widget ───────────────────────────────────────────────────────
export function FanPersonasWidget() {
  const [personas, setPersonas] = useState<PersonasMap | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPersona, setSelectedPersona] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/ai/fans/personas")
      .then(r => r.json())
      .then(data => {
        setPersonas(data.personas);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const personaColors: Record<string, string> = {
    whale: "#c8a96e",
    loyal: "#8dcfff",
    at_risk: "#ff6a6a",
    new: "#4cc88c",
    lurker: "var(--dim)",
    regular: "#a7adb8"
  };

  const personaIcons: Record<string, string> = {
    whale: "🐋",
    loyal: "⭐",
    at_risk: "⚠️",
    new: "🌱",
    lurker: "👁️",
    regular: "👤"
  };

  if (loading) return (
    <div style={{ background: "#111120", border: "1px solid rgba(255,255,255,0.055)", borderRadius: "12px", padding: "18px" }}>
      <div style={{ ...mono, fontSize: "10px", color: "var(--gold-dim)", marginBottom: "12px" }}>AI FAN INTELLIGENCE</div>
      <div style={{ color: "var(--dim)", fontSize: "13px" }}>Analyzing fan segments...</div>
    </div>
  );

  if (!personas || Object.keys(personas).length === 0) return null;

  const sortedPersonas = Object.entries(personas).sort((a, b) => b[1].fans.length - a[1].fans.length);

  return (
    <div style={{ background: "linear-gradient(135deg, #0f0f1e 0%, #151528 100%)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "18px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
        <div style={{ ...mono, fontSize: "10px", letterSpacing: "0.14em", color: "var(--gold-dim)" }}>AI FAN INTELLIGENCE</div>
        <div style={{ ...mono, fontSize: "9px", color: "var(--dim)" }}>{Object.values(personas).reduce((s, p) => s + p.fans.length, 0)} FANS ANALYZED</div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {sortedPersonas.map(([key, data]) => (
          <div key={key}>
            <button
              onClick={() => setSelectedPersona(selectedPersona === key ? null : key)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "10px 12px",
                background: selectedPersona === key ? "rgba(255,255,255,0.05)" : "transparent",
                border: `1px solid ${selectedPersona === key ? personaColors[key] || "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.05)"}`,
                borderRadius: "8px",
                cursor: "pointer",
                transition: "all 0.2s"
              }}
            >
              <span style={{ fontSize: "18px" }}>{personaIcons[key]}</span>
              <div style={{ flex: 1, textAlign: "left" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.9)", textTransform: "capitalize" }}>{key.replace("_", " ")}</span>
                  <span style={{ ...mono, fontSize: "11px", color: personaColors[key] || "var(--gold)" }}>{data.fans.length}</span>
                </div>
                <div style={{ fontSize: "10px", color: "var(--dim)", marginTop: "2px" }}>
                  Avg: ${(data.fans.reduce((s, f) => s + f.totalSpent, 0) / data.fans.length).toFixed(0)}
                </div>
              </div>
            </button>

            {selectedPersona === key && data.insights && (
              <div style={{ marginTop: "8px", padding: "12px", background: "rgba(0,0,0,0.2)", borderRadius: "6px", borderLeft: `2px solid ${personaColors[key]}` }}>
                <div style={{ fontSize: "11px", color: "var(--dim)", marginBottom: "8px" }}>{data.insights.traits}</div>
                <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.8)", marginBottom: "8px" }}>
                  <span style={{ color: personaColors[key] }}>Strategy:</span> {data.insights.strategy}
                </div>
                {data.insights.messageTemplate && (
                  <div style={{ padding: "8px", background: "rgba(200,169,110,0.08)", borderRadius: "4px", fontSize: "11px", color: "rgba(255,255,255,0.7)", fontStyle: "italic" }}>
                    &quot;{data.insights.messageTemplate.slice(0, 100)}...&quot;
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Dynamic Pricing Widget ────────────────────────────────────────────────────
export function DynamicPricingWidget() {
  const [recommendation, setRecommendation] = useState<PricingRecommendation | null>(null);
  const [loading, setLoading] = useState(false);
  const [contentType, setContentType] = useState("unlock");
  const [contentQuality, setContentQuality] = useState("premium");

  const analyze = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/monetization/dynamic-pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentType, contentQuality, exclusivity: "standard" })
      });
      const data = await res.json();
      setRecommendation(data.recommendation);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  return (
    <div style={{ background: "#111120", border: "1px solid rgba(255,255,255,0.055)", borderRadius: "12px", padding: "18px" }}>
      <div style={{ ...mono, fontSize: "10px", letterSpacing: "0.14em", color: "var(--gold-dim)", marginBottom: "14px" }}>AI PRICING OPTIMIZER</div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "12px" }}>
        <select 
          value={contentType} 
          onChange={e => setContentType(e.target.value)}
          style={{ padding: "8px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", color: "#fff", fontSize: "12px" }}
        >
          <option value="unlock">Content Unlock</option>
          <option value="subscription">Subscription</option>
          <option value="tip">Tip/Donation</option>
          <option value="bundle">Bundle</option>
        </select>
        <select 
          value={contentQuality} 
          onChange={e => setContentQuality(e.target.value)}
          style={{ padding: "8px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", color: "#fff", fontSize: "12px" }}
        >
          <option value="standard">Standard</option>
          <option value="premium">Premium</option>
          <option value="exclusive">Exclusive</option>
        </select>
      </div>

      <button
        onClick={analyze}
        disabled={loading}
        style={{
          width: "100%",
          padding: "10px",
          background: "rgba(200,169,110,0.15)",
          border: "1px solid rgba(200,169,110,0.3)",
          borderRadius: "6px",
          color: "var(--gold)",
          ...mono,
          fontSize: "10px",
          cursor: "pointer",
          marginBottom: "14px",
          opacity: loading ? 0.6 : 1
        }}
      >
        {loading ? "ANALYZING..." : "GET OPTIMAL PRICE"}
      </button>

      {recommendation && (
        <div style={{ animation: "fadeIn 0.3s ease" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginBottom: "8px" }}>
            <span style={{ ...disp, fontSize: "32px", color: "var(--gold)" }}>{recommendation.optimalPrice}</span>
            <span style={{ ...mono, fontSize: "10px", color: "var(--dim)" }}>{recommendation.confidence} confidence</span>
          </div>
          
          <div style={{ fontSize: "11px", color: "var(--dim)", marginBottom: "12px", lineHeight: 1.5 }}>
            {recommendation.rationale}
          </div>

          {recommendation.dynamicPricing?.launch && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "12px" }}>
              <div style={{ padding: "8px", background: "rgba(76,200,140,0.08)", border: "1px solid rgba(76,200,140,0.2)", borderRadius: "6px", textAlign: "center" }}>
                <div style={{ ...mono, fontSize: "8px", color: "#4cc88c", marginBottom: "2px" }}>LAUNCH (24H)</div>
                <div style={{ fontSize: "16px", color: "#4cc88c" }}>${recommendation.dynamicPricing.launch}</div>
              </div>
              <div style={{ padding: "8px", background: "rgba(200,169,110,0.08)", border: "1px solid rgba(200,169,110,0.2)", borderRadius: "6px", textAlign: "center" }}>
                <div style={{ ...mono, fontSize: "8px", color: "var(--gold)", marginBottom: "2px" }}>STANDARD</div>
                <div style={{ fontSize: "16px", color: "var(--gold)" }}>${recommendation.dynamicPricing.standard}</div>
              </div>
            </div>
          )}

          {(recommendation.factors?.length ?? 0) > 0 && (
            <div>
              <div style={{ ...mono, fontSize: "9px", color: "var(--dim)", marginBottom: "6px" }}>FACTORS ANALYZED</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                {(recommendation.factors ?? []).slice(0, 3).map((factor: string, i: number) => (
                  <span key={i} style={{ padding: "4px 8px", background: "rgba(255,255,255,0.05)", borderRadius: "4px", fontSize: "10px", color: "rgba(255,255,255,0.7)" }}>
                    {factor.split(":")[0]}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}

// ─── Legacy Mode ───────────────────────────────────────────────────────────────
export function LegacyMode() {
  const [enabled, setEnabled] = useState(false);
  const [beneficiary, setBeneficiary] = useState("");
  const [percentage, setPercentage] = useState(50);

  return (
    <div style={{ background: "#111120", border: "1px solid rgba(255,255,255,0.055)", borderRadius: "8px", padding: "18px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
        <div style={{ ...mono, fontSize: "10px", letterSpacing: "0.14em", color: "var(--gold-dim)" }}>LEGACY MODE</div>
        <button
          onClick={() => setEnabled(!enabled)}
          style={{
            width: "44px",
            height: "24px",
            borderRadius: "12px",
            border: "none",
            background: enabled ? "var(--gold)" : "rgba(255,255,255,0.15)",
            position: "relative",
            cursor: "pointer",
            transition: "background 0.2s",
          }}
        >
          <div style={{
            width: "18px",
            height: "18px",
            borderRadius: "50%",
            background: "#fff",
            position: "absolute",
            top: "3px",
            left: enabled ? "23px" : "3px",
            transition: "left 0.2s",
          }} />
        </button>
      </div>

      <div style={{ fontSize: "12px", color: "var(--dim)", lineHeight: 1.6, marginBottom: enabled ? "16px" : 0 }}>
        Automatically transfer earnings to a beneficiary if inactive for 12 months.
      </div>

      {enabled && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", paddingTop: "14px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div>
            <label style={{ ...mono, fontSize: "9px", color: "var(--dim)", display: "block", marginBottom: "4px" }}>BENEFICIARY WALLET</label>
            <input
              type="text"
              value={beneficiary}
              onChange={e => setBeneficiary(e.target.value)}
              placeholder="0x... or @handle"
              style={{ width: "100%", padding: "10px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "4px", color: "#fff", fontSize: "13px" }}
            />
          </div>
          <div>
            <label style={{ ...mono, fontSize: "9px", color: "var(--dim)", display: "block", marginBottom: "4px" }}>TRANSFER PERCENTAGE: {percentage}%</label>
            <input
              type="range"
              min={10}
              max={100}
              step={10}
              value={percentage}
              onChange={e => setPercentage(parseInt(e.target.value))}
              style={{ width: "100%" }}
            />
          </div>
          <button style={{ padding: "10px", background: "rgba(200,169,110,0.15)", border: "1px solid rgba(200,169,110,0.3)", borderRadius: "4px", color: "var(--gold)", ...mono, fontSize: "10px", cursor: "pointer" }}>
            SAVE LEGACY CONFIGURATION
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Voice Clone Widget ───────────────────────────────────────────────────────
export function VoiceCloneWidget() {
  return (
    <div style={{ background: "linear-gradient(135deg, #0f0f1e 0%, #151528 100%)", border: "1px solid rgba(200,169,110,0.15)", borderRadius: "12px", padding: "18px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
        <div>
          <div style={{ ...mono, fontSize: "10px", letterSpacing: "0.14em", color: "var(--gold-dim)" }}>VOICE STUDIO</div>
          <div style={{ fontSize: "11px", color: "var(--dim)", marginTop: "2px" }}>Coming soon</div>
        </div>
        <div style={{ fontSize: "24px" }}>🎙️</div>
      </div>
      <div style={{ border: "1px dashed rgba(200,169,110,0.28)", borderRadius: "10px", padding: "16px", background: "rgba(200,169,110,0.04)" }}>
        <div style={{ ...mono, fontSize: "9px", color: "var(--gold-dim)", letterSpacing: "0.12em", marginBottom: "8px" }}>LIMITED ROLLOUT</div>
        <div style={{ fontSize: "12px", color: "var(--muted)", lineHeight: 1.7 }}>
          Voice Studio is intentionally gated for a private release. Current dashboard stays focused on core monetization and growth tools.
        </div>
      </div>
    </div>
  );
}

// ─── Fan Prediction Engine ────────────────────────────────────────────────────
export function FanPredictionEngine() {
  const [predictions, setPredictions] = useState<Array<{ title: string; value: string; direction: string; confidence: number }>>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const run = async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await fetch("/api/tools/predict", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Prediction failed");
      setPredictions(data.predictions || []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to generate predictions");
    } finally {
      setLoading(false);
    }
  };

  const dirColor = (d: string) => d === "up" ? "var(--gold)" : d === "down" ? "#ff6a6a" : "var(--dim)";
  const dirIcon = (d: string) => d === "up" ? "▲" : d === "down" ? "▼" : "—";

  return (
    <div style={{ background: "#111120", border: "1px solid rgba(255,255,255,0.055)", borderRadius: "8px", padding: "18px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
        <div style={{ ...mono, fontSize: "10px", letterSpacing: "0.14em", color: "var(--gold-dim)" }}>FAN PREDICTION ENGINE</div>
        <button
          onClick={run}
          disabled={loading}
          style={{ padding: "7px 12px", borderRadius: "6px", border: "none", background: "var(--gold)", color: "#120c00", ...mono, fontSize: "10px", letterSpacing: "0.1em", cursor: "pointer" }}
        >
          {loading ? "PREDICTING..." : "RUN PREDICTION"}
        </button>
      </div>

      {predictions.length === 0 && !loading && (
        <div style={{ fontSize: "13px", color: "var(--dim)", textAlign: "center", padding: "20px" }}>
          Hit &quot;RUN PREDICTION&quot; to analyze your trajectory.
        </div>
      )}

      {loading && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "8px" }}>
          {[0,1,2,3,4].map(i => (
            <div key={i} style={{ height: "80px", background: "rgba(255,255,255,0.04)", borderRadius: "8px", animation: "pulseGold 1.2s ease-in-out infinite", animationDelay: `${i * 0.1}s` }} />
          ))}
        </div>
      )}

      {predictions.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "8px" }}>
          {predictions.map((pred, i) => (
            <div key={i} style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", padding: "12px", background: "rgba(255,255,255,0.02)" }}>
              <div style={{ ...mono, fontSize: "9px", color: "var(--dim)", marginBottom: "6px" }}>{pred.title}</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
                <div style={{ ...disp, fontSize: "22px", color: dirColor(pred.direction) }}>{pred.value}</div>
                <div style={{ fontSize: "12px", color: dirColor(pred.direction) }}>{dirIcon(pred.direction)}</div>
              </div>
              <div style={{ marginTop: "8px", height: "3px", background: "rgba(255,255,255,0.06)", borderRadius: "2px", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${pred.confidence}%`, background: dirColor(pred.direction) }} />
              </div>
              <div style={{ ...mono, fontSize: "9px", color: "var(--dim)", marginTop: "3px" }}>{pred.confidence}% confidence</div>
            </div>
          ))}
        </div>
      )}

      {err && <div style={{ fontSize: "12px", color: "#ff6a6a", marginTop: "8px" }}>{err}</div>}
    </div>
  );
}

// Re-export FanCodeGenerator from separate file
export { FanCodeGenerator } from "./FanCodeGenerator";
export type { FanCodeGeneratorProps } from "./FanCodeGenerator";
