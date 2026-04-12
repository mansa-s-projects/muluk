import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// View all transactions with filters
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const { data: adminCheck } = await supabase
      .from("admin_users")
      .select("id, role")
      .eq("user_id", user.id)
      .single();

    const ALLOW_DEV_ADMIN_BYPASS =
      process.env.ALLOW_DEV_ADMIN_BYPASS === "true" && process.env.NODE_ENV === "development";
    if (!adminCheck && !ALLOW_DEV_ADMIN_BYPASS) {
      return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 });
    }
    if (!adminCheck && ALLOW_DEV_ADMIN_BYPASS) {
      console.warn("[admin-transactions] ALLOW_DEV_ADMIN_BYPASS enabled", { userId: user.id });
    }

    const { searchParams } = new URL(request.url);
    const creatorId = searchParams.get("creatorId");
    const status = searchParams.get("status");
    const paymentMethod = searchParams.get("paymentMethod");
    const minAmount = searchParams.get("minAmount");
    const maxAmount = searchParams.get("maxAmount");
    const since = searchParams.get("since");
    const until = searchParams.get("until");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = (page - 1) * limit;

    let query = supabase
      .from("transactions_v2")
      .select(`
        *,
        creator:creator_id(name, handle),
        content:content_id(title, price),
        fan_code_ref:fan_code_id(code)
      `, { count: "exact" });

    // Apply filters
    if (creatorId) {
      query = query.eq("creator_id", creatorId);
    }

    if (status) {
      query = query.eq("status", status);
    }

    if (paymentMethod) {
      query = query.eq("payment_method", paymentMethod);
    }

    if (minAmount) {
      query = query.gte("amount", parseInt(minAmount));
    }

    if (maxAmount) {
      query = query.lte("amount", parseInt(maxAmount));
    }

    if (since) {
      query = query.gte("created_at", since);
    }

    if (until) {
      query = query.lte("created_at", until);
    }

    const { data: transactions, error, count } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // Calculate summary stats
    const allTransactions = transactions || [];
    const successfulTxns = allTransactions.filter(t => t.status === "success");
    const summary = {
      totalCount: allTransactions.length,
      successfulCount: successfulTxns.length,
      totalVolume: successfulTxns.reduce((sum, t) => sum + (t.amount || 0), 0),
      totalFees: successfulTxns.reduce((sum, t) => sum + (t.platform_fee || 0), 0),
      totalCreatorEarnings: successfulTxns.reduce((sum, t) => sum + (t.creator_earnings || 0), 0),
    };

    // Log admin action without blocking response if audit insert is denied by RLS.
    const { error: auditError } = await supabase.from("admin_audit_logs").insert({
      admin_id: user.id,
      action: "view_transactions",
      target_type: "transactions",
      target_id: creatorId || "all",
      details: { filters: { creatorId, status, paymentMethod }, page, limit },
    });
    if (auditError) {
      console.warn("[admin-transactions] audit log insert failed:", auditError.message);
    }

    return NextResponse.json({
      transactions: allTransactions,
      summary,
      total: count || 0,
      page,
      totalPages: Math.ceil((count || 0) / limit),
    });

  } catch (error) {
    console.error("Admin transactions error:", error);
    return NextResponse.json(
      { error: "Failed to fetch transactions" },
      { status: 500 }
    );
  }
}
