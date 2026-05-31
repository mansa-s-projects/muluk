"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

// ─── Types ────────────────────────────────────────────────────────────────────

type Draft = {
  displayName: string;
  handle: string;
  bio: string;
  niche: string;
  goal: string;
  revenueTarget: string;
};

type Platform = {
  id: string;
  label: string;
  icon: string;
  color: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const NICHES = [
  "luxury", "fitness", "music", "art", "fashion", "gaming",
  "education", "tech", "food", "travel", "finance", "health",
  "beauty", "sports", "crypto", "business", "lifestyle",
];

const GOALS = [
  { id: "grow",         label: "Grow my audience" },
  { id: "monetize",    label: "Monetize my content" },
  { id: "brand",       label: "Build brand partnerships" },
  { id: "products",    label: "Launch my own products" },
  { id: "all",         label: "All of the above" },
];

const REVENUE_TARGETS = ["$0", "$1K", "$5K", "$10K", "$50K", "$100K+"];

const PLATFORMS: Platform[] = [
  { id: "instagram", label: "Instagram", icon: "IG", color: "#E1306C" },
  { id: "tiktok",    label: "TikTok",    icon: "TT", color: "#69C9D0" },
  { id: "youtube",   label: "YouTube",   icon: "YT", color: "#FF0000" },
  { id: "twitter",   label: "X (Twitter)", icon: "X", color: "#FFFFFF" },
  { id: "linkedin",  label: "LinkedIn",  icon: "LI", color: "#0A66C2" },
  { id: "telegram",  label: "Telegram",  icon: "TG", color: "#2AABEE" },
];

const HANDLE_RE = /^[a-z0-9-]*$/;

const EMPTY_DRAFT: Draft = {
  displayName: "",
  handle: "",
  bio: "",
  niche: "",
  goal: "",
  revenueTarget: "",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function saveDraft(draft: Draft): Promise<void> {
  await fetch("/api/onboarding/profile-draft", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(draft),
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 48 }}>
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          style={{
            width: i === current ? 24 : 8,
            height: 8,
            borderRadius: 4,
            background: i <= current ? "#c8a96e" : "rgba(200,169,110,0.2)",
            transition: "all 0.35s ease",
          }}
        />
      ))}
    </div>
  );
}

function GoldButton({
  children,
  onClick,
  disabled = false,
  variant = "primary",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "ghost";
}) {
  if (variant === "ghost") {
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        style={{
          background: "none",
          border: "none",
          color: "rgba(200,169,110,0.6)",
          fontFamily: "'Outfit', sans-serif",
          fontSize: 13,
          cursor: disabled ? "not-allowed" : "pointer",
          padding: "8px 0",
          letterSpacing: "0.04em",
          textDecoration: "underline",
          textDecorationColor: "rgba(200,169,110,0.3)",
          transition: "color 0.2s",
        }}
      >
        {children}
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: "100%",
        padding: "15px 24px",
        background: disabled
          ? "rgba(200,169,110,0.15)"
          : "linear-gradient(135deg, #c8a96e 0%, #a8895a 100%)",
        border: disabled ? "1px solid rgba(200,169,110,0.2)" : "none",
        borderRadius: 2,
        color: disabled ? "rgba(200,169,110,0.35)" : "#020203",
        fontFamily: "'Outfit', sans-serif",
        fontWeight: 600,
        fontSize: 14,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "all 0.25s ease",
        marginTop: 8,
      }}
    >
      {children}
    </button>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label
      style={{
        display: "block",
        fontFamily: "'DM Mono', monospace",
        fontSize: 10,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        color: "rgba(200,169,110,0.55)",
        marginBottom: 8,
      }}
    >
      {children}
    </label>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  prefix,
  error,
  maxLength,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  prefix?: string;
  error?: string;
  maxLength?: number;
}) {
  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          background: "rgba(255,255,255,0.025)",
          border: `1px solid ${error ? "rgba(200,80,80,0.5)" : "rgba(200,169,110,0.15)"}`,
          borderRadius: 2,
          transition: "border-color 0.2s",
        }}
      >
        {prefix && (
          <span
            style={{
              padding: "12px 0 12px 16px",
              fontFamily: "'DM Mono', monospace",
              fontSize: 13,
              color: "rgba(200,169,110,0.4)",
            }}
          >
            {prefix}
          </span>
        )}
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          style={{
            flex: 1,
            background: "none",
            border: "none",
            outline: "none",
            padding: prefix ? "12px 16px 12px 6px" : "12px 16px",
            fontFamily: "'Outfit', sans-serif",
            fontSize: 14,
            color: "#f0ede8",
            letterSpacing: "0.02em",
          }}
        />
      </div>
      {error && (
        <p
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: 10,
            color: "rgba(200,80,80,0.8)",
            margin: "6px 0 0",
            letterSpacing: "0.06em",
          }}
        >
          {error}
        </p>
      )}
    </div>
  );
}

