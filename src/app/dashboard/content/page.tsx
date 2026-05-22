import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ContentManager } from "./ContentManager";

export default async function ContentPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect("/login");
  }

  // Fetch content items
  const { data: contentItems } = await supabase
    .from("content_items")
    .select("*")
    .eq("creator_id", user.id)
    .order("created_at", { ascending: false });

  // Fetch fan codes for content restriction
  const { data: fanCodes } = await supabase
    .from("fan_codes")
    .select("code, custom_name")
    .eq("creator_id", user.id)
    .eq("status", "active");

  const formattedContent = (contentItems || []).map(item => ({
    id: item.id,
    title: item.title,
    description: item.description || "",
    type: item.type || "image",
    status: item.status || "draft",
    price: item.price || 0,
    isFree: item.is_free || false,
    burnMode: item.burn_mode || false,
    expiresAt: item.expires_at,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
    thumbnailUrl: item.thumbnail_url,
    fileUrl: item.file_url,
    accessCount: item.access_count || 0,
    earnings: item.earnings || 0,
    tags: item.tags || [],
    fanCodes: item.fan_codes || [],
  }));

  return (
    <div style={{ padding: "32px", minHeight: "100vh", background: "#020203" }}>
      <ContentManager 
        userId={user.id}
        initialContent={formattedContent}
        fanCodes={(fanCodes || []).map(fc => ({ code: fc.code, custom_name: fc.custom_name }))}
      />
    </div>
  );
}
