import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import crypto from "crypto";

// Simple hash function for PIN (in production, use proper key derivation)
function hashPin(pin: string): string {
  return crypto.createHash("sha256").update(pin).digest("hex");
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { pin } = body;

    if (!pin || typeof pin !== "string" || pin.length < 4) {
      return NextResponse.json({ error: "PIN must be at least 4 digits" }, { status: 400 });
    }

    const pinHash = hashPin(pin);

    // Try to update existing record first
    const { data: existing } = await supabase
      .from("creator_vault_pins")
      .select("id")
      .eq("creator_id", user.id)
      .single();

    if (existing) {
      const { error } = await supabase
        .from("creator_vault_pins")
        .update({ pin_hash: pinHash, updated_at: new Date().toISOString() })
        .eq("creator_id", user.id);

      if (error) throw error;
    } else {
      const { error } = await supabase
        .from("creator_vault_pins")
        .insert({
          creator_id: user.id,
          pin_hash: pinHash,
        });

      if (error) throw error;
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Vault setup error:", error);
    return NextResponse.json(
      { error: "Failed to set vault PIN" },
      { status: 500 }
    );
  }
}
