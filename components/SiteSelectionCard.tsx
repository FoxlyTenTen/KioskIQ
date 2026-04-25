/**
 * SiteSelectionCard Component
 *
 * HITL card showing candidate location options from the Site Selection Expert Agent.
 */
import React, { useState } from "react";
import { type SiteSelectionData, type SiteSelectionOption } from "./types";
import {
  normalizeSiteSelectionData,
  normalizeSiteSelectionOption,
} from "./site-selection-utils";

interface SiteSelectionCardProps {
  data: SiteSelectionData;
  respond?: (selection: object) => void;
}

const SCORE_COLOR = (score: number) =>
  score >= 75
    ? "bg-emerald-100 text-emerald-700 border-emerald-200"
    : score >= 55
      ? "bg-yellow-100 text-yellow-700 border-yellow-200"
      : "bg-red-100 text-red-700 border-red-200";

const TYPE_BADGE: Record<string, string> = {
  "High-Traffic Premium": "bg-purple-100 text-purple-700",
  "Growing Suburban": "bg-blue-100 text-blue-700",
  "Community Hub": "bg-green-100 text-green-700",
};

export const SiteSelectionCard = ({ data, respond }: SiteSelectionCardProps) => {
  const normalizedData = normalizeSiteSelectionData(data);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [selected, setSelected] = useState<SiteSelectionOption | null>(null);

  const handleSelect = (opt: SiteSelectionOption) => {
    const normalizedOption = normalizeSiteSelectionOption(opt);
    setSelected(normalizedOption);
    respond?.({
      selectedOptionId: normalizedOption.optionId,
      selectedName: normalizedOption.name,
      selectedType: normalizedOption.type,
      metrics: normalizedOption.metrics,
      scores: normalizedOption.scores,
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
            <p className="text-sm font-bold text-gray-900">Location Selected</p>
            <p className="text-xs text-gray-600 mt-0.5">
              <span className="font-semibold text-indigo-700">{selected.name}</span>
              {" · "}
              <span className="text-gray-500">{selected.type}</span>
            </p>
            <div className="flex gap-3 mt-1 text-[11px] text-gray-500">
              <span>Traffic {selected.metrics.footTrafficDaily.toLocaleString()}/day</span>
              <span>Rent RM {selected.metrics.rentMonthlyRM.toLocaleString()}/mo</span>
              <span>Score {selected.scores.overallScore}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/90 backdrop-blur-md rounded-xl p-4 my-3 border-2 border-indigo-200 shadow-lg animate-in fade-in slide-in-from-bottom-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">Store</span>
        <div>
          <h3 className="text-base font-bold text-indigo-900">
            Site Selection - {normalizedData.targetArea}
          </h3>
          <p className="text-xs text-indigo-500">{normalizedData.userPrompt}</p>
        </div>
      </div>

      <div className="space-y-3">
        {normalizedData.options.map((opt, idx) => {
          const isOpen = expanded === opt.optionId;
          return (
            <div
              key={`${opt.optionId}-${idx}`}
              className={`rounded-lg border transition-all duration-200 ${
                isOpen
                  ? "border-indigo-400 bg-indigo-50/60"
                  : "border-gray-200 bg-white hover:border-indigo-300"
              }`}
            >
              <button
                className="w-full text-left p-3"
                onClick={() => setExpanded(isOpen ? null : opt.optionId)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                      <span className="font-semibold text-sm text-gray-900">{opt.name}</span>
                      <span
                        className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                          TYPE_BADGE[opt.type] ?? "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {opt.type}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed">{opt.summary}</p>
                  </div>
                  <div
                    className={`flex-shrink-0 text-center px-2 py-1 rounded-lg border text-sm font-bold ${SCORE_COLOR(
                      opt.scores.overallScore
                    )}`}
                  >
                    {opt.scores.overallScore}
                    <div className="text-[9px] font-normal leading-none mt-0.5">score</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-1.5 mt-2">
                  <MetricPill
                    label="Foot Traffic"
                    value={`${opt.metrics.footTrafficDaily.toLocaleString()}/day`}
                  />
                  <MetricPill
                    label="Rent"
                    value={`RM ${opt.metrics.rentMonthlyRM.toLocaleString()}/mo`}
                  />
                  <MetricPill
                    label="Competitors"
                    value={`${opt.metrics.competitorCount} nearby`}
                  />
                  <MetricPill label="Drive Time" value={opt.metrics.driveTimeFromCityCentre} />
                </div>

                <p className="text-[10px] text-indigo-400 text-center mt-2">
                  {isOpen ? "Collapse" : "View pros and cons"}
                </p>
              </button>

              {isOpen && (
                <div className="px-3 pb-3 space-y-3">
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                    <ScoreBar label="Foot Traffic" score={opt.scores.footTrafficScore} />
                    <ScoreBar label="Affordability" score={opt.scores.affordabilityScore} />
                    <ScoreBar label="Competition" score={opt.scores.competitionScore} />
                    <ScoreBar label="Growth" score={opt.scores.growthScore} />
                  </div>

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

                  <button
                    onClick={() => handleSelect(opt)}
                    className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold py-2.5 px-4 text-sm rounded-xl transition-all duration-200 shadow-md hover:shadow-lg active:scale-[0.98] mt-1"
                  >
                    Select This Location {"->"}
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

const ScoreBar = ({ label, score }: { label: string; score: number }) => {
  const pct = Math.min(100, score);
  const color =
    score >= 70 ? "bg-emerald-400" : score >= 50 ? "bg-yellow-400" : "bg-red-400";

  return (
    <div>
      <div className="flex justify-between text-[9px] text-gray-500 mb-0.5">
        <span>{label}</span>
        <span>{score}/100</span>
      </div>
      <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};
