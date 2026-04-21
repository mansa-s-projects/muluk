import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SignalBoardClient from "./SignalBoardClient";


export const metadata = {
  title: "Signal Board — MULUK",
  description: "Real-time monetization signals based on what's trending in your niche.",
};

export default async function SignalBoardPage() {
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

  return <SignalBoardClient />;
}
