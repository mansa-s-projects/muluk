"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { parseCreatorAiSummary } from "@/lib/creator-intelligence";

type ApplicationStatus = "pending" | "approved" | "waitlist" | "rejected";
type Recommendation = "APPROVE_PRIORITY" | "APPROVE" | "WAITLIST" | "REJECT" | "approved" | "waitlist" | "rejected";

type ApplicationRow = {
  id: string;
  name: string;
  email: string;
  primary_platform: string;
  handle: string;
  niche: string | null;
  bio: string | null;
  short_description: string | null;
  audience_size: string | null;
  audience_size_self_reported: string | null;
  monthly_earnings: string | null;
  reason_for_joining: string | null;
  why_join_muluk: string | null;
  overall_score: number;
  recommendation: Recommendation;
  confidence: "high" | "medium" | "low" | null;
  strengths: string[];
  weaknesses: string[];
  onboarding_path: string | null;
  ai_summary: string | null;
  red_flags?: Array<{ type: string; detected: boolean; severity: string; reason: string }>;
  opportunity_tags?: string[];
  first_revenue_prescription?: {
    what_to_sell_first?: string;
    recommended_price_range?: string;
    best_first_product_type?: string;
    fastest_path_to_first_3_sales?: string[];
  } | null;
  admin_decision_memo?: string | null;
  score_explainability?: Record<string, { score?: number; weight?: number; weightedContribution?: number; reasons?: string[] }> | null;
  subscores: {
    audience: number | null;
    engagement: number | null;
    niche: number | null;
    offer_readiness: number | null;
    brand_quality: number | null;
    growth_potential: number | null;
  };
  status: ApplicationStatus;
  admin_notes: string | null;
  created_at: string;
};

const mono = { fontFamily: "var(--font-mono, 'DM Mono', monospace)" } as const;
const body = { fontFamily: "var(--font-body, 'Outfit', sans-serif)" } as const;

const STATUS_OPTIONS: Array<ApplicationStatus | "all"> = ["all", "pending", "approved", "waitlist", "rejected"];
const RECOMMENDATION_OPTIONS = ["all", "APPROVE_PRIORITY", "APPROVE", "WAITLIST", "REJECT"] as const;
const SORT_OPTIONS = [
  { value: "score_desc", label: "Highest score" },
  { value: "score_asc", label: "Lowest score" },
  { value: "newest", label: "Newest" },
] as const;

