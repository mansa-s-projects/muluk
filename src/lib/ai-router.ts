/**
 * AI Router - OpenRouter Only
 * 
 * All AI requests route through OpenRouter for cost optimization.
 * Models:
 * - "fast": GPT-4o-mini (cheap, fast)
 * - "balanced": Gemini 2.5 Flash Lite (cheap, good quality)
 * - "premium": Claude Sonnet via OpenRouter (best quality)
 */

export type TaskTier = "fast" | "balanced" | "premium";

interface ModelConfig {
  model: string;
  maxTokens: number;
  costPer1MInput: number;
  costPer1MOutput: number;
}

// OPENROUTER ONLY - all models via single provider
const MODELS: Record<TaskTier, ModelConfig> = {
  // FAST: GPT-4o-mini - cheapest OpenAI model
  fast: {
    model: "openai/gpt-4o-mini",
    maxTokens: 400,
    costPer1MInput: 0.15,
    costPer1MOutput: 0.60,
  },
  // BALANCED: Gemini 2.5 Flash Lite - low cost, current stable Google option
  balanced: {
    model: "google/gemini-2.5-flash-lite",
    maxTokens: 800,
    costPer1MInput: 0.10,
    costPer1MOutput: 0.40,
  },
  // PREMIUM: Claude Sonnet via OpenRouter - best quality
  premium: {
    model: "anthropic/claude-3.5-sonnet",
    maxTokens: 2000,
    costPer1MInput: 3.00,
    costPer1MOutput: 15.00,
  },
};

// Task to tier mapping
export const TASK_TIERS: Record<string, TaskTier> = {
  bio_generation: "fast",
  content_ideas: "fast",
  content_creation: "balanced",
  price_analysis: "fast",
  chat_assistant: "fast",
  image_analysis: "balanced",
  caption_generation: "fast",
  handle_generation: "fast",
  niche_recommendation: "fast",
  content_strategy: "balanced",
  welcome_sequence: "balanced",
  reply_suggestions: "fast",
  voice_clone: "premium",
  voice_tts: "balanced",
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
  private openRouterKey: string | undefined;
  private usageLog: UsageInfo[] = [];

  constructor() {
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
    const tier = TASK_TIERS[taskName] ?? "fast";
    const config = MODELS[tier];

    if (!this.openRouterKey) {
      throw new Error(`OpenRouter API key not configured for task: ${taskName}`);
    }

    console.log(`[AI Router] Task: ${taskName} | Tier: ${tier} | Model: ${config.model} | MaxTokens: ${config.maxTokens}`);

    return this.streamOpenRouter(config, prompt, systemPrompt, taskName);
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
        const timeoutId = setTimeout(() => abortController.abort(), 20000);

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
              "X-Title": "MULUK Platform",
            },
            body: JSON.stringify({
              model: config.model,
              max_tokens: config.maxTokens,
              stream: true,
              messages,
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
                  
                  if (tokenCount >= config.maxTokens) {
                    controller.close();
                    return;
                  }
                }
              } catch {}
            }
          }

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

  getStatus() {
    return {
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
