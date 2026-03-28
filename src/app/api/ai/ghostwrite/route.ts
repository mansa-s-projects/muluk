import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_TIMEOUT_MS = Number(process.env.ANTHROPIC_TIMEOUT_MS) || 30_000;
const MAX_PROMPT_LENGTH = 2_000;

// Simple in-memory per-user rate limiter (resets on server restart)
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
    // Authentication
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limiting
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

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error("Ghostwrite: ANTHROPIC_API_KEY is not configured");
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ANTHROPIC_TIMEOUT_MS);

    let upstream: Response;
    try {
      upstream = await fetch(ANTHROPIC_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-3-5-sonnet-latest",
          max_tokens: 900,
          stream: true,
          system:
            "You are a ghostwriter for this creator. Match their dark luxury brand voice. Write engaging content for their fans. Be bold, mysterious, direct.",
          messages: [{ role: "user", content: prompt }],
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
      console.error("Anthropic upstream error:", upstream.status, msg);
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

            const chunks = buffer.split("\n\n");
            buffer = chunks.pop() ?? "";

            for (const chunk of chunks) {
              const lines = chunk.split("\n");
              const dataLine = lines.find(line => line.startsWith("data:"));
              if (!dataLine) continue;

              const json = dataLine.slice(5).trim();
              if (!json || json === "[DONE]") continue;

              try {
                const event = JSON.parse(json) as {
                  type?: string;
                  delta?: { text?: string };
                };

                if (event.type === "content_block_delta" && event.delta?.text) {
                  controller.enqueue(encoder.encode(event.delta.text));
                }
              } catch {
                // Ignore malformed SSE chunks.
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