export function ApplicationManager() {
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | "all">("pending");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [nicheFilter, setNicheFilter] = useState("all");
  const [recommendationFilter, setRecommendationFilter] = useState<(typeof RECOMMENDATION_OPTIONS)[number]>("all");
  const [sort, setSort] = useState<(typeof SORT_OPTIONS)[number]["value"]>("score_desc");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ApplicationRow | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState("");
  const latestRequestRef = useRef(0);

  useEffect(() => {
    if (!selected) return;
    setAdminNotes(selected.admin_notes ?? "");
  }, [selected]);

  const stats = useMemo(() => {
    const total = applications.length;
    const approved = applications.filter((item) => item.status === "approved").length;
    const waitlist = applications.filter((item) => item.status === "waitlist").length;
    const pending = applications.filter((item) => item.status === "pending").length;
    return { total, approved, waitlist, pending };
  }, [applications]);

  const platformOptions = useMemo(() => {
    const values = Array.from(new Set(applications.map((item) => item.primary_platform).filter(Boolean))).sort();
    return ["all", ...values];
  }, [applications]);

  const nicheOptions = useMemo(() => {
    const values = Array.from(new Set(applications.map((item) => item.niche).filter(Boolean) as string[])).sort();
    return ["all", ...values];
  }, [applications]);

  const aiSections = useMemo(
    () => parseCreatorAiSummary(selected?.ai_summary),
    [selected?.ai_summary]
  );

  const loadApplications = useCallback(async (requestId?: number, signal?: AbortSignal) => {
    const activeRequestId = requestId ?? ++latestRequestRef.current;
    setLoading(true);

    try {
      const params = new URLSearchParams({
        status: statusFilter,
        platform: platformFilter,
        niche: nicheFilter,
        recommendation: recommendationFilter,
        sort,
      });

      const response = await fetch(`/api/admin/applications?${params.toString()}`, { signal });
      const json = (await response.json()) as {
        applications?: ApplicationRow[];
        error?: string;
      };

      if (activeRequestId !== latestRequestRef.current) return;

      if (!response.ok) {
        setMessage(json.error ?? "Failed to load applications");
        return;
      }

      setApplications(json.applications ?? []);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      if (activeRequestId !== latestRequestRef.current) return;
      setMessage("Network error while loading applications");
    } finally {
      if (activeRequestId !== latestRequestRef.current) return;
      setLoading(false);
    }
  }, [statusFilter, platformFilter, nicheFilter, recommendationFilter, sort]);

  useEffect(() => {
    const abortController = new AbortController();
    const requestId = ++latestRequestRef.current;
    void loadApplications(requestId, abortController.signal);

    return () => abortController.abort();
  }, [loadApplications]);

  async function updateStatus(nextStatus: ApplicationStatus) {
    if (!selected) return;
    setUpdating(true);

    try {
      const response = await fetch(`/api/admin/applications/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus, adminNotes }),
      });

      const json = (await response.json()) as { error?: string };
      if (!response.ok) {
        setMessage(json.error ?? "Update failed");
        return;
      }

      setMessage(`Application moved to ${nextStatus}.`);
      setSelected(null);
      await loadApplications();
    } catch {
      setMessage("Network error while updating application");
    } finally {
      setUpdating(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div>
        <p style={{ ...mono, margin: 0, color: "rgba(200,169,110,0.72)", fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase" }}>
          Creator Intelligence Panel
        </p>
        <h1 style={{ margin: "8px 0 0", fontSize: 44, lineHeight: 0.95, fontWeight: 300, color: "#c8a96e", fontFamily: "var(--font-display, 'Cormorant Garamond', serif)" }}>
          Applications
        </h1>
      </div>

      <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(4, minmax(0,1fr))" }}>
        <StatCard label="Visible" value={String(stats.total)} />
        <StatCard label="Pending" value={String(stats.pending)} />
        <StatCard label="Approved" value={String(stats.approved)} />
        <StatCard label="Waitlist" value={String(stats.waitlist)} />
      </div>

      {message ? (
        <div style={{ border: "1px solid rgba(200,169,110,0.2)", borderRadius: 8, padding: "10px 12px", color: "rgba(255,255,255,0.75)", fontSize: 13 }}>
          {message}
        </div>
      ) : null}

      <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(4, minmax(0,1fr))" }}>
        <FilterSelect label="Platform" value={platformFilter} onChange={setPlatformFilter} options={platformOptions} />
        <FilterSelect label="Niche" value={nicheFilter} onChange={setNicheFilter} options={nicheOptions} />
        <FilterSelect label="Recommendation" value={recommendationFilter} onChange={(value) => setRecommendationFilter(value as (typeof RECOMMENDATION_OPTIONS)[number])} options={[...RECOMMENDATION_OPTIONS]} />
        <FilterSelect label="Sort" value={sort} onChange={(value) => setSort(value as (typeof SORT_OPTIONS)[number]["value"])} options={SORT_OPTIONS.map((item) => item.value)} labels={Object.fromEntries(SORT_OPTIONS.map((item) => [item.value, item.label]))} />
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {STATUS_OPTIONS.map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setStatusFilter(status)}
            style={{
              ...mono,
              fontSize: 10,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              padding: "9px 12px",
              borderRadius: 999,
              border: `1px solid ${statusFilter === status ? "rgba(200,169,110,0.4)" : "rgba(255,255,255,0.14)"}`,
              background: statusFilter === status ? "rgba(200,169,110,0.14)" : "rgba(255,255,255,0.02)",
              color: statusFilter === status ? "#c8a96e" : "rgba(255,255,255,0.65)",
              cursor: "pointer",
            }}
          >
            {status}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 13 }}>Loading applications...</div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {applications.map((item) => (
            <button
              type="button"
              key={item.id}
              onClick={() => setSelected(item)}
              style={{
                textAlign: "left",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 10,
                background: "rgba(17,17,32,0.9)",
                padding: "13px 14px",
                cursor: "pointer",
                display: "grid",
                gridTemplateColumns: "1.2fr .8fr .8fr .8fr .7fr",
                gap: 12,
              }}
            >
              <div>
                <p style={{ margin: 0, color: "rgba(255,255,255,0.9)", fontSize: 15, ...body }}>{item.name}</p>
                <p style={{ margin: "2px 0 0", color: "rgba(255,255,255,0.5)", fontSize: 11, ...mono }}>
                  @{item.handle} · {item.primary_platform}
                </p>
              </div>
              <Metric label="Score" value={String(item.overall_score ?? 0)} />
              <Metric label="Rec" value={item.recommendation} color={decisionColor(item.recommendation)} monoValue />
              <Metric label="Conf" value={item.confidence ?? "-"} color={confidenceColor(item.confidence)} monoValue />
              <Metric label="Status" value={item.status} color={decisionColor(item.status)} monoValue />
            </button>
          ))}
        </div>
      )}

      {selected ? (
        <div
          onClick={(event) => {
            if (event.target === event.currentTarget) setSelected(null);
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99,
            background: "rgba(0,0,0,0.82)",
            display: "grid",
            placeItems: "center",
            padding: 20,
          }}
        >
          <div style={{ width: "min(920px, 100%)", border: "1px solid rgba(200,169,110,0.25)", borderRadius: 14, background: "#09090f", padding: 18, maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 12 }}>
              <div>
                <p style={{ margin: 0, color: "rgba(255,255,255,0.9)", fontSize: 24, fontFamily: "var(--font-display, 'Cormorant Garamond', serif)" }}>
                  {selected.name}
                </p>
                <p style={{ margin: "3px 0 0", color: "rgba(255,255,255,0.52)", fontSize: 12, ...mono }}>
                  @{selected.handle} · {selected.email}
                </p>
              </div>
              <button type="button" onClick={() => setSelected(null)} className="close">
                Close
              </button>
            </div>

            <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(6,minmax(0,1fr))", marginTop: 14 }}>
              <StatCard label="Audience" value={String(selected.subscores.audience ?? "-")} compact />
              <StatCard label="Engagement" value={String(selected.subscores.engagement ?? "-")} compact />
              <StatCard label="Niche" value={String(selected.subscores.niche ?? "-")} compact />
              <StatCard label="Offer" value={String(selected.subscores.offer_readiness ?? "-")} compact />
              <StatCard label="Brand" value={String(selected.subscores.brand_quality ?? "-")} compact />
              <StatCard label="Growth" value={String(selected.subscores.growth_potential ?? "-")} compact />
            </div>

            <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
              <MetaRow label="Niche" value={selected.niche || "-"} />
              <MetaRow label="Audience" value={selected.audience_size || selected.audience_size_self_reported || "-"} />
              <MetaRow label="Monthly Earnings" value={selected.monthly_earnings || "-"} />
              <MetaRow label="Bio" value={selected.bio || selected.short_description || "-"} />
              <MetaRow label="Why MULUK" value={selected.reason_for_joining || selected.why_join_muluk || "-"} />
              <MetaRow label="Onboarding Path" value={selected.onboarding_path || "-"} />
            </div>

            <div style={{ marginTop: 14, display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
              <ListCard title="Top Strengths" items={selected.strengths} />
              <ListCard title="Top Weaknesses" items={selected.weaknesses} />
            </div>

            {selected.admin_decision_memo ? (
              <div style={{ marginTop: 14 }}>
                <MetaRow label="Admin Decision Memo" value={selected.admin_decision_memo} />
              </div>
            ) : null}

            {selected.opportunity_tags && selected.opportunity_tags.length > 0 ? (
              <div style={{ marginTop: 14 }}>
                <ListCard title="Opportunity Tags" items={selected.opportunity_tags} />
              </div>
            ) : null}

            {selected.red_flags && selected.red_flags.length > 0 ? (
              <div style={{ marginTop: 14 }}>
                <ListCard
                  title="Red Flag Detection"
                  items={selected.red_flags.map((flag) => `${flag.type}: ${flag.detected ? `${flag.severity} risk` : "clear"} - ${flag.reason}`)}
                />
              </div>
            ) : null}

            {selected.first_revenue_prescription ? (
              <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
                <MetaRow label="First Sell" value={selected.first_revenue_prescription.what_to_sell_first || "-"} />
                <MetaRow label="Price Range" value={selected.first_revenue_prescription.recommended_price_range || "-"} />
                <MetaRow label="First Product Type" value={selected.first_revenue_prescription.best_first_product_type || "-"} />
                <ListCard title="Fastest Path To First 3 Sales" items={selected.first_revenue_prescription.fastest_path_to_first_3_sales || []} />
              </div>
            ) : null}

            {selected.ai_summary ? (
              <div style={{ marginTop: 14, display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
                <ListCard title="Monetization Readiness" items={aiSections.monetizationReadiness ? [aiSections.monetizationReadiness] : []} />
                <ListCard title="Red Flags" items={aiSections.redFlags ? [aiSections.redFlags] : []} />
                <ListCard title="Fit Assessment" items={aiSections.fitAssessment ? [aiSections.fitAssessment] : []} />
                <ListCard title="Ideal Launch Path" items={aiSections.idealLaunchPath ? [aiSections.idealLaunchPath] : []} />
              </div>
            ) : null}

            <label style={{ display: "block", marginTop: 14 }}>
              <span style={{ ...mono, fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(200,169,110,0.72)" }}>
                Admin notes
              </span>
              <textarea
                value={adminNotes}
                onChange={(event) => setAdminNotes(event.target.value)}
                style={{
                  width: "100%",
                  marginTop: 6,
                  minHeight: 88,
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.13)",
                  background: "rgba(255,255,255,0.02)",
                  color: "rgba(255,255,255,0.86)",
                  padding: 10,
                }}
              />
            </label>

            <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button className="action negative" disabled={updating} onClick={() => updateStatus("rejected")}>Reject</button>
              <button className="action neutral" disabled={updating} onClick={() => updateStatus("waitlist")}>Waitlist</button>
              <button className="action positive" disabled={updating} onClick={() => updateStatus("approved")}>Approve</button>
            </div>
          </div>

          <style jsx>{`
            .close {
              border: 1px solid rgba(255,255,255,0.15);
              background: transparent;
              color: rgba(255,255,255,0.65);
              border-radius: 5px;
              padding: 8px 10px;
              font-size: 10px;
              letter-spacing: .14em;
              text-transform: uppercase;
            }

            .action {
              border-radius: 5px;
              padding: 10px 14px;
              font-size: 10px;
              text-transform: uppercase;
              letter-spacing: 0.14em;
              font-family: var(--font-mono, 'DM Mono', monospace);
              border: 1px solid;
              cursor: pointer;
            }

            .action:disabled {
              opacity: .6;
              cursor: not-allowed;
            }

            .action.negative {
              border-color: rgba(227,127,127,.45);
              color: #e37f7f;
              background: rgba(227,127,127,.08);
            }

            .action.neutral {
              border-color: rgba(200,169,110,.42);
              color: #c8a96e;
              background: rgba(200,169,110,.1);
            }

            .action.positive {
              border-color: rgba(80,212,138,.42);
              color: #50d48a;
              background: rgba(80,212,138,.1);
            }
          `}</style>
        </div>
      ) : null}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  labels,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  labels?: Record<string, string>;
}) {
  return (
    <label style={{ display: "grid", gap: 4 }}>
      <span style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(200,169,110,0.7)", fontFamily: "var(--font-mono, 'DM Mono', monospace)" }}>
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        style={{
          border: "1px solid rgba(255,255,255,0.14)",
          borderRadius: 8,
          background: "rgba(255,255,255,0.02)",
          color: "rgba(255,255,255,0.85)",
          padding: "10px 11px",
        }}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {labels?.[option] ?? option}
          </option>
        ))}
      </select>
    </label>
  );
}

function Metric({
  label,
  value,
  color,
  monoValue,
}: {
  label: string;
  value: string;
  color?: string;
  monoValue?: boolean;
}) {
  return (
    <div>
      <p style={{ margin: 0, color: "rgba(255,255,255,0.58)", fontSize: 10, letterSpacing: "0.1em", fontFamily: "var(--font-mono, 'DM Mono', monospace)" }}>{label.toUpperCase()}</p>
      <p style={{ margin: "4px 0 0", color: color ?? "#c8a96e", fontSize: 12, fontFamily: monoValue ? "var(--font-mono, 'DM Mono', monospace)" : "var(--font-display, 'Cormorant Garamond', serif)", textTransform: monoValue ? "uppercase" : "none" }}>{value}</p>
    </div>
  );
}

function ListCard({ title, items }: { title: string; items: string[] }) {
  return (
    <div style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, background: "rgba(255,255,255,0.02)", padding: "10px 11px" }}>
      <p style={{ margin: 0, fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(200,169,110,0.7)", fontFamily: "var(--font-mono, 'DM Mono', monospace)" }}>{title}</p>
      <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
        {(items.length > 0 ? items : ["-"]).map((item, index) => (
          <p key={`${title}-${index}`} style={{ margin: 0, color: "rgba(255,255,255,0.76)", fontSize: 13, lineHeight: 1.45, fontFamily: "var(--font-body, 'Outfit', sans-serif)" }}>
            {item}
          </p>
        ))}
      </div>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, background: "rgba(255,255,255,0.02)", padding: "10px 11px" }}>
      <p style={{ margin: 0, fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(200,169,110,0.7)", fontFamily: "var(--font-mono, 'DM Mono', monospace)" }}>{label}</p>
      <p style={{ margin: "5px 0 0", color: "rgba(255,255,255,0.76)", fontSize: 13, lineHeight: 1.55, fontFamily: "var(--font-body, 'Outfit', sans-serif)" }}>{value}</p>
    </div>
  );
}

function StatCard({
  label,
  value,
  compact,
}: {
  label: string;
  value: string;
  compact?: boolean;
}) {
  return (
    <div style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 9, background: "rgba(255,255,255,0.02)", padding: compact ? 10 : 12 }}>
      <p style={{ margin: 0, fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.55)", fontFamily: "var(--font-mono, 'DM Mono', monospace)" }}>{label}</p>
      <p style={{ margin: "4px 0 0", fontSize: compact ? 20 : 28, color: "#c8a96e", lineHeight: 1, fontFamily: "var(--font-display, 'Cormorant Garamond', serif)" }}>{value}</p>
    </div>
  );
}

function decisionColor(value: string): string {
  if (value === "APPROVE_PRIORITY") return "#50d48a";
  if (value === "APPROVE") return "#7ce7a8";
  if (value === "approved") return "#50d48a";
  if (value === "WAITLIST" || value === "waitlist") return "#c8a96e";
  if (value === "pending") return "#5b8de8";
  return "#e37f7f";
}

function confidenceColor(value: string | null): string {
  if (value === "high") return "#50d48a";
  if (value === "medium") return "#c8a96e";
  if (value === "low") return "#e37f7f";
  return "rgba(255,255,255,0.65)";
}
