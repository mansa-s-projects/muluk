"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, useCallback, Suspense } from "react";
import { formatPrice } from "@/lib/commissions";

type StatusType = "pending" | "accepted" | "rejected" | "paid" | "delivered" | "cancelled";

interface CommissionStatus {
  status:         StatusType;
  title?:         string;
  agreed_cents?:  number;
  checkout_url?:  string;
  paid_at?:       string | null;
  delivered_at?:  string | null;
}

const STATUS_STEPS: StatusType[] = ["pending", "accepted", "paid", "delivered"];

const STATUS_LABELS: Record<StatusType, string> = {
  pending:   "Pending Review",
  accepted:  "Accepted — Payment Required",
  rejected:  "Declined",
  paid:      "Paid — In Progress",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const STATUS_DESC: Record<StatusType, string> = {
  pending:   "Your request has been submitted and is awaiting review.",
  accepted:  "Great news! The creator has accepted your request and set a price. Complete payment to proceed.",
  rejected:  "The creator was unable to take on this commission at this time.",
  paid:      "Payment confirmed. The creator is working on your commission.",
  delivered: "Your commission has been delivered! Check your email for the files.",
  cancelled: "This commission has been cancelled.",
};

function StatusPageInner() {
  const params    = useSearchParams();
  const id        = params.get("id") ?? "";
  const token     = params.get("token") ?? "";

  const [data, setData]     = useState<CommissionStatus | null>(null);
  const [error, setError]   = useState("");
  const [loading, setLoading] = useState(true);

  const tokenValid = /^[0-9a-f]{48}$/.test(token);
  const idValid    = id.length > 0;

  const poll = useCallback(async () => {
    if (!tokenValid || !idValid) return;
    try {
      const res  = await fetch(`/api/commissions/${id}/status?token=${token}`);
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Unable to fetch status.");
        setLoading(false);
        return;
      }
      setData(json);
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }, [id, token, idValid, tokenValid]);

  useEffect(() => {
    if (!tokenValid || !idValid) {
      setError("Invalid or missing token.");
      setLoading(false);
      return;
    }
    void poll();
    // Auto-poll every 15s while pending/accepted
    const interval = setInterval(() => {
      if (data?.status && !["pending","accepted"].includes(data.status)) {
        clearInterval(interval);
        return;
      }
      void poll();
    }, 15_000);
    return () => clearInterval(interval);
  }, [poll, idValid, tokenValid, data?.status]);

  const activeIdx  = data ? STATUS_STEPS.indexOf(data.status) : -1;
  const isTerminal = data ? ["rejected","cancelled","delivered"].includes(data.status) : false;

  return (
    <div style={{ minHeight: "100vh", background: "var(--void)", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem", fontFamily: "var(--font-body)" }}>
      <div style={{ width: "100%", maxWidth: 520 }}>

        {/* ── Header ── */}
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <div style={{ display: "inline-block", background: "var(--gold-trace)", border: "1px solid var(--gold-mid)", borderRadius: 12, padding: "0.5rem 1.25rem", marginBottom: "1rem" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--gold)", letterSpacing: "0.1em" }}>COMMISSION STATUS</span>
          </div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2rem", fontWeight: 400, color: "var(--white)", margin: 0 }}>
            {data?.title ?? "Your Commission"}
          </h1>
        </div>

        {loading && (
          <div style={{ textAlign: "center", color: "var(--muted)", padding: "3rem" }}>Checking status…</div>
        )}

        {error && !loading && (
          <div style={{ background: "var(--card)", border: "1px solid var(--rim2)", borderRadius: 16, padding: "2rem", textAlign: "center" }}>
            <div style={{ color: "var(--red)", fontSize: "0.9rem" }}>{error}</div>
          </div>
        )}

        {data && !error && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

            {/* ── Timeline ── */}
            {!isTerminal || data.status === "delivered" ? (
              <div style={{ background: "var(--card)", border: "1px solid var(--rim2)", borderRadius: 16, padding: "1.5rem" }}>
                {STATUS_STEPS.map((s, i) => {
                  const done    = activeIdx > i;
                  const current = activeIdx === i;
                  return (
                    <div key={s} style={{ display: "flex", alignItems: "flex-start", gap: "1rem", paddingBottom: i < STATUS_STEPS.length - 1 ? "1.25rem" : 0, position: "relative" }}>
                      {i < STATUS_STEPS.length - 1 && (
                        <div style={{ position: "absolute", left: 13, top: 28, width: 2, height: "calc(100% - 1rem)", background: done ? "var(--gold)" : "var(--rim)" }} />
                      )}
                      <div style={{ width: 28, height: 28, borderRadius: "50%", border: `2px solid ${done || current ? "var(--gold)" : "var(--rim)"}`, background: done ? "var(--gold)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "0.75rem", color: done ? "var(--void)" : current ? "var(--gold)" : "var(--dim)" }}>
                        {done ? "✓" : i + 1}
                      </div>
                      <div style={{ paddingTop: "0.25rem" }}>
                        <div style={{ color: current ? "var(--white)" : done ? "var(--muted)" : "var(--dim)", fontSize: "0.875rem", fontWeight: current ? 500 : 400 }}>
                          {STATUS_LABELS[s]}
                        </div>
                        {current && (
                          <div style={{ color: "var(--muted)", fontSize: "0.8rem", marginTop: "0.25rem" }}>{STATUS_DESC[s]}</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ background: "var(--card)", border: "1px solid var(--rim2)", borderRadius: 16, padding: "2rem", textAlign: "center" }}>
                <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>{data.status === "rejected" || data.status === "cancelled" ? "✕" : "✦"}</div>
                <div style={{ color: "var(--white)", fontSize: "1.1rem", fontWeight: 500, marginBottom: "0.5rem" }}>{STATUS_LABELS[data.status]}</div>
                <div style={{ color: "var(--muted)", fontSize: "0.875rem" }}>{STATUS_DESC[data.status]}</div>
              </div>
            )}

            {/* ── Accepted — payment CTA ── */}
            {data.status === "accepted" && data.checkout_url && (
              <div style={{ background: "var(--gold-trace)", border: "1px solid var(--gold-mid)", borderRadius: 16, padding: "1.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                  <div style={{ color: "var(--muted)", fontSize: "0.8125rem" }}>Price set by creator</div>
                  <div style={{ color: "var(--gold)", fontFamily: "var(--font-mono)", fontSize: "1.5rem" }}>
                    {data.agreed_cents ? formatPrice(data.agreed_cents) : "—"}
                  </div>
                </div>
                <a
                  href={data.checkout_url}
                  style={{ display: "block", background: "var(--gold)", border: "none", borderRadius: 10, padding: "0.875rem", color: "var(--void)", fontWeight: 700, textAlign: "center", fontSize: "1rem", textDecoration: "none", letterSpacing: "0.02em" }}
                >
                  Complete Payment →
                </a>
              </div>
            )}

            {/* ── Dates ── */}
            {(data.paid_at || data.delivered_at) && (
              <div style={{ background: "var(--card)", border: "1px solid var(--rim)", borderRadius: 12, padding: "1rem 1.25rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {data.paid_at && (
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--muted)", fontSize: "0.8125rem" }}>Paid</span>
                    <span style={{ color: "var(--white)", fontSize: "0.8125rem", fontFamily: "var(--font-mono)" }}>{new Date(data.paid_at).toLocaleString()}</span>
                  </div>
                )}
                {data.delivered_at && (
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--muted)", fontSize: "0.8125rem" }}>Delivered</span>
                    <span style={{ color: "var(--white)", fontSize: "0.8125rem", fontFamily: "var(--font-mono)" }}>{new Date(data.delivered_at).toLocaleString()}</span>
                  </div>
                )}
              </div>
            )}

            {/* ── Auto-refresh note ── */}
            {["pending","accepted"].includes(data.status) && (
              <p style={{ textAlign: "center", color: "var(--dim)", fontSize: "0.75rem" }}>Page refreshes automatically every 15 seconds.</p>
            )}
          </div>
        )}

        <p style={{ textAlign: "center", color: "var(--dim)", fontSize: "0.75rem", marginTop: "2rem" }}>
          Powered by MULUK · Bookmark this page
        </p>
      </div>
    </div>
  );
}

export default function CommissionStatusPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "50vh", display: "grid", placeItems: "center", color: "var(--muted)" }}>Loading status…</div>}>
      <StatusPageInner />
    </Suspense>
  );
}
