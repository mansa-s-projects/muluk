"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// ─── design tokens ───────────────────────────────────────────────
const c = {
  void: "#020203", ink: "#060610", deep: "#09090f", card: "#0f0f1e",
  surface: "#0d0d18",
  rim: "rgba(255,255,255,0.055)", rim2: "rgba(255,255,255,0.09)",
  gold: "#c8a96e", goldBright: "#e8cc90", goldDim: "#7a6030",
  goldGlow: "rgba(200,169,110,0.12)", goldFaint: "rgba(200,169,110,0.06)",
  white: "rgba(255,255,255,0.92)", muted: "rgba(255,255,255,0.48)",
  dim: "rgba(255,255,255,0.22)",
  green: "#50d48a", greenD: "rgba(80,212,138,0.12)",
  red: "#e05555", redD: "rgba(224,85,85,0.12)",
  blue: "#5b8de8", blueD: "rgba(91,141,232,0.12)",
  serif: "var(--font-display, 'Cormorant Garamond', serif)",
  sans: "var(--font-body, Outfit, sans-serif)",
  mono: "var(--font-mono, 'DM Mono', monospace)",
};

const input: React.CSSProperties = {
  width: "100%", padding: "13px 16px", boxSizing: "border-box",
  background: "rgba(255,255,255,0.03)", border: `1px solid ${c.rim2}`,
  borderRadius: 5, color: c.white, fontFamily: c.sans, fontSize: 14,
  outline: "none",
};

type Mode = "signin" | "create" | "check";
type Status = { ok?: boolean; message?: string; detail?: string; userId?: string; isAdmin?: boolean; role?: string };

