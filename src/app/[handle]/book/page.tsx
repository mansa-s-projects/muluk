import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BookingPageClient from "@/app/book/[handle]/BookingPageClient";

interface Props {
  params: Promise<{ handle: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  const base = process.env.NEXT_PUBLIC_SITE_URL?.trim() ?? "";
  if (!/^https?:\/\//.test(base)) return { title: "Book a Session" };
  try {
    const res = await fetch(`${base}/api/bookings/slots/${handle}`, { cache: "no-store" });
    if (!res.ok) return { title: "Book a Session" };
    const data = await res.json();
    const name: string = data.creator?.display_name ?? data.creator?.handle ?? handle;
    return {
      title: `Book a Session with ${name}`,
      description: `Reserve a 1-on-1 session with ${name}. Pay once to unlock your meeting link.`,
    };
  } catch {
    return { title: "Book a Session" };
  }
}

export default async function HandleBookPage({ params }: Props) {
  const { handle } = await params;
  const base = process.env.NEXT_PUBLIC_SITE_URL?.trim() ?? "";
  if (!/^https?:\/\//.test(base)) {
    throw new Error("NEXT_PUBLIC_SITE_URL must be configured with an absolute URL");
  }
  try {
    const res = await fetch(`${base}/api/bookings/slots/${handle}`, { cache: "no-store" });
    if (res.status === 404) notFound();
    if (!res.ok) throw new Error("Failed to load slots");
    const data = await res.json();
    return <BookingPageClient handle={handle} initialCreator={data.creator} initialSlots={data.slots} />;
  } catch (error) {
    console.error("[handle/book] failed to load booking slots", error);
    throw error;
  }
}
