import { redirect } from "next/navigation";

// All onboarding logic lives in the wizard at /dashboard/onboarding.
// This route exists only for backward-compat links — redirect immediately.
export default function OnboardingProfilePage() {
  redirect("/dashboard/onboarding");
}
