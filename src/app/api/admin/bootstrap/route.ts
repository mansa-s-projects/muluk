import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// TEMPORARY: Bootstrap first admin user
// Delete this file after setting up your admin!
export async function POST() {
  const supabase = await createClient();
  
  try {
    // Get the most recent user from creator_applications
    const { data: recentApp, error: appError } = await supabase
      .from("creator_applications")
      .select("user_id, email")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
      
    if (appError || !recentApp?.user_id) {
      return NextResponse.json({ 
        error: "No users found. Sign up at /dashboard/onboarding first!" 
      }, { status: 404 });
    }
    
    // Make them admin
    const { error: insertError } = await supabase
      .from("admin_users")
      .upsert({ 
        user_id: recentApp.user_id, 
        role: "super_admin",
      }, { onConflict: "user_id" });

    if (insertError) {
      return NextResponse.json({ 
        error: "Failed to create admin: " + insertError.message 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "✅ Admin created successfully!",
      user_id: recentApp.user_id,
      email: recentApp.email,
      next_step: "Go to http://localhost:3001/admin/command-center"
    });

  } catch (error: any) {
    return NextResponse.json({ 
      error: error.message 
    }, { status: 500 });
  }
}

// Also allow GET for easy browser access
export async function GET() {
  return POST();
}
