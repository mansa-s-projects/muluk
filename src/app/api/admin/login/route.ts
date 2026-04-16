import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid request" }, { status: 400 });
  }

  const { email, password } = body;
  if (!email || !password) {
    return NextResponse.json({ message: "Email and password required" }, { status: 400 });
  }

  const supabase = await createClient();

  // Sign in — this sets the session cookie via Supabase SSR helpers
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    return NextResponse.json(
      { message: error?.message ?? "Invalid credentials" },
      { status: 401 }
    );
  }

  // Verify the user is in admin_users (second gate — middleware re-checks on every request)
  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: adminRow } = await service
    .from("admin_users")
    .select("id")
    .eq("user_id", data.user.id)
    .maybeSingle();

  if (!adminRow) {
    // Sign back out so the cookie isn't left behind
    await supabase.auth.signOut();
    return NextResponse.json({ message: "Access denied" }, { status: 403 });
  }

  return NextResponse.json({ success: true });
}
