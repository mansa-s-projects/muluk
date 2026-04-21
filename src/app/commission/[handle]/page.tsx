import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ handle: string }>;
}

// Canonical URL moved to /:handle/commission
export default async function CommissionHandleRedirect({ params }: Props) {
  const { handle } = await params;
  redirect(`/${handle}/commission`);
}
