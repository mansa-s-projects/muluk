import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardShell from "@/app/dashboard/components/DashboardShell";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const allowDevBypass =
    process.env.ALLOW_DEV_ADMIN_BYPASS === "true" && process.env.NODE_ENV === "development";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !allowDevBypass) {
    redirect("/login");
  }

  const dashboardEmail = user?.email ?? (allowDevBypass ? "dev-bypass@mansasmoguls.local" : "");

  return (
    <DashboardShell userEmail={dashboardEmail}>
      {children}
    </DashboardShell>
  );
}
