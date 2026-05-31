"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/verify-email`,
      },
    });

    if (signUpError) {
      setError(signUpError.message || "Unable to create account.");
      setLoading(false);
      return;
    }

    if (data.session) {
      router.push("/onboarding");
      return;
    }

    setSuccess(true);
    setLoading(false);
  }

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .signup-root {
          position: fixed;
          inset: 0;
          min-height: 100vh;
          background: #020203;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          z-index: 1;
        }

        .noise-overlay {
          position: fixed;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          opacity: 0.032;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
          background-size: 256px 256px;
          background-repeat: repeat;
        }

        .signup-card {
          position: relative;
          z-index: 2;
          width: 100%;
          max-width: 440px;
          background: #0f0f1e;
          border: 1px solid rgba(255, 255, 255, 0.055);
          border-radius: 2px;
          padding: 52px 48px 48px;
          display: flex;
          flex-direction: column;
          gap: 0;
        }

        .signup-wordmark {
          font-family: var(--font-mono, 'DM Mono', monospace);
          font-size: 11px;
          font-weight: 400;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: #c8a96e;
          margin-bottom: 36px;
          display: block;
        }

        .signup-heading {
          font-family: var(--font-display, 'Cormorant Garamond', serif);
          font-size: 36px;
          font-weight: 300;
          line-height: 1.1;
          color: rgba(255, 255, 255, 0.92);
          margin-bottom: 10px;
          letter-spacing: -0.01em;
        }

        .signup-subtitle {
          font-family: var(--font-body, 'Outfit', sans-serif);
          font-size: 14px;
          font-weight: 300;
          font-style: italic;
          color: rgba(255, 255, 255, 0.4);
          margin-bottom: 40px;
          line-height: 1.5;
        }

        .signup-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .field-group {
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .field-label {
          font-family: var(--font-mono, 'DM Mono', monospace);
          font-size: 10px;
          font-weight: 400;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.4);
        }

        .field-input {
          width: 100%;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.09);
          border-radius: 2px;
          padding: 13px 16px;
          font-family: var(--font-body, 'Outfit', sans-serif);
          font-size: 14px;
          font-weight: 300;
          color: rgba(255, 255, 255, 0.92);
          outline: none;
          transition: border-color 0.15s ease, background 0.15s ease;
          -webkit-appearance: none;
          appearance: none;
        }

        .field-input::placeholder {
          color: rgba(255, 255, 255, 0.22);
        }

        .field-input:hover {
          border-color: rgba(255, 255, 255, 0.15);
          background: rgba(255, 255, 255, 0.045);
        }

        .field-input:focus {
          border-color: #c8a96e;
          background: rgba(200, 169, 110, 0.04);
          box-shadow: 0 0 0 1px rgba(200, 169, 110, 0.18);
        }

        .field-input:-webkit-autofill,
        .field-input:-webkit-autofill:hover,
        .field-input:-webkit-autofill:focus {
          -webkit-text-fill-color: rgba(255, 255, 255, 0.92);
          -webkit-box-shadow: 0 0 0 1000px #0f0f1e inset;
          transition: background-color 5000s ease-in-out 0s;
        }

        .signup-cta {
          width: 100%;
          margin-top: 8px;
          padding: 15px 24px;
          background: #c8a96e;
          border: none;
          border-radius: 2px;
          font-family: var(--font-mono, 'DM Mono', monospace);
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #0a0800;
          cursor: pointer;
          transition: opacity 0.15s ease, background 0.15s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .signup-cta:hover:not(:disabled) {
          background: #d4b87a;
        }

        .signup-cta:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        .error-box {
          padding: 13px 16px;
          background: rgba(180, 40, 40, 0.12);
          border: 1px solid rgba(220, 60, 60, 0.25);
          border-radius: 2px;
          font-family: var(--font-body, 'Outfit', sans-serif);
          font-size: 13px;
          font-weight: 300;
          color: rgba(255, 130, 130, 0.9);
          line-height: 1.5;
        }

        .success-box {
          padding: 20px 24px;
          background: rgba(200, 169, 110, 0.07);
          border: 1px solid rgba(200, 169, 110, 0.22);
          border-radius: 2px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .success-box-label {
          font-family: var(--font-mono, 'DM Mono', monospace);
          font-size: 10px;
          font-weight: 400;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #c8a96e;
        }

        .success-box-text {
          font-family: var(--font-body, 'Outfit', sans-serif);
          font-size: 14px;
          font-weight: 300;
          color: rgba(255, 255, 255, 0.7);
          line-height: 1.6;
        }

        .signup-footer {
          margin-top: 28px;
          text-align: center;
          font-family: var(--font-body, 'Outfit', sans-serif);
          font-size: 13px;
          font-weight: 300;
          color: rgba(255, 255, 255, 0.4);
        }

        .signup-footer a {
          color: #c8a96e;
          text-decoration: none;
          transition: opacity 0.15s ease;
        }

        .signup-footer a:hover {
          opacity: 0.75;
        }
      `}</style>

      <div className="signup-root">
        <div className="noise-overlay" aria-hidden="true" />

        <div className="signup-card">
          <span className="signup-wordmark">Mansas Moguls</span>

          <h1 className="signup-heading">Build your empire.</h1>
          <p className="signup-subtitle">Create your Mansas Moguls account.</p>

          {success ? (
            <div className="success-box" role="status">
              <span className="success-box-label">Confirm your email</span>
              <p className="success-box-text">
                Check your email to confirm your account. Once confirmed, you can sign in and begin your onboarding.
              </p>
            </div>
          ) : (
            <form className="signup-form" onSubmit={onSubmit} noValidate>
              <div className="field-group">
                <label className="field-label" htmlFor="signup-email">Email</label>
                <input
                  id="signup-email"
                  className="field-input"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@domain.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>

              <div className="field-group">
                <label className="field-label" htmlFor="signup-password">Password</label>
                <input
                  id="signup-password"
                  className="field-input"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="Min. 8 characters"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
              </div>

              {error && <div className="error-box" role="alert">{error}</div>}

              <button type="submit" className="signup-cta" disabled={loading}>
                {loading ? "Creating…" : "Create Account →"}
              </button>
            </form>
          )}

          <p className="signup-footer">
            Already a member?{" "}
            <a href="/login">Sign in.</a>
          </p>
        </div>
      </div>
    </>
  );
}
