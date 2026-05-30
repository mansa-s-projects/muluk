"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function VerifyEmailPage() {
  const params = useSearchParams();
  const email = params.get("email");

  return (
    <main className="simple-page" style={{ maxWidth: 640 }}>
      <h1>Email Verification</h1>
      <p>
        {email
          ? `A verification link was sent to ${email}.`
          : "Check your inbox for a verification link to activate your account."}
      </p>
      <p>After verification, return to login and continue onboarding.</p>
      <p>
        <Link href="/login">Go to login</Link>
      </p>
    </main>
  );
}
