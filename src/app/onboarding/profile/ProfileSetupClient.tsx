"use client";

import { useRouter } from "next/navigation";
import { type ChangeEvent, type FormEvent, useState } from "react";

type ProfileSetupValues = {
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

type Props = {
  initialValues?: Partial<ProfileSetupValues>;
  onSaved?: () => void;
  sources?: string[];
};

const DEFAULT_VALUES: ProfileSetupValues = {
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

function normaliseHandle(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9_]/g, "");
}

async function uploadFile(file: File, folder: "avatars" | "banners") {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", folder);

  const response = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error || "Upload failed");
  }

  const payload = (await response.json()) as { url?: string };
  if (!payload.url) throw new Error("Upload did not return a URL");
  return payload.url;
}

export default function ProfileSetupClient({ initialValues, onSaved, sources = [] }: Props) {
  const router = useRouter();
  const [values, setValues] = useState<ProfileSetupValues>({
    ...DEFAULT_VALUES,
    ...initialValues,
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateValue = <K extends keyof ProfileSetupValues>(key: K, value: ProfileSetupValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>, kind: "avatar" | "banner") => {
    const file = event.target.files?.[0] ?? null;
    if (kind === "avatar") setAvatarFile(file);
    if (kind === "banner") setBannerFile(file);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      let avatarUrl = values.avatarUrl;
      let bannerUrl = values.bannerUrl;

      if (avatarFile) avatarUrl = await uploadFile(avatarFile, "avatars");
      if (bannerFile) bannerUrl = await uploadFile(bannerFile, "banners");

      const response = await fetch("/api/onboarding/profile-save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          handle: normaliseHandle(values.handle),
          avatarUrl,
          bannerUrl,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error || "Failed to save profile");
      }

      onSaved?.();
      router.push("/dashboard/onboarding");
      router.refresh();
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Failed to save profile";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-white">Profile setup</h1>
        <p className="text-sm text-white/70">
          Complete your public profile details before continuing to onboarding.
        </p>
        {sources.length > 0 ? (
          <p className="text-xs uppercase tracking-[0.2em] text-[#c8a96e]">
            Prefilled from: {sources.join(", ")}
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm text-white/80">
          Display name
          <input
            value={values.displayName}
            onChange={(event) => updateValue("displayName", event.target.value)}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-[#c8a96e]"
            placeholder="Cipher Creator"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm text-white/80">
          Handle
          <input
            value={values.handle}
            onChange={(event) => updateValue("handle", normaliseHandle(event.target.value))}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-[#c8a96e]"
            placeholder="ciphercreator"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm text-white/80 md:col-span-2">
          Bio
          <textarea
            value={values.bio}
            onChange={(event) => updateValue("bio", event.target.value)}
            className="min-h-32 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-[#c8a96e]"
            placeholder="Tell fans what they get from your page."
          />
        </label>
        <label className="flex flex-col gap-2 text-sm text-white/80">
          Website
          <input
            value={values.websiteUrl}
            onChange={(event) => updateValue("websiteUrl", event.target.value)}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-[#c8a96e]"
            placeholder="https://your-site.com"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm text-white/80">
          Location
          <input
            value={values.location}
            onChange={(event) => updateValue("location", event.target.value)}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-[#c8a96e]"
            placeholder="Dubai"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm text-white/80">
          Main specialty
          <input
            value={values.mainSpecialty}
            onChange={(event) => updateValue("mainSpecialty", event.target.value)}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-[#c8a96e]"
            placeholder="Luxury lifestyle"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm text-white/80">
          Primary CTA label
          <input
            value={values.primaryCtaLabel}
            onChange={(event) => updateValue("primaryCtaLabel", event.target.value)}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-[#c8a96e]"
            placeholder="Join now"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm text-white/80 md:col-span-2">
          Primary CTA URL
          <input
            value={values.primaryCtaUrl}
            onChange={(event) => updateValue("primaryCtaUrl", event.target.value)}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-[#c8a96e]"
            placeholder="https://whop.com/your-community"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm text-white/80">
          Avatar image
          <input
            type="file"
            accept="image/*"
            onChange={(event) => handleFileChange(event, "avatar")}
            className="rounded-xl border border-dashed border-white/15 bg-white/5 px-4 py-3 text-white/70"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm text-white/80">
          Banner image
          <input
            type="file"
            accept="image/*"
            onChange={(event) => handleFileChange(event, "banner")}
            className="rounded-xl border border-dashed border-white/15 bg-white/5 px-4 py-3 text-white/70"
          />
        </label>
      </div>

      {error ? <p className="text-sm text-red-300">{error}</p> : null}

      <div className="flex items-center justify-between gap-4">
        <p className="text-xs text-white/50">
          This saves to your onboarding profile draft and returns you to the wizard.
        </p>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-full bg-[#c8a96e] px-5 py-3 text-sm font-medium text-black transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Saving..." : "Save profile"}
        </button>
      </div>
    </form>
  );
}
