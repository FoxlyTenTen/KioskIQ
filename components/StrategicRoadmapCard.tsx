import React from "react";
import type { RoadmapOption } from "./types";
import { normalizeRoadmapOption } from "./site-selection-utils";

interface StrategicRoadmapCardProps {
  data: RoadmapOption;
  locationName?: string;
  finalRecommendation?: { recommendedRoadmap: string; reasoning: string; projectedOutcome: string };
}

const SPEED_COLOR: Record<string, string> = {
  SLOW: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  STANDARD: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
  FAST: "bg-orange-500/20 text-orange-300 border-orange-500/30",
};

const RISK_COLOR: Record<string, string> = {
  LOW: "text-emerald-400",
  MEDIUM: "text-yellow-400",
  HIGH: "text-red-400",
};

export const StrategicRoadmapCard = ({ data, locationName, finalRecommendation }: StrategicRoadmapCardProps) => {
  const normalized = normalizeRoadmapOption(data);
  const speed = normalized.comparison.growthSpeed;
  const phases = [
    { label: "Phase 1", p: normalized.phases.phase1 },
    { label: "Phase 2", p: normalized.phases.phase2 },
    { label: "Phase 3", p: normalized.phases.phase3 },
  ];
  const phaseAmounts = [
    normalized.investmentSchedule.phase1,
    normalized.investmentSchedule.phase2,
    normalized.investmentSchedule.phase3,
  ];
  const phaseTotal = phaseAmounts.reduce((a, b) => a + b, 0) || 1;

  return (
    <div className="bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-800 rounded-2xl p-5 text-white shadow-xl">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">Map</span>
            <div>
              <h2 className="text-lg font-bold leading-tight">{normalized.name}</h2>
              {locationName && <p className="text-indigo-300 text-xs">{locationName}</p>}
            </div>
          </div>
          <p className="text-indigo-200 text-xs leading-relaxed max-w-xs">
            {normalized.philosophy}
          </p>
        </div>
        <span
          className={`shrink-0 ml-3 text-[11px] font-bold px-2.5 py-1 rounded-full border ${
            SPEED_COLOR[speed] ?? "bg-gray-500/20 text-gray-300 border-gray-500/30"
          }`}
        >
          {speed}
        </span>
      </div>

      <div className="grid grid-cols-4 gap-2 mb-4">
        <KpiTile
          label="Total Investment"
          value={`RM ${(normalized.totalInvestment / 1000).toFixed(0)}k`}
        />
        <KpiTile
          label="Year 3 Revenue"
          value={`RM ${(normalized.expectedYear3Revenue / 1000).toFixed(0)}k`}
        />
        <KpiTile
          label="Year 3 Profit"
          value={`RM ${(normalized.expectedYear3Profit / 1000).toFixed(0)}k`}
        />
        <KpiTile label="Timeline" value={normalized.totalTimeline} />
      </div>

      <div className="bg-white/10 rounded-xl p-3 mb-4">
        <p className="text-[10px] text-indigo-300 uppercase tracking-wide font-semibold mb-1">
          Timeline
        </p>
        <p className="text-xs text-indigo-100">{normalized.timelineVisualization}</p>
      </div>

      <div className="mb-4">
        <p className="text-[10px] text-indigo-300 uppercase tracking-wide font-semibold mb-2">
          Phases
        </p>
        <div className="space-y-2">
          {phases.map(({ label, p }) => (
            <div key={label} className="bg-white/10 rounded-xl p-3">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-bold text-indigo-100">
                  {label}: {p.name}
                </span>
                <span className="text-[10px] text-indigo-300">{p.months || p.timeline}</span>
              </div>
              <div className="flex flex-wrap gap-3 text-[10px] text-indigo-300">
                <span>RM {p.investment?.toLocaleString() || "0"}</span>
                {p.numLocations > 0 && (
                  <span>{p.numLocations} location{p.numLocations > 1 ? "s" : ""}</span>
                )}
                {p.targetNetworkSize > 0 && <span>Network: {p.targetNetworkSize} outlets</span>}
              </div>
              {p.decisionPoint && (
                <p className="text-[10px] text-orange-300 mt-1">{p.decisionPoint}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white/10 rounded-xl p-3 mb-4">
        <p className="text-[10px] text-indigo-300 uppercase tracking-wide font-semibold mb-2">
          Investment Schedule
        </p>
        <div className="flex rounded-full overflow-hidden h-3 mb-2">
          {phaseAmounts.map((amount, i) => (
            <div
              key={i}
              style={{ width: `${(amount / phaseTotal) * 100}%` }}
              className={["bg-indigo-400", "bg-purple-400", "bg-violet-400"][i]}
            />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-1 text-center">
          {phaseAmounts.map((amount, i) => (
            <div key={i}>
              <p className="text-[9px] text-indigo-400">Phase {i + 1}</p>
              <p className="text-xs font-semibold text-white">RM {(amount / 1000).toFixed(0)}k</p>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-indigo-300 mt-2 text-center">
          {normalized.investmentSchedule.fundingStrategy}
        </p>
      </div>

      {normalized.milestones.length > 0 && (
        <div className="mb-4">
          <p className="text-[10px] text-indigo-300 uppercase tracking-wide font-semibold mb-2">
            Key Milestones
          </p>
          <div className="space-y-1">
            {normalized.milestones.slice(0, 6).map((milestone, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-indigo-100">
                <span className="text-indigo-400 shrink-0 mt-0.5">→</span>
                {milestone}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white/10 rounded-xl p-3 mb-4">
        <p className="text-[10px] text-indigo-300 uppercase tracking-wide font-semibold mb-2">
          Comparison
        </p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          <MetricRow label="Growth Speed" value={normalized.comparison.growthSpeed} />
          <MetricRow label="Capital Required" value={normalized.comparison.capitalRequired} />
          <MetricRow
            label="Risk Level"
            value={normalized.comparison.riskLevel}
            className={RISK_COLOR[normalized.comparison.riskLevel] ?? "text-indigo-100"}
          />
          <MetricRow
            label="Complexity"
            value={normalized.comparison.managementComplexity}
          />
        </div>
        <p className="text-[10px] text-amber-300 mt-2">
          Best for: {normalized.comparison.bestFor}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-[10px] text-emerald-400 uppercase tracking-wide font-semibold mb-1">
            Pros
          </p>
          {normalized.pros.map((pro, i) => (
            <div key={i} className="flex items-start gap-1.5 text-xs text-indigo-100 mb-0.5">
              <span className="text-emerald-400 shrink-0">✓</span>
              {pro}
            </div>
          ))}
        </div>
        <div>
          <p className="text-[10px] text-red-400 uppercase tracking-wide font-semibold mb-1">
            Cons
          </p>
          {normalized.cons.map((con, i) => (
            <div key={i} className="flex items-start gap-1.5 text-xs text-indigo-100 mb-0.5">
              <span className="text-red-400 shrink-0">×</span>
              {con}
            </div>
          ))}
        </div>
      </div>

      {finalRecommendation?.recommendedRoadmap && (
        <div className="mt-4 border border-amber-400/40 bg-amber-500/10 rounded-xl p-3">
          <p className="text-[10px] text-amber-300 uppercase tracking-wide font-semibold mb-1">
            AI Recommendation
          </p>
          <p className="text-xs font-bold text-amber-200 mb-1">
            {finalRecommendation.recommendedRoadmap}
          </p>
          {finalRecommendation.reasoning && (
            <p className="text-[11px] text-amber-100 leading-relaxed mb-1">
              {finalRecommendation.reasoning}
            </p>
          )}
          {finalRecommendation.projectedOutcome && (
            <p className="text-[11px] text-amber-300 italic">
              {finalRecommendation.projectedOutcome}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

const KpiTile = ({ label, value }: { label: string; value: string }) => (
  <div className="bg-white/10 rounded-xl p-2.5 text-center">
    <p className="text-[9px] text-indigo-300 uppercase tracking-wide mb-0.5">{label}</p>
    <p className="text-sm font-bold text-white leading-tight">{value}</p>
  </div>
);

const MetricRow = ({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) => (
  <div className="flex justify-between items-center">
    <span className="text-[10px] text-indigo-300">{label}</span>
    <span className={`text-xs font-semibold ${className ?? "text-white"}`}>{value}</span>
  </div>
);
