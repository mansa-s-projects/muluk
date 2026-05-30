import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function escapeLike(input: string): string {
  return input.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

// View all messages or filter by creator/supporter
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
      console.warn("[admin-messages] ALLOW_DEV_ADMIN_BYPASS enabled", { userId: user.id });
    }

    const { searchParams } = new URL(request.url);
    const creatorId = searchParams.get("creatorId");
    const SupporterCode = searchParams.get("SupporterCode");
    const search = searchParams.get("search");
    const rawPage = Number(searchParams.get("page"));
    const rawLimit = Number(searchParams.get("limit"));
    const page = Number.isFinite(rawPage) ? Math.max(1, Math.trunc(rawPage)) : 1;
    const limit = Number.isFinite(rawLimit)
      ? Math.min(100, Math.max(1, Math.trunc(rawLimit)))
      : 50;
    const offset = (page - 1) * limit;

    let query = supabase
      .from("supporter_messages")
      .select(`
        *,
        creator:creator_id(name, handle, user_id),
        supporter_code_ref:supporter_code(code)
      `, { count: "exact" });

    // Apply filters
    if (creatorId) {
      query = query.eq("creator_id", creatorId);
    }

    if (SupporterCode) {
      query = query.eq("supporter_code", SupporterCode);
    }

    if (search) {
      const escaped = escapeLike(search);
      query = query.ilike("content", `%${escaped}%`);
    }

    const { data: messages, error, count } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // Get thread/conversation view if creatorId and SupporterCode provided
    let thread = null;
    if (creatorId && SupporterCode) {
      const { data: threadMessages } = await supabase
        .from("supporter_messages")
        .select(`
          *,
          creator:creator_id(name, handle),
          supporter_code_ref:supporter_code(code, custom_name)
        `)
        .eq("creator_id", creatorId)
        .eq("supporter_code", SupporterCode)
        .order("created_at", { ascending: true });

      thread = threadMessages || [];
    }

    // Log admin action without blocking response if audit insert is denied by RLS.
    const { error: auditError } = await supabase.from("admin_audit_logs").insert({
      admin_id: user.id,
      action: "view_messages",
      target_type: "messages",
      target_id: creatorId || "all",
      details: { creatorId, SupporterCode, search, page, limit },
    });
    if (auditError) {
      console.warn("[admin-messages] audit log insert failed:", auditError.message);
    }

    return NextResponse.json({
      messages: messages || [],
      thread,
      total: count || 0,
      page,
      totalPages: Math.ceil((count || 0) / limit),
    });

  } catch (error) {
    console.error("Admin messages error:", error);
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}
