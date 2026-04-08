import { Suspense } from "react";
import CommissionPageClient from "./CommissionPageClient";

interface Props {
  params: Promise<{ handle: string }>;
}

export default async function CommissionPage({ params }: Props) {
  const { handle } = await params;
  return (
    <Suspense>
      <CommissionPageClient handle={handle} />
    </Suspense>
  );
}
