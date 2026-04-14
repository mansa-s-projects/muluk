import { redirect } from "next/navigation";

// Canonical URL is now /dashboard/monetization/pricing
export default function RateCardPage() {
  redirect("/dashboard/monetization/pricing");
}
