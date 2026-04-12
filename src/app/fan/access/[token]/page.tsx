import type { CSSProperties } from "react";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { hashAccessToken } from "@/lib/token-hash";

export const metadata: Metadata = {
  title: "Unlocked Content — MULUK",
  robots: { index: false, follow: false },
};

type PageProps = { params: Promise<{ token: string }> };

const TOKEN_REGEX = /^[0-9a-f]{64}$/;

const mono: CSSProperties = { fontFamily: "var(--font-mono, 'DM Mono', monospace)" };
const disp: CSSProperties = { fontFamily: "var(--font-display, 'Cormorant Garamond', serif)" };

function getDb() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

type AccessResult =
  | { status: "ok"; title: string; description: string | null; content_type: string; content_value: string | null; access_type: string }
  | { status: "expired" | "used" | "not_found" };

async function validateAndFetch(token: string): Promise<AccessResult> {
  const db = getDb();
  const tokenHash = hashAccessToken(token);

  // Step 1: Validate token
  const { data: tokenRow, error: tokenErr } = await db
    .from("access_tokens")
    .select("id, expires_at, used_at, purchase_id")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (tokenErr || !tokenRow) return { status: "not_found" };

  if (tokenRow.expires_at && new Date(tokenRow.expires_at) < new Date()) {
    return { status: "expired" };
  }

  // Step 2: Get purchase → payment_link_id (also verify not refunded)
  const { data: purchase, error: purchaseErr } = await db
    .from("purchases")
    .select("id, payment_link_id, buyer_email, status")
    .eq("id", tokenRow.purchase_id)
    .maybeSingle();

  if (purchaseErr || !purchase?.payment_link_id) return { status: "not_found" };
  if (purchase.status === "refunded") return { status: "not_found" };

  // Step 3: Get content from payment_links
  const { data: link, error: linkErr } = await db
    .from("payment_links")
    .select("title, description, content_type, content_value, file_url, access_type")
    .eq("id", purchase.payment_link_id)
    .maybeSingle();

  if (linkErr || !link) return { status: "not_found" };

  const accessType: string = (link.access_type as string | undefined) ?? "permanent";

  // Step 4: Enforce burn_once
  if (accessType === "burn_once") {
    if (tokenRow.used_at) return { status: "used" };

    // Atomic mark-as-used — only succeeds if used_at is still null
    const { data: burnRows, error: burnErr } = await db
      .from("access_tokens")
      .update({ used_at: new Date().toISOString() })
      .eq("id", tokenRow.id)
      .is("used_at", null)
      .select("id");

    if (burnErr || !burnRows || burnRows.length === 0) return { status: "used" };
  }

  const contentValue =
    link.content_type === "file"
      ? ((link.file_url as string | null) ?? null)
      : ((link.content_value as string | null) ?? null);

  return {
    status:        "ok",
    title:         link.title as string,
    description:   (link.description as string | null) ?? null,
    content_type:  link.content_type as string,
    content_value: contentValue,
    access_type:   accessType,
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ContentBlock({ contentType, contentValue }: { contentType: string; contentValue: string }) {
  if (contentType === "file") {
    const lower = contentValue.toLowerCase();
    const isImage = /\.(png|jpe?g|webp|gif)(\?|$)/i.test(lower);
    const isVideo = /\.(mp4|webm|mov)(\?|$)/i.test(lower);
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <div style={{ ...mono, fontSize: "10px", letterSpacing: "0.14em", color: "rgba(200,169,110,0.6)" }}>
          UNLOCKED FILE
        </div>
        {isImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={contentValue}
            alt="Unlocked content"
            style={{ width: "100%", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.08)" }}
          />
        )}
        {isVideo && (
          <video
            controls
            src={contentValue}
            style={{ width: "100%", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.08)" }}
          />
        )}
        <a
          href={contentValue}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            ...mono,
            display: "inline-block",
            padding: "12px 18px",
            background: "var(--gold, #c8a96e)",
            color: "#120c00",
            borderRadius: "8px",
            fontSize: "11px",
            letterSpacing: "0.18em",
            fontWeight: 600,
            textDecoration: "none",
            textAlign: "center",
          }}
        >
          DOWNLOAD FILE
        </a>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <div style={{ ...mono, fontSize: "10px", letterSpacing: "0.14em", color: "rgba(200,169,110,0.6)" }}>
        UNLOCKED CONTENT
      </div>
      <div
        style={{
          padding: "16px",
          background: "rgba(200,169,110,0.04)",
          border: "1px solid rgba(200,169,110,0.18)",
          borderRadius: "8px",
          color: "rgba(255,255,255,0.82)",
          lineHeight: 1.75,
          whiteSpace: "pre-wrap",
          fontSize: "14px",
        }}
      >
        {contentValue}
      </div>
    </div>
  );
}

function StatusPage({ icon, title, message }: { icon: string; title: string; message: string }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#020203",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 20px",
        fontFamily: "var(--font-body, 'Outfit', sans-serif)",
      }}
    >
      <div style={{ ...mono, fontSize: "12px", letterSpacing: "0.35em", color: "rgba(200,169,110,0.55)", marginBottom: "40px" }}>
        MULUK
      </div>
      <div
        style={{
          maxWidth: "400px",
          textAlign: "center",
          background: "#0d0d18",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "16px",
          padding: "32px 24px",
        }}
      >
        <div style={{ fontSize: "32px", marginBottom: "16px" }}>{icon}</div>
        <div style={{ ...disp, fontSize: "22px", color: "rgba(255,255,255,0.85)", marginBottom: "12px" }}>
          {title}
        </div>
        <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)", lineHeight: 1.6 }}>
          {message}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function FanAccessPage({ params }: PageProps) {
  const { token } = await params;

  if (!TOKEN_REGEX.test(token)) notFound();

  const result = await validateAndFetch(token);

  if (result.status === "not_found") notFound();
  if (result.status === "expired") {
    return <StatusPage icon="⏱" title="Link Expired" message="This access link has expired. Contact the creator for a new link." />;
  }
  if (result.status === "used") {
    return <StatusPage icon="🔒" title="Already Accessed" message="This one-time access link has already been used." />;
  }

  // Guard ensures TS narrows to the "ok" variant
  if (result.status !== "ok") notFound();
  const { title, description, content_type, content_value } = result;

  return (
    <>
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }`}</style>
      <div
        style={{
          minHeight: "100vh",
          background: "#020203",
          backgroundImage: "radial-gradient(circle at 60% 10%, rgba(200,169,110,0.07), transparent 45%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 20px",
          fontFamily: "var(--font-body, 'Outfit', sans-serif)",
        }}
      >
        <div style={{ ...mono, fontSize: "12px", letterSpacing: "0.35em", color: "rgba(200,169,110,0.55)", marginBottom: "40px" }}>
          MULUK
        </div>

        <div
          style={{
            width: "100%",
            maxWidth: "520px",
            background: "#0d0d18",
            border: "1px solid rgba(200,169,110,0.35)",
            borderRadius: "16px",
            overflow: "hidden",
            animation: "fadeIn 0.4s ease",
          }}
        >
          {/* Header */}
          <div
            style={{
              width: "100%",
              height: "80px",
              background: "linear-gradient(135deg, rgba(200,169,110,0.18), rgba(200,169,110,0.04))",
              borderBottom: "1px solid rgba(200,169,110,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "rgba(200,169,110,0.55)",
            }}
          >
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <rect x="5" y="11" width="14" height="10" rx="2" />
              <path d="M8 11V7a4 4 0 017.9-.3" strokeLinecap="round" />
            </svg>
          </div>

          <div style={{ padding: "28px 24px" }}>
            {/* Access granted badge */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 14px",
                background: "rgba(80,212,138,0.08)",
                border: "1px solid rgba(80,212,138,0.25)",
                borderRadius: "8px",
                marginBottom: "20px",
              }}
            >
              <span style={{ color: "#50d48a", fontSize: "14px" }}>✓</span>
              <span style={{ ...mono, fontSize: "10px", letterSpacing: "0.12em", color: "#50d48a" }}>
                ACCESS GRANTED — PURCHASE VERIFIED
              </span>
            </div>

            {/* Title + description */}
            <div style={{ ...disp, fontSize: "26px", color: "rgba(255,255,255,0.92)", lineHeight: 1.2, marginBottom: "8px" }}>
              {title}
            </div>
            {description && (
              <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.45)", marginBottom: "20px", lineHeight: 1.6 }}>
                {description}
              </div>
            )}

            {/* Content */}
            <div style={{ marginTop: description ? "0" : "12px" }}>
              {content_value ? (
                <ContentBlock contentType={content_type} contentValue={content_value} />
              ) : (
                <div style={{ ...mono, fontSize: "12px", color: "rgba(255,255,255,0.25)", letterSpacing: "0.12em" }}>
                  CONTENT UNAVAILABLE — CONTACT THE CREATOR
                </div>
              )}
            </div>

            {/* Footer */}
            <div
              style={{
                marginTop: "28px",
                paddingTop: "16px",
                borderTop: "1px solid rgba(255,255,255,0.06)",
                ...mono,
                fontSize: "10px",
                color: "rgba(255,255,255,0.18)",
                letterSpacing: "0.12em",
              }}
            >
              POWERED BY MULUK
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
