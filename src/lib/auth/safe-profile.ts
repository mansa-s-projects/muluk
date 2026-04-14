import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function getSafeProfile() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (list) => {
          try {
            list.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {}
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, profile: null };
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    // If trigger failed or rows missing, safely return a fallback profile
    console.error("[safe-profile] Could not fetch profile, falling back to default", error);
    return {
      user,
      profile: {
        id: user.id,
        role: "fan",
        username: user.email?.split('@')[0] || "user", // fallback username
        created_at: new Date().toISOString()
      }
    };
  }

  return { user, profile };
}
