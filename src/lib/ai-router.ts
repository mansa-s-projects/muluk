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
  costPer1MInput: number;
  costPer1MOutput: number;
}

// OPTIMIZED MODELS - best quality per dollar on OpenRouter
const MODELS: Record<TaskTier, ModelConfig> = {
  // FAST: GPT-4o-mini - 3x cheaper than 3.5-turbo, much higher quality
  fast: {
    provider: "openrouter",
    model: "openai/gpt-4o-mini",
    maxTokens: 400,
    costPer1MInput: 0.15,   // was $0.50 (70% cheaper)
    costPer1MOutput: 0.60,  // was $1.50 (60% cheaper)
  },
  // BALANCED: Gemini Flash - 90% cheaper than Haiku, excellent quality
  balanced: {
    provider: "openrouter",
    model: "google/gemini-flash-1.5",
    maxTokens: 800,
    costPer1MInput: 0.075,  // was $0.80 (91% cheaper)
    costPer1MOutput: 0.30,  // was $4.00 (93% cheaper)
  },
  // PREMIUM: Claude Sonnet - best quality for complex tasks
  premium: {
    provider: "anthropic",
    model: "claude-3-5-sonnet-20241022",
    maxTokens: 2000,
    costPer1MInput: 3.00,
    costPer1MOutput: 15.00,
  },
};

// Task to tier mapping
export const TASK_TIERS: Record<string, TaskTier> = {
  bio_generation: "fast",
  content_ideas: "fast", // Also use cheap model
  content_creation: "balanced", // Downgraded from premium to save
  price_analysis: "fast", // Downgraded to save
  chat_assistant: "fast",
  image_analysis: "balanced",
};

// Track usage (per request)
export interface UsageInfo {
  task: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
}

interface StreamResponse {
  stream: ReadableStream<Uint8Array>;
  modelUsed: string;
  estimatedCost: number;
  usage: UsageInfo;
}

export class AIRouter {
  private anthropicKey: string | undefined;
  private openRouterKey: string | undefined;
  private usageLog: UsageInfo[] = [];

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
    const tier = TASK_TIERS[taskName] ?? "fast"; // Default to fast to save money
    const config = MODELS[tier];

    // Check API key availability
    if (config.provider === "anthropic" && !this.anthropicKey) {
      throw new Error(`Anthropic API key not configured for task: ${taskName}`);
    }
    if (config.provider === "openrouter" && !this.openRouterKey) {
      if (this.anthropicKey && tier !== "fast") {
        console.log(`[AI Router] Falling back to Anthropic for ${taskName}`);
        return this.streamAnthropic(MODELS.balanced, prompt, systemPrompt, taskName);
      }
      throw new Error(`OpenRouter API key not configured for task: ${taskName}`);
    }

    console.log(`[AI Router] Task: ${taskName} | Tier: ${tier} | Model: ${config.model} | MaxTokens: ${config.maxTokens}`);

    if (config.provider === "openrouter") {
      return this.streamOpenRouter(config, prompt, systemPrompt, taskName);
    } else {
      return this.streamAnthropic(config, prompt, systemPrompt, taskName);
    }
  }

  private async streamOpenRouter(
    config: ModelConfig,
    prompt: string,
    systemPrompt: string | undefined,
    taskName: string
  ): Promise<StreamResponse> {
    const encoder = new TextEncoder();
    const inputTokens = Math.ceil((prompt.length + (systemPrompt?.length || 0)) / 4);
    let outputTokens = 0;

    const stream = new ReadableStream({
      async start(controller) {
        const abortController = new AbortController();
        const timeoutId = setTimeout(() => abortController.abort(), 20000); // Reduced timeout

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
              // Add temperature for consistency (saves tokens on retries)
              temperature: 0.7,
            }),
          });

          clearTimeout(timeoutId);

          if (!res.ok || !res.body) {
            const errorText = await res.text().catch(() => "Unknown error");
            console.error("[OpenRouter] API error:", res.status, errorText);
            controller.enqueue(
              encoder.encode(`Error (${res.status}): ${errorText.slice(0, 200)}`)
            );
            controller.close();
            return;
          }

          const reader = res.body.getReader();
          const dec = new TextDecoder();
          let buffer = "";
          let tokenCount = 0;

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
                const text = json.choices?.[0]?.delta?.content;
                if (text && typeof text === "string") {
                  tokenCount += Math.ceil(text.length / 4);
                  outputTokens = tokenCount;
                  controller.enqueue(encoder.encode(text));
                  
                  // Safety: stop if exceeding max tokens
                  if (tokenCount >= config.maxTokens) {
                    controller.close();
                    return;
                  }
                }
              } catch {}
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
                    outputTokens += Math.ceil(text.length / 4);
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
            controller.enqueue(encoder.encode("Generation failed."));
          }
          controller.close();
        }
      },
    });

    const estimatedCost = (inputTokens / 1_000_000) * config.costPer1MInput + 
                         (outputTokens / 1_000_000) * config.costPer1MOutput;

    const usage: UsageInfo = {
      task: taskName,
      model: config.model,
      inputTokens,
      outputTokens,
      estimatedCost: Math.max(estimatedCost, 0.00001),
    };

    this.usageLog.push(usage);
    console.log(`[AI Router] Usage: ${inputTokens} in / ${outputTokens} out tokens, ~$${estimatedCost.toFixed(6)}`);

    return { stream, modelUsed: config.model, estimatedCost, usage };
  }

  private async streamAnthropic(
    config: ModelConfig,
    prompt: string,
    systemPrompt: string | undefined,
    taskName: string
  ): Promise<StreamResponse> {
    const encoder = new TextEncoder();
    const inputTokens = Math.ceil((prompt.length + (systemPrompt?.length || 0)) / 4);
    let outputTokens = 0;

    const stream = new ReadableStream({
      async start(controller) {
        const abortController = new AbortController();
        const timeoutId = setTimeout(() => abortController.abort(), 20000);

        const processSseLine = (line: string) => {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data: ")) return;
          const data = trimmed.slice(6);
          if (data === "[DONE]") return;
          try {
            const json = JSON.parse(data);
            if (json.type === "content_block_delta" && json.delta?.type === "text_delta") {
              const text = json.delta.text;
              outputTokens += Math.ceil(text.length / 4);
              controller.enqueue(encoder.encode(text));
            }
          } catch {}
        };

        try {
          const body: Record<string, unknown> = {
            model: config.model,
            max_tokens: config.maxTokens,
            stream: true,
            messages: [{ role: "user", content: prompt }],
            temperature: 0.7,
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

    const estimatedCost = (inputTokens / 1_000_000) * config.costPer1MInput + 
                         (outputTokens / 1_000_000) * config.costPer1MOutput;

    const usage: UsageInfo = {
      task: taskName,
      model: config.model,
      inputTokens,
      outputTokens,
      estimatedCost: Math.max(estimatedCost, 0.00001),
    };

    this.usageLog.push(usage);

    return { stream, modelUsed: config.model, estimatedCost, usage };
  }

  getStatus() {
    return {
      anthropic: !!this.anthropicKey,
      openrouter: !!this.openRouterKey,
    };
  }

  getUsageLog(): UsageInfo[] {
    return [...this.usageLog];
  }

  getTotalCost(): number {
    return this.usageLog.reduce((sum, u) => sum + u.estimatedCost, 0);
  }
}

export const aiRouter = new AIRouter();
