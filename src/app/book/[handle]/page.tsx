import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ handle: string }>;
}

// Canonical URL moved to /:handle/book
export default async function BookHandleRedirect({ params }: Props) {
  const { handle } = await params;
  redirect(`/${handle}/book`);
}
