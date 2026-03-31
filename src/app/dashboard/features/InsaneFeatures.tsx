"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";

const mono: React.CSSProperties = { fontFamily: "var(--font-mono)" };
const disp: React.CSSProperties = { fontFamily: "var(--font-display)" };
const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

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
  const [active, setActive] = useState(initialPhantom);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("creator_applications")
        .upsert({ user_id: userId, phantom_mode: !active }, { onConflict: "user_id" });

      if (error) {
        console.error("Phantom mode upsert error:", error);
        return;
      }

      setActive(v => !v);
    } catch (err) {
      console.error("Phantom mode toggle failed:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={loading}
      title={active ? "Phantom Mode ON — Your page is hidden from discovery" : "Phantom Mode OFF — You are visible"}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        padding: "8px 12px",
        background: active ? "rgba(200,169,110,0.12)" : "rgba(255,255,255,0.04)",
        border: `1px solid ${active ? "rgba(200,169,110,0.5)" : "rgba(255,255,255,0.1)"}`,
        borderRadius: "999px",
        cursor: "pointer",
        transition: "all 0.2s",
        ...mono,
        fontSize: "9px",
        letterSpacing: "0.12em",
        color: active ? "var(--gold)" : "var(--dim)",
      }}
    >
      <span style={{ fontSize: "12px" }}>{active ? "👁" : "◎"}</span>
      {active ? "PHANTOM" : "VISIBLE"}
    </button>
  );
}

// ─── Dark Vault ────────────────────────────────────────────────────────────────
const PIN_KDF_VERSION = "pbkdf2-v1";
const PIN_KDF_ITERATIONS = 210000;
const PIN_KDF_HASH = "SHA-256";

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach(byte => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function derivePinKey(pin: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const saltBuffer = salt.buffer.slice(salt.byteOffset, salt.byteOffset + salt.byteLength) as ArrayBuffer;
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(pin),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: saltBuffer,
      iterations,
      hash: PIN_KDF_HASH,
    },
    keyMaterial,
    256
  );

  return new Uint8Array(bits);
}

async function createPinRecord(pin: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const derivedKey = await derivePinKey(pin, salt, PIN_KDF_ITERATIONS);
  return `${PIN_KDF_VERSION}$${PIN_KDF_ITERATIONS}$${bytesToBase64(salt)}$${bytesToBase64(derivedKey)}`;
}

async function verifyPinRecord(pin: string, storedRecord: string): Promise<boolean> {
  const parts = storedRecord.split("$");
  if (parts.length !== 4) return false;

  const [version, iterText, saltB64, keyB64] = parts;
  if (version !== PIN_KDF_VERSION) return false;

  const iterations = Number(iterText);
  if (!Number.isFinite(iterations) || iterations <= 0) return false;

  const salt = base64ToBytes(saltB64);
  const expected = base64ToBytes(keyB64);
  const actual = await derivePinKey(pin, salt, iterations);

  if (actual.length !== expected.length) return false;

  let diff = 0;
  for (let i = 0; i < actual.length; i += 1) {
    diff |= actual[i] ^ expected[i];
  }
  return diff === 0;
}

