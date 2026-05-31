// POST /api/cron/content-generator
// Runs daily. Generates marketing content via OpenRouter and queues it for publish.
// Triggered by cron scheduler with Authorization: Bearer ${CRON_SECRET}

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

const OPENROUTER_API = "https://openrouter.ai/api/v1/chat/completions";
const CONTENT_MODEL = "openai/gpt-4o-mini";

function verifyCronSecret(req: NextRequest): boolean {
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return auth === `Bearer ${secret}`;
}

async function callOpenRouter(prompt: string, systemPrompt: string): Promise<string> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY not configured");

  const res = await fetch(OPENROUTER_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL ?? "https://mansasmoguls.com",
      "X-Title": "Mansas Moguls Content Generator",
    },
    body: JSON.stringify({
      model: CONTENT_MODEL,
      max_tokens: 1200,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenRouter error ${res.status}: ${body}`);
  }

  const json = await res.json() as {
    choices: Array<{ message: { content: string } }>;
  };
  return json.choices[0]?.message?.content ?? "";
}

type ContentItem = {
  platform: string;
  content: string;
  hashtags: string[];
  scheduled_at: string | null;
  status: "pending";
  ai_model: string;
};

function parseTweets(raw: string): string[] {
  return raw
    .split(/\n\s*\n|\n(?=\d+[\)\.])/)
    .map((t) => t.replace(/^\d+[\)\.]\s*/, "").trim())
    .filter((t) => t.length > 10 && t.length <= 280);
}

function extractHashtags(text: string): string[] {
  const matches = text.match(/#\w+/g);
  return matches ? [...new Set(matches)] : [];
}

function stripHashtags(text: string): string {
  return text.replace(/#\w+/g, "").replace(/\s{2,}/g, " ").trim();
}

export async function POST(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createServiceClient();
  const now = new Date();
  const queued: ContentItem[] = [];
  const errors: string[] = [];

  // ── 1. Generate 3 creator-economy tweets ──────────────────────────────────
  try {
    const tweetRaw = await callOpenRouter(
      `Write 3 separate tweets about creator economy insights. Each tweet must:
- Be under 240 characters
- Contain one concrete insight or provocative fact
- Include exactly one relevant hashtag at the end (no hashtag spam)
- Sound like a knowledgeable insider, not a brand account
- Reference real pain points: platform cuts, payment rails, audience ownership

Separate each tweet with a blank line. Number them 1. 2. 3.`,
      "You write sharp, opinionated content for a creator monetization platform called Mansas Moguls. Tone: direct, confident, slightly contrarian. Never use corporate fluff."
    );

    const tweets = parseTweets(tweetRaw);
    for (const tweet of tweets.slice(0, 3)) {
      const hashtags = extractHashtags(tweet);
      queued.push({
        platform: "twitter",
        content: tweet,
        hashtags,
        scheduled_at: null,
        status: "pending",
        ai_model: CONTENT_MODEL,
      });
    }
  } catch (err) {
    errors.push(`tweets: ${err instanceof Error ? err.message : String(err)}`);
  }

  // ── 2. Generate 1 LinkedIn thought-leadership post ─────────────────────────
  try {
    const linkedinRaw = await callOpenRouter(
      `Write a LinkedIn post about creator independence and why the best creators are moving away from ad-revenue dependency. The post should:
- Open with a bold, counterintuitive statement
- Include 2–3 paragraphs of real insight
- End with one clear call-to-action question to drive comments
- Be 150–250 words
- Use minimal formatting — no bullet point overload
- Include 2 hashtags at the very end`,
      "You write thought-leadership content for a creator monetization platform (Mansas Moguls, 88% payouts, crypto rails). Tone: authoritative, founder-level, not salesy."
    );

    const hashtags = extractHashtags(linkedinRaw);
    const content = stripHashtags(linkedinRaw).trim();
    if (content.length > 50) {
      queued.push({
        platform: "linkedin",
        content: linkedinRaw.trim(),
        hashtags,
        scheduled_at: null,
        status: "pending",
        ai_model: CONTENT_MODEL,
      });
    }
  } catch (err) {
    errors.push(`linkedin: ${err instanceof Error ? err.message : String(err)}`);
  }

  // ── 3. Generate email subject line A/B pair ────────────────────────────────
  try {
    const subjectRaw = await callOpenRouter(
      `Generate 2 email subject lines for a waitlist nurture email sent to creators who signed up but haven't applied yet. Requirements:
- Version A: curiosity-driven, creates intrigue
- Version B: urgency or social proof angle
- Each under 55 characters
- No emoji, no ALL CAPS, no clickbait
- Reflect the brand: luxury, exclusive, creator-first

Format exactly as:
A: [subject line]
B: [subject line]`,
      "You write email subject lines for Mansas Moguls, a creator monetization platform. Brand voice: dark luxury, understated confidence, no hype."
    );

    const lineA = subjectRaw.match(/A:\s*(.+)/)?.[1]?.trim();
    const lineB = subjectRaw.match(/B:\s*(.+)/)?.[1]?.trim();

    const abContent = JSON.stringify({ A: lineA ?? "", B: lineB ?? "" });
    if (lineA || lineB) {
      queued.push({
        platform: "email",
        content: abContent,
        hashtags: [],
        scheduled_at: null,
        status: "pending",
        ai_model: CONTENT_MODEL,
      });
    }
  } catch (err) {
    errors.push(`email_subjects: ${err instanceof Error ? err.message : String(err)}`);
  }

  // ── 4. Persist to marketing_content_queue ─────────────────────────────────
  let insertedCount = 0;
  if (queued.length > 0) {
    const { error: insertErr } = await db
      .from("marketing_content_queue")
      .insert(queued.map((item) => ({ ...item, created_at: now.toISOString() })));

    if (insertErr) {
      errors.push(`db_insert: ${insertErr.message}`);
    } else {
      insertedCount = queued.length;
      await db.from("marketing_events").insert({
        event_type: "content_generated",
        metadata: {
          count: insertedCount,
          platforms: queued.map((q) => q.platform),
          model: CONTENT_MODEL,
        },
      });
    }
  }

  return NextResponse.json({
    queued: insertedCount,
    breakdown: {
      twitter: queued.filter((q) => q.platform === "twitter").length,
      linkedin: queued.filter((q) => q.platform === "linkedin").length,
      email: queued.filter((q) => q.platform === "email").length,
    },
    errors: errors.length > 0 ? errors : undefined,
    timestamp: now.toISOString(),
  });
}
