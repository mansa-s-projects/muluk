import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Admin actions: ban, suspend, warn, delete content, add note
export async function POST(request: NextRequest) {
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
      console.warn("[admin-actions] ALLOW_DEV_ADMIN_BYPASS enabled", { userId: user.id });
    }

    const body = await request.json();
    const { action, targetType, targetId, reason, details = {} } = body;

    if (!action || !targetType || !targetId) {
      return NextResponse.json(
        { error: "Missing required fields: action, targetType, targetId" },
        { status: 400 }
      );
    }

    let result;

    switch (action) {
      case "ban_creator":
        result = await handleBanCreator(supabase, user.id, targetId, reason, details);
        break;

      case "unban_creator":
        result = await handleUnbanCreator(supabase, user.id, targetId, reason);
        break;

      case "add_note":
        result = await handleAddNote(supabase, user.id, targetType, targetId, reason, details);
        break;

      case "delete_content":
        result = await handleDeleteContent(supabase, user.id, targetId, reason);
        break;

      case "shadow_ban":
        result = await handleShadowBan(supabase, user.id, targetId, reason, details);
        break;

      case "change_tier":
        result = await handleChangeTier(supabase, user.id, targetId, details.tier);
        break;

      case "force_withdrawal":
        result = await handleForceWithdrawal(supabase, user.id, targetId, details);
        break;

      case "send_warning":
        result = await handleSendWarning(supabase, user.id, targetId, reason);
        break;

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    // Log the action
    await supabase.from("admin_audit_logs").insert({
      admin_id: user.id,
      action,
      target_type: targetType,
      target_id: targetId,
      details: { reason, ...details, result }
    });

    // Add to realtime events
    const isCriticalAction =
      action.includes("delete") || (action.includes("ban") && !action.includes("unban"));
    await supabase.from("admin_realtime_events").insert({
      event_type: "admin_action",
      user_id: targetId,
      user_type: targetType,
      metadata: { action, admin_id: user.id, reason },
      severity: isCriticalAction ? "critical" : "warning"
    });

    return NextResponse.json({ 
      success: true, 
      action,
      result 
    });

  } catch (error) {
    console.error("Admin action error:", error);
    return NextResponse.json(
      { error: "Failed to execute admin action" },
      { status: 500 }
    );
  }
}

// Handler functions
async function handleBanCreator(supabase: any, adminId: string, creatorId: string, reason: string, details: any) {
  const { duration_days, ban_type = "temporary" } = details;
  
  const expiresAt = duration_days 
    ? new Date(Date.now() + duration_days * 24 * 60 * 60 * 1000).toISOString()
    : null;

  const { data, error } = await supabase
    .from("creator_bans")
    .insert({
      creator_id: creatorId,
      admin_id: adminId,
      reason,
      ban_type,
      expires_at: expiresAt,
      evidence: details.evidence || {}
    })
    .select()
    .single();

  if (error) throw error;

  // Update creator status and rollback the ban row on failure.
  const { error: statusError } = await supabase
    .from("creator_applications")
    .update({ status: "suspended" })
    .eq("user_id", creatorId);

  if (statusError) {
    await supabase.from("creator_bans").delete().eq("id", data.id);
    throw statusError;
  }

  return { ban_id: data.id, expires_at: expiresAt };
}

async function handleUnbanCreator(supabase: any, adminId: string, creatorId: string, reason: string) {
  // Get active bans
  const { data: bans } = await supabase
    .from("creator_bans")
    .select("id")
    .eq("creator_id", creatorId)
    .eq("is_active", true);

  // Lift all active bans
  for (const ban of (bans || [])) {
    await supabase
      .from("creator_bans")
      .update({
        is_active: false,
        lifted_at: new Date().toISOString(),
        lifted_by: adminId,
        lift_reason: reason
      })
      .eq("id", ban.id);
  }

  // Update creator status back to approved
  await supabase
    .from("creator_applications")
    .update({ status: "approved" })
    .eq("user_id", creatorId);

  return { lifted_bans: bans?.length || 0 };
}

