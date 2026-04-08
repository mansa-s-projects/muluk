/**
 * POST /api/vault/upload
 *
 * Creator uploads content (image or video).
 * - Image: blurs + watermarks via sharp, stores preview in vault-previews
 * - Video: accepts a separate thumbnail which is blurred for preview
 * - Original stored in vault-originals (private)
 * - Inserts vault_item record
 *
 * Requires: authenticated creator session
 * Body: multipart/form-data
 *   file        — original media file (required)
 *   thumbnail   — thumbnail image for video (required if content_type=video)
 *   title       — string (required)
 *   description — string (optional)
 *   price_cents — integer (required, min 50)
 *   status      — 'active' | 'draft' (default: 'active')
 */

import { NextResponse } from "next/server";
import { createClient }  from "@/lib/supabase/server";
import {
  generateBlurredPreview,
  getServiceSupabase,
  VAULT_ORIGINALS_BUCKET,
  VAULT_PREVIEWS_BUCKET,
} from "@/lib/vault";

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg", "image/png", "image/webp", "image/gif",
]);
const ALLOWED_VIDEO_TYPES = new Set([
  "video/mp4", "video/webm", "video/quicktime", "video/x-msvideo",
]);
const MAX_ORIGINAL_BYTES = 200 * 1024 * 1024; // 200 MB
const MAX_THUMB_BYTES    = 10  * 1024 * 1024; // 10 MB

export async function POST(req: Request) {
  // ── Auth ───────────────────────────────────────────────────────────────────
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Parse multipart form ────────────────────────────────────────────────────
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid multipart body" }, { status: 400 });
  }

  const file        = formData.get("file") as File | null;
  const thumbnail   = formData.get("thumbnail") as File | null;
  const title       = (formData.get("title") as string | null)?.trim() ?? "";
  const description = (formData.get("description") as string | null)?.trim() || null;
  const priceCentsRaw = formData.get("price_cents");
  const statusRaw   = (formData.get("status") as string | null) ?? "active";

  // ── Validate inputs ─────────────────────────────────────────────────────────
  if (!file) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }
  if (!title || title.length < 1) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }
  const priceCents = Number(priceCentsRaw);
  if (!Number.isInteger(priceCents) || priceCents < 50) {
    return NextResponse.json({ error: "price_cents must be an integer ≥ 50" }, { status: 400 });
  }
  if (!["active", "draft"].includes(statusRaw)) {
    return NextResponse.json({ error: "status must be active or draft" }, { status: 400 });
  }

  const isImage = ALLOWED_IMAGE_TYPES.has(file.type);
  const isVideo = ALLOWED_VIDEO_TYPES.has(file.type);

  if (!isImage && !isVideo) {
    return NextResponse.json(
      { error: `Unsupported file type: ${file.type}` },
      { status: 400 }
    );
  }
  if (file.size > MAX_ORIGINAL_BYTES) {
    return NextResponse.json({ error: "File exceeds 200 MB limit" }, { status: 413 });
  }

  if (isVideo && !thumbnail) {
    return NextResponse.json(
      { error: "thumbnail is required for video uploads" },
      { status: 400 }
    );
  }
  if (thumbnail && thumbnail.size > MAX_THUMB_BYTES) {
    return NextResponse.json({ error: "Thumbnail exceeds 10 MB limit" }, { status: 413 });
  }
  if (thumbnail && !ALLOWED_IMAGE_TYPES.has(thumbnail.type)) {
    return NextResponse.json({ error: "Thumbnail must be an image" }, { status: 400 });
  }

  // ── Read file bytes ─────────────────────────────────────────────────────────
  const originalBuffer = Buffer.from(await file.arrayBuffer());

  // For image: blur the original. For video: blur the thumbnail.
  const previewSourceBuffer = isImage
    ? originalBuffer
    : Buffer.from(await thumbnail!.arrayBuffer());
  const previewMimeType = isImage ? file.type : thumbnail!.type;

  let previewBuffer: Buffer;
  try {
    previewBuffer = await generateBlurredPreview(previewSourceBuffer, previewMimeType);
  } catch (err) {
    console.error("[vault/upload] generateBlurredPreview failed:", err);
    return NextResponse.json({ error: "Failed to generate preview" }, { status: 500 });
  }

  // ── Upload to Supabase Storage ──────────────────────────────────────────────
  const db       = getServiceSupabase();
  const stamp    = Date.now();
  const ext      = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  const filePath = `${user.id}/${stamp}.${ext}`;
  const previewPath = `${user.id}/${stamp}_preview.jpg`;

  const [originalUpload, previewUpload] = await Promise.all([
    db.storage
      .from(VAULT_ORIGINALS_BUCKET)
      .upload(filePath, originalBuffer, {
        contentType: file.type,
        upsert: false,
      }),
    db.storage
      .from(VAULT_PREVIEWS_BUCKET)
      .upload(previewPath, previewBuffer, {
        contentType: "image/jpeg",
        upsert: false,
      }),
  ]);

  if (originalUpload.error) {
    console.error("[vault/upload] original upload failed:", originalUpload.error.message);
    // If bucket doesn't exist, give a clearer error
    if (originalUpload.error.message.includes("Bucket not found")) {
      return NextResponse.json(
        { error: `Storage bucket '${VAULT_ORIGINALS_BUCKET}' not found. Create it in Supabase Dashboard → Storage.` },
        { status: 500 }
      );
    }
    return NextResponse.json({ error: "Failed to upload original file" }, { status: 500 });
  }
  if (previewUpload.error) {
    // Rollback original
    await db.storage.from(VAULT_ORIGINALS_BUCKET).remove([filePath]);
    console.error("[vault/upload] preview upload failed:", previewUpload.error.message);
    return NextResponse.json({ error: "Failed to upload preview" }, { status: 500 });
  }

  // ── Insert vault_item record ────────────────────────────────────────────────
  const { data: item, error: insertErr } = await db
    .from("vault_items")
    .insert({
      creator_id:      user.id,
      title,
      description,
      price_cents:     priceCents,
      content_type:    isImage ? "image" : "video",
      file_path:       filePath,
      preview_path:    previewPath,
      file_size_bytes: file.size,
      mime_type:       file.type,
      status:          statusRaw,
    })
    .select("id, title, price_cents, content_type, preview_path, status")
    .single();

  if (insertErr || !item) {
    // Rollback storage
    await Promise.all([
      db.storage.from(VAULT_ORIGINALS_BUCKET).remove([filePath]),
      db.storage.from(VAULT_PREVIEWS_BUCKET).remove([previewPath]),
    ]);
    return NextResponse.json({ error: "Failed to create vault item" }, { status: 500 });
  }

  return NextResponse.json({ item }, { status: 201 });
}
