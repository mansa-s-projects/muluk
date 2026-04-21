import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ handle: string }>;
}

// Canonical URL moved to /:handle/vault
export default async function VaultHandleRedirect({ params }: Props) {
  const { handle } = await params;
  redirect(`/${handle}/vault`);
}
