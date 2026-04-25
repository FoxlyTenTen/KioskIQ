import React from "react";
import type { MarketStrategyOption } from "./types";
import { normalizeMarketStrategyOption } from "./site-selection-utils";

interface MarketStrategyCardProps {
  data: MarketStrategyOption;
  locationName?: string;
}

const SCORE_COLOR = (score: number) =>
  score >= 75 ? "text-emerald-600" : score >= 55 ? "text-yellow-600" : "text-red-500";

const GROWTH_BG: Record<string, string> = {
  High: "bg-emerald-100 text-emerald-700 border-emerald-200",
  Moderate: "bg-yellow-100 text-yellow-700 border-yellow-200",
  Low: "bg-red-100 text-red-700 border-red-200",
};

export const MarketStrategyCard = ({ data, locationName }: MarketStrategyCardProps) => {
  const normalized = normalizeMarketStrategyOption(data);
  const marginPct = Math.round(normalized.pricingStrategy.profitMargin * 100);
  const ltvCacRatio =
    normalized.marketingApproach.cac > 0
      ? (normalized.marketingApproach.ltv / normalized.marketingApproach.cac).toFixed(1)
      : "-";

  return (
    <div className="bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-800 rounded-2xl p-5 text-white shadow-xl">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">Target</span>
            <div>
              <h2 className="text-lg font-bold leading-tight">{normalized.name}</h2>
              {locationName && <p className="text-indigo-300 text-xs">{locationName}</p>}
            </div>
          </div>
          <p className="text-indigo-200 text-xs leading-relaxed max-w-xs">
            {normalized.positioning}
          </p>
        </div>
        <div className="text-right shrink-0 ml-3">
          <div
            className={`text-3xl font-black ${SCORE_COLOR(
              normalized.marketOpportunity.opportunityScore
            )}`}
          >
            {normalized.marketOpportunity.opportunityScore}
          </div>
          <div className="text-indigo-400 text-[10px] uppercase tracking-wide">opp. score</div>
          <span
            className={`inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
              GROWTH_BG[normalized.marketOpportunity.growthPotential] ??
              "bg-gray-100 text-gray-600 border-gray-200"
            }`}
          >
            {normalized.marketOpportunity.growthPotential} Growth
          </span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 mb-4">
        <KpiTile label="Price Point" value={normalized.pricingStrategy.pricePoint} />
        <KpiTile label="Avg Order" value={`RM ${normalized.pricingStrategy.aov}`} />
        <KpiTile label="Margin" value={`${marginPct}%`} />
        <KpiTile label="LTV:CAC" value={`${ltvCacRatio}x`} />
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-white/10 rounded-xl p-3">
          <p className="text-[10px] text-indigo-300 uppercase tracking-wide font-semibold mb-2">
            Marketing
          </p>
          <div className="space-y-1">
            <MetricRow label="CAC" value={`RM ${normalized.marketingApproach.cac}`} />
            <MetricRow label="LTV" value={`RM ${normalized.marketingApproach.ltv}`} />
            <MetricRow
              label="Monthly Budget"
              value={`RM ${normalized.marketingApproach.monthlyBudget.toLocaleString()}`}
            />
          </div>
        </div>
        <div className="bg-white/10 rounded-xl p-3">
          <p className="text-[10px] text-indigo-300 uppercase tracking-wide font-semibold mb-2">
            Timeline
          </p>
          <div className="space-y-1">
            <MetricRow
              label="To Dominance"
              value={normalized.marketOpportunity.timelineToDominance}
            />
            <MetricRow label="Growth Rate" value={normalized.marketAnalysis.growthRate} />
          </div>
        </div>
      </div>

      <div className="bg-white/10 rounded-xl p-3 mb-4">
        <p className="text-[10px] text-indigo-300 uppercase tracking-wide font-semibold mb-1">
          Target Customer
        </p>
        <p className="text-xs text-indigo-100 leading-relaxed">
          {normalized.customerProfile}
        </p>
      </div>

      <div className="mb-4">
        <p className="text-[10px] text-indigo-300 uppercase tracking-wide font-semibold mb-2">
          Growth Tactics
        </p>
        <div className="space-y-1">
          {normalized.growthTactics.map((tactic, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-indigo-100">
              <span className="text-indigo-400 mt-0.5 shrink-0">→</span>
              {tactic}
            </div>
          ))}
        </div>
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
    </div>
  );
};

const KpiTile = ({ label, value }: { label: string; value: string }) => (
  <div className="bg-white/10 rounded-xl p-2.5 text-center">
    <p className="text-[9px] text-indigo-300 uppercase tracking-wide mb-0.5">{label}</p>
    <p className="text-sm font-bold text-white leading-tight">{value}</p>
  </div>
);

const MetricRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between items-center">
    <span className="text-[10px] text-indigo-300">{label}</span>
    <span className="text-xs font-semibold text-white">{value}</span>
  </div>
);
