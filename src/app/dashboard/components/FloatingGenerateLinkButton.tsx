"use client";

import { useState } from "react";
import GeneratePayLinkModal from "./GeneratePayLinkModal";

export default function FloatingGenerateLinkButton() {
  const [open, setOpen]       = useState(false);
  const [pressed, setPressed] = useState(false);

  function handleClick() {
    setPressed(true);
    setTimeout(() => setPressed(false), 140);
    setOpen(true);
  }

  return (
    <>
      {open && <GeneratePayLinkModal onClose={() => setOpen(false)} />}

      <style>{`
        @media (max-width: 480px) {
          .gl-fab { padding: 14px !important; border-radius: 50% !important; }
          .gl-fab-label { display: none !important; }
        }
      `}</style>

      <button
        aria-label="Generate payment link"
        onClick={handleClick}
        className="gl-fab"
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: 180,
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "12px 20px",
          background: "linear-gradient(135deg,#c8a96e,rgba(200,169,110,0.82))",
          border: "none",
          borderRadius: 50,
          color: "#070608",
          fontFamily: `'DM Mono','Courier New',monospace`,
          fontWeight: 700,
          fontSize: 13,
          letterSpacing: "0.03em",
          cursor: "pointer",
          boxShadow: "0 4px 24px rgba(200,169,110,0.42), 0 0 0 1px rgba(200,169,110,0.15)",
          transform: pressed ? "scale(0.96)" : "scale(1)",
          transition: "transform 0.14s cubic-bezier(.4,0,.2,1), box-shadow 0.18s",
          userSelect: "none",
        }}
        onMouseEnter={(e) => {
          if (!pressed) {
            e.currentTarget.style.transform = "scale(1.05) translateY(-1px)";
            e.currentTarget.style.boxShadow = "0 10px 36px rgba(200,169,110,0.56), 0 0 0 1px rgba(200,169,110,0.25)";
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "scale(1)";
          e.currentTarget.style.boxShadow = "0 4px 24px rgba(200,169,110,0.42), 0 0 0 1px rgba(200,169,110,0.15)";
        }}
      >
        {/* + icon */}
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path d="M7 1.5v11M1.5 7h11" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
        </svg>

        <span className="gl-fab-label">Generate Link</span>
      </button>
    </>
  );
}
