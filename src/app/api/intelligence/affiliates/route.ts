// GET /api/intelligence/affiliates?niche=fashion
// Returns curated brand affiliate programs, optionally filtered by niche.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const niche = req.nextUrl.searchParams.get("niche");
  const tier = req.nextUrl.searchParams.get("tier");

  let query = supabase
    .from("brand_affiliates")
    .select("*")
    .eq("is_active", true)
    .order("tier", { ascending: false })
    .order("brand_name");

  if (niche) query = query.contains("niches", [niche]);
  if (tier) query = query.eq("tier", tier);

  const { data, error } = await query.limit(50);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ affiliates: data ?? [] });
}
