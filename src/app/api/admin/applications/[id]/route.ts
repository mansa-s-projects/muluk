import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Get single application details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const { data: adminCheck } = await supabase
      .from("admin_users")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!adminCheck && process.env.NODE_ENV !== "development") {
      return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 });
    }

    const { data: application, error } = await supabase
      .from("creator_applications")
      .select("*, auth.users!inner(email)")
      .eq("id", id)
      .single();

    if (error) throw error;
    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    return NextResponse.json({ application });

  } catch (error) {
    console.error("Get application error:", error);
    return NextResponse.json(
      { error: "Failed to fetch application" },
      { status: 500 }
    );
  }
}

// Update application status (approve/reject)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const { data: adminCheck } = await supabase
      .from("admin_users")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!adminCheck && process.env.NODE_ENV !== "development") {
      return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 });
    }

    const body = await request.json();
    const { status, adminNotes, tier } = body;

    if (!status || !["approved", "rejected", "pending"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status. Must be: approved, rejected, or pending" },
        { status: 400 }
      );
    }

    // Get application before update (for email notification)
    const { data: application } = await supabase
      .from("creator_applications")
      .select("user_id, name, email")
      .eq("id", id)
      .single();

    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    // Update application
    const updateData: Record<string, string | null> = {
      status,
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
      admin_notes: adminNotes || null,
    };

    if (tier && ["cipher", "legend", "apex"].includes(tier)) {
      updateData.tier = tier;
    }

    const { data: updated, error } = await supabase
      .from("creator_applications")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    // If approved, create wallet and notification settings
    if (status === "approved") {
      // Create wallet if doesn't exist
      await supabase.from("creator_wallets").upsert({
        creator_id: application.user_id,
        balance: 0,
        total_earnings: 0,
        referral_income: 0,
      }, { onConflict: "creator_id" });

      // Create default notification settings
      await supabase.from("creator_notification_settings").upsert({
        creator_id: application.user_id,
        email_new_fan: true,
        email_new_earning: true,
        email_weekly_report: true,
        email_marketing: false,
        push_enabled: false,
      }, { onConflict: "creator_id" });

      // TODO: Send approval email
      console.log(`Application ${id} approved - email should be sent to ${application.email}`);
    } else if (status === "rejected") {
      // TODO: Send rejection email
      console.log(`Application ${id} rejected - email should be sent to ${application.email}`);
    }

    return NextResponse.json({
      success: true,
      application: updated,
      message: `Application ${status} successfully`,
    });

  } catch (error) {
    console.error("Update application error:", error);
    return NextResponse.json(
      { error: "Failed to update application" },
      { status: 500 }
    );
  }
}
