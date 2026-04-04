/**
 * Centralized PostHog analytics wrapper.
 * Single source of truth for all product funnel events.
 * Safe to call from any client component — no-ops on SSR.
 */

import posthog from 'posthog-js';

type Props = Record<string, unknown>;

/** Returns the posthog instance only when it's safe to use (browser + initialized). */
function ph(): typeof posthog | null {
  if (typeof window === 'undefined') return null;
  return posthog;
}

// ── Identity ─────────────────────────────────────────────────────────────────

export function identifyUser(
  userId: string,
  traits: { email?: string; name?: string; tier?: string; niche?: string } = {}
) {
  ph()?.identify(userId, traits);
}

export function resetUser() {
  ph()?.reset();
}

// ── Onboarding funnel ─────────────────────────────────────────────────────────

export const track = {
  onboardingStarted: (props?: Props) =>
    ph()?.capture('onboarding_started', props),

  nicheSelected: (niche: string, subNiche?: string) =>
    ph()?.capture('niche_selected', { niche, sub_niche: subNiche ?? null }),

  socialConnectClicked: (platform: string) =>
    ph()?.capture('social_connect_clicked', { platform }),

  socialConnected: (platform: string, followers: number) =>
    ph()?.capture('social_connected', { platform, followers }),

  signalAnalysisCompleted: (props: {
    strongestPlatform: string;
    audienceQuality: string;
    dmOpportunities: number;
  }) =>
    ph()?.capture('signal_analysis_completed', props),

  blueprintGenerated: (props: {
    price: number;
    niche: string;
    revenueEstimateMonthly: number;
  }) =>
    ph()?.capture('blueprint_generated', props),

  firstDropPrefilled: (props: {
    price: number;
    niche: string;
    mediaType: string;
  }) =>
    ph()?.capture('first_drop_prefilled', props),

  firstDropLaunched: (props: {
    price: number;
    niche: string;
    hasPageUrl: boolean;
  }) =>
    ph()?.capture('first_drop_launched', props),

  // ── Pricing / landing page ──────────────────────────────────────────────────

  pricingViewed: () =>
    ph()?.capture('pricing_viewed'),

  legendCtaClicked: () =>
    ph()?.capture('legend_cta_clicked'),

  apexAccessRequested: () =>
    ph()?.capture('apex_access_requested'),

  // ── Auth ────────────────────────────────────────────────────────────────────

  signedIn: (props?: Props) =>
    ph()?.capture('user_signed_in', props),

  signedUp: (props?: Props) =>
    ph()?.capture('user_signed_up', props),

  // ── Generic escape hatch ────────────────────────────────────────────────────

  event: (name: string, props?: Props) =>
    ph()?.capture(name, props),
};

export default track;
