import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as serviceClient } from "@supabase/supabase-js";

const BUCKET       = "pay-links";
const MAX_BYTES    = 100 * 1024 * 1024; // 100 MB
const BASE_URL     = process.env.NEXT_PUBLIC_SITE_URL ?? "https://muluk.vip";

function service() {
  return serviceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

// POST /api/instant-links — create a new instant pay link
// Body: FormData { file: File, price: string (dollars), title?: string }
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file  = form.get("file")  as File   | null;
  const price = form.get("price") as string | null;
  const title = ((form.get("title") as string | null) ?? "").trim() || null;

  if (!file || file.size === 0) {
    return NextResponse.json({ error: "File is required" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File exceeds 100 MB" }, { status: 413 });
  }

  const priceCents = Math.round(parseFloat(price ?? "0") * 100);
  if (!Number.isFinite(priceCents) || priceCents < 50) {
    return NextResponse.json({ error: "Minimum price is $0.50" }, { status: 400 });
  }

  const ext      = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  const filePath = `${user.id}/${crypto.randomUUID()}.${ext}`;
  const bytes    = await file.arrayBuffer();
  const sb       = service();

  const { error: uploadErr } = await sb.storage
    .from(BUCKET)
    .upload(filePath, bytes, { contentType: file.type, upsert: false });

  if (uploadErr) {
    console.error("[instant-links] upload failed:", uploadErr.message);
    return NextResponse.json({ error: "File upload failed" }, { status: 500 });
  }

  const { data: link, error: dbErr } = await sb
    .from("pay_links")
    .insert({
      creator_id: user.id,
      title,
      price:      priceCents,
      file_path:  filePath,
      file_type:  file.type,
      file_name:  file.name,
    })
    .select("id")
    .single();

  if (dbErr || !link) {
    console.error("[instant-links] db insert failed:", dbErr?.message);
    // Best-effort cleanup of orphaned upload
    await sb.storage.from(BUCKET).remove([filePath]);
    return NextResponse.json({ error: "Failed to create link" }, { status: 500 });
  }

  return NextResponse.json({
    id:  link.id,
    url: `${BASE_URL}/l/${link.id}`,
  });
}

// GET /api/instant-links — list creator's own links
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("pay_links")
    .select("id, title, price, file_type, file_name, created_at")
    .eq("creator_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data ?? [] });
}
