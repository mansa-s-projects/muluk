import WaitlistPage from "@/components/marketing/WaitlistPage";
import LandingPage from "@/components/marketing/LandingPage";

type SiteMode = "waitlist" | "live";

function getSiteMode(): SiteMode {
  const mode = process.env.NEXT_PUBLIC_SITE_MODE;
  if (mode === "waitlist" || mode === "live") {
    return mode;
  }

  throw new Error(
    "Invalid NEXT_PUBLIC_SITE_MODE. Expected 'waitlist' or 'live'."
  );
}

export default function Home() {
  const siteMode = getSiteMode();

  if (siteMode === "waitlist") {
    return <WaitlistPage />;
  }

  return <LandingPage />;
}
