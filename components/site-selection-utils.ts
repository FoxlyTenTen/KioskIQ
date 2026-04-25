import { type SiteSelectionData, type SiteSelectionOption } from "./types";

const toNumber = (value: unknown, fallback = 0) => {
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const clampScore = (value: unknown) => {
  const score = Math.round(toNumber(value, 0));
  return Math.min(100, Math.max(0, score));
};

const deriveOverallScore = (scores: {
  footTrafficScore: number;
  affordabilityScore: number;
  competitionScore: number;
  growthScore: number;
}) =>
  Math.round(
    (scores.footTrafficScore +
      scores.affordabilityScore +
      scores.competitionScore +
      scores.growthScore) /
      4
  );

export function normalizeSiteSelectionOption(raw: unknown, index = 0): SiteSelectionOption {
  const option = (raw ?? {}) as Partial<SiteSelectionOption> & {
    score?: number;
    overallScore?: number;
  };
  const rawScores = (option.scores ?? {}) as Partial<SiteSelectionOption["scores"]>;
  const rawMetrics = (option.metrics ?? {}) as Partial<SiteSelectionOption["metrics"]>;

  const scores = {
    footTrafficScore: clampScore(rawScores.footTrafficScore),
    affordabilityScore: clampScore(rawScores.affordabilityScore),
    competitionScore: clampScore(rawScores.competitionScore),
    growthScore: clampScore(rawScores.growthScore),
    overallScore: 0,
  };

  const explicitOverall = rawScores.overallScore ?? option.overallScore ?? option.score;
  scores.overallScore =
    explicitOverall !== undefined && explicitOverall !== null
      ? clampScore(explicitOverall)
      : deriveOverallScore(scores);

  return {
    optionId: option.optionId || `option-${index + 1}`,
    name: option.name || `Location Option ${index + 1}`,
    type: option.type || "Community Hub",
    summary: option.summary || "No summary provided for this location.",
    coordinates:
      option.coordinates &&
      Number.isFinite(option.coordinates.lat) &&
      Number.isFinite(option.coordinates.lng)
        ? option.coordinates
        : undefined,
    competitors: Array.isArray(option.competitors)
      ? option.competitors.filter(
          (competitor) =>
            competitor &&
            typeof competitor.name === "string" &&
            competitor.coordinates &&
            Number.isFinite(competitor.coordinates.lat) &&
            Number.isFinite(competitor.coordinates.lng)
        )
      : [],
    metrics: {
      footTrafficDaily: toNumber(rawMetrics.footTrafficDaily),
      rentMonthlyRM: toNumber(rawMetrics.rentMonthlyRM),
      competitorCount: toNumber(rawMetrics.competitorCount),
      populationNearby: toNumber(rawMetrics.populationNearby),
      driveTimeFromCityCentre: rawMetrics.driveTimeFromCityCentre || "Unknown",
    },
    scores,
    pros: Array.isArray(option.pros) ? option.pros.filter(Boolean) : [],
    cons: Array.isArray(option.cons) ? option.cons.filter(Boolean) : [],
  };
}

export function normalizeSiteSelectionData(raw: unknown): SiteSelectionData {
  const data = (raw ?? {}) as Partial<SiteSelectionData>;
  return {
    agentName: data.agentName || "Site Selection Expert",
    actionType: data.actionType || "SITE_SELECTION_OPTIONS",
    targetArea: data.targetArea || "Target Area",
    userPrompt:
      data.userPrompt ||
      "Review the location options and choose the best fit for the expansion.",
    options: Array.isArray(data.options)
      ? data.options.map((option, index) => normalizeSiteSelectionOption(option, index))
      : [],
    nextStep: data.nextStep || "Select a location to proceed to financial analysis.",
  };
}
