import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET - Fetch messages (creator or supporter)
export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    const url = new URL(req.url);
    const SupporterCode = url.searchParams.get("SupporterCode");
    const asSupporter = url.searchParams.get("asSupporter") === "true";

    let query = supabase.from("supporter_messages").select("*");

    if (user && !asSupporter) {
      // Creator view - messages to/from this creator
      query = query.eq("creator_id", user.id);
    } else if (SupporterCode) {
      // Supporter view - messages for this supporter code
      query = query.eq("supporter_code", SupporterCode);
    } else {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: messages, error } = await query
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;

    return NextResponse.json({ messages: messages || [] });
  } catch (error) {
    console.error("Fetch messages error:", error);
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}

// POST - Send message
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    const body = await req.json();
    const { SupporterCode, content, asSupporter } = body;

    if (!SupporterCode || !content?.trim()) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const messageData: {
      content: string;
      supporter_code: string;
      creator_id?: string;
      from_creator?: boolean;
    } = {
      content: content.trim(),
      supporter_code: SupporterCode,
    };

    if (user && !asSupporter) {
      // Creator sending message
      messageData.creator_id = user.id;
      messageData.from_creator = true;
      
      // Verify supporter code belongs to this creator
      const { data: supporterData } = await supabase
        .from("supporter_codes")
        .select("creator_id")
        .eq("code", SupporterCode)
        .single();
        
      if (supporterData?.creator_id !== user.id) {
        return NextResponse.json({ error: "Invalid supporter code" }, { status: 403 });
      }
    } else {
      // Supporter sending message (anonymous)
      messageData.from_creator = false;
    }

    const { data: message, error } = await supabase
      .from("supporter_messages")
      .insert(messageData)
      .select()
      .single();

    if (error) throw error;

    // Create notification for recipient
    if (message.from_creator) {
      // Notify supporter (if they have notifications enabled)
      await supabase.from("notifications").insert({
        user_id: null, // Supporter is anonymous
        supporter_code: SupporterCode,
        type: "message",
        message: "New message from creator",
      });
    } else {
      // Notify creator
      const { data: supporterData } = await supabase
        .from("supporter_codes")
        .select("creator_id")
        .eq("code", SupporterCode)
        .single();
        
      if (supporterData?.creator_id) {
        await supabase.from("notifications").insert({
          user_id: supporterData.creator_id,
          type: "message",
          message: `New message from supporter ${SupporterCode.slice(0, 8)}...`,
        });
      }
    }

    return NextResponse.json({ success: true, message });
  } catch (error) {
    console.error("Send message error:", error);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
