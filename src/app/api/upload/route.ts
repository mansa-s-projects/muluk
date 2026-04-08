import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const folder = formData.get("folder") as string || "content";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = [
      "image/jpeg", "image/png", "image/webp", "image/gif",
      "video/mp4", "video/quicktime", "video/webm",
      "audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg", "audio/aac", "audio/x-m4a", "audio/mp4",
      "text/plain",
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: `File type not allowed: ${file.type}` }, { status: 400 });
    }

    // Validate file size (100MB max)
    if (file.size > 100 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 100MB)" }, { status: 400 });
    }

    // Generate unique filename
    const ext = file.name.split(".").pop();
    const filename = `${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
    const path = `${user.id}/${folder}/${filename}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("creator-content")
      .upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload storage error:", uploadError);
      throw new Error("File upload failed");
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from("creator-content")
      .getPublicUrl(path);

    return NextResponse.json({ 
      success: true, 
      url: publicUrl,
      path,
      filename: file.name,
      size: file.size,
      type: file.type,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "File upload failed" }, { status: 500 });
  }
}
