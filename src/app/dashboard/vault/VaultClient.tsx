"use client";

import { useState, useRef, useCallback } from "react";

interface VaultItem {
  id: string;
  title: string;
  description: string | null;
  price_cents: number;
  content_type: "image" | "video";
  preview_path: string | null;
  status: "active" | "draft";
  purchase_count: number;
  created_at: string;
}

interface Props {
  creatorId: string;
  handle: string;
  initialItems: VaultItem[];
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

function previewUrl(path: string | null) {
  if (!path) return null;
  return `${SUPABASE_URL}/storage/v1/object/public/vault-previews/${path}`;
}

function formatPrice(cents: number) {
  if (cents % 100 === 0) return `$${cents / 100}`;
  return `$${(cents / 100).toFixed(2)}`;
}

export default function VaultClient({ creatorId, handle, initialItems }: Props) {
  const [items, setItems] = useState<VaultItem[]>(initialItems);
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priceDollars, setPriceDollars] = useState("10");
  const [contentType, setContentType] = useState<"image" | "video">("image");
  const [file, setFile] = useState<File | null>(null);
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [status, setStatus] = useState<"active" | "draft">("active");

  const fileRef = useRef<HTMLInputElement>(null);
  const thumbRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const dropped = e.dataTransfer.files[0];
      if (!dropped) return;
      const isVideo = dropped.type.startsWith("video/");
      setContentType(isVideo ? "video" : "image");
      setFile(dropped);
    },
    []
  );

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setPriceDollars("10");
    setContentType("image");
    setFile(null);
    setThumbnail(null);
    setStatus("active");
    setUploadError("");
    if (fileRef.current) fileRef.current.value = "";
    if (thumbRef.current) thumbRef.current.value = "";
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) { setUploadError("Please select a file."); return; }
    if (contentType === "video" && !thumbnail) {
      setUploadError("Please upload a thumbnail image for video content.");
      return;
    }

    const priceCents = Math.round(parseFloat(priceDollars) * 100);
    if (isNaN(priceCents) || priceCents < 100) {
      setUploadError("Minimum price is $1.00");
      return;
    }

    setUploading(true);
    setUploadError("");

    const form = new FormData();
    form.append("file", file);
    form.append("title", title);
    form.append("description", description);
    form.append("price_cents", String(priceCents));
    form.append("content_type", contentType);
    form.append("status", status);
    if (thumbnail) form.append("thumbnail", thumbnail);

    try {
      const res = await fetch("/api/vault/upload", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Upload failed");
      setItems((prev) => [json.item, ...prev]);
      setShowUpload(false);
      resetForm();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const toggleStatus = async (item: VaultItem) => {
    const newStatus = item.status === "active" ? "draft" : "active";
    if (togglingId === item.id) return;
    setTogglingId(item.id);
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: newStatus } : i)));
    try {
      const res = await fetch(`/api/vault/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        throw new Error(`Failed to update item (${res.status})`);
      }
    } catch (error) {
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: item.status } : i)));
      alert(error instanceof Error ? error.message : "Failed to update item");
    } finally {
      setTogglingId(null);
    }
  };

  const deleteItem = async (itemId: string) => {
    if (!confirm("Delete this vault item? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/vault/${itemId}`, { method: "DELETE" });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error ?? `Failed to delete item (${res.status})`);
      }
      setItems((prev) => prev.filter((i) => i.id !== itemId));
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to delete item");
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--void)" }}>
      {/* ── Header ── */}
      <div
        style={{
          borderBottom: "1px solid var(--rim)",
          padding: "28px 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              color: "var(--gold-dim)",
              marginBottom: 8,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <span style={{ display: "block", width: 20, height: 1, background: "var(--gold-dim)" }} />
            Content Vault
          </div>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 300,
              fontSize: 30,
              color: "var(--white)",
              margin: 0,
            }}
          >
            Vault
          </h1>
          <p style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--muted)", margin: "6px 0 0" }}>
            Lock premium content behind blurred previews. Fans pay to unlock.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {handle && (
            <a
              href={`/vault/${handle}`}
              target="_blank"
              rel="noreferrer"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "var(--muted)",
                border: "1px solid var(--rim2)",
                borderRadius: 3,
                padding: "10px 18px",
                textDecoration: "none",
                transition: "color 0.2s, border-color 0.2s",
              }}
            >
              Preview Page
            </a>
          )}
          <button
            onClick={() => setShowUpload(true)}
            style={{
              background: "var(--gold)",
              color: "#0a0800",
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              fontWeight: 500,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              padding: "12px 22px",
              border: "none",
              borderRadius: 3,
              cursor: "pointer",
            }}
          >
            + Add Item
          </button>
        </div>
      </div>

      {/* ── Upload Modal ── */}
      {showUpload && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(2,2,3,0.88)",
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
          onClick={(e) => { if (e.target === e.currentTarget) { setShowUpload(false); resetForm(); } }}
        >
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--rim2)",
              borderRadius: 10,
              width: "100%",
              maxWidth: 560,
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            {/* modal header */}
            <div
              style={{
                padding: "22px 28px",
                borderBottom: "1px solid var(--rim)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 300, color: "var(--white)" }}>
                New Vault Item
              </span>
              <button
                onClick={() => { setShowUpload(false); resetForm(); }}
                style={{ background: "none", border: "none", color: "var(--dim)", fontSize: 18, cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpload} style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 18 }}>
              {/* Content Type toggle */}
              <div style={{ display: "flex", gap: 8 }}>
                {(["image", "video"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setContentType(t)}
                    style={{
                      flex: 1,
                      padding: "10px",
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                      border: `1px solid ${contentType === t ? "rgba(200,169,110,0.5)" : "var(--rim2)"}`,
                      borderRadius: 3,
                      background: contentType === t ? "var(--gold-glow)" : "transparent",
                      color: contentType === t ? "var(--gold)" : "var(--dim)",
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                  >
                    {t === "image" ? "📷 Image" : "🎬 Video"}
                  </button>
                ))}
              </div>

              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                style={{
                  border: `2px dashed ${dragOver ? "rgba(200,169,110,0.6)" : "var(--rim2)"}`,
                  borderRadius: 6,
                  padding: "28px 20px",
                  textAlign: "center",
                  cursor: "pointer",
                  background: dragOver ? "var(--gold-trace)" : "rgba(255,255,255,0.01)",
                  transition: "all 0.2s",
                }}
              >
                {file ? (
                  <div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--gold)", marginBottom: 4 }}>
                      {file.name}
                    </div>
                    <div style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--dim)" }}>
                      {(file.size / 1024 / 1024).toFixed(1)} MB
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>⬆</div>
                    <div style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--muted)" }}>
                      Drag & drop or click to select
                    </div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--dim)", marginTop: 6, letterSpacing: "0.1em" }}>
                      {contentType === "image" ? "JPG · PNG · WEBP · up to 50MB" : "MP4 · MOV · up to 500MB"}
                    </div>
                  </div>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept={contentType === "image" ? "image/*" : "video/*"}
                style={{ display: "none" }}
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />

              {/* Thumbnail for video */}
              {contentType === "video" && (
                <div>
                  <label style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--muted)", display: "block", marginBottom: 8 }}>
                    Thumbnail Image *
                  </label>
                  <div
                    onClick={() => thumbRef.current?.click()}
                    style={{
                      border: "1px solid var(--rim2)",
                      borderRadius: 3,
                      padding: "10px 14px",
                      cursor: "pointer",
                      fontFamily: "var(--font-body)",
                      fontSize: 13,
                      color: thumbnail ? "var(--white)" : "var(--dim)",
                    }}
                  >
                    {thumbnail ? thumbnail.name : "Select thumbnail image…"}
                  </div>
                  <input
                    ref={thumbRef}
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={(e) => setThumbnail(e.target.files?.[0] ?? null)}
                  />
                </div>
              )}

              {/* Title */}
              <div>
                <label style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--muted)", display: "block", marginBottom: 8 }}>
                  Title *
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  placeholder="Behind-the-scenes exclusive…"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid var(--rim2)",
                    borderRadius: 3,
                    color: "var(--white)",
                    fontFamily: "var(--font-body)",
                    fontSize: 14,
                    fontWeight: 300,
                    padding: "12px 16px",
                    width: "100%",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {/* Description */}
              <div>
                <label style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--muted)", display: "block", marginBottom: 8 }}>
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="What fans get when they unlock…"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid var(--rim2)",
                    borderRadius: 3,
                    color: "var(--white)",
                    fontFamily: "var(--font-body)",
                    fontSize: 14,
                    fontWeight: 300,
                    padding: "12px 16px",
                    width: "100%",
                    outline: "none",
                    resize: "vertical",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {/* Price + Status row */}
              <div className="dash-2col-14">
                <div>
                  <label style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--muted)", display: "block", marginBottom: 8 }}>
                    Price (USD) *
                  </label>
                  <div style={{ position: "relative" }}>
                    <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--gold)", fontFamily: "var(--font-mono)", fontSize: 13 }}>$</span>
                    <input
                      value={priceDollars}
                      onChange={(e) => setPriceDollars(e.target.value)}
                      type="number"
                      min="1"
                      step="0.01"
                      required
                      style={{
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid var(--rim2)",
                        borderRadius: 3,
                        color: "var(--white)",
                        fontFamily: "var(--font-mono)",
                        fontSize: 14,
                        padding: "12px 16px 12px 30px",
                        width: "100%",
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                </div>
                <div>
                  <label style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--muted)", display: "block", marginBottom: 8 }}>
                    Visibility
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as "active" | "draft")}
                    style={{
                      background: "var(--card)",
                      border: "1px solid var(--rim2)",
                      borderRadius: 3,
                      color: "var(--white)",
                      fontFamily: "var(--font-body)",
                      fontSize: 13,
                      padding: "12px 16px",
                      width: "100%",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  >
                    <option value="active">Active — visible</option>
                    <option value="draft">Draft — hidden</option>
                  </select>
                </div>
              </div>

              {uploadError && (
                <div style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--red)", background: "var(--red-d)", border: "1px solid rgba(224,85,85,0.25)", borderRadius: 3, padding: "10px 14px" }}>
                  {uploadError}
                </div>
              )}

              <button
                type="submit"
                disabled={uploading}
                style={{
                  background: uploading ? "var(--gold-dim)" : "var(--gold)",
                  color: "#0a0800",
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  fontWeight: 500,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  padding: "14px",
                  border: "none",
                  borderRadius: 3,
                  cursor: uploading ? "not-allowed" : "pointer",
                  transition: "opacity 0.2s",
                }}
              >
                {uploading ? "Uploading…" : "Upload to Vault"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Content ── */}
      <div style={{ padding: "32px" }}>
        {items.length === 0 ? (
          <div
            style={{
              border: "1px dashed var(--rim2)",
              borderRadius: 10,
              padding: "64px 32px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 40, marginBottom: 16 }}>🔒</div>
            <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 300, fontSize: 26, color: "var(--white)", margin: "0 0 10px" }}>
              Your vault is empty
            </h2>
            <p style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--muted)", margin: "0 0 24px" }}>
              Upload exclusive content that fans can unlock for a one-time fee.
            </p>
            <button
              onClick={() => setShowUpload(true)}
              style={{
                background: "var(--gold)",
                color: "#0a0800",
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                fontWeight: 500,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                padding: "12px 28px",
                border: "none",
                borderRadius: 3,
                cursor: "pointer",
              }}
            >
              Upload First Item
            </button>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: 20,
            }}
          >
            {items.map((item) => {
              const pUrl = previewUrl(item.preview_path);
              return (
                <div
                  key={item.id}
                  style={{
                    background: "var(--card)",
                    border: "1px solid var(--rim)",
                    borderRadius: 10,
                    overflow: "hidden",
                    transition: "border-color 0.2s",
                  }}
                >
                  {/* Preview image */}
                  <div style={{ position: "relative", aspectRatio: "16/9", background: "var(--ink)" }}>
                    {pUrl ? (
                      <img
                        src={pUrl}
                        alt={item.title}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--dim)", fontSize: 28 }}>
                        {item.content_type === "video" ? "🎬" : "🖼"}
                      </div>
                    )}
                    {/* Status badge */}
                    <div
                      style={{
                        position: "absolute",
                        top: 10,
                        right: 10,
                        fontFamily: "var(--font-mono)",
                        fontSize: 9,
                        letterSpacing: "0.18em",
                        textTransform: "uppercase",
                        padding: "4px 10px",
                        borderRadius: 100,
                        border: `1px solid ${item.status === "active" ? "rgba(80,212,138,0.4)" : "var(--rim2)"}`,
                        background: item.status === "active" ? "rgba(80,212,138,0.12)" : "rgba(255,255,255,0.05)",
                        color: item.status === "active" ? "var(--green)" : "var(--dim)",
                      }}
                    >
                      {item.status}
                    </div>
                  </div>

                  {/* Meta */}
                  <div style={{ padding: "16px 18px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                      <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 400, fontSize: 17, color: "var(--white)", margin: 0, lineHeight: 1.3, flex: 1 }}>
                        {item.title}
                      </h3>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 14, color: "var(--gold)", marginLeft: 12, whiteSpace: "nowrap" }}>
                        {formatPrice(item.price_cents)}
                      </span>
                    </div>
                    {item.description && (
                      <p style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--muted)", margin: "0 0 12px", lineHeight: 1.5 }}>
                        {item.description.slice(0, 80)}{item.description.length > 80 ? "…" : ""}
                      </p>
                    )}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--dim)" }}>
                        {item.purchase_count} unlock{item.purchase_count !== 1 ? "s" : ""}
                      </span>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          disabled={togglingId === item.id}
                          onClick={() => toggleStatus(item)}
                          style={{
                            background: "none",
                            border: "1px solid var(--rim2)",
                            borderRadius: 3,
                            color: "var(--muted)",
                            fontFamily: "var(--font-mono)",
                            fontSize: 9,
                            letterSpacing: "0.12em",
                            textTransform: "uppercase",
                            padding: "6px 10px",
                            cursor: togglingId === item.id ? "not-allowed" : "pointer",
                            opacity: togglingId === item.id ? 0.6 : 1,
                          }}
                        >
                          {item.status === "active" ? "Draft" : "Activate"}
                        </button>
                        <button
                          onClick={() => deleteItem(item.id)}
                          style={{
                            background: "none",
                            border: "1px solid rgba(224,85,85,0.25)",
                            borderRadius: 3,
                            color: "var(--red)",
                            fontFamily: "var(--font-mono)",
                            fontSize: 9,
                            letterSpacing: "0.12em",
                            textTransform: "uppercase",
                            padding: "6px 10px",
                            cursor: "pointer",
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
