import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ handle: string }>;
}

// Canonical URL moved to /:handle/series
export default async function SeriesHandleRedirect({ params }: Props) {
  const { handle } = await params;
  redirect(`/${handle}/series`);
}
