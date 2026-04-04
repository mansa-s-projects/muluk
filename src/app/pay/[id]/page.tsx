import { createClient as createServiceClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import PayLinkClient from "./PayLinkClient";

type PageProps = { params: Promise<{ id: string }> };

async function fetchPayLink(id: string) {
  const db = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await db
    .from("payment_links")
    .select(
      "id, title, description, price, content_type, cover_image_url, whop_checkout_url, view_count, purchase_count"
    )
    .eq("id", id)
    .eq("is_active", true)
    .single();

  if (error || !data) return null;
  return data;
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const link = await fetchPayLink(id);
  if (!link) return { title: "Not Found" };
  return {
    title: link.title,
    description: link.description ?? "Exclusive content — unlock after purchase.",
  };
}

export default async function PayLinkPage({ params }: PageProps) {
  const { id } = await params;
  const link = await fetchPayLink(id);
  if (!link) notFound();
  return <PayLinkClient link={link} />;
}
