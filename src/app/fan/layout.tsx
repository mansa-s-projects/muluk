import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSafeProfile } from "@/lib/auth/safe-profile";

export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

/**
 * Fan dashboard layout.
 * We rely on getSafeProfile to check the database role securely.
 */
export default async function FanLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await getSafeProfile();

  if (!user || !profile) {
    redirect("/login?next=/fan");
  }

  const role = profile.role || "fan";

  // Admins who land on /fan should be redirected to their panel
  if (role === "admin" || role === "super_admin") {
    redirect("/admin/dashboard");
  }

  // Creators should go to creator dashboard
  if (role === "creator") {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
