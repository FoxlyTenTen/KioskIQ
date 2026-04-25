import React, { useState } from "react";
import type { RiskProfileData, RiskProfileOption } from "./types";
import {
  normalizeRiskProfileData,
  normalizeRiskProfileOption,
} from "./site-selection-utils";

interface RiskProfileOptionsCardProps {
  data: RiskProfileData;
  respond?: (selection: object) => void;
}

const SEVERITY_BADGE: Record<string, string> = {
  HIGH: "bg-red-100 text-red-700 border-red-200",
  MEDIUM: "bg-yellow-100 text-yellow-700 border-yellow-200",
  LOW: "bg-green-100 text-green-700 border-green-200",
};

const TOLERANCE_BADGE: Record<string, string> = {
  CONSERVATIVE: "bg-blue-100 text-blue-700",
  BALANCED: "bg-indigo-100 text-indigo-700",
  AGGRESSIVE: "bg-orange-100 text-orange-700",
};

export const RiskProfileOptionsCard = ({
  data,
  respond,
}: RiskProfileOptionsCardProps) => {
  const normalizedData = normalizeRiskProfileData(data);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [selected, setSelected] = useState<RiskProfileOption | null>(null);

  if (!normalizedData.riskProfiles.length) return null;

  const handleSelect = (opt: RiskProfileOption) => {
    const normalizedOption = normalizeRiskProfileOption(opt);
    setSelected(normalizedOption);
    respond?.({
      selectedProfileId: normalizedOption.profileId,
      selectedName: normalizedOption.name,
      riskTolerance: normalizedOption.riskTolerance,
      contingencyBudget: normalizedOption.contingencyBudget,
      financialBuffers: normalizedOption.financialBuffers,
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
            <p className="text-sm font-bold text-gray-900">Risk Profile Selected</p>
            <p className="text-xs text-gray-600 mt-0.5">
              <span className="font-semibold text-indigo-700">{selected.name}</span>
              {" · "}
              <span className="text-gray-500">{selected.riskTolerance}</span>
            </p>
            <div className="flex gap-3 mt-1 text-[11px] text-gray-500">
              <span>Contingency RM {selected.contingencyBudget.toLocaleString()}</span>
              <span>{selected.riskAssessment.risks.length} risks tracked</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/90 backdrop-blur-md rounded-xl p-4 my-3 border-2 border-indigo-200 shadow-lg animate-in fade-in slide-in-from-bottom-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">Shield</span>
        <div>
          <h3 className="text-base font-bold text-indigo-900">Risk Management Profiles</h3>
          <p className="text-xs text-indigo-500">{normalizedData.userPrompt}</p>
        </div>
      </div>

      <div className="space-y-3">
        {normalizedData.riskProfiles.map((opt, idx) => {
          const isOpen = expanded === opt.profileId;
          const topRisks = opt.riskAssessment.risks.slice(0, 3);

          return (
            <div
              key={`${opt.profileId}-${idx}`}
              className={`rounded-lg border transition-all duration-200 ${
                isOpen
                  ? "border-indigo-400 bg-indigo-50/60"
                  : "border-gray-200 bg-white hover:border-indigo-300"
              }`}
            >
              <button
                className="w-full text-left p-3"
                onClick={() => setExpanded(isOpen ? null : opt.profileId)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                      <span className="font-semibold text-sm text-gray-900">{opt.name}</span>
                      <span
                        className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                          TOLERANCE_BADGE[opt.riskTolerance] ?? "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {opt.riskTolerance}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed">{opt.philosophy}</p>
                  </div>
                  <div className="flex-shrink-0 text-center px-2 py-1 rounded-lg border text-sm font-bold bg-indigo-50 text-indigo-700 border-indigo-200">
                    RM {(opt.contingencyBudget / 1000).toFixed(0)}k
                    <div className="text-[9px] font-normal leading-none mt-0.5">buffer</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-1.5 mt-2">
                  <MetricPill label="Contingency" value={`RM ${opt.contingencyBudget.toLocaleString()}`} />
                  <MetricPill label="Risks Tracked" value={`${opt.riskAssessment.risks.length} risks`} />
                  <MetricPill label="Check Frequency" value={opt.monitoringApproach.checkFrequency} />
                  <MetricPill
                    label="Decision Points"
                    value={`${opt.monitoringApproach.decisionPoints.length} checkpoints`}
                  />
                </div>

                <p className="text-[10px] text-indigo-400 text-center mt-2">
                  {isOpen ? "Collapse" : "View risk details"}
                </p>
              </button>

              {isOpen && (
                <div className="px-3 pb-3 space-y-3">
                  <div>
                    <p className="text-[10px] font-semibold text-red-600 uppercase tracking-wide mb-1.5">
                      Top Risks
                    </p>
                    <div className="space-y-1.5">
                      {topRisks.map((risk, i) => (
                        <div key={i} className="bg-gray-50 rounded-lg p-2">
                          <div className="flex items-start justify-between gap-2 mb-0.5">
                            <p className="text-xs font-medium text-gray-800 flex-1">{risk.risk}</p>
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                                SEVERITY_BADGE[risk.severity] ??
                                "bg-gray-100 text-gray-600 border-gray-200"
                              }`}
                            >
                              {risk.severity}
                            </span>
                          </div>
                          <p className="text-[10px] text-gray-500">
                            Impact: RM {risk.impact.toLocaleString()} · Likelihood: {risk.likelihood}
                          </p>
                          <p className="text-[10px] text-indigo-600 mt-0.5">→ {risk.mitigation}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] font-semibold text-indigo-700 uppercase tracking-wide mb-1">
                      Mitigation Strategies
                    </p>
                    <ul className="space-y-0.5">
                      {opt.mitigationStrategies.map((strategy, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-xs text-gray-700">
                          <span className="text-indigo-400 mt-0.5 shrink-0">Shield</span>
                          {strategy}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <p className="text-[10px] font-semibold text-orange-600 uppercase tracking-wide mb-1">
                      Contingency Plans
                    </p>
                    <div className="space-y-1">
                      {opt.contingencyPlans.slice(0, 3).map((plan, i) => (
                        <div key={i} className="bg-orange-50 rounded p-2">
                          <p className="text-[10px] font-medium text-orange-700">{plan.trigger}</p>
                          <p className="text-[10px] text-gray-600 mt-0.5">→ {plan.action}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    <MetricPill
                      label="Operating Reserve"
                      value={`RM ${opt.financialBuffers.operatingReserve.toLocaleString()}`}
                    />
                    <MetricPill
                      label="Marketing Buffer"
                      value={`RM ${opt.financialBuffers.marketingBuffer.toLocaleString()}`}
                    />
                    <MetricPill
                      label="Staffing Buffer"
                      value={`RM ${opt.financialBuffers.staffingBuffer.toLocaleString()}`}
                    />
                    <MetricPill
                      label="Contingency Fund"
                      value={`RM ${opt.financialBuffers.contingencyFund.toLocaleString()}`}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-x-3">
                    <div>
                      <p className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wide mb-1">
                        Pros
                      </p>
                      <ul className="space-y-0.5">
                        {opt.pros.map((pro, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-xs text-gray-700">
                            <span className="text-emerald-500 mt-0.5 shrink-0">✓</span>
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
                            <span className="text-red-400 mt-0.5 shrink-0">×</span>
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
                    Select This Risk Profile {"->"}
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
