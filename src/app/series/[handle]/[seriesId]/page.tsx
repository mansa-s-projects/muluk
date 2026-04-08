import { Suspense } from "react";
import SeriesReaderClient from "./SeriesReaderClient";

interface Props {
  params: Promise<{ handle: string; seriesId: string }>;
}

export default async function SeriesReaderPage({ params }: Props) {
  const { handle, seriesId } = await params;
  return (
    <Suspense>
      <SeriesReaderClient handle={handle} seriesId={seriesId} />
    </Suspense>
  );
}
