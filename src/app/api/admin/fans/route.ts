import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

// Admin: List subscribed fans with online/offline presence status
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

    const { searchParams } = new URL(request.url);
    const creatorId = searchParams.get("creator_id") || null;
    const rawLimit = Number(searchParams.get("limit")) || 200;
    const limit = Math.min(Math.max(1, rawLimit), 500);

    // Use service role so RLS doesn't block cross-table joins
    const db = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Fetch paid fan codes joined to content only.
    // Creator profile is resolved in a second query to avoid relying on a missing
    // direct PostgREST relationship between content_items_v2 and creator_applications.
    const query = db
      .from("fan_codes_v2")
      .select("id, code, is_paid, payment_method, paid_at, last_seen_at, content_id, content_items_v2(id, title, creator_id)")
      .eq("is_paid", true)
      .order("last_seen_at", { ascending: false, nullsFirst: false })
      .limit(limit);

    // If filtering by creator, we need to do it post-fetch since creator_id is nested
    const { data: rows, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const creatorIds = Array.from(
      new Set(
        (rows ?? [])
          .map((row: any) => {
            const content = row.content_items_v2 as { creator_id?: string } | Array<{ creator_id?: string }> | null;
            return Array.isArray(content) ? content[0]?.creator_id : content?.creator_id;
          })
          .filter((id): id is string => Boolean(id))
      )
    );

    const creatorProfileMap = new Map<string, { name: string | null; handle: string | null }>();
    if (creatorIds.length > 0) {
      const { data: creatorProfiles, error: creatorsError } = await db
        .from("creator_applications")
        .select("user_id, name, handle")
        .in("user_id", creatorIds);

      if (creatorsError) {
        return NextResponse.json({ error: creatorsError.message }, { status: 500 });
      }

      for (const profile of creatorProfiles ?? []) {
        creatorProfileMap.set(profile.user_id, {
          name: profile.name ?? null,
          handle: profile.handle ?? null,
        });
      }
    }

    const now = Date.now();
    const ONLINE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

    const fans = (rows ?? [])
      .map((row: any) => {
        const content = row.content_items_v2 as { id: string; title: string; creator_id: string } | Array<{ id: string; title: string; creator_id: string }> | null;
        const normalizedContent = Array.isArray(content) ? content[0] : content;
        const creatorIdValue = normalizedContent?.creator_id ?? null;
        const creator = creatorIdValue ? creatorProfileMap.get(creatorIdValue) : null;
        return {
          id: row.id as string,
          code: row.code as string,
          payment_method: row.payment_method as string | null,
          paid_at: row.paid_at as string | null,
          last_seen_at: row.last_seen_at as string | null,
          is_online: row.last_seen_at
            ? now - new Date(row.last_seen_at).getTime() < ONLINE_THRESHOLD_MS
            : false,
          content_id: row.content_id as string,
          content_title: normalizedContent?.title ?? "Unknown Content",
          creator_id: creatorIdValue,
          creator_name: creator?.name ?? "Unknown Creator",
          creator_handle: creator?.handle ?? null,
        };
      })
      .filter((f) => !creatorId || f.creator_id === creatorId);

    const onlineCount = fans.filter((f) => f.is_online).length;

    return NextResponse.json({
      success: true,
      fans,
      total: fans.length,
      online_count: onlineCount,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
