import { Suspense } from "react";
import CommissionPageClient from "@/app/commission/[handle]/CommissionPageClient";

interface Props {
  params: Promise<{ handle: string }>;
}

export default async function HandleCommissionPage({ params }: Props) {
  const { handle } = await params;
  return (
    <Suspense>
      <CommissionPageClient handle={handle} />
    </Suspense>
  );
}
