/**
 * generateLaunchCommand — transforms social analytics into an actionable
 * creator launch strategy. Pure function, no DB calls.
 */

import type { SocialAnalysisResult } from "./analyzeSocial";

export type LaunchCommandInput = {
  niche: string;
  sub_niche?: string;
  creator_name?: string;
  strongest_platform: string;
  followers_count: number;
  analysis: SocialAnalysisResult;
};

export type SevenDayStep = {
  day: number;
  action: string;
  platform: string;
  script?: string;
};

export type LaunchCommandOutput = {
  niche: string;
  monetization_opportunity: string;
  primary_channel: string;
  recommended_offer: string;
  recommended_price: number;
  launch_angle: string;
  seven_day_plan: SevenDayStep[];
  dm_script: string;
  launch_caption: string;
  closing_script: string;
  offer_title: string;
  offer_description: string;
  offer_type: "private_community" | "premium_content" | "coaching" | "tutorials" | "vault";
};

// ─── Copy templates ───────────────────────────────────────────────────────────

const OFFER_TYPES: Record<
  LaunchCommandInput["analysis"]["recommended_offer_type"],
  { label: string; description: (niche: string) => string }
> = {
  private_community: {
    label: "Private Community",
    description: (n) => `Exclusive private community for serious ${n} enthusiasts. Direct access, behind-the-scenes content, and a curated circle of people who take it seriously.`,
  },
  premium_content: {
    label: "Premium Content Vault",
    description: (n) => `Exclusive ${n} content you won't find anywhere else — raw footage, detailed breakdowns, and content created specifically for members.`,
  },
  coaching: {
    label: "Private Coaching Access",
    description: (n) => `1-on-1 and small group coaching sessions. Direct access to personalized guidance in ${n} with actionable feedback.`,
  },
  tutorials: {
    label: "Tutorial & Resource Library",
    description: (n) => `Step-by-step tutorials, guides, and templates for ${n}. Everything you need to get results faster.`,
  },
  vault: {
    label: "Creator Vault",
    description: (n) => `The complete ${n} vault — every resource, template, guide, and exclusive piece of content compiled in one place.`,
  },
};

const LAUNCH_ANGLES: Record<
  LaunchCommandInput["analysis"]["recommended_offer_type"],
  string
> = {
  private_community: "Scarcity + founding access — limited founding members at a locked-in rate",
  premium_content: "Exclusive access angle — content that can't be found on public profiles",
  coaching: "Transformation + personal touch — direct access to the creator, not just content",
  tutorials: "ROI angle — specific results and skills gained from following the content",
  vault: "Archive + completeness — everything in one place, always growing",
};

function buildDmScript(
  niche: string,
  price: number,
  platform: string,
  fanPageUrl?: string
): string {
  return `Hey! I just dropped something exclusive I think you'd actually use.

I launched a private ${niche} community — real behind-the-scenes content and direct access that doesn't go on my public ${platform}.

Founding rate is locked at $${price} and I'm keeping slots limited.

Thought of you first. Here's the link: ${fanPageUrl ?? "muluk.vip/[your-handle]"}

No pressure — just wanted you to see it before I open it up.`;
}

function buildLaunchCaption(
  niche: string,
  price: number,
  offer_label: string,
  fanPageUrl?: string
): string {
  const lines = [
    `I've been building this quietly for the real ones.`,
    ``,
    `🔓 My private ${niche} ${offer_label.toLowerCase()} is now open.`,
    ``,
    `Founding members get locked-in pricing at $${price} — once I fill the first cohort, that rate is gone.`,
    ``,
    `This is where I put everything I can't post publicly.`,
    ``,
    `Link in bio${fanPageUrl ? `: ${fanPageUrl}` : "."}.`,
  ];
  return lines.join("\n");
}

function buildClosingScript(
  niche: string,
  price: number,
  fanPageUrl?: string
): string {
  return `Last chance — I'm closing founding access for my private ${niche} community tonight.

You get locked in at $${price} with everything included as long as you stay.

After midnight the rate changes.

${fanPageUrl ?? "muluk.vip/[your-handle]"}`;
}

function buildSevenDayPlan(
  platform: string
): SevenDayStep[] {
  const p = platform.charAt(0).toUpperCase() + platform.slice(1);
  return [
    { day: 1, platform: p, action: `Post a teaser on ${p} — hint that something private is coming without revealing everything. Build curiosity.` },
    { day: 2, platform: p, action: `Share a behind-the-scenes piece of content that shows the value of what you're building. Caption: "This is what I drop in private."` },
    { day: 3, platform: "DM", action: `DM your top 15–20 most engaged followers personally. Use the DM script. Personalize one line per DM.` },
    { day: 4, platform: p, action: `LAUNCH. Post the full launch caption with your payment link. Update your bio link. Drop one piece of exclusive content to members immediately.` },
    { day: 5, platform: "Email/DM", action: `Follow up the DMs from Day 3. Remind them the founding rate closes soon. Send a "last 24 hours" message.` },
    { day: 6, platform: p, action: `Post social proof — a screenshot of member activity, a reaction, or early results (with permission). Continue driving traffic to your link.` },
    { day: 7, platform: "All", action: `Closing message. Use the closing script. Send to everyone who expressed interest but didn't join. Post a final story or post with countdown.` },
  ];
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function generateLaunchCommand(input: LaunchCommandInput): LaunchCommandOutput {
  const { niche, creator_name: _cn, strongest_platform, followers_count, analysis } = input;
  const offerDef    = OFFER_TYPES[analysis.recommended_offer_type];
  const offerType   = analysis.recommended_offer_type;
  const price       = analysis.recommended_price_range.min;
  const launchAngle = LAUNCH_ANGLES[offerType];

  const nLabel = niche.charAt(0).toUpperCase() + niche.slice(1);

  const opportunity =
    `${followers_count.toLocaleString()} ${strongest_platform} followers · ` +
    `${analysis.engagement_rate.toFixed(1)}% engagement · ` +
    `${analysis.high_intent_signal_count} high-intent signals detected`;

  const offerTitle = `${offerDef.label} — ${nLabel}`;

  return {
    niche:                    nLabel,
    monetization_opportunity: opportunity,
    primary_channel:          strongest_platform,
    recommended_offer:        offerDef.label,
    recommended_price:        price,
    launch_angle:             launchAngle,
    seven_day_plan:           buildSevenDayPlan(strongest_platform),
    dm_script:                buildDmScript(nLabel, price, strongest_platform),
    launch_caption:           buildLaunchCaption(nLabel, price, offerDef.label),
    closing_script:           buildClosingScript(nLabel, price),
    offer_title:              offerTitle,
    offer_description:        offerDef.description(nLabel),
    offer_type:               offerType,
  };
}
