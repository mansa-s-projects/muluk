import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import UnlockClient from "./UnlockClient";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PayLinkPage({ params }: PageProps) {
  const { id } = await params;

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: link, error } = await sb
    .from("pay_links")
    .select("id, title, price, file_type, file_name")
    .eq("id", id)
    .single();

  if (error || !link) notFound();

  return (
    <UnlockClient
      linkId={link.id}
      title={link.title}
      price={link.price}
      fileType={link.file_type}
      fileName={link.file_name}
    />
  );
}
