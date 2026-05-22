import { redirect } from "next/navigation";
import ApplyClient from "./ApplyClient";

type PageProps = { searchParams: Promise<{ code?: string }> };

export const metadata = {
  title: "Apply — MULUK",
  robots: { index: false, follow: false },
};

export default async function ApplyPage({ searchParams }: PageProps) {
  const { code } = await searchParams;
  const inviteCode = process.env.APPLY_INVITE_CODE;

  // If an invite code is configured, enforce it.
  // No code set in env → apply is open to anyone with the URL.
  if (inviteCode && code !== inviteCode) {
    redirect("/");
  }

  return <ApplyClient />;
}
