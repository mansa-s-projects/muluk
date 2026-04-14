import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardShell from "@/app/dashboard/components/DashboardShell";
import PayLinksClient from "./PayLinksClient";

export default async function PayLinksPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <DashboardShell userEmail={user.email ?? ""} userId={user.id}>
      <PayLinksClient />
    </DashboardShell>
  );
}
