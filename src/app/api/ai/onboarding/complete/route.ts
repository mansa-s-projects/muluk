import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { provisionWhopCheckout } from "@/lib/whop";

type FirstDrop = {
  title: string;
  description: string;
  price: number;
  expiryHours: number;
  caption: string;
  mediaType: "image" | "video" | "text";
};

type LaunchBlueprint = {
  offerIdea: string;
  offerDescription: string;
  price: number;
  contentPillars: string[];
  bestChannels: string[];
  sevenDayPlan: Array<{ day: number; action: string }>;
  revenueEstimate: { monthly: number; yearly: number };
};

type ProfileIdentity = {
  displayName?: string;
  handle?: string;
  bio?: string;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  website?: string;
  location?: string;
  specialty?: string;
  ctaLabel?: string;
  cta?: string;
};

type CompleteRequest = {
  niche: string;
  subNiche?: string;
  contentTypes: string[];
  experience: string;
  launchBlueprint: LaunchBlueprint;
  firstDrop: FirstDrop;
  profileIdentity?: ProfileIdentity | null;
};

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as CompleteRequest;
    const { niche, subNiche, contentTypes, experience, launchBlueprint, firstDrop, profileIdentity } = body;

    // ── 1. Mark onboarding complete — authoritative signal ───────────────────
    // profiles.onboarding_completed is the single source of truth for the gate.
    const { data: profileRow, error: profileUpsertError } = await supabase
      .from("profiles")
      .upsert(
        {
          id: user.id,
          onboarding_completed: true,
          onboarding_completed_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      )
      .select("id")
      .single();

    if (profileUpsertError || !profileRow) {
      console.error("Failed to mark onboarding complete on profile", {
        userId: user.id,
        error: profileUpsertError,
      });
      return NextResponse.json({ error: "Failed to finalize onboarding" }, { status: 500 });
    }

    // ── 2. Write creator_onboarding snapshot (fire-and-forget) ───────────────
    // Not used for gating — errors here do not fail the request.
    supabase.from("creator_onboarding").upsert({
      user_id: user.id,
      interests: [niche, subNiche].filter(Boolean),
      content_types: contentTypes,
      experience_level: experience,
      launch_blueprint: launchBlueprint,
      first_drop: firstDrop,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" }).then(({ error }) => {
      if (error) console.error("creator_onboarding snapshot failed (non-fatal):", error);
    });

    // ── 3. Create the first drop as a content item (draft) ───────────────────
    const expiresAt = firstDrop.expiryHours > 0
      ? new Date(Date.now() + firstDrop.expiryHours * 60 * 60 * 1000).toISOString()
      : null;

    const { data: contentItem, error: contentError } = await supabase
      .from("content_items")
      .insert({
        creator_id: user.id,
        title: firstDrop.title,
        description: firstDrop.description,
        content_type: firstDrop.mediaType,
        is_premium: true,
        price: firstDrop.price,
        currency: "usd",
        status: "draft",
        metadata: {
          caption: firstDrop.caption,
          expires_at: expiresAt,
          from_onboarding: true,
        },
      })
      .select("id")
      .single();

    if (contentError) {
      console.error("Failed to create first drop:", contentError);
      // Non-fatal — profile is already marked complete
    }

    // ── 4. Save profile identity to profiles (authoritative) ────────────────
    if (profileIdentity?.displayName) {
      const pi = profileIdentity;
      const { error: profileIdentityErr } = await supabase
        .from("profiles")
        .upsert(
          {
            id:           user.id,
            display_name: pi.displayName,
            handle:       pi.handle?.toLowerCase().replace(/[^a-z0-9_]/g, "") || null,
            bio:          pi.bio || null,
            avatar_url:   pi.avatarUrl ?? null,
            banner_url:   pi.bannerUrl ?? null,
            website:      pi.website || null,
            location:     pi.location || null,
            specialty:    pi.specialty || null,
            cta_label:    pi.ctaLabel || null,
            cta_url:      pi.cta || null,
            updated_at:   new Date().toISOString(),
          },
          { onConflict: "id" }
        );
      if (profileIdentityErr) {
        console.error("Failed to save profile identity to profiles:", profileIdentityErr);
      }

      // Mirror to creator_applications for fan-page rendering (fire-and-forget)
      supabase.from("creator_applications").upsert({
        user_id:   user.id,
        name:      pi.displayName,
        handle:    pi.handle,
        bio:       pi.bio,
        category:  niche,
        avatar_url: pi.avatarUrl ?? null,
        banner_url: pi.bannerUrl ?? null,
        website:   pi.cta || pi.website || null,
        location:  pi.location || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" }).then(({ error }) => {
        if (error) console.error("creator_applications mirror failed (non-fatal):", error);
      });
    }

    const handle = profileIdentity?.handle;
    // ── Create offer_draft for the first drop ──────────────────────────────
    let paymentLinkId: string | null = null;
    let paymentLinkUrl: string | null = null;

    const priceCents = Math.round(firstDrop.price * 100);

    const { data: offerDraft } = await supabase
      .from("offer_drafts")
      .insert({
        creator_id:   user.id,
        title:        firstDrop.title,
        description:  firstDrop.description,
        price:        priceCents,
        billing_type: "one_time",
        offer_type:   "premium_content",
        launch_angle: launchBlueprint.offerDescription,
        status:       "draft",
      })
      .select("id")
      .single();

    // ── Provision Whop + create payment_link ──────────────────────────────
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL?.trim() || "";
    let baseUrlValid = false;
    let provisioningSkipped = false;
    if (baseUrl) {
      try {
        new URL(baseUrl);
        baseUrlValid = true;
      } catch {
        console.error("Invalid NEXT_PUBLIC_BASE_URL:", baseUrl);
      }
    }

    if (!baseUrlValid) {
      provisioningSkipped = true;
      console.warn("Skipping Whop provisioning: NEXT_PUBLIC_BASE_URL is missing or invalid");
    }

    const safeTitle = firstDrop.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);
    // Map media type to content_type field
    const contentTypeMap: Record<string, string> = {
      "image": "text",
      "video": "text",
      "text": "text",
    };
    const contentType = contentTypeMap[firstDrop.mediaType?.toLowerCase()] || "text";

    const { data: payLink } = await supabase
      .from("payment_links")
      .insert({
        creator_id:    user.id,
        title:         firstDrop.title,
        description:   firstDrop.description,
        price:         priceCents,
        content_type:  contentType,
        content_value: firstDrop.caption,
        offer_draft_id: offerDraft?.id ?? null,
        is_active:     true,
      })
      .select("id")
      .single();

    if (payLink) {
      paymentLinkId = payLink.id;
      const slug = `${safeTitle}-${payLink.id.slice(0, 8)}`;
      if (baseUrlValid) {
        const redirectUrl = `${baseUrl}/pay/${slug}?success=1`;

        try {
          const whop = await provisionWhopCheckout({
            title: firstDrop.title,
            description: firstDrop.description,
            price_cents: priceCents,
            redirect_url: redirectUrl,
          });

          const updatePayload: Record<string, unknown> = { slug };
          if (whop) {
            updatePayload.whop_product_id   = whop.whop_product_id;
            updatePayload.whop_checkout_id  = whop.whop_checkout_id;
            updatePayload.whop_checkout_url = whop.whop_checkout_url;
            updatePayload.is_live           = true;
          }

          const { error: updateError } = await supabase
            .from("payment_links")
            .update(updatePayload)
            .eq("id", payLink.id);

          if (updateError) {
            console.error("Failed to update payment link:", { id: payLink.id, error: updateError });
          } else {
            paymentLinkUrl = `/pay/${slug}`;
          }
        } catch (err) {
          console.error("Error provisioning Whop:", err);
          provisioningSkipped = true;
          // Still save slug even if provisioning fails
          const { error: updateError } = await supabase
            .from("payment_links")
            .update({ slug: safeTitle + "-" + payLink.id.slice(0, 8) })
            .eq("id", payLink.id);
          if (!updateError) {
            paymentLinkUrl = `/pay/${safeTitle}-${payLink.id.slice(0, 8)}`;
          }
        }
      } else {
        const { error: updateError } = await supabase
          .from("payment_links")
          .update({ slug })
          .eq("id", payLink.id);

        if (updateError) {
          console.error("Failed to save slug without provisioning:", { id: payLink.id, error: updateError });
        } else {
          paymentLinkUrl = `/pay/${slug}`;
        }
      }
    }

    return NextResponse.json({
      success: true,
      dropId: contentItem?.id,
      fanPageUrl: handle ? `/${handle}` : "",
      paymentLinkId,
      paymentLinkUrl,
      provisioningSkipped,
      message: "Onboarding complete! Your first drop is ready to publish.",
    });
  } catch (error) {
    console.error("Onboarding completion failed:", error);
    return NextResponse.json({ error: "Completion failed" }, { status: 500 });
  }
}
