import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

/**
 * Top-level /admin layout — intentionally unguarded.
 *
 * The auth gate lives in `(protected)/layout.tsx` so that `/admin/login`
 * (the only public admin page) remains reachable by logged-out users.
 * Middleware still enforces the "non-admin sees 404" rule for every
 * `/admin/*` path except `/admin/login`.
 */
export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
