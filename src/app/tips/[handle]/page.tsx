import { Suspense } from "react";
import TipsPageClient from "./TipsPageClient";

interface Props {
  params: Promise<{ handle: string }>;
}

export default async function TipsPage({ params }: Props) {
  const { handle } = await params;
  return (
    <Suspense>
      <TipsPageClient handle={handle} />
    </Suspense>
  );
}
