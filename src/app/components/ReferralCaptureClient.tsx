"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

const CLICK_TTL_MS = 1000 * 60 * 10;

export default function ReferralCaptureClient() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const ref = (searchParams.get("ref") ?? "").trim().toLowerCase();
    if (!ref || !/^[a-z0-9][a-z0-9_-]{2,31}$/.test(ref)) return;

    const dedupeKey = `cipher_ref_click:${ref}`;
    const now = Date.now();
    const last = Number(localStorage.getItem(dedupeKey) ?? "0");

    if (Number.isFinite(last) && now - last < CLICK_TTL_MS) {
      return;
    }

    localStorage.setItem(dedupeKey, String(now));

    void fetch("/api/referrals/click", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        referral_code: ref,
        source: window.location.pathname,
        event_id: `${ref}:${now}`,
      }),
    }).catch(() => {});
  }, [searchParams]);

  // Try to attach referral whenever this client mounts; route is no-op when unauthenticated.
  useEffect(() => {
    void fetch("/api/referrals/attach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source: "session_bootstrap" }),
    }).catch(() => {});
  }, []);

  return null;
}
