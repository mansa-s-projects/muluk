/**
 * Combined and resolved PostHog analytics helper.
 * Supports both modern PostHogProvider initialization (upstream)
 * and legacy inline init/tracking capabilities (HEAD/PR branch).
 */
import posthog from 'posthog-js';

type AnalyticsProperties = Record<string, unknown>;
type VisitorPayload = AnalyticsProperties & {
  page?: string;
  referrer?: string;
};

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY ?? "";
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://app.posthog.com";

let initialised = false;

function init() {
  if (initialised || typeof window === "undefined" || !POSTHOG_KEY) return;
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    capture_pageview: false, // we fire these manually
    autocapture: false,
    persistence: "localStorage",
  });
  initialised = true;
}

function ph(): typeof posthog | null {
  init();
  if (typeof window === 'undefined') return null;
  return posthog;
}

/** Legacy init function, now no-op or auto-init via provider. */
export const initPostHog = () => {
  init();
};

export const identifyUser = (userId: string, properties?: AnalyticsProperties) => {
  ph()?.identify(userId, properties);
};

// Supports both trackVisitor({ page, referrer }) and trackVisitor(data: AnalyticsProperties)
export const trackVisitor = (data: VisitorPayload) => {
  if (data && typeof data === 'object' && ('page' in data || 'referrer' in data)) {
    ph()?.capture('$pageview', {
      $current_url: typeof window !== 'undefined' ? window.location.href : '',
      page: data.page,
      referrer: data.referrer ?? (typeof document !== 'undefined' ? document.referrer : ''),
    });
  } else {
    ph()?.capture('page_view', data);
  }
};

export const trackSignUp = (data: AnalyticsProperties) => {
  ph()?.capture('user_signed_up', data);
};

export const trackLogin = (data: AnalyticsProperties) => {
  ph()?.capture('user_logged_in', data);
};

export const trackContentUpload = (data: AnalyticsProperties) => {
  ph()?.capture('content_uploaded', data);
};

export const trackContentPurchase = (data: AnalyticsProperties) => {
  ph()?.capture('content_purchased', data);
};

export const trackPaymentSuccess = (data: AnalyticsProperties) => {
  ph()?.capture('payment_succeeded', data);
};

export const trackPaymentFailure = (data: AnalyticsProperties) => {
  ph()?.capture('payment_failed', data);
};

export const trackCreatorEarnings = (data: AnalyticsProperties) => {
  ph()?.capture('creator_earnings', data);
};

export const trackWithdrawalRequest = (data: AnalyticsProperties) => {
  ph()?.capture('withdrawal_requested', data);
};

export const trackReferralClick = (data: AnalyticsProperties) => {
  ph()?.capture('referral_link_clicked', data);
};

export const trackSocialShare = (data: AnalyticsProperties) => {
  ph()?.capture('social_shared', data);
};

// Supports trackButtonClick(label, props) and trackButtonClick(buttonName, context)
export const trackButtonClick = (buttonName: string, context?: AnalyticsProperties) => {
  ph()?.capture('button_clicked', { button_name: buttonName, ...context });
  ph()?.capture('button_click', { label: buttonName, ...context });
};

export const trackEvent = (event: string, props?: Record<string, unknown>) => {
  ph()?.capture(event, props);
};

export const trackError = (error: AnalyticsProperties) => {
  ph()?.capture('error_occurred', error);
};

export const trackAdminAction = (data: AnalyticsProperties) => {
  ph()?.capture('admin_action', { ...data, timestamp: new Date().toISOString() });
};

export default posthog;
