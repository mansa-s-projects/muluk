import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendWelcomeEmail, sendEarningsNotification } from "@/lib/notifications/resend";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { type, to, data } = body;

    let emailResult;
    switch (type) {
      case "welcome":
        emailResult = await sendWelcomeEmail({ to, ...data });
        break;
      case "earnings":
        emailResult = await sendEarningsNotification({ to, ...data });
        break;
      default:
        return NextResponse.json({ error: "Unknown notification type" }, { status: 400 });
    }

    // Check for error
    if ('error' in emailResult && emailResult.error) {
      throw new Error(emailResult.error.message);
    }

    const resultData = 'data' in emailResult ? emailResult.data : null;

    // Log notification
    await supabase.from("notifications").insert({
      user_id: user.id,
      type,
      message: `Email sent: ${type}`,
      metadata: { recipient: to, result: resultData },
    });

    return NextResponse.json({ success: true, id: resultData?.id });
  } catch (error) {
    console.error("Notification error:", error);
    return NextResponse.json({ error: "Failed to send notification" }, { status: 500 });
  }
}
