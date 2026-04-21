import { Suspense } from "react";
import TipsPageClient from "@/app/tips/[handle]/TipsPageClient";

interface Props {
  params: Promise<{ handle: string }>;
}

export default async function HandleTipsPage({ params }: Props) {
  const { handle } = await params;
  return (
    <Suspense>
      <TipsPageClient handle={handle} />
    </Suspense>
  );
}
