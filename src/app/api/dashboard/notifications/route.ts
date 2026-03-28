import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function safeNum(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = parseFloat(v.replace(/[$,]/g, ""));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ items: [], unreadCount: 0 }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("transactions")
      .select("id, fan_code, amount, created_at, status")
      .eq("creator_id", user.id)
      .order("created_at", { ascending: false })
      .limit(8);

    if (error) {
      return NextResponse.json({ items: [], unreadCount: 0 });
    }

    const items = (data ?? []).map((row, idx) => ({
      id: String(row.id),
      message: `You earned ${new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(safeNum(row.amount))} from ${String(row.fan_code ?? "FAN-UNKNOWN")}`,
      created_at: String(row.created_at ?? ""),
      unread: idx < 3,
    }));

    return NextResponse.json({
      items,
      unreadCount: items.filter(item => item.unread).length,
    });
  } catch (err) {
    console.error("Notifications route failed:", err);
    return NextResponse.json({ items: [], unreadCount: 0 }, { status: 500 });
  }
}
