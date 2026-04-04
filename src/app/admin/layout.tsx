import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect("/admin/login");
  }

  // DEV MODE: Skip admin check in development
  if (process.env.NODE_ENV === "development") {
    return (
      <div className="admin-layout">
        {children}
      </div>
    );
  }

  // Check if user is admin
  const { data: adminCheck } = await supabase
    .from("admin_users")
    .select("id, role")
    .eq("user_id", user.id)
    .single();

  if (!adminCheck) {
    redirect("/dashboard");
  }

  return (
    <div className="admin-layout">
      {children}
    </div>
  );
}
