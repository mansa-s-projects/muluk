import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { assertFeatureAccess, TierGateError, tierGatePayload } from "@/lib/tiers";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const TIMEOUT_MS = Number(process.env.OPENROUTER_TIMEOUT_MS) || 30_000;
const MAX_PROMPT_LENGTH = 2_000;

// Rate limiter
const rateLimitMap = new Map<string, { count: number; reset: number }>();
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60_000;

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.reset) {
    rateLimitMap.set(key, { count: 1, reset: now + RATE_WINDOW_MS });
    return false;
  }
  if (entry.count >= RATE_LIMIT) return true;
  entry.count++;
  return false;
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ── Tier gate: ai_tools requires legend+ ────────────────────────────────
    try {
      await assertFeatureAccess(user.id, "ai_tools", supabase);
    } catch (e) {
      if (e instanceof TierGateError) return NextResponse.json(tierGatePayload(e), { status: 403 });
      throw e;
    }

    if (isRateLimited(user.id)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = (await req.json()) as { prompt?: string };
    const prompt = (body.prompt ?? "").trim();

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    if (prompt.length > MAX_PROMPT_LENGTH) {
      return NextResponse.json(
        { error: `Prompt must be ${MAX_PROMPT_LENGTH.toLocaleString()} characters or fewer` },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      console.error("Ghostwrite: OPENROUTER_API_KEY is not configured");
      return NextResponse.json({ error: "AI not configured" }, { status: 500 });
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    let upstream: Response;
    try {
      upstream = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
          "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "https://cipher.so",
          "X-Title": "CIPHER Platform",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          max_tokens: 800,
          stream: true,
          messages: [
            {
              role: "system",
              content: "You are a ghostwriter for this creator. Match their dark luxury brand voice. Write engaging content for their fans. Be bold, mysterious, direct."
            },
            { role: "user", content: prompt }
          ],
        }),
        signal: controller.signal,
      });
    } catch (fetchErr) {
      clearTimeout(timer);
      if (fetchErr instanceof Error && fetchErr.name === "AbortError") {
        return NextResponse.json({ error: "Request timed out" }, { status: 504 });
      }
      throw fetchErr;
    }
    clearTimeout(timer);

    if (!upstream.ok || !upstream.body) {
      const msg = await upstream.text();
      console.error("OpenRouter upstream error:", upstream.status, msg);
      return NextResponse.json({ error: "Upstream service error" }, { status: 502 });
    }

    const decoder = new TextDecoder();
    const encoder = new TextEncoder();

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const reader = upstream.body!.getReader();
        let buffer = "";

        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed.startsWith("data: ")) continue;
              const data = trimmed.slice(6);
              if (data === "[DONE]") continue;

              try {
                const json = JSON.parse(data);
                const text = json.choices?.[0]?.delta?.content;
                if (text && typeof text === "string") {
                  controller.enqueue(encoder.encode(text));
                }
              } catch {
                // Ignore malformed chunks
              }
            }
          }
        } catch (err) {
          console.error("Ghostwrite stream error:", err);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("Ghostwrite route failed:", err);
    return NextResponse.json({ error: "Request failed" }, { status: 500 });
  }
}
