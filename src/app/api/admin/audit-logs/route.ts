import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// View admin audit logs
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
      console.warn("[admin-audit-logs] ALLOW_DEV_ADMIN_BYPASS enabled");
    }

    const { searchParams } = new URL(request.url);
    const adminId = searchParams.get("adminId");
    const action = searchParams.get("action");
    const targetType = searchParams.get("targetType");
    const targetId = searchParams.get("targetId");
    const since = searchParams.get("since");
    const parsedPage = Number(searchParams.get("page"));
    const parsedLimit = Number(searchParams.get("limit"));
    const page = Number.isFinite(parsedPage) ? Math.max(1, Math.trunc(parsedPage)) : 1;
    const limit = Number.isFinite(parsedLimit)
      ? Math.min(100, Math.max(1, Math.trunc(parsedLimit)))
      : 50;
    const offset = (page - 1) * limit;

    let query = supabase
      .from("admin_audit_logs")
      .select(`
        *,
        admin:admin_id(email:auth.users!inner(email))
      `, { count: "exact" });

    // Apply filters
    if (adminId) {
      query = query.eq("admin_id", adminId);
    }

    if (action) {
      query = query.eq("action", action);
    }

    if (targetType) {
      query = query.eq("target_type", targetType);
    }

    if (targetId) {
      query = query.eq("target_id", targetId);
    }

    if (since) {
      query = query.gte("created_at", since);
    }

    const { data: logs, error, count } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // Get unique actions for filter dropdown
    const { data: actions } = await supabase
      .from("admin_audit_logs")
      .select("action")
      .limit(1000);

    const uniqueActions = [...new Set((actions || []).map(a => a.action))];

    return NextResponse.json({
      logs: logs || [],
      total: count || 0,
      page,
      totalPages: Math.ceil((count || 0) / limit),
      filters: {
        actions: uniqueActions
      }
    });

  } catch (error) {
    console.error("Admin audit logs error:", error);
    return NextResponse.json(
      { error: "Failed to fetch audit logs" },
      { status: 500 }
    );
  }
}
