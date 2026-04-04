"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

const mono: React.CSSProperties = { fontFamily: "var(--font-mono)" };
const disp: React.CSSProperties = { fontFamily: "var(--font-display)" };

export type ProfileDraftData = {
  displayName: string;
  handle: string;
  bio: string;
  avatarUrl: string | null;
  bannerUrl: string | null;
  websiteUrl: string;
  location: string;
  mainSpecialty: string;
  primaryCtaLabel: string;
  primaryCtaUrl: string;
};

type Props = {
  initialDraft: ProfileDraftData;
  sources: string[];
};

// ── Inline field ──────────────────────────────────────────────────────────────
function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <label style={{ ...mono, fontSize: "10px", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--gold-dim)" }}>
        {label}
      </label>
      {children}
      {hint && <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.28)", fontFamily: "var(--font-body)" }}>{hint}</div>}
    </div>
  );
}

const inp: React.CSSProperties = {
  width: "100%",
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: "6px",
  color: "rgba(255,255,255,0.92)",
  padding: "12px 14px",
  fontSize: "14px",
  fontFamily: "var(--font-body)",
  outline: "none",
  boxSizing: "border-box",
};

// ── Live preview panel ────────────────────────────────────────────────────────
function ProfilePreview({ draft, avatarPreview, bannerPreview, showModal, onClose }: {
  draft: ProfileDraftData;
  avatarPreview: string | null;
  bannerPreview: string | null;
  showModal: boolean;
  onClose: () => void;
}) {
  const avatarSrc = avatarPreview || draft.avatarUrl;
  const bannerSrc = bannerPreview || draft.bannerUrl;

  const card = (
    <div style={{
      background: "#0f0f1e",
      border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: "14px",
      overflow: "hidden",
      maxWidth: showModal ? "420px" : "100%",
      width: "100%",
    }}>
      {/* Banner */}
      <div style={{
        height: showModal ? "140px" : "100px",
        background: bannerSrc
          ? "transparent"
          : "linear-gradient(135deg, rgba(200,169,110,0.12), rgba(200,169,110,0.03))",
        position: "relative",
        overflow: "hidden",
      }}>
        {bannerSrc && (
          <img src={bannerSrc} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        )}
        {!bannerSrc && (
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ color: "rgba(200,169,110,0.2)", fontSize: showModal ? "32px" : "22px" }}>✦</span>
          </div>
        )}
      </div>

      {/* Avatar + info */}
      <div style={{ padding: "0 20px 20px" }}>
        <div style={{ marginTop: "-28px", marginBottom: "12px" }}>
          <div style={{
            width: showModal ? "64px" : "52px",
            height: showModal ? "64px" : "52px",
            borderRadius: "50%",
            border: "3px solid #0f0f1e",
            background: "#1a1a30",
            overflow: "hidden",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {avatarSrc
              ? <img src={avatarSrc} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <span style={{ fontSize: showModal ? "26px" : "20px", opacity: 0.35 }}>👤</span>
            }
          </div>
        </div>

        <div style={{ ...disp, fontSize: showModal ? "22px" : "17px", color: "var(--gold)", lineHeight: 1.1, marginBottom: "2px" }}>
          {draft.displayName || "Display Name"}
        </div>
        {draft.handle && (
          <div style={{ ...mono, fontSize: "11px", color: "rgba(255,255,255,0.35)", marginBottom: "6px" }}>
            @{draft.handle}
          </div>
        )}
        {draft.mainSpecialty && (
          <div style={{
            display: "inline-flex", alignItems: "center",
            background: "rgba(200,169,110,0.08)",
            border: "1px solid rgba(200,169,110,0.18)",
            borderRadius: "3px",
            padding: "2px 8px",
            ...mono,
            fontSize: "9px",
            letterSpacing: "0.15em",
            color: "var(--gold-dim)",
            textTransform: "uppercase",
            marginBottom: "8px",
          }}>
            {draft.mainSpecialty}
          </div>
        )}
        {draft.bio && (
          <div style={{
            fontSize: "13px",
            color: "rgba(255,255,255,0.6)",
            lineHeight: 1.55,
            marginBottom: "12px",
            fontFamily: "var(--font-body)",
          }}>
            {draft.bio}
          </div>
        )}
        {draft.location && (
          <div style={{ ...mono, fontSize: "10px", color: "rgba(255,255,255,0.3)", marginBottom: "10px" }}>
            📍 {draft.location}
          </div>
        )}
        {(draft.primaryCtaLabel || draft.primaryCtaUrl) && (
          <div style={{
            marginTop: "12px",
            padding: "10px 16px",
            background: "var(--gold)",
            borderRadius: "4px",
            textAlign: "center",
            ...mono,
            fontSize: "11px",
            letterSpacing: "0.14em",
            color: "#0a0800",
            fontWeight: 500,
          }}>
            {draft.primaryCtaLabel || "Visit Website"}
          </div>
        )}
      </div>
    </div>
  );

  if (showModal) {
    return (
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 100,
          background: "rgba(2,2,3,0.85)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "24px",
        }}
      >
        <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: "440px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div style={{ ...mono, fontSize: "10px", letterSpacing: "0.18em", color: "var(--gold-dim)" }}>PROFILE PREVIEW</div>
            <button
              onClick={onClose}
              style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.45)", cursor: "pointer", fontSize: "18px" }}
            >×</button>
          </div>
          {card}
        </div>
      </div>
    );
  }

  return card;
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ProfileSetupClient({ initialDraft, sources }: Props) {
  const router = useRouter();
  const [draft, setDraft] = useState<ProfileDraftData>(initialDraft);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [msg, setMsg] = useState("");
  const [msgErr, setMsgErr] = useState(false);
  const avatarRef = useRef<HTMLInputElement>(null);
  const bannerRef = useRef<HTMLInputElement>(null);

  const update = useCallback((k: keyof ProfileDraftData, v: string | null) => {
    setDraft(d => ({ ...d, [k]: v ?? "" }));
  }, []);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setAvatarFile(f);
    setAvatarPreview(URL.createObjectURL(f));
  };

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setBannerFile(f);
    setBannerPreview(URL.createObjectURL(f));
  };

  const notify = (text: string, isErr = false) => {
    setMsg(text); setMsgErr(isErr);
    setTimeout(() => setMsg(""), 5000);
  };

  const handleSubmit = async () => {
    if (!draft.displayName.trim()) {
      notify("Display name is required.", true);
      return;
    }
    setSaving(true);
    try {
      // Upload avatar
      let avatarUrl = draft.avatarUrl;
      if (avatarFile) {
        const fd = new FormData();
        fd.append("file", avatarFile);
        fd.append("folder", "avatars");
        const r = await fetch("/api/upload", { method: "POST", body: fd });
        if (r.ok) avatarUrl = (await r.json()).url;
      }

      // Upload banner
      let bannerUrl = draft.bannerUrl;
      if (bannerFile) {
        const fd = new FormData();
        fd.append("file", bannerFile);
        fd.append("folder", "banners");
        const r = await fetch("/api/upload", { method: "POST", body: fd });
        if (r.ok) bannerUrl = (await r.json()).url;
      }

      const res = await fetch("/api/onboarding/profile-save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...draft, avatarUrl, bannerUrl }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error ?? "Save failed");

      router.push("/dashboard");
    } catch (err) {
      notify(err instanceof Error ? err.message : "Save failed", true);
      setSaving(false);
    }
  };

  const hasSocialSources = sources.length > 0;

  return (
    <div style={{ minHeight: "100vh", background: "var(--void)", color: "rgba(255,255,255,0.92)" }}>
      {/* Header */}
      <div style={{
        borderBottom: "1px solid rgba(255,255,255,0.055)",
        padding: "18px 32px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ ...disp, fontSize: "20px", color: "var(--gold)", fontWeight: 300 }}>CIPHER</div>
        <div style={{ ...mono, fontSize: "10px", letterSpacing: "0.18em", color: "rgba(255,255,255,0.3)" }}>
          BUILD YOUR PUBLIC IDENTITY
        </div>
        <button
          onClick={() => setShowPreview(true)}
          style={{
            background: "transparent",
            border: "1px solid rgba(200,169,110,0.25)",
            borderRadius: "4px",
            padding: "7px 16px",
            ...mono, fontSize: "10px", letterSpacing: "0.14em",
            color: "var(--gold)", cursor: "pointer",
          }}
        >
          PREVIEW PROFILE
        </button>
      </div>

      <div style={{
        maxWidth: "1100px", margin: "0 auto",
        padding: "40px 24px 100px",
        display: "grid",
        gridTemplateColumns: "1fr 340px",
        gap: "40px",
        alignItems: "start",
      }}>
        {/* ── LEFT: Form ── */}
        <div>
          {/* Step indicator */}
          <div style={{ ...mono, fontSize: "10px", letterSpacing: "0.22em", color: "var(--gold-dim)", marginBottom: "10px" }}>
            ONBOARDING · PROFILE SETUP
          </div>
          <h1 style={{
            ...disp,
            fontSize: "clamp(28px, 4vw, 44px)",
            fontWeight: 300, color: "var(--gold)",
            margin: "0 0 10px 0",
          }}>
            Build your public identity
          </h1>
          <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.45)", marginBottom: "32px", lineHeight: 1.6, fontFamily: "var(--font-body)" }}>
            This is what fans see before they pay.
            {hasSocialSources && " Pre-filled from your connected accounts — edit anything."}
          </p>

          {/* Social sources badge */}
          {hasSocialSources && (
            <div style={{
              display: "flex", alignItems: "center", gap: "10px",
              padding: "10px 14px",
              background: "rgba(80,212,138,0.06)",
              border: "1px solid rgba(80,212,138,0.2)",
              borderRadius: "8px",
              marginBottom: "28px",
            }}>
              <span style={{ color: "var(--green)" }}>✓</span>
              <div>
                <span style={{ ...mono, fontSize: "11px", color: "var(--green)", letterSpacing: "0.12em" }}>
                  AUTO-FILLED FROM {sources.map(s => s.toUpperCase()).join(" · ")}
                </span>
                <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", marginTop: "2px", fontFamily: "var(--font-body)" }}>
                  All fields are editable — you have full control.
                </div>
              </div>
            </div>
          )}

          {/* Banner area */}
          <div style={{ marginBottom: "8px" }}>
            <div style={{
              height: "140px",
              borderRadius: "10px",
              background: (bannerPreview || draft.bannerUrl)
                ? "transparent"
                : "linear-gradient(135deg, rgba(200,169,110,0.05), rgba(200,169,110,0.01))",
              border: "1px solid rgba(255,255,255,0.08)",
              overflow: "hidden",
              position: "relative",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {(bannerPreview || draft.bannerUrl) ? (
                <img
                  src={bannerPreview || draft.bannerUrl!}
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "22px", opacity: 0.2, marginBottom: "6px" }}>✦</div>
                  <div style={{ ...mono, fontSize: "10px", color: "rgba(255,255,255,0.2)", letterSpacing: "0.14em" }}>
                    BANNER IMAGE · OPTIONAL
                  </div>
                </div>
              )}
              <div style={{ position: "absolute", bottom: "10px", right: "10px", display: "flex", gap: "8px" }}>
                <button
                  onClick={() => bannerRef.current?.click()}
                  style={{
                    padding: "6px 12px",
                    background: "rgba(0,0,0,0.7)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    borderRadius: "4px",
                    ...mono, fontSize: "10px", letterSpacing: "0.12em",
                    color: "rgba(255,255,255,0.8)", cursor: "pointer",
                  }}
                >
                  {(bannerPreview || draft.bannerUrl) ? "CHANGE" : "ADD BANNER"}
                </button>
                {(bannerPreview || draft.bannerUrl) && (
                  <button
                    onClick={() => { setBannerFile(null); setBannerPreview(null); update("bannerUrl", null); }}
                    style={{
                      padding: "6px 12px",
                      background: "rgba(224,85,85,0.1)",
                      border: "1px solid rgba(224,85,85,0.25)",
                      borderRadius: "4px",
                      ...mono, fontSize: "10px", letterSpacing: "0.12em",
                      color: "#e05555", cursor: "pointer",
                    }}
                  >
                    REMOVE
                  </button>
                )}
              </div>
            </div>
            <input ref={bannerRef} type="file" accept="image/*" onChange={handleBannerChange} style={{ display: "none" }} />
          </div>

          {/* Avatar row */}
          <div style={{ display: "flex", alignItems: "flex-end", gap: "14px", marginBottom: "28px", marginTop: "-24px", paddingLeft: "16px" }}>
            <div style={{ position: "relative", flexShrink: 0 }}>
              <div style={{
                width: "72px", height: "72px", borderRadius: "50%",
                border: "3px solid var(--void)",
                background: "#1a1a30",
                overflow: "hidden",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {(avatarPreview || draft.avatarUrl)
                  ? <img src={avatarPreview || draft.avatarUrl!} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : <span style={{ fontSize: "26px", opacity: 0.35 }}>👤</span>
                }
              </div>
              <button
                onClick={() => avatarRef.current?.click()}
                style={{
                  position: "absolute", bottom: "-2px", right: "-2px",
                  width: "22px", height: "22px", borderRadius: "50%",
                  background: "var(--gold)", border: "2px solid var(--void)",
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "11px",
                }}
              >
                📷
              </button>
            </div>
            {(avatarPreview || draft.avatarUrl) && (
              <button
                onClick={() => { setAvatarFile(null); setAvatarPreview(null); update("avatarUrl", null); }}
                style={{
                  padding: "4px 10px",
                  background: "transparent",
                  border: "1px solid rgba(224,85,85,0.28)",
                  borderRadius: "4px",
                  ...mono, fontSize: "10px", letterSpacing: "0.12em",
                  color: "#e05555", cursor: "pointer", marginBottom: "4px",
                }}
              >
                REMOVE PHOTO
              </button>
            )}
            <input ref={avatarRef} type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: "none" }} />
          </div>

          {/* Form grid */}
          <div style={{ display: "grid", gap: "18px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <Field label="Display Name *">
                <input
                  type="text"
                  value={draft.displayName}
                  onChange={e => update("displayName", e.target.value)}
                  placeholder="Your public name"
                  style={inp}
                />
              </Field>
              <Field label="Handle">
                <div style={{ position: "relative" }}>
                  <span style={{
                    position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)",
                    color: "rgba(255,255,255,0.25)", ...mono, fontSize: "14px",
                  }}>@</span>
                  <input
                    type="text"
                    value={draft.handle}
                    onChange={e => update("handle", e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                    placeholder="yourhandle"
                    style={{ ...inp, paddingLeft: "28px" }}
                  />
                </div>
              </Field>
            </div>

            <Field label="Bio" hint="Shown on your fan page. Keep it punchy.">
              <textarea
                value={draft.bio}
                onChange={e => update("bio", e.target.value.slice(0, 200))}
                placeholder="Exclusive content, direct access, no filters."
                rows={3}
                style={{ ...inp, resize: "vertical", minHeight: "74px" }}
              />
              <div style={{ ...mono, fontSize: "10px", color: "rgba(255,255,255,0.22)", textAlign: "right" }}>
                {draft.bio.length}/200
              </div>
            </Field>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <Field label="Main Specialty" hint="e.g. Streetwear Styling, Music Production">
                <input
                  type="text"
                  value={draft.mainSpecialty}
                  onChange={e => update("mainSpecialty", e.target.value)}
                  placeholder="Your niche focus"
                  style={inp}
                />
              </Field>
              <Field label="Location (optional)">
                <input
                  type="text"
                  value={draft.location}
                  onChange={e => update("location", e.target.value)}
                  placeholder="Dubai, UAE"
                  style={inp}
                />
              </Field>
            </div>

            {/* CTA section */}
            <div style={{
              padding: "18px",
              background: "rgba(200,169,110,0.04)",
              border: "1px solid rgba(200,169,110,0.12)",
              borderRadius: "8px",
              display: "grid", gap: "14px",
            }}>
              <div style={{ ...mono, fontSize: "10px", letterSpacing: "0.15em", color: "var(--gold-dim)" }}>
                PRIMARY CTA BUTTON
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: "14px" }}>
                <Field label="Button Label">
                  <input
                    type="text"
                    value={draft.primaryCtaLabel}
                    onChange={e => update("primaryCtaLabel", e.target.value)}
                    placeholder="Book a Call"
                    style={inp}
                  />
                </Field>
                <Field label="URL">
                  <input
                    type="url"
                    value={draft.primaryCtaUrl}
                    onChange={e => update("primaryCtaUrl", e.target.value)}
                    placeholder="https://yourwebsite.com"
                    style={inp}
                  />
                </Field>
              </div>
            </div>

            <Field label="Website / Link" hint="Additional link displayed below your bio">
              <input
                type="url"
                value={draft.websiteUrl}
                onChange={e => update("websiteUrl", e.target.value)}
                placeholder="https://yourwebsite.com"
                style={inp}
              />
            </Field>
          </div>
        </div>

        {/* ── RIGHT: Live preview ── */}
        <div style={{ position: "sticky", top: "32px" }}>
          <div style={{ ...mono, fontSize: "10px", letterSpacing: "0.18em", color: "rgba(255,255,255,0.22)", marginBottom: "12px" }}>
            LIVE PREVIEW
          </div>
          <ProfilePreview
            draft={draft}
            avatarPreview={avatarPreview}
            bannerPreview={bannerPreview}
            showModal={false}
            onClose={() => {}}
          />
          <div style={{ ...mono, fontSize: "10px", color: "rgba(255,255,255,0.2)", marginTop: "10px", textAlign: "center" }}>
            Updates as you type
          </div>
        </div>
      </div>

      {/* ── Sticky footer ── */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        background: "linear-gradient(to top, var(--void) 60%, transparent)",
        padding: "28px 24px 24px",
        display: "flex", justifyContent: "center", gap: "12px",
        zIndex: 10,
      }}>
        <>
          {msg && (
            <div style={{
              position: "absolute", bottom: "calc(100% - 8px)", left: "50%", transform: "translateX(-50%)",
              padding: "10px 18px",
              background: msgErr ? "rgba(224,85,85,0.12)" : "rgba(80,212,138,0.12)",
              border: `1px solid ${msgErr ? "rgba(224,85,85,0.3)" : "rgba(80,212,138,0.3)"}`,
              borderRadius: "6px",
              color: msgErr ? "#e05555" : "#50d48a",
              ...mono, fontSize: "12px", letterSpacing: "0.06em",
              whiteSpace: "nowrap",
            }}>
              {msg}
            </div>
          )}
          <button
            onClick={() => router.push("/dashboard")}
            disabled={saving}
            style={{
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "4px",
              padding: "14px 24px",
              ...mono, fontSize: "11px", letterSpacing: "0.14em",
              color: "rgba(255,255,255,0.4)",
              cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.5 : 1,
            }}
          >
            SKIP FOR NOW
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            style={{
              background: "var(--gold)",
              border: "none",
              borderRadius: "4px",
              padding: "14px 36px",
              ...mono, fontSize: "11px", letterSpacing: "0.18em", fontWeight: 500,
              color: "#0a0800",
              cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.6 : 1,
              minWidth: "200px",
            }}
          >
            {saving ? "SAVING..." : "SAVE & CONTINUE →"}
          </button>
        </>
      </div>

      {/* Preview modal */}
      {showPreview && (
        <ProfilePreview
          draft={draft}
          avatarPreview={avatarPreview}
          bannerPreview={bannerPreview}
          showModal={true}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
}
