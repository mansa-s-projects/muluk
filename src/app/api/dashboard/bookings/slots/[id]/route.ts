import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const serviceDb = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

async function getAuthenticatedUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll:  () => cookieStore.getAll(),
        setAll: (toSet) => {
          try {
            toSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// DELETE /api/dashboard/bookings/slots/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const db = serviceDb();

  // Confirm the slot belongs to this creator and is not yet booked
  const { data: slot } = await db
    .from("availability")
    .select("id, is_booked, creator_id")
    .eq("id", id)
    .single();

  if (!slot) return NextResponse.json({ error: "Slot not found" }, { status: 404 });
  if (slot.creator_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (slot.is_booked) return NextResponse.json({ error: "Cannot delete a booked slot" }, { status: 409 });

  const { error } = await db.from("availability").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "Failed to delete slot" }, { status: 500 });

  return NextResponse.json({ ok: true });
}
