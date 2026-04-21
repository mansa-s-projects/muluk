import { redirect } from "next/navigation";
import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import TipsClient from "./TipsClient";
import type { Tip } from "@/lib/tips";


export const dynamic = "force-dynamic";

function getLocalServiceDb() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export default async function TipsDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .maybeSingle();

  const db = getLocalServiceDb();

  const [tipsRes, monthlyRes, applicationRes] = await Promise.all([
    db
      .from("tips")
      .select("*")
      .eq("creator_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100),
    db.rpc("get_tip_monthly_earnings", {
      p_creator_id: user.id,
      p_year: new Date().getFullYear(),
    }),
    db
      .from("creator_applications")
      .select("handle")
      .eq("user_id", user.id)
      .eq("status", "approved")
      .maybeSingle(), // Use maybeSingle to avoid 406 Not Acceptable when missing
  ]);

  if (tipsRes.error) {
    console.error("[dashboard/tips] failed to load tips", { creatorId: user.id, error: tipsRes.error });
  }
  if (monthlyRes.error) {
    console.error("[dashboard/tips] failed to load monthly tip earnings", { error: monthlyRes.error });
  }

  // Gracefully fallback instead of crashing
  const handle = applicationRes.data?.handle || profile?.username || "creator";
  const safeTips = (tipsRes.data ?? []) as Tip[];
  const safeEarnings = (monthlyRes.data ?? []) as { month: number; total_cents: number; tip_count: number }[];

  // If there's no handle or application, we can show an empty state or allow them to use their profile name.
  // The UI requirement: show username, show "Generate Tip Link" button, placeholder for payment link.
  
  return !applicationRes.data?.handle ? (
    <div className="p-8 max-w-2xl mx-auto text-center space-y-4">
      <h2 className="text-2xl font-bold text-white">Welcome, {profile?.username || "Creator"}!</h2>
      <p className="text-zinc-400">You need an approved handle to fully accept tips on your public profile, but you can configure your payment links now.</p>
      <div className="pt-4">
        <Link
          href="/dashboard/monetization/pay-links"
          style={{
            display: "inline-block",
            padding: "11px 28px",
            background: "#c8a96e",
            color: "#0a0800",
            borderRadius: "4px",
            fontFamily: "var(--font-mono, 'DM Mono', monospace)",
            fontSize: "11px",
            fontWeight: 500,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            textDecoration: "none",
          }}
        >
          Generate Tip Link →
        </Link>
      </div>
    </div>
  ) : (
    <TipsClient
      initialTips={safeTips}
      monthlyEarnings={safeEarnings}
      handle={handle}
    />
  );
}
