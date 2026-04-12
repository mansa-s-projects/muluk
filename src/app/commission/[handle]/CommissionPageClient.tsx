"use client";

import { useState } from "react";

interface Props {
  handle: string;
}

type Step = "details" | "contact" | "submitted";

const BUDGETS = [
  { label: "$50",  cents: 5000  },
  { label: "$100", cents: 10000 },
  { label: "$250", cents: 25000 },
  { label: "$500", cents: 50000 },
  { label: "$1k",  cents: 100000 },
  { label: "$2.5k",cents: 250000 },
];

export default function CommissionPageClient({ handle }: Props) {
  const [step, setStep]       = useState<Step>("details");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [resultToken, setResultToken] = useState("");
  const [resultId, setResultId]       = useState("");

  const [title, setTitle]         = useState("");
  const [description, setDesc]    = useState("");
  const [budgetCents, setBudget]  = useState(0);
  const [customBudget, setCustom] = useState("");
  const [deadline, setDeadline]   = useState("");
  const [fanName, setFanName]     = useState("");
  const [fanEmail, setFanEmail]   = useState("");
  const [notes, setNotes]         = useState("");

  const parsedCustomBudget = Number.parseFloat(customBudget);
  const customBudgetCents = Number.isFinite(parsedCustomBudget)
    ? Math.round(parsedCustomBudget * 100)
    : 0;
  const effectiveBudget = budgetCents || customBudgetCents;

  async function submit() {
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/commissions/creator/${encodeURIComponent(handle)}`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title, description,
          budget_cents: effectiveBudget,
          deadline: deadline || undefined,
          fan_name:  fanName.trim(),
          fan_email: fanEmail.trim(),
          notes: notes.trim() || undefined,
        }),
      });
      let json: Record<string, unknown> | null = null;
      const contentType = res.headers.get("content-type") ?? "";
      if (contentType.includes("application/json")) {
        try {
          json = await res.json();
        } catch {
          json = null;
        }
      }
      if (!res.ok) {
        if (json && typeof json.error === "string") {
          setError(json.error);
        } else {
          const text = await res.text().catch(() => "");
          setError(text || "Something went wrong.");
        }
        return;
      }
      if (!json) {
        setError("Unexpected response from server.");
        return;
      }
      setResultToken(typeof json.access_token === "string" ? json.access_token : "");
      setResultId(typeof json.id === "string" ? json.id : "");
      setStep("submitted");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const statusUrl = resultId && resultToken
    ? `/commission/status?id=${resultId}&token=${resultToken}`
    : null;

  return (
    <div style={{ minHeight: "100vh", background: "var(--void)", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem", fontFamily: "var(--font-body)" }}>
      <div style={{ width: "100%", maxWidth: 560 }}>

        {/* ── Logo ── */}
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <div style={{ display: "inline-block", background: "var(--gold-trace)", border: "1px solid var(--gold-mid)", borderRadius: 12, padding: "0.5rem 1.25rem", marginBottom: "1rem" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--gold)", letterSpacing: "0.1em" }}>COMMISSION</span>
          </div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2.25rem", fontWeight: 400, color: "var(--white)", margin: "0 0 0.5rem" }}>
            Commission @{handle}
          </h1>
          <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>Submit a custom work request</p>
        </div>

        {/* ── Progress ── */}
        {step !== "submitted" && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", marginBottom: "2rem" }}>
            {(["details","contact"] as const).map((s, i) => (
              <div key={s} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", border: `1px solid ${step === s || (s === "details" && step === "contact") ? "var(--gold)" : "var(--rim)"}`, background: (s === "details" && step === "contact") ? "var(--gold)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", color: (s === "details" && step === "contact") ? "var(--void)" : "var(--muted)" }}>
                  {(s === "details" && step === "contact") ? "✓" : i + 1}
                </div>
                <span style={{ color: step === s ? "var(--white)" : "var(--muted)", fontSize: "0.8125rem", textTransform: "capitalize" }}>{s}</span>
                {i === 0 && <span style={{ color: "var(--rim2)", fontSize: "1rem" }}>·</span>}
              </div>
            ))}
          </div>
        )}

        {/* ── Card ── */}
        <div style={{ background: "var(--card)", border: "1px solid var(--rim2)", borderRadius: 20, padding: "2rem" }}>

          {/* Step 1: Project details */}
          {step === "details" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <Field label="What do you need?" required>
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Custom song for my wedding" maxLength={120} style={inputStyle} />
              </Field>
              <Field label="Describe your request" required>
                <textarea value={description} onChange={(e) => setDesc(e.target.value)} placeholder="Be as specific as possible — style, mood, length, references..." rows={4} maxLength={2000} style={{ ...inputStyle, resize: "vertical" }} />
              </Field>
              <Field label="Your budget">
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem", marginBottom: "0.75rem" }}>
                  {BUDGETS.map((b) => (
                    <button
                      key={b.cents}
                      type="button"
                      onClick={() => { setBudget(b.cents); setCustom(""); }}
                      style={{ background: budgetCents === b.cents ? "var(--gold-trace)" : "var(--surface)", border: `1px solid ${budgetCents === b.cents ? "var(--gold)" : "var(--rim)"}`, borderRadius: 8, padding: "0.6rem", color: budgetCents === b.cents ? "var(--gold)" : "var(--muted)", cursor: "pointer", fontSize: "0.875rem", fontFamily: "var(--font-mono)" }}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
                <input
                  value={customBudget}
                  onChange={(e) => { setCustom(e.target.value); setBudget(0); }}
                  placeholder="Or enter custom amount ($)"
                  type="number"
                  min="1"
                  style={inputStyle}
                />
              </Field>
              <Field label="Deadline (optional)">
                <input value={deadline} onChange={(e) => setDeadline(e.target.value)} type="date" style={inputStyle} />
              </Field>
              <button
                disabled={!title.trim() || !description.trim()}
                onClick={() => setStep("contact")}
                style={{ ...btnGold, opacity: (!title.trim() || !description.trim()) ? 0.4 : 1 }}
              >
                Continue →
              </button>
            </div>
          )}

          {/* Step 2: Contact */}
          {step === "contact" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <div style={{ background: "var(--surface)", border: "1px solid var(--rim)", borderRadius: 10, padding: "0.875rem" }}>
                <div style={{ color: "var(--muted)", fontSize: "0.75rem", marginBottom: "0.25rem" }}>Your request</div>
                <div style={{ color: "var(--white)", fontSize: "0.9rem", fontWeight: 500 }}>{title}</div>
                {effectiveBudget > 0 && (
                  <div style={{ color: "var(--gold)", fontFamily: "var(--font-mono)", fontSize: "0.8125rem", marginTop: "0.25rem" }}>
                    Budget: ${(effectiveBudget / 100).toFixed(0)}
                  </div>
                )}
              </div>
              <Field label="Your name" required>
                <input value={fanName} onChange={(e) => setFanName(e.target.value)} placeholder="Jane Doe" style={inputStyle} />
              </Field>
              <Field label="Your email" required>
                <input value={fanEmail} onChange={(e) => setFanEmail(e.target.value)} placeholder="jane@example.com" type="email" style={inputStyle} />
              </Field>
              <Field label="Additional notes (optional)">
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything else you want to share..." rows={3} style={{ ...inputStyle, resize: "vertical" }} />
              </Field>
              {error && <div style={{ color: "var(--red)", fontSize: "0.8125rem", background: "var(--red-d)", border: "1px solid rgba(224,85,85,0.3)", borderRadius: 8, padding: "0.75rem" }}>{error}</div>}
              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button onClick={() => setStep("details")} style={btnGhost}>← Back</button>
                <button
                  disabled={loading || !fanName.trim() || !fanEmail.trim()}
                  onClick={submit}
                  style={{ ...btnGold, flex: 2, opacity: (loading || !fanName.trim() || !fanEmail.trim()) ? 0.4 : 1 }}
                >
                  {loading ? "Submitting…" : "Submit Request"}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Submitted */}
          {step === "submitted" && (
            <div style={{ textAlign: "center", padding: "1rem 0" }}>
              <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>✦</div>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.75rem", color: "var(--white)", margin: "0 0 0.75rem" }}>Request Sent</h2>
              <p style={{ color: "var(--muted)", fontSize: "0.9rem", lineHeight: 1.6, marginBottom: "1.5rem" }}>
                Your commission has been submitted to @{handle}. You&apos;ll receive an email once they review it.
              </p>
              {statusUrl && (
                <div style={{ background: "var(--surface)", border: "1px solid var(--rim)", borderRadius: 12, padding: "1.25rem", marginBottom: "1.5rem" }}>
                  <div style={{ color: "var(--muted)", fontSize: "0.75rem", marginBottom: "0.5rem" }}>TRACK YOUR REQUEST</div>
                  <a
                    href={statusUrl}
                    style={{ color: "var(--gold)", fontFamily: "var(--font-mono)", fontSize: "0.8125rem", wordBreak: "break-all", textDecoration: "none" }}
                  >
                    View Status ↗
                  </a>
                </div>
              )}
              <p style={{ color: "var(--dim)", fontSize: "0.8rem" }}>Bookmark that link — it&apos;s your only way to track this commission.</p>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <p style={{ textAlign: "center", color: "var(--dim)", fontSize: "0.75rem", marginTop: "1.5rem" }}>
          Powered by MULUK · Secure payouts
        </p>
      </div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: "block", color: "var(--muted)", fontSize: "0.75rem", marginBottom: "0.4rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}{required && <span style={{ color: "var(--gold)", marginLeft: "0.25rem" }}>*</span>}
      </label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", background: "var(--surface)", border: "1px solid var(--rim2)", borderRadius: 10,
  padding: "0.75rem", color: "var(--white)", fontSize: "0.9rem", outline: "none",
  boxSizing: "border-box", fontFamily: "var(--font-body)",
};

const btnGold: React.CSSProperties = {
  background: "var(--gold)", border: "none", borderRadius: 10, padding: "0.875rem",
  color: "var(--void)", fontWeight: 600, cursor: "pointer", fontSize: "0.9375rem",
  width: "100%", fontFamily: "var(--font-body)",
};

const btnGhost: React.CSSProperties = {
  background: "none", border: "1px solid var(--rim)", borderRadius: 10, padding: "0.875rem 1.25rem",
  color: "var(--muted)", cursor: "pointer", fontSize: "0.9rem", fontFamily: "var(--font-body)",
};
