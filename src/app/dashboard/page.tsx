import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardShell from "./components/DashboardShell";
import DashboardHome from "./DashboardHome";

export const metadata = { title: "Dashboard — MULUK" };

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profileRow } = await supabase
    .from("profiles")
    .select("onboarding_completed")
    .eq("id", user.id)
    .maybeSingle();

  if (profileRow?.onboarding_completed !== true) redirect("/dashboard/onboarding");

  const { data: creatorProfile } = await supabase
    .from("creator_profiles")
    .select("handle")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <DashboardShell
      userEmail={user.email ?? ""}
      userId={user.id}
      handle={creatorProfile?.handle ?? undefined}
    >
      <DashboardHome userId={user.id} />
    </DashboardShell>
  );
}