export default function SetupAdminPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [artistName, setArtistName] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<Status | null>(null);
  const [session, setSession] = useState<any>(null);
  const [result, setResult] = useState<any>(null);

  // Check current session on mount
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) setMode("check");
    });
  }, []);

  // ── Sign in ──────────────────────────────────────────────────────
  const handleSignIn = async () => {
    setLoading(true); setStatus(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setStatus({ ok: false, message: error.message }); setLoading(false); return; }
    const { data: { session: s } } = await supabase.auth.getSession();
    setSession(s);
    setMode("check");
    setLoading(false);
  };

  // ── Create admin account ─────────────────────────────────────────
  const handleCreate = async () => {
    setLoading(true); setStatus(null);
    const supabase = createClient();
    try {
      // 1. Sign up
      const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
      if (authError) throw authError;
      const userId = authData.user?.id;
      if (!userId) throw new Error("No user ID returned. Check if email confirmation is required.");

      // 2. Creator application row (needed for admin APIs)
      await supabase.from("creator_applications").upsert({
        user_id: userId, email,
        artist_name: artistName || "Admin",
        genre: "admin", tier: "apex", status: "approved",
      }, { onConflict: "user_id" });

      // 3. Admin role
      const { error: adminErr } = await supabase
        .from("admin_users")
        .upsert({ user_id: userId, role: "super_admin" }, { onConflict: "user_id" });
      if (adminErr) throw adminErr;

      setStatus({ ok: true, message: "Admin account created.", userId, detail: "Sign in below to access the Command Center." });
      setMode("signin");
    } catch (e: any) {
      setStatus({ ok: false, message: e.message });
    }
    setLoading(false);
  };

  // ── Bootstrap current user as admin ──────────────────────────────
  const handleBootstrap = async () => {
    setLoading(true); setStatus(null);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setStatus({ ok: false, message: "Not signed in." }); setLoading(false); return; }

    // Ensure creator_applications row
    await supabase.from("creator_applications").upsert({
      user_id: user.id, email: user.email,
      artist_name: artistName || user.email?.split("@")[0] || "Admin",
      genre: "admin", tier: "apex", status: "approved",
    }, { onConflict: "user_id" });

    const { error } = await supabase
      .from("admin_users")
      .upsert({ user_id: user.id, role: "super_admin" }, { onConflict: "user_id" });

    if (error) { setStatus({ ok: false, message: error.message }); setLoading(false); return; }
    setStatus({ ok: true, message: "You are now a super admin.", userId: user.id, isAdmin: true });
    setLoading(false);
  };

  // ── Check admin status ────────────────────────────────────────────
  const handleCheckStatus = async () => {
    setLoading(true); setStatus(null);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setStatus({ ok: false, message: "Not signed in." }); setLoading(false); return; }
    const { data: admin } = await supabase.from("admin_users").select("role").eq("user_id", user.id).single();
    if (admin) {
      setStatus({ ok: true, isAdmin: true, role: admin.role, userId: user.id, message: `Signed in as admin (${admin.role}).` });
    } else {
      setStatus({ ok: false, isAdmin: false, message: "Account exists but has no admin role.", userId: user.id });
    }
    setLoading(false);
  };

  const handleSignOut = async () => {
    const supabase = createClient(); await supabase.auth.signOut();
    setSession(null); setMode("signin"); setStatus(null);
  };

  // ─────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24,
      background: `radial-gradient(circle at 50% 0%, rgba(200,169,110,0.12) 0%, transparent 55%), ${c.void}`,
    }}>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        .su-panel { animation: fadeUp 0.5s ease forwards; }
        input:focus { border-color: rgba(200,169,110,0.45) !important; box-shadow: 0 0 0 3px rgba(200,169,110,0.07); }
      `}</style>

      <div className="su-panel" style={{
        width: "100%", maxWidth: 480,
        background: c.card, border: `1px solid ${c.rim2}`,
        borderRadius: 12, padding: "40px 36px",
        boxShadow: "0 32px 80px rgba(0,0,0,0.6)",
        position: "relative", overflow: "hidden",
      }}>
        {/* Gold top line */}
        <div style={{ position:"absolute", top:0, left:0, right:0, height:1, background:`linear-gradient(90deg, transparent, ${c.gold}, transparent)`, opacity:0.6 }} />

        {/* Logo */}
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <div style={{
            width:44, height:44, borderRadius:"50%", margin:"0 auto 16px",
            background:`linear-gradient(135deg, rgba(200,169,110,0.2), rgba(200,169,110,0.06))`,
            border:`1px solid rgba(200,169,110,0.3)`,
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:18, color:c.gold,
          }}>✦</div>
          <div style={{ fontFamily:c.serif, fontSize:28, fontWeight:300, color:c.gold, letterSpacing:"0.08em", marginBottom:4 }}>CIPHER</div>
          <div style={{ fontFamily:c.mono, fontSize:9, color:c.goldDim, letterSpacing:"0.3em", textTransform:"uppercase" }}>Admin Setup</div>
        </div>

        {/* Tab switcher */}
        <div style={{ display:"flex", gap:4, background:"rgba(255,255,255,0.03)", border:`1px solid ${c.rim}`, borderRadius:7, padding:4, marginBottom:28 }}>
          {([
            { id:"signin", label:"Sign In" },
            { id:"create", label:"Create Admin" },
            ...(session ? [{ id:"check", label:"Status" }] : []),
          ] as { id: Mode; label: string }[]).map(tab => (
            <button key={tab.id} onClick={() => { setMode(tab.id); setStatus(null); }} style={{
              flex:1, padding:"8px 0", borderRadius:5, border:"none", cursor:"pointer",
              background: mode === tab.id ? "rgba(200,169,110,0.12)" : "transparent",
              color: mode === tab.id ? c.gold : c.muted,
              fontFamily: c.mono, fontSize:10, letterSpacing:"0.1em",
              borderBottom: mode === tab.id ? `1px solid rgba(200,169,110,0.3)` : "1px solid transparent",
              transition:"all 0.15s",
            }}>{tab.label}</button>
          ))}
        </div>

        {/* Session badge */}
        {session && (
          <div style={{
            display:"flex", alignItems:"center", justifyContent:"space-between",
            padding:"8px 12px", borderRadius:6, marginBottom:20,
            background: c.greenD, border:`1px solid rgba(80,212,138,0.2)`,
          }}>
            <div style={{ display:"flex", alignItems:"center", gap:7 }}>
              <span style={{ display:"inline-block", width:6, height:6, borderRadius:"50%", background:c.green }} />
              <span style={{ fontFamily:c.mono, fontSize:10, color:c.green }}>{session.user?.email}</span>
            </div>
            <button onClick={handleSignOut} style={{ background:"none", border:"none", color:c.dim, fontFamily:c.mono, fontSize:9, cursor:"pointer", letterSpacing:"0.1em" }}>SIGN OUT</button>
          </div>
        )}

        {/* ── SIGN IN ── */}
        {mode === "signin" && (
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" />
            <Field label="Password" type="password" value={password} onChange={setPassword} placeholder="••••••••••" />
            <Btn onClick={handleSignIn} loading={loading} label="SIGN IN" />
            <div style={{ textAlign:"center", marginTop:4 }}>
              <button onClick={() => setMode("create")} style={{ background:"none", border:"none", color:c.goldDim, fontFamily:c.mono, fontSize:10, cursor:"pointer", letterSpacing:"0.08em" }}>
                No account? Create admin →
              </button>
            </div>
          </div>
        )}

        {/* ── CREATE ADMIN ── */}
        {mode === "create" && (
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <div style={{ padding:"10px 14px", background:`rgba(200,169,110,0.06)`, border:`1px solid rgba(200,169,110,0.16)`, borderRadius:6, fontFamily:c.sans, fontSize:12, color:c.muted, lineHeight:1.5 }}>
              Creates a new Supabase auth account, an <code style={{ color:c.gold, fontSize:11 }}>creator_applications</code> row, and grants <code style={{ color:c.gold, fontSize:11 }}>super_admin</code> role in one step.
            </div>
            <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" />
            <Field label="Password (min 6 chars)" type="password" value={password} onChange={setPassword} placeholder="••••••••••" />
            <Field label="Display Name" type="text" value={artistName} onChange={setArtistName} placeholder="Admin" />
            <Btn onClick={handleCreate} loading={loading} label="CREATE ADMIN ACCOUNT" />
            <div style={{ textAlign:"center", marginTop:4 }}>
              <button onClick={() => setMode("signin")} style={{ background:"none", border:"none", color:c.goldDim, fontFamily:c.mono, fontSize:10, cursor:"pointer", letterSpacing:"0.08em" }}>
                Have an account? Sign in →
              </button>
            </div>
          </div>
        )}

        {/* ── STATUS / BOOTSTRAP ── */}
        {mode === "check" && (
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <div style={{ fontFamily:c.sans, fontSize:13, color:c.muted, marginBottom:4 }}>
              Signed in as <strong style={{ color:c.white }}>{session?.user?.email}</strong>. Use the buttons below to check or grant your admin role.
            </div>
            {artistName === "" && (
              <Field label="Display Name (optional)" type="text" value={artistName} onChange={setArtistName} placeholder="Admin" />
            )}
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={handleCheckStatus} disabled={loading} style={{
                flex:1, padding:"12px 0", background:"transparent",
                border:`1px solid ${c.rim2}`, borderRadius:5, color:c.muted,
                fontFamily:c.mono, fontSize:10, letterSpacing:"0.12em", cursor:"pointer",
              }}>
                {loading ? "CHECKING..." : "CHECK STATUS"}
              </button>
              <button onClick={handleBootstrap} disabled={loading} style={{
                flex:2, padding:"12px 0",
                background: loading ? "rgba(200,169,110,0.06)" : c.goldGlow,
                border:`1px solid rgba(200,169,110,0.25)`, borderRadius:5, color:c.gold,
                fontFamily:c.mono, fontSize:10, letterSpacing:"0.12em", cursor:"pointer",
              }}>
                {loading ? "GRANTING..." : "GRANT SUPER ADMIN"}
              </button>
            </div>
          </div>
        )}

        {/* ── Status message ── */}
        {status && (
          <div style={{
            marginTop:20, padding:"14px 16px",
            background: status.ok ? c.greenD : c.redD,
            border:`1px solid ${status.ok ? "rgba(80,212,138,0.25)" : "rgba(224,85,85,0.25)"}`,
            borderRadius:7,
          }}>
            <div style={{ fontFamily:c.sans, fontSize:13, color:status.ok ? c.green : c.red, fontWeight:500, marginBottom: status.detail ? 4 : 0 }}>
              {status.ok ? "✓" : "✗"} {status.message}
            </div>
            {status.detail && <div style={{ fontFamily:c.sans, fontSize:12, color:c.muted }}>{status.detail}</div>}
            {status.userId && <div style={{ fontFamily:c.mono, fontSize:10, color:c.dim, marginTop:6 }}>USER ID: {status.userId}</div>}
            {status.ok && status.isAdmin && (
              <a href="/admin/command-center" style={{
                display:"block", marginTop:12, padding:"10px 0",
                background:c.goldGlow, border:`1px solid rgba(200,169,110,0.3)`, borderRadius:5,
                color:c.gold, fontFamily:c.mono, fontSize:10, letterSpacing:"0.16em",
                textAlign:"center", textDecoration:"none",
              }}>
                OPEN COMMAND CENTER →
              </a>
            )}
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop:28, paddingTop:16, borderTop:`1px solid ${c.rim}`, textAlign:"center" }}>
          <span style={{ fontFamily:c.mono, fontSize:9, color:c.dim, letterSpacing:"0.1em" }}>
            CIPHER ADMIN SETUP · PRIVATE
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Small helpers ────────────────────────────────────────────────
function Field({ label, type, value, onChange, placeholder }: {
  label: string; type: string; value: string;
  onChange: (v: string) => void; placeholder: string;
}) {
  const fc = {
    void: "#020203", rim2: "rgba(255,255,255,0.09)",
    white: "rgba(255,255,255,0.92)", muted: "rgba(255,255,255,0.48)",
    dim: "rgba(255,255,255,0.22)",
    sans: "var(--font-body, Outfit, sans-serif)",
    mono: "var(--font-mono, 'DM Mono', monospace)",
  };
  return (
    <div>
      <div style={{ fontFamily:fc.mono, fontSize:9, color:fc.dim, letterSpacing:"0.2em", textTransform:"uppercase", marginBottom:7 }}>{label}</div>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{
        width:"100%", padding:"12px 14px", boxSizing:"border-box",
        background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.09)",
        borderRadius:5, color:fc.white, fontFamily:fc.sans, fontSize:14,
        outline:"none", transition:"border-color 0.2s, box-shadow 0.2s",
      }} className="su-input" />
    </div>
  );
}

function Btn({ onClick, loading, label }: { onClick: () => void; loading: boolean; label: string }) {
  const bc = { gold: "#c8a96e", goldGlow: "rgba(200,169,110,0.12)", mono: "var(--font-mono, 'DM Mono', monospace)" };
  return (
    <button onClick={onClick} disabled={loading} style={{
      width:"100%", padding:"13px 0", marginTop:4,
      background: loading ? bc.goldGlow : bc.gold,
      border:`1px solid ${bc.gold}`,
      borderRadius:5, color: loading ? bc.gold : "#0a0800",
      fontFamily:bc.mono, fontSize:11, letterSpacing:"0.18em",
      cursor: loading ? "not-allowed" : "pointer",
      transition:"all 0.2s", opacity: loading ? 0.7 : 1,
    }}>
      {loading ? "WORKING..." : label}
    </button>
  );
}
