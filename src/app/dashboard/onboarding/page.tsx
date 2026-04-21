import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import FirstMoneyOnboarding from "./FirstMoneyOnboarding";

export default async function CreatorOnboardingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // If already completed, skip the wizard entirely.
  const { data: profileRow } = await supabase
    .from("profiles")
    .select("onboarding_completed")
    .eq("id", user.id)
    .maybeSingle();

  if (profileRow?.onboarding_completed === true) {
    redirect("/dashboard");
  }

  const { data: application } = await supabase
    .from("applications")
    .select("name")
    .eq("user_id", user.id)
    .maybeSingle();

  return <FirstMoneyOnboarding defaultTitle={application?.name || "Exclusive Creator Offer"} />;
}
