"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";

type Draft = {
  displayName: string;
  handle: string;
  bio: string;
  websiteUrl: string;
  location: string;
  mainSpecialty: string;
  primaryCtaLabel: string;
  primaryCtaUrl: string;
  avatarUrl: string | null;
  bannerUrl: string | null;
};

const emptyDraft: Draft = {
  displayName: "",
  handle: "",
  bio: "",
  websiteUrl: "",
  location: "",
  mainSpecialty: "",
  primaryCtaLabel: "",
  primaryCtaUrl: "",
  avatarUrl: null,
  bannerUrl: null,
};

export default function OnboardingPage() {
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [loadingDraft, setLoadingDraft] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);

  useEffect(() => {
    async function loadDraft() {
      setLoadingDraft(true);
      setError(null);

      try {
        const response = await fetch("/api/onboarding/profile-draft", { method: "GET" });
        const data = (await response.json()) as { error?: string; draft?: Draft };

        if (response.status === 401) {
          setNeedsLogin(true);
          setLoadingDraft(false);
          return;
        }

        if (!response.ok || !data.draft) {
          setError(data.error || "Unable to load onboarding draft.");
          setLoadingDraft(false);
          return;
        }

        setDraft(data.draft);
      } catch {
        setError("Network error while loading onboarding draft.");
      } finally {
        setLoadingDraft(false);
      }
    }

    void loadDraft();
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/onboarding/profile-save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error || "Failed to save onboarding profile.");
        setSaving(false);
        return;
      }

      setMessage("Profile saved. Continue to social account connections.");
    } catch {
      setError("Network error while saving profile.");
    } finally {
      setSaving(false);
    }
  }

  if (loadingDraft) {
    return <main className="simple-page"><h1>White Glove Onboarding</h1><p>Loading profile draft...</p></main>;
  }

  if (needsLogin) {
    return (
      <main className="simple-page" style={{ maxWidth: 640 }}>
        <h1>White Glove Onboarding</h1>
        <p>You need to sign in before completing onboarding.</p>
        <p><Link href="/login">Go to login</Link></p>
      </main>
    );
  }

  return (
    <main className="simple-page" style={{ maxWidth: 760 }}>
      <h1>White Glove Onboarding</h1>
      <p>Complete your operator profile to unlock the dashboard workflow.</p>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12, marginTop: 18 }}>
        <label htmlFor="displayName">Display name</label>
        <input id="displayName" value={draft.displayName} onChange={e => setDraft(v => ({ ...v, displayName: e.target.value }))} style={{ padding: "10px 12px", border: "1px solid #d9d9d9", borderRadius: 6 }} />

        <label htmlFor="handle">Handle</label>
        <input id="handle" value={draft.handle} onChange={e => setDraft(v => ({ ...v, handle: e.target.value }))} style={{ padding: "10px 12px", border: "1px solid #d9d9d9", borderRadius: 6 }} />

        <label htmlFor="bio">Bio</label>
        <textarea id="bio" value={draft.bio} onChange={e => setDraft(v => ({ ...v, bio: e.target.value }))} rows={4} style={{ padding: "10px 12px", border: "1px solid #d9d9d9", borderRadius: 6 }} />

        <label htmlFor="website">Website</label>
        <input id="website" value={draft.websiteUrl} onChange={e => setDraft(v => ({ ...v, websiteUrl: e.target.value }))} style={{ padding: "10px 12px", border: "1px solid #d9d9d9", borderRadius: 6 }} />

        <label htmlFor="location">Location</label>
        <input id="location" value={draft.location} onChange={e => setDraft(v => ({ ...v, location: e.target.value }))} style={{ padding: "10px 12px", border: "1px solid #d9d9d9", borderRadius: 6 }} />

        <label htmlFor="specialty">Main specialty</label>
        <input id="specialty" value={draft.mainSpecialty} onChange={e => setDraft(v => ({ ...v, mainSpecialty: e.target.value }))} style={{ padding: "10px 12px", border: "1px solid #d9d9d9", borderRadius: 6 }} />

        <label htmlFor="ctaLabel">Primary CTA label</label>
        <input id="ctaLabel" value={draft.primaryCtaLabel} onChange={e => setDraft(v => ({ ...v, primaryCtaLabel: e.target.value }))} style={{ padding: "10px 12px", border: "1px solid #d9d9d9", borderRadius: 6 }} />

        <label htmlFor="ctaUrl">Primary CTA URL</label>
        <input id="ctaUrl" value={draft.primaryCtaUrl} onChange={e => setDraft(v => ({ ...v, primaryCtaUrl: e.target.value }))} style={{ padding: "10px 12px", border: "1px solid #d9d9d9", borderRadius: 6 }} />

        <button type="submit" disabled={saving} style={{ marginTop: 8, padding: "10px 14px" }}>
          {saving ? "Saving profile..." : "Save onboarding profile"}
        </button>

        {error ? <p style={{ color: "#a62424", margin: 0 }}>{error}</p> : null}
        {message ? <p style={{ color: "#1f7a2e", margin: 0 }}>{message}</p> : null}

        <p style={{ marginTop: 8 }}><Link href="/settings/social">Continue to social connections</Link></p>
      </form>
    </main>
  );
}