export function DarkVault({ userId, hasPin }: { userId: string; hasPin: boolean }) {
  const [open, setOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [phase, setPhase] = useState<"lock" | "set" | "confirm" | "open">(hasPin ? "lock" : "set");
  const [confirmPin, setConfirmPin] = useState("");
  const [shake, setShake] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [savingPin, setSavingPin] = useState(false);
  const [msg, setMsg] = useState("");

  const isMissingTableError = (code?: string, message?: string) =>
    code === "42P01" || /relation .* does not exist/i.test(message ?? "");

  const VAULT_NOTE = "Your darkest thoughts, manifested.";

  const handleDigit = (d: string) => {
    if (pin.length >= 4) return;
    const next = pin + d;
    setPin(next);
    if (next.length === 4) {
      setTimeout(() => handleFourDigits(next), 80);
    }
  };

  const handleFourDigits = async (entered: string) => {
    if (phase === "lock") {
      // Verify against stored hash, preferring dedicated vault table.
      const supabase = createClient();
      const { data: vaultPinRow, error: vaultPinErr } = await supabase
        .from("creator_vault_pins")
        .select("pin_hash")
        .eq("creator_id", userId)
        .maybeSingle();

      if (vaultPinErr && !isMissingTableError(vaultPinErr.code, vaultPinErr.message)) {
        console.error("Vault PIN fetch failed:", vaultPinErr);
        setMsg("Vault verification failed. Try again.");
        setPin("");
        return;
      }

      let storedRecord = vaultPinRow?.pin_hash ?? "";
      if (!storedRecord) {
        const { data: legacyRow, error: legacyErr } = await supabase
          .from("creator_applications")
          .select("vault_pin_hash")
          .eq("user_id", userId)
          .maybeSingle();

        if (legacyErr && !isMissingTableError(legacyErr.code, legacyErr.message)) {
          console.error("Legacy vault PIN fetch failed:", legacyErr);
          setMsg("Vault verification failed. Try again.");
          setPin("");
          return;
        }

        storedRecord = legacyRow?.vault_pin_hash ?? "";
      }

      if (!storedRecord) {
        setMsg("No vault PIN found. Set a new PIN.");
        setPhase("set");
        setPin("");
        return;
      }

      const verified = await verifyPinRecord(entered, storedRecord);
      if (verified) {
        setUnlocked(true);
        setPhase("open");
        setMsg("");
      } else {
        setShake(true);
        setTimeout(() => { setShake(false); setPin(""); }, 500);
        setMsg("Wrong PIN");
      }
    } else if (phase === "set") {
      setConfirmPin(entered);
      setPhase("confirm");
      setPin("");
    } else if (phase === "confirm") {
      if (entered === confirmPin) {
        setSavingPin(true);
        try {
          const pinRecord = await createPinRecord(entered);
          const supabase = createClient();
          const { error: vaultSaveErr } = await supabase
            .from("creator_vault_pins")
            .upsert({ creator_id: userId, pin_hash: pinRecord, updated_at: new Date().toISOString() }, { onConflict: "creator_id" });

          if (vaultSaveErr && !isMissingTableError(vaultSaveErr.code, vaultSaveErr.message)) {
            console.error("Vault PIN save failed:", vaultSaveErr);
            setMsg("Could not save PIN. Please try again.");
            setPin("");
            setConfirmPin("");
            setPhase("set");
            return;
          }

          if (vaultSaveErr && isMissingTableError(vaultSaveErr.code, vaultSaveErr.message)) {
            // Backward-compatible fallback for environments where migration has not run yet.
            const { data: legacyRows, error: legacySaveErr } = await supabase
              .from("creator_applications")
              .update({ vault_pin_hash: pinRecord })
              .eq("user_id", userId)
              .select("user_id")
              .limit(1);

            if (legacySaveErr || !legacyRows || legacyRows.length === 0) {
              console.error("Legacy vault PIN save failed:", legacySaveErr);
              setMsg("Could not save PIN. Please run the latest migration and try again.");
              setPin("");
              setConfirmPin("");
              setPhase("set");
              return;
            }
          }

          setUnlocked(true);
          setPhase("open");
          setMsg("Vault sealed. PIN set.");
        } finally {
          setSavingPin(false);
        }
      } else {
        setShake(true);
        setTimeout(() => { setShake(false); setPin(""); setConfirmPin(""); setPhase("set"); }, 500);
        setMsg("PINs don't match. Start again.");
      }
    }
  };

  const KEYS = ["1","2","3","4","5","6","7","8","9","","0","⌫"];

  if (!open) {
    return (
      <div
        onClick={() => setOpen(true)}
        style={{ background: "#111120", border: "1px solid rgba(255,255,255,0.055)", borderRadius: "8px", padding: "18px", cursor: "pointer", transition: "border-color 0.2s", display: "flex", alignItems: "center", justifyContent: "space-between" }}
      >
        <div>
          <div style={{ ...mono, fontSize: "10px", letterSpacing: "0.14em", color: "var(--gold-dim)", marginBottom: "6px" }}>DARK VAULT</div>
          <div style={{ fontSize: "13px", color: "var(--dim)" }}>{hasPin ? "PIN protected. Tap to unlock." : "Set a PIN to create your vault."}</div>
        </div>
        <div style={{ fontSize: "32px", filter: "grayscale(0.3)" }}>🔐</div>
      </div>
    );
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", backdropFilter: "blur(12px)", zIndex: 9100, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: "320px", background: "#060610", border: "1px solid rgba(200,169,110,0.4)", borderRadius: "16px", padding: "32px 24px", textAlign: "center" }}>
        <div style={{ ...disp, fontSize: "48px", marginBottom: "4px" }}>🔐</div>
        <div style={{ ...disp, fontSize: "28px", color: "var(--gold)", marginBottom: "4px" }}>Dark Vault</div>
        <div style={{ ...mono, fontSize: "10px", color: "var(--dim)", marginBottom: "24px", letterSpacing: "0.1em" }}>
          {phase === "lock" ? "ENTER PIN" : phase === "set" ? "SET A 4-DIGIT PIN" : phase === "confirm" ? "CONFIRM PIN" : "VAULT OPEN"}
        </div>

        {phase !== "open" && (
          <>
            <div
              style={{ display: "flex", justifyContent: "center", gap: "12px", marginBottom: "24px", animation: shake ? "shakeX 0.4s ease" : "none" }}
            >
              {[0,1,2,3].map(i => (
                <div key={i} style={{ width: "14px", height: "14px", borderRadius: "50%", border: `2px solid ${pin.length > i ? "var(--gold)" : "rgba(255,255,255,0.2)"}`, background: pin.length > i ? "var(--gold)" : "transparent", transition: "all 0.15s" }} />
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "10px" }}>
              {KEYS.map((k, idx) => (
                <button
                  key={idx}
                  onClick={() => k === "⌫" ? setPin(p => p.slice(0, -1)) : k ? handleDigit(k) : undefined}
                  disabled={savingPin}
                  style={{ height: "54px", borderRadius: "10px", border: k ? "1px solid rgba(255,255,255,0.12)" : "none", background: k ? "rgba(255,255,255,0.04)" : "transparent", color: k === "⌫" ? "var(--dim)" : "var(--white)", fontSize: k === "⌫" ? "18px" : "20px", cursor: k ? "pointer" : "default", transition: "background 0.1s", ...mono }}
                >
                  {k}
                </button>
              ))}
            </div>

            {msg && <div style={{ marginTop: "12px", fontSize: "12px", color: msg.includes("sealed") ? "var(--gold)" : "#ff6a6a" }}>{msg}</div>}

            <button onClick={() => setOpen(false)} style={{ marginTop: "20px", background: "transparent", border: "none", color: "var(--dim)", ...mono, fontSize: "10px", cursor: "pointer", letterSpacing: "0.1em" }}>CLOSE</button>
          </>
        )}

        {phase === "open" && unlocked && (
          <div>
            <div style={{ border: "1px solid rgba(200,169,110,0.2)", borderRadius: "10px", padding: "20px", marginBottom: "16px", background: "rgba(200,169,110,0.04)" }}>
              <div style={{ ...disp, fontSize: "18px", color: "var(--gold)", lineHeight: 1.8 }}>{VAULT_NOTE}</div>
              <div style={{ fontSize: "12px", color: "var(--dim)", marginTop: "10px" }}>Your vault is open. No one else can see this.</div>
            </div>
            <button onClick={() => { setOpen(false); setUnlocked(false); setPhase(hasPin ? "lock" : "set"); setPin(""); }} style={{ border: "none", borderRadius: "6px", padding: "10px 16px", background: "var(--gold)", color: "#120c00", ...mono, fontSize: "11px", letterSpacing: "0.1em", cursor: "pointer" }}>
              LOCK VAULT
            </button>
          </div>
        )}
      </div>
      <style>{`@keyframes shakeX { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-8px)} 40%,80%{transform:translateX(8px)} }`}</style>
    </div>
  );
}

// ─── CIPHER Radio ──────────────────────────────────────────────────────────────
const CIPHER_RADIO_TRACKS = [
  { title: "Midnight Gold", artist: "CIPHER Mix Vol. 1", videoId: "jfKfPfyJRdk" },
  { title: "Dark Luxury Lounge", artist: "Ambient Series", videoId: "5qap5aO4i9A" },
  { title: "The Creator's Hour", artist: "CIPHER Exclusive", videoId: "lTRiuFIWV54" },
];

export function CipherRadio() {
  const [open, setOpen] = useState(false);
  const [trackIdx, setTrackIdx] = useState(0);
  const [beat, setBeat] = useState(0);

  const track = CIPHER_RADIO_TRACKS[trackIdx];

  useEffect(() => {
    if (!open) return;
    const interval = setInterval(() => setBeat(b => (b + 1) % 4), 400);
    return () => clearInterval(interval);
  }, [open]);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 12px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "999px", cursor: "pointer", ...mono, fontSize: "9px", letterSpacing: "0.12em", color: "var(--muted)", transition: "all 0.15s" }}
      >
        <span style={{ fontSize: "12px" }}>♪</span>
        CIPHER RADIO
      </button>
    );
  }

  return (
    <div style={{ width: "100%", maxWidth: "100%", minWidth: 0, boxSizing: "border-box", background: "#0d0d18", border: "1px solid rgba(200,169,110,0.35)", borderRadius: "14px", overflow: "hidden", boxShadow: "0 10px 30px rgba(0,0,0,0.35)" }}>
      <div style={{ padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          {[0,1,2,3].map(i => (
            <div key={i} style={{ width: "3px", borderRadius: "1px", background: "var(--gold)", height: `${8 + (beat === i ? 14 : Math.abs(i - beat) === 1 ? 10 : 6)}px`, transition: "height 0.2s ease", opacity: 0.7 + (beat === i ? 0.3 : 0) }} />
          ))}
          <span style={{ ...mono, fontSize: "9px", color: "var(--gold)", letterSpacing: "0.15em", marginLeft: "6px" }}>CIPHER RADIO</span>
        </div>
        <button onClick={() => setOpen(false)} style={{ background: "transparent", border: "none", color: "var(--dim)", cursor: "pointer", fontSize: "16px" }}>×</button>
      </div>

      <div style={{ padding: "12px" }}>
        <div style={{ marginBottom: "10px" }}>
          <div style={{ fontSize: "14px", color: "var(--white)", marginBottom: "2px" }}>{track.title}</div>
          <div style={{ ...mono, fontSize: "10px", color: "var(--dim)" }}>{track.artist}</div>
        </div>

        <iframe
          src={`https://www.youtube.com/embed/${track.videoId}?autoplay=1&controls=0&modestbranding=1&loop=1&playlist=${track.videoId}`}
          width="100%"
          height="160"
          allow="autoplay; encrypted-media"
          style={{ border: "none", borderRadius: "8px", display: "block" }}
          title={track.title}
        />

        <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginTop: "10px" }}>
          <button
            onClick={() => setTrackIdx(i => (i - 1 + CIPHER_RADIO_TRACKS.length) % CIPHER_RADIO_TRACKS.length)}
            style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "999px", color: "var(--dim)", cursor: "pointer", padding: "6px 12px", ...mono, fontSize: "10px" }}
          >◀</button>
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", ...mono, fontSize: "9px", color: "var(--gold-dim)" }}>
            {trackIdx + 1} / {CIPHER_RADIO_TRACKS.length}
          </div>
          <button
            onClick={() => setTrackIdx(i => (i + 1) % CIPHER_RADIO_TRACKS.length)}
            style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "999px", color: "var(--dim)", cursor: "pointer", padding: "6px 12px", ...mono, fontSize: "10px" }}
          >▶</button>
        </div>
      </div>
    </div>
  );
}

