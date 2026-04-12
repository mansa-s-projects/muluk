import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Minimum earnings required to unlock custom referral handle
const UNLOCK_THRESHOLD = 1000; // $1,000 USD

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { handle } = body;

    // Validate handle
    if (!handle || typeof handle !== "string") {
      return NextResponse.json({ error: "Handle is required" }, { status: 400 });
    }

    // Validate handle format (alphanumeric, hyphens, underscores, 3-30 chars)
    const handleRegex = /^[a-zA-Z0-9_-]{3,30}$/;
    if (!handleRegex.test(handle)) {
      return NextResponse.json(
        { error: "Handle must be 3-30 characters, alphanumeric, hyphens, or underscores only" },
        { status: 400 }
      );
    }

    // Check if user has earned enough to unlock customization
    const { data: walletData } = await supabase
      .from("creator_wallets")
      .select("total_earnings")
      .eq("creator_id", user.id)
      .single();

    const totalEarnings = Number(walletData?.total_earnings || 0);

    if (totalEarnings < UNLOCK_THRESHOLD) {
      return NextResponse.json(
        { 
          error: `Custom referral links unlock at $${UNLOCK_THRESHOLD.toLocaleString()} in total earnings. You have $${totalEarnings.toFixed(2)}.`,
          unlocked: false,
          required: UNLOCK_THRESHOLD,
          current: totalEarnings,
        },
        { status: 403 }
      );
    }

    // Check if handle is already taken by another user
    const { data: existing } = await supabase
      .from("creator_applications")
      .select("user_id")
      .eq("referral_handle", handle.toLowerCase())
      .neq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "This handle is already taken. Try another." },
        { status: 409 }
      );
    }

    // Update the referral handle
    const { error } = await supabase
      .from("creator_applications")
      .update({ referral_handle: handle.toLowerCase() })
      .eq("user_id", user.id);

    if (error) {
      console.error("Update referral handle error:", error);
      return NextResponse.json(
        { error: "Failed to update referral handle" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      handle: handle.toLowerCase(),
      link: `muluk.vip/ref/${handle.toLowerCase()}`,
    });

  } catch (error) {
    console.error("Update referral handle error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET endpoint to check unlock status
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get current earnings
    const { data: walletData } = await supabase
      .from("creator_wallets")
      .select("total_earnings")
      .eq("creator_id", user.id)
      .single();

    const totalEarnings = Number(walletData?.total_earnings || 0);
    const unlocked = totalEarnings >= UNLOCK_THRESHOLD;

    // Get current referral handle
    const { data: profile } = await supabase
      .from("creator_applications")
      .select("referral_handle")
      .eq("user_id", user.id)
      .single();

    return NextResponse.json({
      unlocked,
      required: UNLOCK_THRESHOLD,
      current: totalEarnings,
      progress: Math.min((totalEarnings / UNLOCK_THRESHOLD) * 100, 100),
      currentHandle: profile?.referral_handle || null,
    });

  } catch (error) {
    console.error("Check unlock status error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
