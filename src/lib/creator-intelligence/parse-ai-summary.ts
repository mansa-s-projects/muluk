export type CreatorAiSummarySections = {
  monetizationReadiness: string | null;
  redFlags: string | null;
  fitAssessment: string | null;
  idealLaunchPath: string | null;
};

const SECTION_KEYS = [
  "MONETIZATION_READINESS",
  "RED_FLAGS",
  "FIT_ASSESSMENT",
  "IDEAL_LAUNCH_PATH",
] as const;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractSection(summary: string, key: (typeof SECTION_KEYS)[number]): string | null {
  const otherKeys = SECTION_KEYS.filter((item) => item !== key)
    .map((item) => escapeRegExp(item))
    .join("|");

  const pattern = new RegExp(
    `(?:^|\\n)${escapeRegExp(key)}:\\s*([\\s\\S]*?)(?=\\n(?:${otherKeys}):|$)`,
    "i"
  );
  const match = summary.match(pattern);
  const value = match?.[1]?.trim() ?? "";
  return value || null;
}

export function parseCreatorAiSummary(summary: string | null | undefined): CreatorAiSummarySections {
  if (!summary) {
    return {
      monetizationReadiness: null,
      redFlags: null,
      fitAssessment: null,
      idealLaunchPath: null,
    };
  }

  return {
    monetizationReadiness: extractSection(summary, "MONETIZATION_READINESS"),
    redFlags: extractSection(summary, "RED_FLAGS"),
    fitAssessment: extractSection(summary, "FIT_ASSESSMENT"),
    idealLaunchPath: extractSection(summary, "IDEAL_LAUNCH_PATH"),
  };
}