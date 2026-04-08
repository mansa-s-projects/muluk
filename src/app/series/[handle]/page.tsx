import { Suspense } from "react";
import SeriesPageClient from "./SeriesPageClient";

interface Props {
  params: Promise<{ handle: string }>;
}

export default async function SeriesPage({ params }: Props) {
  const { handle } = await params;
  return (
    <Suspense>
      <SeriesPageClient handle={handle} />
    </Suspense>
  );
}
