import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardShell from "@/app/dashboard/components/DashboardShell";
import MembersClient from "./MembersClient";

export const metadata = { title: "Members — Muluk" };

export default async function MembersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.onboarding_completed !== true) redirect("/dashboard/onboarding");

  const { data: creatorProfile } = await supabase
    .from("creator_applications")
    .select("handle")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <DashboardShell
      userEmail={user.email ?? ""}
      userId={user.id}
      handle={creatorProfile?.handle ?? undefined}
    >
      <MembersClient userId={user.id} />
    </DashboardShell>
  );
}
