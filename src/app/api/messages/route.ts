import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET - Fetch messages (creator or fan)
export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    const url = new URL(req.url);
    const fanCode = url.searchParams.get("fanCode");
    const asFan = url.searchParams.get("asFan") === "true";

    let query = supabase.from("fan_messages").select("*");

    if (user && !asFan) {
      // Creator view - messages to/from this creator
      query = query.eq("creator_id", user.id);
    } else if (fanCode) {
      // Fan view - messages for this fan code
      query = query.eq("fan_code", fanCode);
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
    const { fanCode, content, asFan } = body;

    if (!fanCode || !content?.trim()) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const messageData: {
      content: string;
      fan_code: string;
      creator_id?: string;
      from_creator?: boolean;
    } = {
      content: content.trim(),
      fan_code: fanCode,
    };

    if (user && !asFan) {
      // Creator sending message
      messageData.creator_id = user.id;
      messageData.from_creator = true;
      
      // Verify fan code belongs to this creator
      const { data: fanData } = await supabase
        .from("fan_codes")
        .select("creator_id")
        .eq("code", fanCode)
        .single();
        
      if (fanData?.creator_id !== user.id) {
        return NextResponse.json({ error: "Invalid fan code" }, { status: 403 });
      }
    } else {
      // Fan sending message (anonymous)
      messageData.from_creator = false;
    }

    const { data: message, error } = await supabase
      .from("fan_messages")
      .insert(messageData)
      .select()
      .single();

    if (error) throw error;

    // Create notification for recipient
    if (message.from_creator) {
      // Notify fan (if they have notifications enabled)
      await supabase.from("notifications").insert({
        user_id: null, // Fan is anonymous
        fan_code: fanCode,
        type: "message",
        message: "New message from creator",
      });
    } else {
      // Notify creator
      const { data: fanData } = await supabase
        .from("fan_codes")
        .select("creator_id")
        .eq("code", fanCode)
        .single();
        
      if (fanData?.creator_id) {
        await supabase.from("notifications").insert({
          user_id: fanData.creator_id,
          type: "message",
          message: `New message from fan ${fanCode.slice(0, 8)}...`,
        });
      }
    }

    return NextResponse.json({ success: true, message });
  } catch (error) {
    console.error("Send message error:", error);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
