"use client";

import { useEffect } from "react";

/**
 * Fires a non-blocking analytics ping when the success page loads.
 * This records that the user reached the post-purchase confirmation page.
 * Actual purchase verification happens server-side via the Whop webhook.
 */
export default function SuccessClient({ offerId }: { offerId: string | null }) {
  useEffect(() => {
    if (!offerId) return;

    // Log "offer_purchase_confirmed" event to your analytics endpoint.
    // This is best-effort — failures are silently ignored.
    fetch("/api/offers/manage", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: offerId, _track: "purchase_confirmed" }),
    }).catch(() => {/* non-fatal */});
  }, [offerId]);

  return null;
}
