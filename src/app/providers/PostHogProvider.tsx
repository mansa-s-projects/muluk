'use client';

import posthog from 'posthog-js';
import { PostHogProvider as PHProvider } from 'posthog-js/react';
import { Suspense, useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

function PostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastUrl = useRef<string>('');

  useEffect(() => {
    if (!posthog.config) return; // not yet initialized
    const url = window.location.href;
    if (url === lastUrl.current) return;
    lastUrl.current = url;
    posthog.capture('$pageview', { $current_url: url });
  }, [pathname, searchParams]);

  return null;
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key) return;
    if (posthog.config) return; // already initialized (StrictMode + HMR guard)
    posthog.init(key, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
      capture_pageview: false, // manual via PostHogPageView
      capture_pageleave: true,
      autocapture: false, // explicit tracking only — prevents PII capture
      persistence: 'localStorage',
      session_recording: {
        maskAllInputs: true, // safe default; opt-out per field via data-ph-no-capture
        maskInputOptions: { password: true },
      },
      loaded: (ph) => {
        if (process.env.NODE_ENV === 'development') ph.debug();
      },
    });
  }, []);

  return (
    <PHProvider client={posthog}>
      {/* Suspense owned here — isolates useSearchParams boundary from layout */}
      <Suspense fallback={null}>
        <PostHogPageView />
      </Suspense>
      {children}
    </PHProvider>
  );
}
