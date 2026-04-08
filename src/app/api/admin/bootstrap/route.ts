import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type BootstrapBody = {
  user_id?: string;
  email?: string;
  token?: string;
};

export async function POST(request: Request) {
  const bootstrapSecret = process.env.ADMIN_BOOTSTRAP_SECRET?.trim();
  const enableInProd = process.env.ADMIN_BOOTSTRAP_ENABLE_PROD === "true";

  if (!bootstrapSecret) {
    console.error("[admin-bootstrap] ADMIN_BOOTSTRAP_SECRET is missing");
    return NextResponse.json({ error: "Bootstrap is not configured" }, { status: 500 });
  }

  if (process.env.NODE_ENV === "production" && !enableInProd) {
    return NextResponse.json({ error: "Bootstrap is disabled in production" }, { status: 403 });
  }

  let body: BootstrapBody = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const tokenFromHeader = request.headers.get("x-admin-bootstrap-secret")?.trim();
  const token = tokenFromHeader || body.token?.trim();
  if (!token || token !== bootstrapSecret) {
    return NextResponse.json({ error: "Invalid bootstrap token" }, { status: 401 });
  }

  const userId = body.user_id?.trim();
  const email = body.email?.trim().toLowerCase();
  if (!userId && !email) {
    return NextResponse.json(
      { error: "user_id or email is required" },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  
  try {
    let appQuery = supabase
      .from("creator_applications")
      .select("user_id")
      .limit(1);

    if (userId) {
      appQuery = appQuery.eq("user_id", userId);
    } else if (email) {
      appQuery = appQuery.eq("email", email);
    }

    const { data: appRows, error: appError } = await appQuery;
    const app = appRows?.[0] ?? null;

    if (appError) {
      console.error("[admin-bootstrap] app lookup failed:", appError);
      return NextResponse.json({ error: "Failed to load target application" }, { status: 500 });
    }

    if (!app?.user_id) {
      return NextResponse.json({ error: "Target application not found" }, { status: 404 });
    }
    
    // Promote explicit target to admin
    const { error: insertError } = await supabase
      .from("admin_users")
      .upsert({ 
        user_id: app.user_id, 
        role: "super_admin",
      }, { onConflict: "user_id" });

    if (insertError) {
      console.error("[admin-bootstrap] admin upsert failed:", insertError);
      return NextResponse.json({ 
        error: "Failed to create admin" 
      }, { status: 500 });
    }

    const adminUiUrl = process.env.ADMIN_UI_URL?.trim() || new URL("/admin/command-center", request.url).toString();

    return NextResponse.json({
      success: true,
      message: "Admin created successfully",
      user_id: app.user_id,
      next_step: adminUiUrl,
    });

  } catch (error) {
    console.error("[admin-bootstrap] unexpected error:", error);
    return NextResponse.json({ 
      error: "Internal server error" 
    }, { status: 500 });
  }
}
