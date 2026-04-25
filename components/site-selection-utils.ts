import {
  type MarketStrategyData,
  type MarketStrategyOption,
  type RiskProfileData,
  type RiskProfileOption,
  type RoadmapData,
  type RoadmapOption,
  type SiteSelectionData,
  type SiteSelectionOption,
} from "./types";

const toNumber = (value: unknown, fallback = 0) => {
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const clampScore = (value: unknown) => {
  const score = Math.round(toNumber(value, 0));
  return Math.min(100, Math.max(0, score));
};

const toStringValue = (value: unknown, fallback = "") =>
  typeof value === "string" && value.trim() ? value : fallback;

const toStringArray = (value: unknown) =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];

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

export function normalizeMarketStrategyOption(raw: unknown, index = 0): MarketStrategyOption {
  const option = (raw ?? {}) as Partial<MarketStrategyOption>;

  return {
    strategyId: option.strategyId || `strategy-${index + 1}`,
    name: toStringValue(option.name, `Strategy ${index + 1}`),
    positioning: toStringValue(option.positioning, "No positioning summary provided."),
    targetCustomer: toStringValue(option.targetCustomer, "General mall visitors"),
    marketAnalysis: {
      tam: toNumber(option.marketAnalysis?.tam),
      sam: toNumber(option.marketAnalysis?.sam),
      growthRate: toStringValue(option.marketAnalysis?.growthRate, "Unknown"),
    },
    customerProfile: toStringValue(option.customerProfile, "No customer profile provided."),
    pricingStrategy: {
      pricePoint: toStringValue(option.pricingStrategy?.pricePoint, "RM 0-0"),
      aov: toNumber(option.pricingStrategy?.aov),
      profitMargin: toNumber(option.pricingStrategy?.profitMargin),
    },
    marketingApproach: {
      cac: toNumber(option.marketingApproach?.cac),
      ltv: toNumber(option.marketingApproach?.ltv),
      monthlyBudget: toNumber(option.marketingApproach?.monthlyBudget),
    },
    growthTactics: toStringArray(option.growthTactics),
    pros: toStringArray(option.pros),
    cons: toStringArray(option.cons),
    marketOpportunity: {
      opportunityScore: clampScore(option.marketOpportunity?.opportunityScore),
      growthPotential: toStringValue(option.marketOpportunity?.growthPotential, "Moderate"),
      timelineToDominance: toStringValue(option.marketOpportunity?.timelineToDominance, "Unknown"),
    },
  };
}

export function normalizeMarketStrategyData(raw: unknown): MarketStrategyData {
  const data = (raw ?? {}) as Partial<MarketStrategyData>;
  return {
    agentName: toStringValue(data.agentName, "Market Researcher"),
    actionType: toStringValue(data.actionType, "SELECT_MARKET_STRATEGY"),
    locationName: toStringValue(data.locationName, "Selected Location"),
    targetArea: toStringValue(data.targetArea, "Target Area"),
    userPrompt: toStringValue(
      data.userPrompt,
      "Review the strategy options and choose the market position that best fits the location."
    ),
    strategies: Array.isArray(data.strategies)
      ? data.strategies.map((option, index) => normalizeMarketStrategyOption(option, index))
      : [],
    nextStep: toStringValue(data.nextStep, "Select the strategy that best fits your business goals."),
  };
}

export function normalizeRiskProfileOption(raw: unknown, index = 0): RiskProfileOption {
  const option = (raw ?? {}) as Partial<RiskProfileOption>;
  const risks = Array.isArray(option.riskAssessment?.risks)
    ? option.riskAssessment.risks.map((risk) => ({
        risk: toStringValue(risk?.risk, "Unnamed risk"),
        severity: toStringValue(risk?.severity, "MEDIUM") as "HIGH" | "MEDIUM" | "LOW",
        likelihood: toStringValue(risk?.likelihood, "MEDIUM") as "HIGH" | "MEDIUM" | "LOW",
        impact: toNumber(risk?.impact),
        mitigation: toStringValue(risk?.mitigation, "No mitigation provided."),
        contingency: toStringValue(risk?.contingency, "No contingency provided."),
      }))
    : [];

  return {
    profileId: option.profileId || `profile-${index + 1}`,
    name: toStringValue(option.name, `Risk Profile ${index + 1}`),
    philosophy: toStringValue(option.philosophy, "No philosophy provided."),
    riskTolerance: toStringValue(option.riskTolerance, "BALANCED"),
    contingencyBudget: toNumber(option.contingencyBudget),
    riskAssessment: { risks },
    mitigationStrategies: toStringArray(option.mitigationStrategies),
    contingencyPlans: Array.isArray(option.contingencyPlans)
      ? option.contingencyPlans.map((plan) => ({
          trigger: toStringValue(plan?.trigger, "No trigger provided."),
          action: toStringValue(plan?.action, "No action provided."),
        }))
      : [],
    monitoringApproach: {
      keyMetrics: toStringArray(option.monitoringApproach?.keyMetrics),
      checkFrequency: toStringValue(option.monitoringApproach?.checkFrequency, "WEEKLY"),
      decisionPoints: toStringArray(option.monitoringApproach?.decisionPoints),
    },
    financialBuffers: {
      operatingReserve: toNumber(option.financialBuffers?.operatingReserve),
      marketingBuffer: toNumber(option.financialBuffers?.marketingBuffer),
      staffingBuffer: toNumber(option.financialBuffers?.staffingBuffer),
      contingencyFund: toNumber(option.financialBuffers?.contingencyFund),
      totalContingency: toNumber(option.financialBuffers?.totalContingency),
    },
    pros: toStringArray(option.pros),
    cons: toStringArray(option.cons),
  };
}

