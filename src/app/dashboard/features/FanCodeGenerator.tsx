"use client";

import { useState } from "react";

const mono: React.CSSProperties = { fontFamily: "var(--font-mono)" };
const disp: React.CSSProperties = { fontFamily: "var(--font-display)" };

export type FanCodeGeneratorProps = {
  userId: string;
  currentCount: number;
  tier?: string;
  onGenerated?: (codes: Array<{ id: string; code: string; created_at: string }>) => void;
};

export function FanCodeGenerator({ userId: _userId, currentCount, tier = "cipher", onGenerated }: FanCodeGeneratorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [customName, setCustomName] = useState("");
  const [creatorNotes, setCreatorNotes] = useState("");
  const [tags, setTags] = useState("");
  const [isVip, setIsVip] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [generatedCodes, setGeneratedCodes] = useState<Array<{ id: string; code: string; created_at: string }>>([]);

  const limits: Record<string, number> = {
    cipher: 500,
    legend: 999999,
    apex: 999999,
  };
  const maxCodes = limits[tier] || 500;
  const remaining = maxCodes - currentCount;

  const generate = async () => {
    if (quantity > remaining) {
      setMessage(`Tier limit: Only ${remaining} codes remaining.`);
      return;
    }

    setLoading(true);
    setMessage("");
    setGeneratedCodes([]);

    try {
      const res = await fetch("/api/fans/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quantity,
          customName: quantity === 1 ? customName || null : null,
          creatorNotes: quantity === 1 ? creatorNotes || null : null,
          tags: quantity === 1 ? tags.split(",").map(t => t.trim()).filter(Boolean) : [],
          isVip: quantity === 1 ? isVip : false,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to generate codes");
      }

      setGeneratedCodes(data.codes || []);
      setMessage(`Successfully generated ${data.generated} fan code${data.generated > 1 ? "s" : ""}!`);
      onGenerated?.(data.codes || []);
      
      // Reset form after success
      if (quantity === 1) {
        setCustomName("");
        setCreatorNotes("");
        setTags("");
        setIsVip(false);
      }
    } catch (err) {
      console.error("Generate error:", err);
      setMessage(err instanceof Error ? err.message : "Failed to generate codes");
    } finally {
      setLoading(false);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{
          background: "var(--gold)",
          border: "none",
          color: "#0a0800",
          ...mono,
          fontSize: "11px",
          fontWeight: 500,
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          padding: "12px 24px",
          borderRadius: "3px",
          cursor: "pointer",
          transition: "opacity 0.2s",
        }}
        onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
        onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
      >
        + Generate Fan Code
      </button>
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={e => { if (e.target === e.currentTarget) setIsOpen(false); }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9200,
        background: "rgba(0,0,0,0.85)",
        backdropFilter: "blur(10px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "500px",
          maxHeight: "90vh",
          overflowY: "auto",
          background: "#0d0d18",
          border: "1px solid rgba(200,169,110,0.25)",
          borderRadius: "12px",
          padding: "28px",
          position: "relative",
        }}
      >
        <button
          onClick={() => setIsOpen(false)}
          style={{
            position: "absolute",
            top: "16px",
            right: "16px",
            background: "transparent",
            border: "none",
            color: "var(--dim)",
            fontSize: "24px",
            cursor: "pointer",
          }}
        >
          ×
        </button>

        <div style={{ ...mono, fontSize: "10px", letterSpacing: "0.18em", color: "var(--gold-dim)", marginBottom: "8px" }}>
          FAN CODE GENERATOR
        </div>
        <div style={{ ...disp, fontSize: "28px", color: "var(--gold)", marginBottom: "8px" }}>
          Generate New Code
        </div>
        <div style={{ fontSize: "13px", color: "var(--dim)", marginBottom: "24px" }}>
          {currentCount} / {maxCodes === 999999 ? "∞" : maxCodes} codes used
          {remaining < 50 && remaining > 0 && (
            <span style={{ color: "#ff8f6a", marginLeft: "8px" }}>({remaining} remaining)</span>
          )}
        </div>

        {/* Quantity */}
        <div style={{ marginBottom: "20px" }}>
          <label style={{ ...mono, fontSize: "10px", letterSpacing: "0.15em", color: "var(--gold-dim)", display: "block", marginBottom: "8px" }}>
            QUANTITY
          </label>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {[1, 5, 10, 25, 50].map(q => (
              <button
                key={q}
                onClick={() => setQuantity(q)}
                disabled={q > remaining}
                style={{
                  padding: "8px 16px",
                  borderRadius: "4px",
                  border: `1px solid ${quantity === q ? "var(--gold)" : "rgba(255,255,255,0.1)"}`,
                  background: quantity === q ? "rgba(200,169,110,0.15)" : "transparent",
                  color: quantity === q ? "var(--gold)" : q > remaining ? "rgba(255,255,255,0.3)" : "var(--muted)",
                  ...mono,
                  fontSize: "12px",
                  cursor: q > remaining ? "not-allowed" : "pointer",
                }}
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Single code options */}
        {quantity === 1 && (
          <>
            <div style={{ marginBottom: "16px" }}>
              <label style={{ ...mono, fontSize: "10px", letterSpacing: "0.15em", color: "var(--gold-dim)", display: "block", marginBottom: "6px" }}>
                CUSTOM NAME (OPTIONAL)
              </label>
              <input
                type="text"
                value={customName}
                onChange={e => setCustomName(e.target.value)}
                placeholder="e.g., VIP Fan #1"
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "4px",
                  color: "rgba(255,255,255,0.9)",
                  fontSize: "14px",
                }}
              />
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ ...mono, fontSize: "10px", letterSpacing: "0.15em", color: "var(--gold-dim)", display: "block", marginBottom: "6px" }}>
                NOTES (OPTIONAL)
              </label>
              <textarea
                value={creatorNotes}
                onChange={e => setCreatorNotes(e.target.value)}
                placeholder="Private notes about this fan..."
                rows={2}
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "4px",
                  color: "rgba(255,255,255,0.9)",
                  fontSize: "14px",
                  resize: "none",
                }}
              />
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ ...mono, fontSize: "10px", letterSpacing: "0.15em", color: "var(--gold-dim)", display: "block", marginBottom: "6px" }}>
                TAGS (COMMA SEPARATED)
              </label>
              <input
                type="text"
                value={tags}
                onChange={e => setTags(e.target.value)}
                placeholder="vip, whale, early-adopter"
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "4px",
                  color: "rgba(255,255,255,0.9)",
                  fontSize: "14px",
                }}
              />
            </div>

            <div style={{ marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px" }}>
              <button
                onClick={() => setIsVip(!isVip)}
                style={{
                  width: "20px",
                  height: "20px",
                  borderRadius: "4px",
                  border: `1px solid ${isVip ? "var(--gold)" : "rgba(255,255,255,0.2)"}`,
                  background: isVip ? "var(--gold)" : "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                {isVip && <span style={{ color: "#0a0800", fontSize: "14px" }}>✓</span>}
              </button>
              <span style={{ ...mono, fontSize: "11px", color: "var(--muted)" }}>Mark as VIP</span>
            </div>
          </>
        )}

        {/* Message */}
        {message && (
          <div
            style={{
              padding: "12px 16px",
              borderRadius: "6px",
              marginBottom: "16px",
              fontSize: "13px",
              background: message.includes("Successfully") ? "rgba(76,200,140,0.1)" : "rgba(200,100,100,0.1)",
              color: message.includes("Successfully") ? "#4cc88c" : "#ff8f8f",
              border: `1px solid ${message.includes("Successfully") ? "rgba(76,200,140,0.3)" : "rgba(200,100,100,0.3)"}`,
            }}
          >
            {message}
          </div>
        )}

        {/* Generated Codes */}
        {generatedCodes.length > 0 && (
          <div style={{ marginBottom: "20px" }}>
            <div style={{ ...mono, fontSize: "10px", letterSpacing: "0.15em", color: "var(--gold-dim)", marginBottom: "10px" }}>
              GENERATED CODES
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {generatedCodes.map(code => (
                <div
                  key={code.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 14px",
                    background: "rgba(200,169,110,0.08)",
                    border: "1px solid rgba(200,169,110,0.2)",
                    borderRadius: "6px",
                  }}
                >
                  <code style={{ ...mono, fontSize: "14px", color: "var(--gold)", letterSpacing: "0.05em" }}>
                    {code.code}
                  </code>
                  <button
                    onClick={() => copyCode(code.code)}
                    style={{
                      background: "transparent",
                      border: "1px solid rgba(200,169,110,0.3)",
                      color: "var(--gold)",
                      ...mono,
                      fontSize: "10px",
                      padding: "6px 12px",
                      borderRadius: "3px",
                      cursor: "pointer",
                    }}
                  >
                    Copy
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: "12px" }}>
          <button
            onClick={() => setIsOpen(false)}
            style={{
              flex: 1,
              padding: "14px",
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "6px",
              color: "var(--muted)",
              ...mono,
              fontSize: "11px",
              letterSpacing: "0.1em",
              cursor: "pointer",
            }}
          >
            CLOSE
          </button>
          <button
            onClick={generate}
            disabled={loading || remaining <= 0}
            style={{
              flex: 2,
              padding: "14px",
              background: "var(--gold)",
              border: "none",
              borderRadius: "6px",
              color: "#0a0800",
              ...mono,
              fontSize: "11px",
              fontWeight: 600,
              letterSpacing: "0.1em",
              cursor: loading || remaining <= 0 ? "not-allowed" : "pointer",
              opacity: loading || remaining <= 0 ? 0.6 : 1,
            }}
          >
            {loading ? "GENERATING..." : `GENERATE ${quantity > 1 ? quantity + " CODES" : "CODE"}`}
          </button>
        </div>
      </div>
    </div>
  );
}
