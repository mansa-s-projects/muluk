import { NextResponse } from "next/server";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { prompt?: string };
    const prompt = (body.prompt ?? "").trim();

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "ANTHROPIC_API_KEY is missing" }, { status: 500 });
    }

    const upstream = await fetch(ANTHROPIC_URL, {
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
    });

    if (!upstream.ok || !upstream.body) {
      const msg = await upstream.text();
      return NextResponse.json({ error: msg || "Claude request failed" }, { status: 502 });
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
