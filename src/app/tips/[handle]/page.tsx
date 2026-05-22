import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ handle: string }>;
}

// Canonical URL moved to /:handle/tips
export default async function TipsHandleRedirect({ params }: Props) {
  const { handle } = await params;
  redirect(`/${handle}/tips`);
}
