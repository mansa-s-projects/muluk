import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardShell from "@/app/dashboard/components/DashboardShell";
import PricingClient from "./PricingClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Pricing — MULUK",
  description: "AI-powered dynamic pricing for your content.",
};

export default async function PricingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.onboarding_completed !== true) {
    redirect("/dashboard/onboarding");
  }

  const { data: payLinks } = await supabase
    .from("payment_links")
    .select("id, title, price, purchase_count, view_count, is_active")
    .eq("creator_id", user.id)
    .order("purchase_count", { ascending: false });

  return (
    <DashboardShell userEmail={user.email ?? ""} userId={user.id}>
      <PricingClient payLinks={payLinks ?? []} />
    </DashboardShell>
  );
}
