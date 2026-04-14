import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function service() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

// GET /api/instant-links/[id] — public link metadata for fan page
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const { data, error } = await service()
    .from("pay_links")
    .select("id, title, price, file_type, file_name, created_at")
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Link not found" }, { status: 404 });
  }
  return NextResponse.json(data);
}
