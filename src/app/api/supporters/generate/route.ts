import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function generateSupporterCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `SUPPORTER-${code.slice(0, 4)}-${code.slice(4)}`;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { 
      customName = null, 
      creatorNotes = null, 
      tags = [], 
      isVip = false,
      quantity = 1 
    } = body;

    // Validate quantity
    const qty = Math.min(Math.max(parseInt(String(quantity)) || 1, 1), 50);
    
    // Check creator's tier limits
    const { data: creatorProfile } = await supabase
      .from("creator_applications")
      .select("tier, category")
      .eq("user_id", user.id)
      .single();

    // Get current supporter code count
    const { count: currentCount } = await supabase
      .from("supporter_codes")
      .select("*", { count: "exact", head: true })
      .eq("creator_id", user.id);

    const tier = creatorProfile?.tier || "cipher";
    const limits: Record<string, number> = {
      cipher: 500,
      legend: 999999, // unlimited
      apex: 999999,   // unlimited
    };
    const maxCodes = limits[tier] || 500;

    if ((currentCount || 0) + qty > maxCodes) {
      return NextResponse.json(
        { error: `Tier limit: ${maxCodes} supporter codes maximum. You have ${currentCount || 0}.` },
        { status: 400 }
      );
    }

    // Generate unique codes
    const codes: string[] = [];
    const insertedCodes = [];
    
    for (let i = 0; i < qty; i++) {
      let code = generateSupporterCode();
      let attempts = 0;
      
      // Ensure uniqueness
      while (codes.includes(code) && attempts < 10) {
        code = generateSupporterCode();
        attempts++;
      }
      codes.push(code);

      const { data: inserted, error } = await supabase
        .from("supporter_codes")
        .insert({
          creator_id: user.id,
          code,
          status: "active",
          custom_name: qty === 1 ? customName : null,
          creator_notes: qty === 1 ? creatorNotes : null,
          tags: qty === 1 ? tags : [],
          is_vip: qty === 1 ? isVip : false,
        })
        .select()
        .single();

      if (error) {
        console.error("Failed to insert supporter code:", error);
        continue;
      }
      
      insertedCodes.push(inserted);
    }

    return NextResponse.json({
      success: true,
      codes: insertedCodes,
      generated: insertedCodes.length,
    });

  } catch (error) {
    console.error("Generate supporter code error:", error);
    return NextResponse.json(
      { error: "Failed to generate supporter code" },
      { status: 500 }
    );
  }
}