export function normalizeRiskProfileData(raw: unknown): RiskProfileData {
  const data = (raw ?? {}) as Partial<RiskProfileData>;
  return {
    agentName: toStringValue(data.agentName, "Risk Manager"),
    actionType: toStringValue(data.actionType, "SELECT_RISK_MANAGEMENT_PROFILE"),
    selectedLocation: toStringValue(data.selectedLocation, "Selected Location"),
    selectedFinancial: toStringValue(data.selectedFinancial, "Financial summary unavailable"),
    selectedStrategy: toStringValue(data.selectedStrategy, "Selected Strategy"),
    userPrompt: toStringValue(
      data.userPrompt,
      "Select the risk management approach that matches your risk tolerance."
    ),
    riskProfiles: Array.isArray(data.riskProfiles)
      ? data.riskProfiles.map((option, index) => normalizeRiskProfileOption(option, index))
      : [],
    nextStep: toStringValue(data.nextStep, "Select the risk management profile that fits your business."),
  };
}

export function normalizeRoadmapOption(raw: unknown, index = 0): RoadmapOption {
  const option = (raw ?? {}) as Partial<RoadmapOption>;

  const normalizePhase = (phase: unknown, defaultName: string) => {
    const p = (phase ?? {}) as Record<string, unknown>;
    return {
      name: toStringValue(p.name, defaultName),
      months: toStringValue(p.months, undefined as unknown as string),
      investment: toNumber(p.investment),
      revenueTarget: toStringValue(p.revenueTarget, ""),
      numLocations: toNumber(p.numLocations),
      timeline: toStringValue(p.timeline, ""),
      investmentPerLocation: toNumber(p.investmentPerLocation),
      totalPhase2Investment: toNumber(p.totalPhase2Investment),
      expansionPace: toStringValue(p.expansionPace, ""),
      revenuePerStore: toStringValue(p.revenuePerStore, ""),
      successCriteria: toStringArray(p.successCriteria),
      decisionPoint: toStringValue(p.decisionPoint, ""),
      targetNetworkSize: toNumber(p.targetNetworkSize),
      expectedYear3Revenue: toNumber(p.expectedYear3Revenue),
      expectedYear3Profit: toNumber(p.expectedYear3Profit),
    };
  };

  return {
    roadmapId: option.roadmapId || `roadmap-${index + 1}`,
    name: toStringValue(option.name, `Roadmap ${index + 1}`),
    philosophy: toStringValue(option.philosophy, "No roadmap philosophy provided."),
    totalTimeline: toStringValue(option.totalTimeline, "Unknown timeline"),
    totalInvestment: toNumber(option.totalInvestment),
    expectedYear3Revenue: toNumber(option.expectedYear3Revenue),
    expectedYear3Profit: toNumber(option.expectedYear3Profit),
    phases: {
      phase1: normalizePhase(option.phases?.phase1, "Phase 1"),
      phase2: normalizePhase(option.phases?.phase2, "Phase 2"),
      phase3: normalizePhase(option.phases?.phase3, "Phase 3"),
    },
    timelineVisualization: toStringValue(option.timelineVisualization, "Timeline unavailable."),
    investmentSchedule: {
      phase1: toNumber(option.investmentSchedule?.phase1),
      phase2: toNumber(option.investmentSchedule?.phase2),
      phase3: toNumber(option.investmentSchedule?.phase3),
      contingency: toNumber(option.investmentSchedule?.contingency),
      total: toNumber(option.investmentSchedule?.total),
      fundingStrategy: toStringValue(option.investmentSchedule?.fundingStrategy, "Funding strategy unavailable."),
    },
    milestones: toStringArray(option.milestones),
    successMetrics: Object.fromEntries(
      Object.entries(option.successMetrics ?? {}).filter(
        ([key, value]) => typeof key === "string" && typeof value === "string"
      )
    ),
    pros: toStringArray(option.pros),
    cons: toStringArray(option.cons),
    comparison: {
      growthSpeed: toStringValue(option.comparison?.growthSpeed, "STANDARD"),
      capitalRequired: toStringValue(option.comparison?.capitalRequired, "Unknown"),
      riskLevel: toStringValue(option.comparison?.riskLevel, "MEDIUM"),
      managementComplexity: toStringValue(option.comparison?.managementComplexity, "Unknown"),
      bestFor: toStringValue(option.comparison?.bestFor, "General operators"),
    },
  };
}

export function normalizeRoadmapData(raw: unknown): RoadmapData {
  const data = (raw ?? {}) as Partial<RoadmapData>;
  return {
    agentName: toStringValue(data.agentName, "Strategic Planner"),
    actionType: toStringValue(data.actionType, "FINAL_RECOMMENDATION"),
    selectedLocation: toStringValue(data.selectedLocation, "Selected Location"),
    selectedFinancial: toStringValue(data.selectedFinancial, "Financial summary unavailable"),
    selectedStrategy: toStringValue(data.selectedStrategy, "Selected Strategy"),
    selectedRiskProfile: toStringValue(data.selectedRiskProfile, "Selected Risk Profile"),
    userPrompt: toStringValue(
      data.userPrompt,
      "Select your expansion roadmap based on your goals and resources."
    ),
    roadmaps: Array.isArray(data.roadmaps)
      ? data.roadmaps.map((option, index) => normalizeRoadmapOption(option, index))
      : [],
    finalRecommendation: {
      recommendedRoadmap: toStringValue(data.finalRecommendation?.recommendedRoadmap, ""),
      reasoning: toStringValue(data.finalRecommendation?.reasoning, ""),
      projectedOutcome: toStringValue(data.finalRecommendation?.projectedOutcome, ""),
    },
    nextStep: toStringValue(data.nextStep, "Select the roadmap you want to follow."),
  };
}
