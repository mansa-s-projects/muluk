import { analyzeCreatorApplication } from "./analyze-creator";
import type { CreatorApplicationInput } from "./types";

export const MOCK_CREATORS: CreatorApplicationInput[] = [
  {
    name: "Maya Collins",
    email: "maya@example.com",
    primaryPlatform: "instagram",
    handle: "mayafitcoach",
    secondaryPlatforms: ["youtube", "twitter"],
    niche: "fitness coaching",
    bio: "Online coach helping women build strength with science-backed systems.",
    offerDescription: "12-week coaching program + templates + accountability check-ins.",
    audienceSize: "52K",
    monthlyEarnings: "$12K",
    reasonForJoining: "Launch a premium recurring membership and scale predictable monthly revenue.",
  },
  {
    name: "Omar Vega",
    email: "omar@example.com",
    primaryPlatform: "tiktok",
    handle: "omarsellsystems",
    secondaryPlatforms: ["instagram"],
    niche: "business education",
    bio: "I break down sales systems and GTM frameworks for solo founders.",
    offerDescription: "Digital templates and strategy teardown subscriptions.",
    audienceSize: "14K",
    monthlyEarnings: "$2K",
    reasonForJoining: "Need an elite monetization stack with cleaner conversion flow.",
  },
  {
    name: "Leah Park",
    email: "leah@example.com",
    primaryPlatform: "youtube",
    handle: "leahcreative",
    secondaryPlatforms: [],
    niche: "lifestyle",
    bio: "Documenting creator life and habits.",
    offerDescription: "Still exploring what to package for paid offers.",
    audienceSize: "3K",
    monthlyEarnings: "$0",
    reasonForJoining: "Want to learn and test paid products.",
  },
  {
    name: "Rico Tan",
    email: "rico@example.com",
    primaryPlatform: "twitter",
    handle: "ricodesigns",
    secondaryPlatforms: ["instagram"],
    niche: "design",
    bio: "I share UI systems and brand teardown threads daily.",
    offerDescription: "Custom design packs and personalized critiques.",
    audienceSize: "9K",
    monthlyEarnings: "$800",
    reasonForJoining: "Need a faster launch loop for custom content and paid drops.",
  },
  {
    name: "Nia Laurent",
    email: "nia@example.com",
    primaryPlatform: "instagram",
    handle: "niabeautylab",
    secondaryPlatforms: ["tiktok", "youtube"],
    niche: "beauty",
    bio: "Beauty creator focused on high-trust education and premium routines.",
    offerDescription: "Membership for tutorials, product stacks, and weekly private Q&A.",
    audienceSize: "180K",
    monthlyEarnings: "$35K",
    reasonForJoining: "I want concierge support for premium subscription growth.",
  },
];

export async function getMockCreatorAnalysis() {
  const results = await Promise.all(MOCK_CREATORS.map((creator) => analyzeCreatorApplication(creator)));
  return MOCK_CREATORS.map((creator, index) => ({
    creator,
    analysis: results[index],
  }));
}
