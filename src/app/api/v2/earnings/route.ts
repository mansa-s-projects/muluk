import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * GET /api/v2/earnings?creator_id=xxx
 * Returns total earnings for a creator from v2 transactions.
 */
export async function GET(_request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("transactions_v2")
    .select("amount, currency, payment_method, creator_earnings, platform_fee, status")
    .eq("creator_id", user.id)
    .eq("status", "success");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const totalRevenue = data.reduce((sum, tx) => sum + (tx.amount || 0), 0);
  const totalEarnings = data.reduce((sum, tx) => sum + (tx.creator_earnings || 0), 0);
  const totalFees = data.reduce((sum, tx) => sum + (tx.platform_fee || 0), 0);
  const transactionCount = data.length;

  const byMethod: Record<string, { count: number; total: number }> = {};
  for (const tx of data) {
    const method = tx.payment_method || "unknown";
    if (!byMethod[method]) byMethod[method] = { count: 0, total: 0 };
    byMethod[method].count++;
    byMethod[method].total += tx.creator_earnings || 0;
  }

  return NextResponse.json({
    success: true,
    data: {
      totalRevenue,
      totalEarnings,
      totalFees,
      transactionCount,
      byMethod,
      currency: "usd",
    },
  });
}