async function handleAddNote(supabase: any, adminId: string, targetType: string, targetId: string, note: string, details: any) {
  const { data, error } = await supabase
    .from("admin_notes")
    .insert({
      admin_id: adminId,
      target_type: targetType,
      target_id: targetId,
      note,
      priority: details.priority || "normal"
    })
    .select()
    .single();

  if (error) throw error;
  return { note_id: data.id };
}

async function handleDeleteContent(supabase: any, adminId: string, contentId: string, reason: string) {
  // Soft delete - mark as inactive and add admin note
  const { data, error } = await supabase
    .from("content_items_v2")
    .update({
      is_active: false,
      updated_at: new Date().toISOString()
    })
    .eq("id", contentId)
    .select("creator_id, title")
    .single();

  if (error) throw error;

  // Add admin note on the creator
  await supabase.from("admin_notes").insert({
    admin_id: adminId,
    target_type: "creator",
    target_id: data.creator_id,
    note: `Content deleted: "${data.title}" (ID: ${contentId}). Reason: ${reason}`,
    priority: "high"
  });

  return { content_id: contentId, creator_id: data.creator_id };
}

async function handleShadowBan(supabase: any, adminId: string, creatorId: string, reason: string, details: any) {
  const { data, error } = await supabase
    .from("creator_bans")
    .insert({
      creator_id: creatorId,
      admin_id: adminId,
      reason,
      ban_type: "shadow",
      expires_at: null, // Shadow bans are permanent until lifted
      evidence: details.evidence || {}
    })
    .select()
    .single();

  if (error) throw error;
  return { ban_id: data.id };
}

async function handleChangeTier(supabase: any, adminId: string, creatorId: string, tier: string) {
  if (!["cipher", "legend", "apex"].includes(tier)) {
    throw new Error("Invalid tier");
  }

  const { data, error } = await supabase
    .from("creator_applications")
    .update({ tier })
    .eq("user_id", creatorId)
    .select("handle, tier")
    .single();

  if (error) throw error;

  return { new_tier: tier, creator: data.handle };
}

async function handleForceWithdrawal(supabase: any, adminId: string, creatorId: string, details: any) {
  const { amount, method = "manual" } = details;
  
  if (!amount || amount <= 0) {
    throw new Error("Invalid withdrawal amount");
  }

  const { data: wallet, error: walletError } = await supabase
    .from("creator_wallets")
    .select("balance")
    .eq("creator_id", creatorId)
    .maybeSingle();

  if (walletError) {
    throw new Error(`Failed to read wallet balance: ${walletError.message}`);
  }

  const balance = Number(wallet?.balance ?? 0);
  if (balance < amount) {
    throw new Error("Insufficient wallet balance");
  }

  // Create withdrawal record
  const { data, error } = await supabase
    .from("withdrawal_requests")
    .insert({
      creator_id: creatorId,
      amount,
      method,
      status: "processing",
      admin_processed_by: adminId,
      admin_notes: `Force withdrawal initiated by admin ${adminId}`
    })
    .select()
    .single();

  if (error) throw error;

  // Deduct from wallet
  const rpcResult = await supabase.rpc("deduct_from_wallet", {
    p_creator_id: creatorId,
    p_amount: amount
  });

  if (rpcResult.error) {
    await supabase
      .from("withdrawal_requests")
      .update({
        status: "failed",
        admin_notes: `Force withdrawal failed after creation: ${rpcResult.error.message}`,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.id);
    throw new Error(`Wallet deduction failed: ${rpcResult.error.message}`);
  }

  return { withdrawal_id: data.id, amount, method };
}

async function handleSendWarning(supabase: any, adminId: string, creatorId: string, warningText: string) {
  // Add as admin note
  const { data, error } = await supabase
    .from("admin_notes")
    .insert({
      admin_id: adminId,
      target_type: "creator",
      target_id: creatorId,
      note: `WARNING: ${warningText}`,
      priority: "high"
    })
    .select()
    .single();

  if (error) throw error;

  // Also send notification to creator
  await supabase.from("notifications").insert({
    user_id: creatorId,
    type: "admin_warning",
    message: warningText,
    data: { admin_id: adminId, note_id: data.id }
  });

  return { warning_sent: true, note_id: data.id };
}
