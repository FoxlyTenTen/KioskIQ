import React, { useState } from "react";
import type { MarketStrategyData, MarketStrategyOption } from "./types";
import {
  normalizeMarketStrategyData,
  normalizeMarketStrategyOption,
} from "./site-selection-utils";

interface MarketStrategyOptionsCardProps {
  data: MarketStrategyData;
  respond?: (selection: object) => void;
}

const SCORE_COLOR = (score: number) =>
  score >= 75
    ? "bg-emerald-100 text-emerald-700 border-emerald-200"
    : score >= 55
      ? "bg-yellow-100 text-yellow-700 border-yellow-200"
      : "bg-red-100 text-red-700 border-red-200";

const STRATEGY_BADGE: Record<string, string> = {
  "Premium Experience": "bg-purple-100 text-purple-700",
  "Value Champion": "bg-blue-100 text-blue-700",
  "Niche Specialist": "bg-green-100 text-green-700",
};

const GROWTH_COLOR: Record<string, string> = {
  High: "text-emerald-600",
  Moderate: "text-yellow-600",
  Low: "text-red-500",
};

export const MarketStrategyOptionsCard = ({
  data,
  respond,
}: MarketStrategyOptionsCardProps) => {
  const normalizedData = normalizeMarketStrategyData(data);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [selected, setSelected] = useState<MarketStrategyOption | null>(null);

  if (!normalizedData.strategies.length) return null;

  const handleSelect = (opt: MarketStrategyOption) => {
    const normalizedOption = normalizeMarketStrategyOption(opt);
    setSelected(normalizedOption);
    respond?.({
      selectedStrategyId: normalizedOption.strategyId,
      selectedName: normalizedOption.name,
      positioning: normalizedOption.positioning,
      pricingStrategy: normalizedOption.pricingStrategy,
      marketingApproach: normalizedOption.marketingApproach,
      marketOpportunity: normalizedOption.marketOpportunity,
    });
  };

  if (selected) {
    return (
      <div className="bg-green-50/95 border border-green-200 rounded-xl p-4 my-3 shadow-sm animate-in fade-in slide-in-from-bottom-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-xl border border-green-200">
            ✓
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">Strategy Selected</p>
            <p className="text-xs text-gray-600 mt-0.5">
              <span className="font-semibold text-indigo-700">{selected.name}</span>
              {" · "}
              <span className="text-gray-500">{selected.pricingStrategy.pricePoint}</span>
            </p>
            <div className="flex gap-3 mt-1 text-[11px] text-gray-500">
              <span>AOV RM {selected.pricingStrategy.aov}</span>
              <span>Margin {Math.round(selected.pricingStrategy.profitMargin * 100)}%</span>
              <span>Score {selected.marketOpportunity.opportunityScore}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/90 backdrop-blur-md rounded-xl p-4 my-3 border-2 border-indigo-200 shadow-lg animate-in fade-in slide-in-from-bottom-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">Target</span>
        <div>
          <h3 className="text-base font-bold text-indigo-900">
            Market Strategy - {normalizedData.locationName}
          </h3>
          <p className="text-xs text-indigo-500">{normalizedData.userPrompt}</p>
        </div>
      </div>

      <div className="space-y-3">
        {normalizedData.strategies.map((opt, idx) => {
          const isOpen = expanded === opt.strategyId;
          return (
            <div
              key={`${opt.strategyId}-${idx}`}
              className={`rounded-lg border transition-all duration-200 ${
                isOpen
                  ? "border-indigo-400 bg-indigo-50/60"
                  : "border-gray-200 bg-white hover:border-indigo-300"
              }`}
            >
              <button
                className="w-full text-left p-3"
                onClick={() => setExpanded(isOpen ? null : opt.strategyId)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                      <span className="font-semibold text-sm text-gray-900">{opt.name}</span>
                      <span
                        className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                          STRATEGY_BADGE[opt.name] ?? "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {opt.pricingStrategy.pricePoint}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed">{opt.positioning}</p>
                  </div>
                  <div
                    className={`flex-shrink-0 text-center px-2 py-1 rounded-lg border text-sm font-bold ${SCORE_COLOR(
                      opt.marketOpportunity.opportunityScore
                    )}`}
                  >
                    {opt.marketOpportunity.opportunityScore}
                    <div className="text-[9px] font-normal leading-none mt-0.5">score</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-1.5 mt-2">
                  <MetricPill label="Avg Order Value" value={`RM ${opt.pricingStrategy.aov}`} />
                  <MetricPill
                    label="Profit Margin"
                    value={`${Math.round(opt.pricingStrategy.profitMargin * 100)}%`}
                  />
                  <MetricPill label="CAC" value={`RM ${opt.marketingApproach.cac}`} />
                  <MetricPill label="LTV" value={`RM ${opt.marketingApproach.ltv}`} />
                </div>

                <p className="text-[10px] text-indigo-400 text-center mt-2">
                  {isOpen ? "Collapse" : "View strategy details"}
                </p>
              </button>

              {isOpen && (
                <div className="px-3 pb-3 space-y-3">
                  <div className="bg-gray-50 rounded-lg p-2.5 space-y-1.5">
                    <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-wide">
                      Target Customer
                    </p>
                    <p className="text-xs text-gray-700">{opt.customerProfile}</p>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-center">
                      <p className="text-[9px] text-gray-400 uppercase tracking-wide">Growth</p>
                      <p
                        className={`text-xs font-bold ${
                          GROWTH_COLOR[opt.marketOpportunity.growthPotential] ?? "text-gray-600"
                        }`}
                      >
                        {opt.marketOpportunity.growthPotential}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-[9px] text-gray-400 uppercase tracking-wide">Timeline</p>
                      <p className="text-xs font-bold text-gray-700">
                        {opt.marketOpportunity.timelineToDominance}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-[9px] text-gray-400 uppercase tracking-wide">
                        Mktg Budget
                      </p>
                      <p className="text-xs font-bold text-gray-700">
                        RM {opt.marketingApproach.monthlyBudget.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] font-semibold text-indigo-700 uppercase tracking-wide mb-1">
                      Growth Tactics
                    </p>
                    <ul className="space-y-0.5">
                      {opt.growthTactics.map((tactic, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-xs text-gray-700">
                          <span className="text-indigo-400 mt-0.5 flex-shrink-0">→</span>
                          {tactic}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="grid grid-cols-2 gap-x-3">
                    <div>
                      <p className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wide mb-1">
                        Pros
                      </p>
                      <ul className="space-y-0.5">
                        {opt.pros.map((pro, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-xs text-gray-700">
                            <span className="text-emerald-500 mt-0.5 flex-shrink-0">✓</span>
                            {pro}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-red-600 uppercase tracking-wide mb-1">
                        Cons
                      </p>
                      <ul className="space-y-0.5">
                        {opt.cons.map((con, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-xs text-gray-700">
                            <span className="text-red-400 mt-0.5 flex-shrink-0">×</span>
                            {con}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <button
                    onClick={() => handleSelect(opt)}
                    className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold py-2.5 px-4 text-sm rounded-xl transition-all duration-200 shadow-md hover:shadow-lg active:scale-[0.98] mt-1"
                  >
                    Select This Strategy {"->"}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-[10px] text-gray-400 mt-3 text-center">{normalizedData.nextStep}</p>
    </div>
  );
};

const MetricPill = ({ label, value }: { label: string; value: string }) => (
  <div className="bg-gray-50 rounded px-2 py-1 text-center">
    <p className="text-[9px] text-gray-400 uppercase tracking-wide">{label}</p>
    <p className="text-xs font-semibold text-gray-800">{value}</p>
  </div>
);