// ─── Step 1: Identity ─────────────────────────────────────────────────────────

function StepIdentity({
  draft,
  onUpdate,
  onNext,
}: {
  draft: Draft;
  onUpdate: (patch: Partial<Draft>) => void;
  onNext: () => void;
}) {
  const handleError =
    draft.handle && !HANDLE_RE.test(draft.handle)
      ? "Lowercase letters, numbers and hyphens only"
      : draft.handle.length > 30
      ? "Max 30 characters"
      : undefined;

  const canProceed =
    draft.displayName.trim().length >= 2 &&
    draft.handle.trim().length >= 2 &&
    !handleError &&
    draft.niche !== "";

  return (
    <div>
      <h1
        style={{
          fontFamily: "'Cormorant', serif",
          fontSize: 36,
          fontWeight: 300,
          color: "#f0ede8",
          margin: "0 0 8px",
          letterSpacing: "-0.01em",
          lineHeight: 1.15,
        }}
      >
        Define your identity
      </h1>
      <p
        style={{
          fontFamily: "'Outfit', sans-serif",
          fontSize: 14,
          color: "rgba(240,237,232,0.45)",
          margin: "0 0 36px",
          letterSpacing: "0.03em",
        }}
      >
        This is how the world sees you on Mansas Moguls.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div>
          <FieldLabel>Display Name</FieldLabel>
          <TextInput
            value={draft.displayName}
            onChange={(v) => onUpdate({ displayName: v })}
            placeholder="Your public name"
          />
        </div>

        <div>
          <FieldLabel>Handle</FieldLabel>
          <TextInput
            value={draft.handle}
            onChange={(v) => onUpdate({ handle: v.toLowerCase() })}
            prefix="@"
            placeholder="your-handle"
            error={handleError}
          />
        </div>

        <div>
          <FieldLabel>Bio ({draft.bio.length}/160)</FieldLabel>
          <div
            style={{
              background: "rgba(255,255,255,0.025)",
              border: "1px solid rgba(200,169,110,0.15)",
              borderRadius: 2,
            }}
          >
            <textarea
              value={draft.bio}
              onChange={(e) => onUpdate({ bio: e.target.value.slice(0, 160) })}
              placeholder="What you do, who you serve…"
              rows={3}
              style={{
                width: "100%",
                background: "none",
                border: "none",
                outline: "none",
                padding: "12px 16px",
                fontFamily: "'Outfit', sans-serif",
                fontSize: 14,
                color: "#f0ede8",
                letterSpacing: "0.02em",
                resize: "none",
                boxSizing: "border-box",
                lineHeight: 1.6,
              }}
            />
          </div>
        </div>

        <div>
          <FieldLabel>Niche / Category</FieldLabel>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            {NICHES.map((n) => (
              <button
                key={n}
                onClick={() => onUpdate({ niche: n })}
                style={{
                  padding: "6px 14px",
                  background:
                    draft.niche === n
                      ? "rgba(200,169,110,0.15)"
                      : "rgba(255,255,255,0.03)",
                  border: `1px solid ${
                    draft.niche === n
                      ? "rgba(200,169,110,0.6)"
                      : "rgba(255,255,255,0.07)"
                  }`,
                  borderRadius: 2,
                  color:
                    draft.niche === n
                      ? "#c8a96e"
                      : "rgba(240,237,232,0.45)",
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 11,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                  transition: "all 0.18s ease",
                }}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 36 }}>
        <GoldButton onClick={onNext} disabled={!canProceed}>
          Continue →
        </GoldButton>
      </div>
    </div>
  );
}

// ─── Step 2: Connect Platforms ────────────────────────────────────────────────

function StepPlatforms({
  onNext,
  onSkip,
}: {
  onNext: () => void;
  onSkip: () => void;
}) {
  const [connected, setConnected] = useState<Set<string>>(new Set());
  const [connecting, setConnecting] = useState<string | null>(null);
  const popupRef = useRef<Window | null>(null);

  useEffect(() => {
    fetch("/api/social/connections")
      .then((r) => r.json())
      .then((data: { connections?: { platform: string }[] }) => {
        if (data.connections) {
          setConnected(new Set(data.connections.map((c) => c.platform)));
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (
        e.data &&
        typeof e.data === "object" &&
        e.data.type === "oauth_complete" &&
        e.data.platform
      ) {
        setConnected((prev) => new Set([...prev, e.data.platform as string]));
        setConnecting(null);
        popupRef.current?.close();
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  function connectPlatform(platform: Platform) {
    setConnecting(platform.id);
    const url = `/api/auth/${platform.id}/connect?next=/onboarding`;
    const popup = window.open(url, `connect_${platform.id}`, "width=560,height=660");
    popupRef.current = popup;

    const poll = setInterval(() => {
      if (popup?.closed) {
        clearInterval(poll);
        setConnecting(null);
      }
    }, 500);
  }

  return (
    <div>
      <h1
        style={{
          fontFamily: "'Cormorant', serif",
          fontSize: 36,
          fontWeight: 300,
          color: "#f0ede8",
          margin: "0 0 8px",
          letterSpacing: "-0.01em",
          lineHeight: 1.15,
        }}
      >
        Connect your empire
      </h1>
      <p
        style={{
          fontFamily: "'Outfit', sans-serif",
          fontSize: 14,
          color: "rgba(240,237,232,0.45)",
          margin: "0 0 36px",
          letterSpacing: "0.03em",
          lineHeight: 1.6,
        }}
      >
        Link your platforms. Mansas Moguls becomes your intelligence layer.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {PLATFORMS.map((p) => {
          const isConnected = connected.has(p.id);
          const isConnecting = connecting === p.id;
          return (
            <div
              key={p.id}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "14px 18px",
                background: isConnected
                  ? "rgba(200,169,110,0.06)"
                  : "rgba(255,255,255,0.025)",
                border: `1px solid ${
                  isConnected
                    ? "rgba(200,169,110,0.25)"
                    : "rgba(255,255,255,0.06)"
                }`,
                borderRadius: 2,
                transition: "all 0.2s",
              }}
            >
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 8,
                  background: `${p.color}18`,
                  border: `1px solid ${p.color}33`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 10,
                  fontWeight: 700,
                  color: p.color,
                  letterSpacing: "0.04em",
                  flexShrink: 0,
                }}
              >
                {p.icon}
              </div>
              <span
                style={{
                  flex: 1,
                  marginLeft: 14,
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: 14,
                  color: isConnected ? "#f0ede8" : "rgba(240,237,232,0.7)",
                  letterSpacing: "0.02em",
                }}
              >
                {p.label}
              </span>
              {isConnected ? (
                <span
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: 10,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: "#4caf7d",
                    background: "rgba(76,175,125,0.1)",
                    border: "1px solid rgba(76,175,125,0.25)",
                    borderRadius: 2,
                    padding: "3px 10px",
                  }}
                >
                  Connected
                </span>
              ) : (
                <button
                  onClick={() => connectPlatform(p)}
                  disabled={isConnecting}
                  style={{
                    padding: "6px 16px",
                    background: "none",
                    border: "1px solid rgba(200,169,110,0.3)",
                    borderRadius: 2,
                    color: isConnecting
                      ? "rgba(200,169,110,0.35)"
                      : "rgba(200,169,110,0.75)",
                    fontFamily: "'DM Mono', monospace",
                    fontSize: 11,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    cursor: isConnecting ? "default" : "pointer",
                    transition: "all 0.18s",
                  }}
                >
                  {isConnecting ? "Opening…" : "Connect"}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 32, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
        <GoldButton onClick={onNext}>Continue →</GoldButton>
        <GoldButton variant="ghost" onClick={onSkip}>
          Skip for now
        </GoldButton>
      </div>
    </div>
  );
}

// ─── Step 3: Goals ────────────────────────────────────────────────────────────

function StepGoals({
  draft,
  onUpdate,
  onNext,
}: {
  draft: Draft;
  onUpdate: (patch: Partial<Draft>) => void;
  onNext: () => void;
}) {
  const canProceed = draft.goal !== "" && draft.revenueTarget !== "";

  return (
    <div>
      <h1
        style={{
          fontFamily: "'Cormorant', serif",
          fontSize: 36,
          fontWeight: 300,
          color: "#f0ede8",
          margin: "0 0 8px",
          letterSpacing: "-0.01em",
          lineHeight: 1.15,
        }}
      >
        Set your targets
      </h1>
      <p
        style={{
          fontFamily: "'Outfit', sans-serif",
          fontSize: 14,
          color: "rgba(240,237,232,0.45)",
          margin: "0 0 36px",
          letterSpacing: "0.03em",
        }}
      >
        We calibrate your empire around what matters most to you.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div>
          <FieldLabel>Primary Goal</FieldLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {GOALS.map((g) => (
              <button
                key={g.id}
                onClick={() => onUpdate({ goal: g.id })}
                style={{
                  padding: "13px 18px",
                  background:
                    draft.goal === g.id
                      ? "rgba(200,169,110,0.1)"
                      : "rgba(255,255,255,0.025)",
                  border: `1px solid ${
                    draft.goal === g.id
                      ? "rgba(200,169,110,0.5)"
                      : "rgba(255,255,255,0.06)"
                  }`,
                  borderRadius: 2,
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  cursor: "pointer",
                  transition: "all 0.18s",
                  textAlign: "left",
                }}
              >
                <div
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    border: `2px solid ${
                      draft.goal === g.id
                        ? "#c8a96e"
                        : "rgba(255,255,255,0.15)"
                    }`,
                    background:
                      draft.goal === g.id
                        ? "rgba(200,169,110,0.3)"
                        : "none",
                    flexShrink: 0,
                    transition: "all 0.18s",
                  }}
                />
                <span
                  style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontSize: 14,
                    color:
                      draft.goal === g.id
                        ? "#f0ede8"
                        : "rgba(240,237,232,0.6)",
                    letterSpacing: "0.02em",
                    transition: "color 0.18s",
                  }}
                >
                  {g.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <FieldLabel>Monthly Revenue Target</FieldLabel>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {REVENUE_TARGETS.map((t) => (
              <button
                key={t}
                onClick={() => onUpdate({ revenueTarget: t })}
                style={{
                  padding: "8px 18px",
                  background:
                    draft.revenueTarget === t
                      ? "rgba(200,169,110,0.15)"
                      : "rgba(255,255,255,0.03)",
                  border: `1px solid ${
                    draft.revenueTarget === t
                      ? "rgba(200,169,110,0.6)"
                      : "rgba(255,255,255,0.07)"
                  }`,
                  borderRadius: 2,
                  color:
                    draft.revenueTarget === t
                      ? "#c8a96e"
                      : "rgba(240,237,232,0.5)",
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 12,
                  letterSpacing: "0.06em",
                  cursor: "pointer",
                  transition: "all 0.18s",
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 36 }}>
        <GoldButton onClick={onNext} disabled={!canProceed}>
          Continue →
        </GoldButton>
      </div>
    </div>
  );
}

// ─── Step 4: Launch ───────────────────────────────────────────────────────────

function StepLaunch({
  draft,
  connectedCount,
  onLaunch,
  launching,
  error,
}: {
  draft: Draft;
  connectedCount: number;
  onLaunch: () => void;
  launching: boolean;
  error: string | null;
}) {
  const goalLabel = GOALS.find((g) => g.id === draft.goal)?.label ?? draft.goal;

  return (
    <div>
      <h1
        style={{
          fontFamily: "'Cormorant', serif",
          fontSize: 40,
          fontWeight: 300,
          color: "#f0ede8",
          margin: "0 0 8px",
          letterSpacing: "-0.02em",
          lineHeight: 1.1,
        }}
      >
        Your empire is ready.
      </h1>
      <p
        style={{
          fontFamily: "'Outfit', sans-serif",
          fontSize: 14,
          color: "rgba(240,237,232,0.45)",
          margin: "0 0 40px",
          letterSpacing: "0.03em",
        }}
      >
        Review your setup before entering the dashboard.
      </p>

      <div
        style={{
          padding: "24px",
          background: "rgba(200,169,110,0.04)",
          border: "1px solid rgba(200,169,110,0.18)",
          borderRadius: 2,
          display: "flex",
          flexDirection: "column",
          gap: 0,
        }}
      >
        {[
          { label: "Handle",     value: `@${draft.handle}` },
          { label: "Niche",      value: draft.niche },
          { label: "Goal",       value: goalLabel },
          { label: "Revenue",    value: `${draft.revenueTarget} / month` },
          {
            label: "Platforms",
            value:
              connectedCount === 0
                ? "None connected yet"
                : `${connectedCount} platform${connectedCount > 1 ? "s" : ""} connected`,
          },
        ].map((row, i, arr) => (
          <div
            key={row.label}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              padding: "12px 0",
              borderBottom:
                i < arr.length - 1
                  ? "1px solid rgba(200,169,110,0.08)"
                  : "none",
            }}
          >
            <span
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 10,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "rgba(200,169,110,0.45)",
              }}
            >
              {row.label}
            </span>
            <span
              style={{
                fontFamily: "'Outfit', sans-serif",
                fontSize: 14,
                color: "#f0ede8",
                letterSpacing: "0.02em",
                textAlign: "right",
                maxWidth: "60%",
              }}
            >
              {row.value}
            </span>
          </div>
        ))}
      </div>

      {error && (
        <p
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: 11,
            color: "rgba(200,80,80,0.8)",
            letterSpacing: "0.06em",
            marginTop: 16,
            textAlign: "center",
          }}
        >
          {error}
        </p>
      )}

      <div style={{ marginTop: 32 }}>
        <GoldButton onClick={onLaunch} disabled={launching}>
          {launching ? "Entering the empire…" : "Enter the Empire →"}
        </GoldButton>
      </div>
    </div>
  );
}

// ─── Main Wizard ──────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [connectedCount, setConnectedCount] = useState(0);
  const [launching, setLaunching] = useState(false);
  const [launchError, setLaunchError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [animKey, setAnimKey] = useState(0);

  useEffect(() => {
    fetch("/api/onboarding/profile-draft")
      .then((r) => {
        if (r.status === 401) { setNeedsLogin(true); return null; }
        return r.json();
      })
      .then((data: { draft?: Draft } | null) => {
        if (data?.draft) setDraft((prev) => ({ ...prev, ...data.draft }));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function updateDraft(patch: Partial<Draft>) {
    setDraft((prev) => ({ ...prev, ...patch }));
  }

  function advanceStep(next: number) {
    void saveDraft(draft);
    setAnimKey((k) => k + 1);
    setStep(next);
    if (next === 1) {
      fetch("/api/social/connections")
        .then((r) => r.json())
        .then((data: { connections?: unknown[] }) => {
          setConnectedCount(data.connections?.length ?? 0);
        })
        .catch(() => {});
    }
    if (next === 3) {
      fetch("/api/social/connections")
        .then((r) => r.json())
        .then((data: { connections?: unknown[] }) => {
          setConnectedCount(data.connections?.length ?? 0);
        })
        .catch(() => {});
    }
  }

  async function handleLaunch() {
    setLaunching(true);
    setLaunchError(null);
    try {
      const res = await fetch("/api/onboarding/profile-save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setLaunchError(data.error ?? "Failed to save profile.");
        setLaunching(false);
        return;
      }
      router.push("/dashboard");
    } catch {
      setLaunchError("Network error. Please try again.");
      setLaunching(false);
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#020203", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: 11,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "rgba(200,169,110,0.4)",
          }}
        >
          Loading…
        </span>
      </div>
    );
  }

  if (needsLogin) {
    return (
      <div style={{ minHeight: "100vh", background: "#020203", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <p style={{ fontFamily: "'Outfit', sans-serif", color: "rgba(240,237,232,0.6)", marginBottom: 16 }}>
            Sign in to continue onboarding.
          </p>
          <a
            href="/login"
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 11,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "#c8a96e",
              textDecoration: "none",
              borderBottom: "1px solid rgba(200,169,110,0.3)",
              paddingBottom: 2,
            }}
          >
            Go to Login →
          </a>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant:ital,wght@0,300;0,400;1,300&family=Outfit:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; }

        body {
          margin: 0;
          background: #020203;
          color: #f0ede8;
        }

        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateX(18px); }
          to   { opacity: 1; transform: translateX(0); }
        }

        .step-panel {
          animation: fadeSlideIn 0.4s cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        textarea { color-scheme: dark; }

        input::placeholder,
        textarea::placeholder {
          color: rgba(240,237,232,0.2);
        }

        input:focus,
        textarea:focus {
          outline: none;
        }

        *:focus-visible {
          outline: 1px solid rgba(200,169,110,0.35);
          outline-offset: 2px;
        }

        button:hover:not(:disabled) {
          filter: brightness(1.08);
        }
      `}</style>

      {/* Noise texture */}
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          zIndex: 0,
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E\")",
          backgroundSize: "256px 256px",
          opacity: 0.6,
        }}
      />

      {/* Subtle gold glow top-left */}
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          top: -120,
          left: -80,
          width: 420,
          height: 420,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(200,169,110,0.07) 0%, transparent 65%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      <main
        style={{
          position: "relative",
          zIndex: 1,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 20px",
        }}
      >
        <div style={{ width: "100%", maxWidth: 560 }}>
          {/* Wordmark */}
          <div
            style={{
              textAlign: "center",
              marginBottom: 48,
            }}
          >
            <span
              style={{
                fontFamily: "'Cormorant', serif",
                fontSize: 13,
                fontWeight: 400,
                letterSpacing: "0.28em",
                textTransform: "uppercase",
                color: "rgba(200,169,110,0.5)",
              }}
            >
              Mansas Moguls
            </span>
          </div>

          <StepDots current={step} total={4} />

          {/* Step panel */}
          <div key={animKey} className="step-panel">
            {step === 0 && (
              <StepIdentity
                draft={draft}
                onUpdate={updateDraft}
                onNext={() => advanceStep(1)}
              />
            )}
            {step === 1 && (
              <StepPlatforms
                onNext={() => advanceStep(2)}
                onSkip={() => advanceStep(2)}
              />
            )}
            {step === 2 && (
              <StepGoals
                draft={draft}
                onUpdate={updateDraft}
                onNext={() => advanceStep(3)}
              />
            )}
            {step === 3 && (
              <StepLaunch
                draft={draft}
                connectedCount={connectedCount}
                onLaunch={handleLaunch}
                launching={launching}
                error={launchError}
              />
            )}
          </div>
        </div>
      </main>
    </>
  );
}
