"use client";

import { useMemo, useState } from "react";
import { track } from "@/lib/analytics/track";

export function WaitlistPanel() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("operator");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const canSubmit = useMemo(() => email.includes("@") && email.includes("."), [email]);

  const submit = async () => {
    if (!canSubmit || status === "loading") return;
    setStatus("loading");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, type: role, source: "landing-redesign" }),
      });
      if (!res.ok) throw new Error();
      track.event("waitlist_joined", { role, surface: "hero" });
      setStatus("done");
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className="waitlist-wrap">
      <div className="waitlist-eyebrow">Private Access Queue</div>
      {status === "done" ? (
        <div className="waitlist-success">
          <span>Access request secured.</span>
          <small>Founding operator invite will be delivered before public release.</small>
        </div>
      ) : (
        <>
          <div className="waitlist-row">
            <select value={role} onChange={(e) => setRole(e.target.value)} aria-label="Role">
              <option value="operator">Operator</option>
              <option value="citizen">Citizen</option>
            </select>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@domain.com"
              aria-label="Email"
              onKeyDown={(e) => {
                if (e.key === "Enter") void submit();
              }}
            />
            <button disabled={!canSubmit || status === "loading"} onClick={() => void submit()}>
              {status === "loading" ? "Securing…" : "Enter the Empire"}
            </button>
          </div>
          {status === "error" && <p className="waitlist-error">Could not secure access. Try again.</p>}
        </>
      )}
    </div>
  );
}

