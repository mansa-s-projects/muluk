/**
 * AI Router - Routes tasks to different providers/models based on cost/quality needs
 * 
 * Task tiers:
 * - "fast": Cheap, fast models for simple tasks (bio generation, quick summaries)
 * - "balanced": Good quality at reasonable price (content ideas, descriptions)
 * - "premium": Best quality for complex tasks (content creation, analysis)
 */

export type TaskTier = "fast" | "balanced" | "premium";

interface ModelConfig {
  provider: "anthropic" | "openrouter";
  model: string;
  maxTokens: number;
  costPer1MInput: number;  // USD per 1M input tokens (for logging/budgeting)
  costPer1MOutput: number; // USD per 1M output tokens
}

// Model pricing reference (approximate, check OpenRouter for current rates)
const MODELS: Record<TaskTier, ModelConfig> = {
  // Cheap & fast: ~$0.10-0.30 per 1M tokens
  fast: {
    provider: "openrouter",
    model: "mistralai/mistral-7b-instruct", // Reliable, fast, cheap
    maxTokens: 600,
    costPer1MInput: 0.10,
    costPer1MOutput: 0.30,
  },
  // Balanced: ~$0.50-2.00 per 1M tokens  
  balanced: {
    provider: "openrouter",
    model: "anthropic/claude-3.5-haiku",
    maxTokens: 1500,
    costPer1MInput: 0.80,
    costPer1MOutput: 4.00,
  },
  // Premium: ~$3-15 per 1M tokens
  premium: {
    provider: "anthropic",
    model: "claude-3-5-sonnet-20241022",
    maxTokens: 4000,
    costPer1MInput: 3.00,
    costPer1MOutput: 15.00,
  },
};

// Task to tier mapping - configure which tasks use which tier
export const TASK_TIERS: Record<string, TaskTier> = {
  bio_generation: "fast",      // Simple creative writing, cheap model is fine
  content_ideas: "balanced",   // Needs some creativity but not premium
  content_creation: "premium", // High quality needed
  price_analysis: "balanced",  // Data analysis, balanced is good
  chat_assistant: "balanced",  // Conversational, balanced works well
  image_analysis: "premium",   // Vision tasks need good models
};

interface StreamResponse {
  stream: ReadableStream<Uint8Array>;
  modelUsed: string;
  estimatedCost: number; // Rough estimate for tracking
}

export class AIRouter {
  private anthropicKey: string | undefined;
  private openRouterKey: string | undefined;

  constructor() {
    this.anthropicKey = process.env.ANTHROPIC_API_KEY;
    this.openRouterKey = process.env.OPENROUTER_API_KEY;
  }

  /**
   * Stream a completion for a specific task
   */
  async streamCompletion(
    taskName: string,
    prompt: string,
    systemPrompt?: string
  ): Promise<StreamResponse> {
    const tier = TASK_TIERS[taskName] ?? "balanced";
    const config = MODELS[tier];

    // Check API key availability
    if (config.provider === "anthropic" && !this.anthropicKey) {
      throw new Error(`Anthropic API key not configured for task: ${taskName}`);
    }
    if (config.provider === "openrouter" && !this.openRouterKey) {
      // Fallback to anthropic if openrouter not available
      if (this.anthropicKey && tier !== "fast") {
        console.log(`[AI Router] Falling back to Anthropic for ${taskName}`);
        return this.streamAnthropic(MODELS.premium, prompt, systemPrompt);
      }
      throw new Error(`OpenRouter API key not configured for task: ${taskName}`);
    }

    console.log(`[AI Router] Task: ${taskName} | Tier: ${tier} | Model: ${config.model}`);

    if (config.provider === "openrouter") {
      return this.streamOpenRouter(config, prompt, systemPrompt);
    } else {
      return this.streamAnthropic(config, prompt, systemPrompt);
    }
  }

