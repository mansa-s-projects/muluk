import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { isAdminUserById } from "@/lib/auth/role-guards";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  const isAdmin = await isAdminUserById(user.id);
  if (!isAdmin) {
    notFound();
  }

  return (
    <div className="admin-layout">
      {children}
    </div>
  );
}