// ─── Legacy Mode ───────────────────────────────────────────────────────────────
const MILESTONES = [
  { score: 100, label: "First Signal", icon: "◎" },
  { score: 250, label: "Dark Star Rising", icon: "★" },
  { score: 500, label: "Cipher Forged", icon: "⬡" },
  { score: 750, label: "Gold Standard", icon: "◈" },
  { score: 1000, label: "The Obsidian", icon: "♦" },
];

export function LegacyMode({ totalScore, userEmail, totalEarnings, fanCount }: { totalScore: number; userEmail: string; totalEarnings: number; fanCount: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [generated, setGenerated] = useState(false);

  const reached = MILESTONES.filter(m => totalScore >= m.score);
  const next = MILESTONES.find(m => totalScore < m.score);

  const generateCertificate = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const fontSizePx = (font: string) => {
      const match = font.match(/(\d+(?:\.\d+)?)px/);
      return match ? Number(match[1]) : 16;
    };

    const drawTextWithLetterSpacing = (
      c: CanvasRenderingContext2D,
      text: string,
      x: number,
      y: number,
      letterSpacingPx: number
    ) => {
      if (!text) return;
      const glyphs = Array.from(text);
      const widths = glyphs.map(glyph => c.measureText(glyph).width);
      const totalWidth = widths.reduce((sum, w) => sum + w, 0) + letterSpacingPx * Math.max(glyphs.length - 1, 0);

      let cursorX = x;
      if (c.textAlign === "center") cursorX = x - totalWidth / 2;
      if (c.textAlign === "right" || c.textAlign === "end") cursorX = x - totalWidth;

      glyphs.forEach((glyph, idx) => {
        c.fillText(glyph, cursorX, y);
        cursorX += widths[idx] + letterSpacingPx;
      });
    };

    canvas.width = 800;
    canvas.height = 500;

    // Background
    ctx.fillStyle = "#020203";
    ctx.fillRect(0, 0, 800, 500);

    // Gold border
    ctx.strokeStyle = "#c8a96e";
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 20, 760, 460);
    ctx.strokeStyle = "rgba(200,169,110,0.3)";
    ctx.lineWidth = 1;
    ctx.strokeRect(28, 28, 744, 444);

    // Corner ornaments
    const corners = [[40,40],[760,40],[40,460],[760,460]];
    corners.forEach(([x,y]) => {
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fillStyle = "#c8a96e";
      ctx.fill();
    });

    // CIPHER title
    ctx.fillStyle = "#c8a96e";
    ctx.font = "bold 14px monospace";
    ctx.textAlign = "center";
    drawTextWithLetterSpacing(ctx, "CIPHER PLATFORM", 400, 70, fontSizePx(ctx.font) * 0.3);

    // Certificate of Legacy
    ctx.fillStyle = "#e8d5a8";
    ctx.font = "italic 38px Georgia";
    ctx.fillText("Certificate of Legacy", 400, 130);

    // This certifies
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "14px Georgia";
    ctx.fillText("This certifies that", 400, 175);

    // Creator name
    ctx.fillStyle = "#c8a96e";
    ctx.font = "bold 28px Georgia";
    ctx.fillText(userEmail.split("@")[0].toUpperCase(), 400, 220);

    // Details
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.font = "13px monospace";
    ctx.fillText(`has achieved a CIPHER Score of ${totalScore}/1000`, 400, 265);
    ctx.fillText(`${money.format(totalEarnings)} earned · ${fanCount} fan codes`, 400, 290);

    // Top tier milestone
    const topMilestone = reached[reached.length - 1];
    if (topMilestone) {
      ctx.fillStyle = "#c8a96e";
      ctx.font = "bold 18px Georgia";
      ctx.fillText(`${topMilestone.icon} ${topMilestone.label}`, 400, 340);
    }

    // Date
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.font = "11px monospace";
    ctx.fillText(new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }), 400, 420);

    // Gold line
    ctx.beginPath();
    ctx.moveTo(100, 395);
    ctx.lineTo(300, 395);
    ctx.strokeStyle = "rgba(200,169,110,0.5)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(500, 395);
    ctx.lineTo(700, 395);
    ctx.stroke();

    ctx.fillStyle = "rgba(200,169,110,0.3)";
    ctx.font = "11px monospace";
    ctx.fillText("CIPHER VERIFIED", 400, 455);

    setGenerated(true);
  };

  const downloadCertificate = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `cipher_legacy_${userEmail.split("@")[0]}.png`;
    a.click();
  };

  return (
    <div style={{ background: "#111120", border: "1px solid rgba(255,255,255,0.055)", borderRadius: "8px", padding: "18px" }}>
      <div style={{ ...mono, fontSize: "10px", letterSpacing: "0.14em", color: "var(--gold-dim)", marginBottom: "14px" }}>LEGACY MODE</div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: "6px", marginBottom: "16px" }}>
        {MILESTONES.map(m => {
          const done = totalScore >= m.score;
          return (
            <div key={m.score} style={{ textAlign: "center", padding: "10px 6px", border: `1px solid ${done ? "rgba(200,169,110,0.5)" : "rgba(255,255,255,0.06)"}`, borderRadius: "8px", background: done ? "rgba(200,169,110,0.07)" : "transparent" }}>
              <div style={{ fontSize: "20px", opacity: done ? 1 : 0.25 }}>{m.icon}</div>
              <div style={{ fontSize: "10px", color: done ? "var(--gold)" : "var(--dim)", marginTop: "4px", lineHeight: 1.3 }}>{m.label}</div>
              <div style={{ ...mono, fontSize: "9px", color: "var(--muted)", marginTop: "2px" }}>{m.score}</div>
            </div>
          );
        })}
      </div>

      {next && (
        <div style={{ marginBottom: "14px", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "8px", padding: "10px", background: "rgba(255,255,255,0.02)" }}>
          <div style={{ ...mono, fontSize: "9px", color: "var(--dim)" }}>
            NEXT: <span style={{ color: "var(--gold)" }}>{next.label}</span> at {next.score} — you need {next.score - totalScore} more points
          </div>
          <div style={{ marginTop: "8px", height: "4px", background: "rgba(255,255,255,0.06)", borderRadius: "2px", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${(totalScore / next.score) * 100}%`, background: "linear-gradient(90deg, rgba(200,169,110,0.5), #c8a96e)" }} />
          </div>
        </div>
      )}

      <canvas ref={canvasRef} style={{ display: "block", maxWidth: "100%", borderRadius: "8px", marginBottom: "10px", border: generated ? "1px solid rgba(200,169,110,0.3)" : "none" }} />

      <div style={{ display: "flex", gap: "8px" }}>
        <button
          onClick={generateCertificate}
          style={{ border: "none", borderRadius: "6px", padding: "10px 14px", background: "var(--gold)", color: "#120c00", ...mono, fontSize: "11px", letterSpacing: "0.1em", cursor: "pointer" }}
        >
          GENERATE CERTIFICATE
        </button>
        {generated && (
          <button
            onClick={downloadCertificate}
            style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: "6px", padding: "10px 14px", background: "transparent", color: "var(--dim)", ...mono, fontSize: "11px", letterSpacing: "0.1em", cursor: "pointer" }}
          >
            DOWNLOAD PNG
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Fan Prediction Engine ─────────────────────────────────────────────────────
type BestPostDayPrediction = {
  day: "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";
  confidence: number;
  direction: "up" | "down" | "neutral";
};

function computeBestPostDay(engagementData: {
  totalEarnings: number;
  fanCount: number;
  retentionRate: number;
  chartTrend: "up" | "down";
}): BestPostDayPrediction {
  const days: BestPostDayPrediction["day"][] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const seed =
    Math.round(engagementData.totalEarnings) +
    engagementData.fanCount * 17 +
    Math.round(engagementData.retentionRate * 10) * 7 +
    (engagementData.chartTrend === "up" ? 29 : 11);

  const day = days[Math.abs(seed) % days.length];
  const confidence = Math.max(55, Math.min(92, Math.round(58 + engagementData.retentionRate * 0.34 + (engagementData.chartTrend === "up" ? 8 : -4))));
  const direction: BestPostDayPrediction["direction"] =
    engagementData.chartTrend === "up" ? "up" : engagementData.retentionRate >= 45 ? "neutral" : "down";

  return { day, confidence, direction };
}

export function FanPredictionEngine({ totalEarnings, fanCount, retentionRate, chartTrend }: {
  totalEarnings: number;
  fanCount: number;
  retentionRate: number;
  chartTrend: "up" | "down";
}) {
  const [loading, setLoading] = useState(false);
  const [predictions, setPredictions] = useState<Array<{ title: string; value: string; confidence: number; direction: "up" | "down" | "neutral" }>>([]);
  const [err, setErr] = useState("");

  const run = async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await fetch("/api/tools/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPrice: 25, contentType: "subscription" }),
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => String(res.status));
        throw new Error(`Prediction API error (${res.status}): ${errText}`);
      }
      const json = await res.json();

      // Build prediction cards from response + computed data
      const nextMonthRevenue = totalEarnings * (chartTrend === "up" ? 1.18 : 0.85);
      const fanGrowth = Math.round(fanCount * (retentionRate / 100) * 1.2);
      const bestPostDay = computeBestPostDay({
        totalEarnings,
        fanCount,
        retentionRate,
        chartTrend,
      });

      const computed = [
        {
          title: "30-Day Revenue",
          value: money.format(nextMonthRevenue),
          confidence: Math.round(60 + (retentionRate * 0.3)),
          direction: chartTrend,
        },
        {
          title: "Fan Growth",
          value: `+${fanGrowth} fans`,
          confidence: Math.round(55 + (retentionRate * 0.25)),
          direction: "up" as const,
        },
        {
          title: "Optimal Price",
          value: json.recommendedPrice ?? "$—",
          confidence: Number(String(json.confidence ?? "60").replace(/\D/g, "")) || 60,
          direction: "up" as const,
        },
        {
          title: "Churn Risk",
          value: retentionRate > 60 ? "LOW" : retentionRate > 30 ? "MEDIUM" : "HIGH",
          confidence: Math.round(70 + retentionRate * 0.2),
          direction: retentionRate > 50 ? "up" as const : "down" as const,
        },
        {
          title: "Best Post Day",
          value: bestPostDay.day,
          confidence: bestPostDay.confidence,
          direction: bestPostDay.direction,
        },
      ];

      setPredictions(computed);
    } catch {
      setErr("Prediction engine failed.");
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
