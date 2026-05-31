"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics/track";

type Trackable = HTMLElement & {
  dataset: {
    mmEvent?: string;
    mmPayload?: string;
  };
};

export function LandingTracking() {
  useEffect(() => {
    const clickHandler = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const trackTarget = target?.closest?.("[data-mm-event]") as Trackable | null;
      if (!trackTarget) return;

      const name = trackTarget.dataset.mmEvent;
      if (!name) return;

      try {
        const payload = trackTarget.dataset.mmPayload ? JSON.parse(trackTarget.dataset.mmPayload) : {};
        track.event(name, payload);
      } catch {
        track.event(name, {});
      }
    };

    document.addEventListener("click", clickHandler, true);
    return () => document.removeEventListener("click", clickHandler, true);
  }, []);

  return null;
}
