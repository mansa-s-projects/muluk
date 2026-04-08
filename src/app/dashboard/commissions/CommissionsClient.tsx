"use client";

import { useState, useCallback } from "react";
import type { Commission } from "@/lib/commissions";
import { formatPrice } from "@/lib/commissions";

const STATUS_LABELS: Record<string, string> = {
  pending:   "Pending",
  accepted:  "Accepted",
  rejected:  "Rejected",
  paid:      "Paid",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const STATUS_COLORS: Record<string, string> = {
  pending:   "var(--amber)",
  accepted:  "var(--blue)",
  rejected:  "var(--red)",
  paid:      "var(--green)",
  delivered: "var(--gold)",
  cancelled: "var(--dim)",
};

interface Props {
  initialCommissions: Commission[];
  handle: string;
}

export default function CommissionsClient({ initialCommissions, handle }: Props) {
  const [commissions, setCommissions] = useState<Commission[]>(initialCommissions);
  const [filter, setFilter]           = useState<string>("all");
  const [selected, setSelected]       = useState<Commission | null>(null);
  const [acceptModal, setAcceptModal] = useState(false);
  const [agreedCents, setAgreedCents] = useState("");
  const [loading, setLoading]         = useState(false);
  const [copied, setCopied]           = useState(false);

  const siteUrl  = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const shareUrl = `${siteUrl}/commission/${handle}`;

  const filtered = filter === "all"
    ? commissions
    : commissions.filter((c) => c.status === filter);

  const refreshList = useCallback(async () => {
    const res = await fetch("/api/commissions?limit=50");
    if (res.ok) {
      const json = await res.json();
      setCommissions(json.commissions ?? []);
    }
  }, []);

  async function handleAction(id: string, action: string, extra?: Record<string, unknown>) {
    setLoading(true);
    try {
      const res = await fetch(`/api/commissions/${id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action, ...extra }),
      });
      if (res.ok) {
        await refreshList();
        if (action !== "deliver") setSelected(null);
        else {
          const json = await res.json();
          setSelected(json.commission ?? null);
        }
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleAccept() {
    const cents = Math.round(parseFloat(agreedCents) * 100);
    if (!cents || cents < 100) return;
    setAcceptModal(false);
    if (selected) {
      await handleAction(selected.id, "accept", { agreed_cents: cents });
    }
  }

  async function copyLink() {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--void)", padding: "2rem" }}>
      {/* ── Header ── */}
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "2rem" }}>
          <div>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2rem", fontWeight: 400, color: "var(--white)", margin: 0 }}>
              Commission Inbox
            </h1>
            <p style={{ color: "var(--muted)", marginTop: "0.25rem", fontSize: "0.875rem" }}>
              Manage custom work requests from your fans
            </p>
          </div>
          {handle && (
            <button
              onClick={copyLink}
              style={{
                background: copied ? "var(--gold-glow2)" : "var(--gold-faint)",
                border: "1px solid var(--gold-dim)",
                borderRadius: 8,
                padding: "0.5rem 1rem",
                color: "var(--gold)",
                fontSize: "0.8125rem",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              {copied ? "Copied!" : "Copy Commission Link"}
            </button>
          )}
        </div>

        {/* ── Stats row ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "2rem" }}>
          {(["all", "pending", "paid", "delivered"] as const).map((s) => {
            const count = s === "all" ? commissions.length : commissions.filter((c) => c.status === s).length;
            return (
              <button
                key={s}
                onClick={() => setFilter(s)}
                style={{
                  background: filter === s ? "var(--card2)" : "var(--card)",
                  border: `1px solid ${filter === s ? "var(--gold-dim)" : "var(--rim)"}`,
                  borderRadius: 12,
                  padding: "1rem",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.2s",
                }}
              >
                <div style={{ color: "var(--muted)", fontSize: "0.75rem", marginBottom: "0.25rem", textTransform: "capitalize" }}>
                  {s === "all" ? "Total" : s}
                </div>
                <div style={{ color: "var(--white)", fontFamily: "var(--font-mono)", fontSize: "1.5rem" }}>
                  {count}
                </div>
              </button>
            );
          })}
        </div>

        {/* ── Table ── */}
        <div style={{ background: "var(--card)", border: "1px solid var(--rim)", borderRadius: 16, overflow: "hidden" }}>
          {filtered.length === 0 ? (
            <div style={{ padding: "4rem", textAlign: "center", color: "var(--muted)" }}>
              No{filter !== "all" ? ` ${filter}` : ""} commissions yet.
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--rim)" }}>
                  {["Fan", "Title", "Budget", "Status", "Submitted", ""].map((h) => (
                    <th key={h} style={{ padding: "0.875rem 1.25rem", textAlign: "left", color: "var(--muted)", fontSize: "0.75rem", fontWeight: 500, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => setSelected(c)}
                    style={{ borderBottom: "1px solid var(--rim)", cursor: "pointer", transition: "background 0.15s" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--lift)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                  >
                    <td style={{ padding: "1rem 1.25rem", color: "var(--white)", fontSize: "0.875rem" }}>
                      <div>{c.fan_name || "—"}</div>
                      <div style={{ color: "var(--muted)", fontSize: "0.75rem" }}>{c.fan_email}</div>
                    </td>
                    <td style={{ padding: "1rem 1.25rem", color: "var(--white)", fontSize: "0.875rem", maxWidth: 220 }}>
                      <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.title}</div>
                    </td>
                    <td style={{ padding: "1rem 1.25rem", fontFamily: "var(--font-mono)", color: "var(--gold)", fontSize: "0.875rem" }}>
                      {c.agreed_cents ? formatPrice(c.agreed_cents) : formatPrice(c.budget_cents)}
                      {c.agreed_cents && c.agreed_cents !== c.budget_cents && (
                        <span style={{ color: "var(--muted)", marginLeft: 4, fontSize: "0.75rem" }}>agreed</span>
                      )}
                    </td>
                    <td style={{ padding: "1rem 1.25rem" }}>
                      <span style={{
                        background: `${STATUS_COLORS[c.status]}22`,
                        border: `1px solid ${STATUS_COLORS[c.status]}55`,
                        borderRadius: 6,
                        padding: "0.2rem 0.6rem",
                        fontSize: "0.75rem",
                        color: STATUS_COLORS[c.status],
                      }}>
                        {STATUS_LABELS[c.status]}
                      </span>
                    </td>
                    <td style={{ padding: "1rem 1.25rem", color: "var(--muted)", fontSize: "0.8125rem" }}>
                      {new Date(c.created_at).toLocaleDateString()}
                    </td>
                    <td style={{ padding: "1rem 1.25rem" }}>
                      {c.status === "pending" && (
                        <div style={{ display: "flex", gap: "0.5rem" }} onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => { setSelected(c); setAcceptModal(true); setAgreedCents(""); }}
                            style={{ background: "var(--green-d)", border: "1px solid var(--green-b)", borderRadius: 6, padding: "0.3rem 0.75rem", color: "var(--green)", fontSize: "0.8125rem", cursor: "pointer" }}
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => handleAction(c.id, "reject")}
                            style={{ background: "var(--red-d)", border: "1px solid var(--red)", borderRadius: 6, padding: "0.3rem 0.75rem", color: "var(--red)", fontSize: "0.8125rem", cursor: "pointer" }}
                          >
                            Reject
                          </button>
                        </div>
                      )}
                      {c.status === "paid" && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleAction(c.id, "deliver"); }}
                          style={{ background: "var(--gold-glow)", border: "1px solid var(--gold-dim)", borderRadius: 6, padding: "0.3rem 0.75rem", color: "var(--gold)", fontSize: "0.8125rem", cursor: "pointer" }}
                        >
                          Mark Delivered
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Detail Drawer ── */}
      {selected && !acceptModal && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", justifyContent: "flex-end", zIndex: 50 }}
          onClick={() => setSelected(null)}
        >
          <div
            style={{ width: 480, background: "var(--surface)", borderLeft: "1px solid var(--rim)", padding: "2rem", overflowY: "auto", height: "100vh" }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelected(null)}
              style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: "1.25rem", marginBottom: "1.5rem" }}
            >
              ✕
            </button>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", color: "var(--white)", marginBottom: "0.25rem" }}>{selected.title}</h2>
            <span style={{
              background: `${STATUS_COLORS[selected.status]}22`,
              border: `1px solid ${STATUS_COLORS[selected.status]}55`,
              borderRadius: 6,
              padding: "0.2rem 0.6rem",
              fontSize: "0.75rem",
              color: STATUS_COLORS[selected.status],
            }}>
              {STATUS_LABELS[selected.status]}
            </span>

            <div style={{ marginTop: "1.5rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <Row label="Fan" value={`${selected.fan_name || ""} <${selected.fan_email}>`} />
              <Row label="Budget" value={formatPrice(selected.budget_cents)} mono />
              {selected.agreed_cents && <Row label="Agreed Price" value={formatPrice(selected.agreed_cents)} mono gold />}
              {selected.deadline && <Row label="Deadline" value={new Date(selected.deadline).toLocaleDateString()} />}
            </div>

            <div style={{ marginTop: "1.5rem" }}>
              <div style={{ color: "var(--muted)", fontSize: "0.75rem", marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Description</div>
              <p style={{ color: "var(--white)", fontSize: "0.875rem", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{selected.description}</p>
            </div>

            {selected.status === "pending" && (
              <div style={{ display: "flex", gap: "0.75rem", marginTop: "2rem" }}>
                <button
                  onClick={() => { setAcceptModal(true); setAgreedCents(""); }}
                  style={{ flex: 1, background: "var(--green-d)", border: "1px solid var(--green-b)", borderRadius: 8, padding: "0.75rem", color: "var(--green)", cursor: "pointer", fontSize: "0.9rem" }}
                >
                  Accept & Set Price
                </button>
                <button
                  onClick={() => handleAction(selected.id, "reject")}
                  style={{ flex: 1, background: "var(--red-d)", border: "1px solid var(--red)", borderRadius: 8, padding: "0.75rem", color: "var(--red)", cursor: "pointer", fontSize: "0.9rem" }}
                >
                  Decline
                </button>
              </div>
            )}
            {selected.status === "accepted" && selected.whop_checkout_id && (
              <div style={{ marginTop: "1.5rem", background: "var(--card)", border: "1px solid var(--rim)", borderRadius: 8, padding: "1rem" }}>
                <div style={{ color: "var(--muted)", fontSize: "0.75rem", marginBottom: "0.25rem" }}>Checkout URL (send to fan)</div>
                <div style={{ color: "var(--gold)", fontFamily: "var(--font-mono)", fontSize: "0.75rem", wordBreak: "break-all" }}>
                  {`https://whop.com/checkout/${selected.whop_checkout_id}/`}
                </div>
              </div>
            )}
            {selected.status === "paid" && (
              <button
                disabled={loading}
                onClick={() => handleAction(selected.id, "deliver")}
                style={{ width: "100%", marginTop: "2rem", background: "var(--gold-glow)", border: "1px solid var(--gold-dim)", borderRadius: 8, padding: "0.75rem", color: "var(--gold)", cursor: "pointer", fontSize: "0.9rem" }}
              >
                {loading ? "Marking…" : "Mark as Delivered"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Accept Modal ── */}
      {acceptModal && selected && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60 }}
          onClick={() => setAcceptModal(false)}
        >
          <div
            style={{ background: "var(--card)", border: "1px solid var(--rim2)", borderRadius: 20, padding: "2rem", width: 420 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", color: "var(--white)", marginBottom: "0.25rem" }}>
              Accept Commission
            </h3>
            <p style={{ color: "var(--muted)", fontSize: "0.875rem", marginBottom: "1.5rem" }}>
              Set your final price. A payment link will be created automatically.
            </p>
            <label style={{ display: "block", color: "var(--muted)", fontSize: "0.75rem", marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Agreed Price (USD)
            </label>
            <div style={{ position: "relative", marginBottom: "1.5rem" }}>
              <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--gold)", fontFamily: "var(--font-mono)" }}>$</span>
              <input
                type="number"
                value={agreedCents}
                onChange={(e) => setAgreedCents(e.target.value)}
                placeholder={`${(selected.budget_cents / 100).toFixed(2)}`}
                style={{ width: "100%", background: "var(--deep)", border: "1px solid var(--rim2)", borderRadius: 8, padding: "0.75rem 0.75rem 0.75rem 2rem", color: "var(--white)", fontSize: "1rem", outline: "none", boxSizing: "border-box", fontFamily: "var(--font-mono)" }}
              />
            </div>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button onClick={() => setAcceptModal(false)} style={{ flex: 1, background: "none", border: "1px solid var(--rim)", borderRadius: 8, padding: "0.75rem", color: "var(--muted)", cursor: "pointer" }}>
                Cancel
              </button>
              <button
                disabled={loading || !agreedCents}
                onClick={handleAccept}
                style={{ flex: 2, background: "var(--gold)", border: "none", borderRadius: 8, padding: "0.75rem", color: "var(--void)", fontWeight: 600, cursor: "pointer", fontSize: "0.9rem" }}
              >
                {loading ? "Creating link…" : "Accept & Generate Link"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, mono, gold }: { label: string; value: string; mono?: boolean; gold?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ color: "var(--muted)", fontSize: "0.8125rem" }}>{label}</span>
      <span style={{ color: gold ? "var(--gold)" : "var(--white)", fontFamily: mono ? "var(--font-mono)" : undefined, fontSize: "0.875rem" }}>
        {value}
      </span>
    </div>
  );
}
