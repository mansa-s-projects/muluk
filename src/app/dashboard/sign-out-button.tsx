"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignOutButton() {
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  };

  return (
    <button
      type="button"
      onClick={handleSignOut}
      style={{
        background: "transparent",
        color: "var(--gold)",
        border: "1px solid rgba(200,169,110,0.45)",
        borderRadius: "4px",
        padding: "12px 14px",
        fontFamily: "var(--font-mono)",
        fontSize: "11px",
        letterSpacing: "0.16em",
        textTransform: "uppercase",
      }}
    >
      Sign out
    </button>
  );
}