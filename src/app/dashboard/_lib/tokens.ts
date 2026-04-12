// ─── Shared design tokens ─────────────────────────────────────────────────────
// Import these in any dashboard component instead of re-declaring locally.

export const G = "#c8a96e";
export const GOLD = `var(--gold, ${G})`;
export const RED = "#ef4444";
export const GREEN = "#22c55e";

export const mono = {
  fontFamily: "var(--font-mono, 'DM Mono', monospace)",
} as const;

export const body = {
  fontFamily: "var(--font-body, 'Outfit', sans-serif)",
} as const;

export const display = {
  fontFamily: "var(--font-display, 'Cormorant Garamond', serif)",
} as const;

export const card: React.CSSProperties = {
  background: "#111",
  border: "1px solid rgba(255,255,255,0.07)",
  borderRadius: "10px",
};

export const inputBase: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  background: "#151515",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "7px",
  color: "#fff",
  fontSize: "13px",
  outline: "none",
  boxSizing: "border-box",
};
