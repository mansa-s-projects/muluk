import { notFound } from "next/navigation";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { createClient as createServiceClient } from "@supabase/supabase-js";

interface Props {
  params: Promise<{ handle: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}

function getDb() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  return {
    title: `@${handle} — Pay | MULUK`,
    robots: { index: false, follow: false },
  };
}

export default async function HandlePayPage({ params, searchParams }: Props) {
  const { handle } = await params;
  const query = await searchParams;
  const clean = handle.replace(/^@/, "").toLowerCase();
  const db = getDb();

  const { data: creator } = await db
    .from("creator_applications")
    .select("user_id, name")
    .eq("handle", clean)
    .eq("status", "approved")
    .maybeSingle();

  if (!creator) notFound();

  // If a specific pay link ID or slug is requested, redirect to it
  const id = query.id ?? query.slug;
  if (id) redirect(`/pay/${id}`);

  const { data: links } = await db
    .from("payment_links")
    .select("id, title, description, price, content_type, slug")
    .eq("creator_id", creator.user_id)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  const active = links ?? [];

  // If only one link, jump straight to it
  if (active.length === 1) redirect(`/pay/${active[0].slug ?? active[0].id}`);
  if (active.length === 0) notFound();

  return (
    <div style={{
      minHeight: "100vh",
      background: "#020203",
      fontFamily: "var(--font-body, 'Outfit', sans-serif)",
      color: "rgba(255,255,255,0.92)",
      padding: "60px 24px",
    }}>
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <Link href={`/${clean}`} style={{
          fontFamily: "var(--font-mono, 'DM Mono', monospace)",
          fontSize: 11,
          letterSpacing: "0.3em",
          color: "rgba(200,169,110,0.45)",
          textDecoration: "none",
          display: "block",
          marginBottom: 40,
        }}>
          MULUK
        </Link>

        <div style={{
          fontFamily: "var(--font-mono, 'DM Mono', monospace)",
          fontSize: 10,
          letterSpacing: "0.25em",
          color: "#7a6030",
          marginBottom: 10,
        }}>
          @{clean}
        </div>
        <h1 style={{
          fontFamily: "var(--font-display, 'Cormorant Garamond', serif)",
          fontSize: "clamp(28px,5vw,42px)",
          fontWeight: 300,
          margin: "0 0 32px",
        }}>
          {creator.name}
        </h1>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {active.map((link) => (
            <Link
              key={link.id}
              href={`/pay/${link.slug ?? link.id}`}
              style={{
                display: "block",
                padding: "22px 24px",
                background: "#0f0f1e",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 10,
                textDecoration: "none",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div style={{
                position: "absolute",
                top: 0, left: "20%", right: "20%",
                height: 1,
                background: "linear-gradient(90deg,transparent,rgba(200,169,110,0.3),transparent)",
              }} />
              <div style={{
                fontFamily: "var(--font-body, 'Outfit', sans-serif)",
                fontSize: 16,
                fontWeight: 500,
                color: "rgba(255,255,255,0.9)",
                marginBottom: 6,
              }}>
                {link.title}
              </div>
              {link.description && (
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.38)", fontWeight: 300, marginBottom: 10 }}>
                  {link.description}
                </div>
              )}
              <div style={{
                fontFamily: "var(--font-mono, 'DM Mono', monospace)",
                fontSize: 18,
                color: "#c8a96e",
              }}>
                {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 })
                  .format((link.price as number) / 100)}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
