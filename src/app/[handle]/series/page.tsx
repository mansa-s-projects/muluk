import { Suspense } from "react";
import SeriesPageClient from "@/app/series/[handle]/SeriesPageClient";

interface Props {
  params: Promise<{ handle: string }>;
}

export default async function HandleSeriesPage({ params }: Props) {
  const { handle } = await params;
  return (
    <Suspense>
      <SeriesPageClient handle={handle} />
    </Suspense>
  );
}
