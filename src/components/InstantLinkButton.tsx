"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

const InstantLinkModal = dynamic(() => import("./InstantLinkModal"), { ssr: false });

export default function InstantLinkButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Generate instant pay link"
        title="Generate instant pay link"
        style={{
          position:      "fixed",
          bottom:        28,
          right:         28,
          zIndex:        900,
          display:       "flex",
          alignItems:    "center",
          gap:           8,
          padding:       "13px 20px",
          background:    "#c8a96e",
          color:         "#0a0800",
          border:        "none",
          borderRadius:  40,
          fontFamily:    "'DM Mono', monospace",
          fontSize:      11,
          fontWeight:    500,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          cursor:        "pointer",
          boxShadow:     "0 4px 24px rgba(200,169,110,0.28), 0 2px 8px rgba(0,0,0,0.4)",
          transition:    "transform 0.15s, box-shadow 0.15s, opacity 0.15s",
          whiteSpace:    "nowrap",
        }}
        onMouseEnter={e => {
          e.currentTarget.style.transform  = "translateY(-2px)";
          e.currentTarget.style.boxShadow  = "0 8px 32px rgba(200,169,110,0.38), 0 4px 12px rgba(0,0,0,0.5)";
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform  = "translateY(0)";
          e.currentTarget.style.boxShadow  = "0 4px 24px rgba(200,169,110,0.28), 0 2px 8px rgba(0,0,0,0.4)";
        }}
      >
        <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>
        Generate Link
      </button>

      {open && <InstantLinkModal onClose={() => setOpen(false)} />}
    </>
  );
}