  private async streamOpenRouter(
    config: ModelConfig,
    prompt: string,
    systemPrompt?: string
  ): Promise<StreamResponse> {
    const encoder = new TextEncoder();
    const inputTokens = Math.ceil(prompt.length / 4); // Rough estimate

    const stream = new ReadableStream({
      async start(controller) {
        const abortController = new AbortController();
        const timeoutId = setTimeout(() => abortController.abort(), 30000);

        try {
          const messages = systemPrompt
            ? [
                { role: "system" as const, content: systemPrompt },
                { role: "user" as const, content: prompt },
              ]
            : [{ role: "user" as const, content: prompt }];

          const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            signal: abortController.signal,
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
              "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
              "X-Title": "CIPHER Platform",
            },
            body: JSON.stringify({
              model: config.model,
              max_tokens: config.maxTokens,
              stream: true,
              messages,
            }),
          });

          clearTimeout(timeoutId);

          if (!res.ok || !res.body) {
            const errorText = await res.text().catch(() => "Unknown error");
            console.error("[OpenRouter] API error:", res.status, errorText);
            controller.enqueue(
              encoder.encode(`Error (${res.status}): ${errorText.slice(0, 500)}`)
            );
            controller.close();
            return;
          }

          const reader = res.body.getReader();
          const dec = new TextDecoder();
          let outputChars = 0;
          let buffer = "";

          while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            buffer += dec.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed.startsWith("data: ")) continue;
              const data = trimmed.slice(6);
              if (data === "[DONE]") continue;

              try {
                const json = JSON.parse(data);
                // OpenRouter format: choices[0].delta.content
                const text = json.choices?.[0]?.delta?.content;
                if (text && typeof text === "string") {
                  outputChars += text.length;
                  controller.enqueue(encoder.encode(text));
                }
              } catch (e) {
                // Ignore parse errors for incomplete chunks
              }
            }
          }

          // Process remaining buffer
          if (buffer.trim()) {
            const trimmed = buffer.trim();
            if (trimmed.startsWith("data: ")) {
              const data = trimmed.slice(6);
              if (data !== "[DONE]") {
                try {
                  const json = JSON.parse(data);
                  const text = json.choices?.[0]?.delta?.content;
                  if (text && typeof text === "string") {
                    controller.enqueue(encoder.encode(text));
                  }
                } catch {}
              }
            }
          }

          controller.close();
        } catch (error) {
          clearTimeout(timeoutId);
          if (error instanceof Error && error.name === "AbortError") {
            controller.enqueue(encoder.encode("Generation timed out."));
          } else {
            console.error("[OpenRouter] Stream error:", error);
            controller.enqueue(encoder.encode(`Generation failed: ${error instanceof Error ? error.message : "Unknown error"}`));
          }
          controller.close();
        }
      },
    });

    // Rough cost estimate (very approximate)
    const estimatedCost = (inputTokens / 1_000_000) * config.costPer1MInput;

    return { stream, modelUsed: config.model, estimatedCost };
  }

  private async streamAnthropic(
    config: ModelConfig,
    prompt: string,
    systemPrompt?: string
  ): Promise<StreamResponse> {
    const encoder = new TextEncoder();
    const inputTokens = Math.ceil(prompt.length / 4);

    const stream = new ReadableStream({
      async start(controller) {
        const abortController = new AbortController();
        const timeoutId = setTimeout(() => abortController.abort(), 30000);

        const processSseLine = (line: string) => {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data: ")) return;
          const data = trimmed.slice(6);
          if (data === "[DONE]") return;
          try {
            const json = JSON.parse(data);
            if (json.type === "content_block_delta" && json.delta?.type === "text_delta") {
              controller.enqueue(encoder.encode(json.delta.text));
            }
          } catch {}
        };

        try {
          const body: Record<string, unknown> = {
            model: config.model,
            max_tokens: config.maxTokens,
            stream: true,
            messages: [{ role: "user", content: prompt }],
          };
          if (systemPrompt) {
            body.system = systemPrompt;
          }

          const res = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            signal: abortController.signal,
            headers: {
              "Content-Type": "application/json",
              "x-api-key": process.env.ANTHROPIC_API_KEY || "",
              "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify(body),
          });

          clearTimeout(timeoutId);

          if (!res.ok || !res.body) {
            const errorText = await res.text().catch(() => "Unknown error");
            console.error("[Anthropic] API error:", res.status, errorText);
            controller.enqueue(
              encoder.encode(`Error (${res.status}): ${errorText.slice(0, 200)}`)
            );
            controller.close();
            return;
          }

          const reader = res.body.getReader();
          const dec = new TextDecoder();
          let buffer = "";

          while (true) {
            const { value, done } = await reader.read();
            if (done) {
              buffer += dec.decode();
              break;
            }
            buffer += dec.decode(value, { stream: true });

            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";
            for (const line of lines) {
              processSseLine(line);
            }
          }

          if (buffer.trim()) {
            processSseLine(buffer);
          }
          controller.close();
        } catch (error) {
          clearTimeout(timeoutId);
          if (error instanceof Error && error.name === "AbortError") {
            controller.enqueue(encoder.encode("Generation timed out."));
          } else {
            controller.enqueue(encoder.encode("Generation failed."));
          }
          controller.close();
        }
      },
    });

    const estimatedCost = (inputTokens / 1_000_000) * config.costPer1MInput;

    return { stream, modelUsed: config.model, estimatedCost };
  }

  /**
   * Get available providers status
   */
  getStatus() {
    return {
      anthropic: !!this.anthropicKey,
      openrouter: !!this.openRouterKey,
    };
  }
}

// Singleton instance
export const aiRouter = new AIRouter();
