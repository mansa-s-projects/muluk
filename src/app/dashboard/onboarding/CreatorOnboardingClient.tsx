"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ExistingAnalysis = {
  niche?: string;
  confidence?: string;
  subNiches?: string[];
  handleSuggestions?: string[];
  pricing?: { recommendation?: string; rationale?: string };
  contentPillars?: Array<{ name?: string; description?: string }>;
  targetAudience?: { primary?: string; psychographics?: string[]; painPoints?: string };
  platformPriority?: string[];
  first30Days?: string[];
};

type Props = {
  initialValues: {
    interests: string[];
    contentTypes: string[];
    experience: string;
    currentPlatforms: string[];
    goals: string[];
  };
  existingAnalysis: ExistingAnalysis | null;
  creatorName: string;
};

function listToText(values: string[]) {
  return values.join(", ");
}

function textToList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function CreatorOnboardingClient({ initialValues, existingAnalysis, creatorName }: Props) {
  const router = useRouter();
  const [interests, setInterests] = useState(listToText(initialValues.interests));
  const [contentTypes, setContentTypes] = useState(listToText(initialValues.contentTypes));
  const [experience, setExperience] = useState(initialValues.experience || "beginner");
  const [currentPlatforms, setCurrentPlatforms] = useState(listToText(initialValues.currentPlatforms));
  const [goals, setGoals] = useState(listToText(initialValues.goals));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [analysis, setAnalysis] = useState<ExistingAnalysis | null>(existingAnalysis);

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "8px",
    color: "rgba(255,255,255,0.92)",
    padding: "12px 14px",
    fontSize: "14px",
    fontFamily: "var(--font-body)",
  };

  const runOnboarding = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/ai/onboarding/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          interests: textToList(interests),
          contentTypes: textToList(contentTypes),
          experience,
          currentPlatforms: textToList(currentPlatforms),
          followerCounts: {},
          goals: textToList(goals),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Onboarding failed");
      setAnalysis(data.analysis);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Onboarding failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#020203", color: "rgba(255,255,255,0.92)", padding: "48px 24px 72px" }}>
      {/* Progress Bar */}
      <div style={{ maxWidth: "1100px", margin: "0 auto", marginBottom: "48px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
          {[
            { label: "Application", done: true },
            { label: "Onboarding", done: false },
            { label: "Dashboard", done: false },
          ].map((step, idx, arr) => (
            <div key={step.label} style={{ display: "flex", alignItems: "center", flex: 1, gap: "12px" }}>
              <div style={{
                width: "28px",
                height: "28px",
                borderRadius: "50%",
                background: step.done ? "var(--gold)" : "rgba(200,169,110,0.2)",
                border: `1px solid ${step.done ? "var(--gold)" : "rgba(200,169,110,0.3)"}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "var(--font-mono)",
                fontSize: "11px",
                color: step.done ? "#120c00" : "var(--gold-dim)",
                fontWeight: step.done ? 600 : 400,
              }}>
                {step.done ? "✓" : idx + 1}
              </div>
              <span style={{
                fontFamily: "var(--font-mono)",
                fontSize: "11px",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: step.done ? "var(--gold)" : "rgba(255,255,255,0.4)",
              }}>
                {step.label}
              </span>
              {idx < arr.length - 1 && (
                <div style={{
                  flex: 1,
                  height: "1px",
                  background: step.done ? "var(--gold)" : "rgba(200,169,110,0.15)",
                  marginLeft: "12px",
                }} />
              )}
            </div>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: "1100px", margin: "0 auto", display: "grid", gridTemplateColumns: "1.05fr 0.95fr", gap: "24px" }}>
        <section style={{ background: "#0f0f1e", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "14px", padding: "28px" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "10px", letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--gold-dim)", marginBottom: "10px" }}>
            Creator Onboarding
          </div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "44px", fontWeight: 300, lineHeight: 1.02, color: "var(--gold)", marginBottom: "14px" }}>
            Build the creator setup before the dashboard.
          </h1>
          <p style={{ fontSize: "15px", lineHeight: 1.8, color: "rgba(255,255,255,0.52)", maxWidth: "650px", marginBottom: "26px" }}>
            {creatorName || "Creator"}, this is the real onboarding step. Define your niche, pricing angle, audience, and launch plan first. Once this is saved, you continue into the dashboard with a concrete starting strategy.
          </p>

          <div style={{ display: "grid", gap: "14px" }}>
            <div>
              <label htmlFor="interests-input" style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: "10px", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--gold-dim)", marginBottom: "8px" }}>
                Interests
              </label>
              <input id="interests-input" value={interests} onChange={(event) => setInterests(event.target.value)} placeholder="luxury, fashion, music" style={inputStyle} />
            </div>

            <div>
              <label htmlFor="content-types-input" style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: "10px", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--gold-dim)", marginBottom: "8px" }}>
                Content Types
              </label>
              <input id="content-types-input" value={contentTypes} onChange={(event) => setContentTypes(event.target.value)} placeholder="photos, videos, exclusive drops" style={inputStyle} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label htmlFor="experience-select" style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: "10px", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--gold-dim)", marginBottom: "8px" }}>
                  Experience
                </label>
                <select id="experience-select" value={experience} onChange={(event) => setExperience(event.target.value)} style={inputStyle}>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
              <div>
                <label htmlFor="current-platforms-input" style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: "10px", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--gold-dim)", marginBottom: "8px" }}>
                  Current Platforms
                </label>
                <input id="current-platforms-input" value={currentPlatforms} onChange={(event) => setCurrentPlatforms(event.target.value)} placeholder="instagram, x, tiktok" style={inputStyle} />
              </div>
            </div>

            <div>
              <label htmlFor="goals-textarea" style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: "10px", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--gold-dim)", marginBottom: "8px" }}>
                Goals
              </label>
              <textarea id="goals-textarea" value={goals} onChange={(event) => setGoals(event.target.value)} placeholder="first 50 paying fans, premium positioning, recurring revenue" rows={4} style={{ ...inputStyle, resize: "vertical" }} />
            </div>
          </div>

          {error && <div style={{ marginTop: "14px", color: "#ff6a6a", fontSize: "13px" }}>{error}</div>}

          <div style={{ display: "flex", gap: "12px", marginTop: "22px", flexWrap: "wrap" }}>
            <button onClick={() => void runOnboarding()} disabled={loading} style={{ border: "none", borderRadius: "8px", padding: "12px 18px", background: "var(--gold)", color: "#120c00", fontFamily: "var(--font-mono)", fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", cursor: "pointer", opacity: loading ? 0.65 : 1 }}>
              {loading ? "Running onboarding..." : analysis ? "Refine onboarding" : "Run creator onboarding"}
            </button>
            <button onClick={() => router.push("/dashboard")} disabled={!analysis} style={{ border: "1px solid rgba(200,169,110,0.3)", borderRadius: "8px", padding: "12px 18px", background: "transparent", color: analysis ? "var(--gold)" : "rgba(255,255,255,0.3)", fontFamily: "var(--font-mono)", fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", cursor: analysis ? "pointer" : "not-allowed" }}>
              Continue to dashboard
            </button>
          </div>
        </section>

        <section style={{ background: "#111120", border: "1px solid rgba(255,255,255,0.055)", borderRadius: "14px", padding: "28px" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "10px", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--gold-dim)", marginBottom: "10px" }}>
            Onboarding Output
          </div>

          {!analysis && (
            <p style={{ fontSize: "14px", lineHeight: 1.8, color: "rgba(255,255,255,0.46)" }}>
              Run onboarding to generate your niche, pricing recommendation, content pillars, target audience, and first 30-day plan.
            </p>
          )}

          {analysis && (
            <div style={{ display: "grid", gap: "14px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div style={{ padding: "12px", borderRadius: "10px", background: "rgba(200,169,110,0.06)", border: "1px solid rgba(200,169,110,0.2)" }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "9px", color: "var(--gold-dim)", marginBottom: "5px" }}>NICHE</div>
                  <div style={{ fontSize: "24px", color: "var(--gold)", fontFamily: "var(--font-display)" }}>{analysis.niche || "-"}</div>
                  <div style={{ fontSize: "12px", color: "var(--dim)", marginTop: "4px" }}>{analysis.confidence || ""}</div>
                </div>
                <div style={{ padding: "12px", borderRadius: "10px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "9px", color: "var(--gold-dim)", marginBottom: "5px" }}>STARTING PRICE</div>
                  <div style={{ fontSize: "20px", color: "rgba(255,255,255,0.92)" }}>{analysis.pricing?.recommendation || "-"}</div>
                  <div style={{ fontSize: "12px", color: "var(--dim)", marginTop: "4px", lineHeight: 1.6 }}>{analysis.pricing?.rationale || ""}</div>
                </div>
              </div>

              <div style={{ padding: "14px", borderRadius: "10px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "9px", color: "var(--gold-dim)", marginBottom: "8px" }}>CONTENT PILLARS</div>
                <div style={{ display: "grid", gap: "7px" }}>
                  {(analysis.contentPillars || []).map((pillar, index) => (
                    <div key={`${pillar.name}-${index}`} style={{ fontSize: "12px", lineHeight: 1.6, color: "rgba(255,255,255,0.72)" }}>
                      <strong style={{ color: "var(--gold)" }}>{pillar.name || `Pillar ${index + 1}`}</strong>: {pillar.description || ""}
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ padding: "14px", borderRadius: "10px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "9px", color: "var(--gold-dim)", marginBottom: "8px" }}>FIRST 30 DAYS</div>
                <div style={{ display: "grid", gap: "7px" }}>
                  {(analysis.first30Days || []).map((step, index) => (
                    <div key={`${step}-${index}`} style={{ fontSize: "12px", lineHeight: 1.6, color: "rgba(255,255,255,0.72)" }}>{step}</div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
      </div>
    </div>
  );
}