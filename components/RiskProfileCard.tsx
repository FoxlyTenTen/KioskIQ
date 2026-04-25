import React from "react";
import type { RiskProfileOption } from "./types";
import { normalizeRiskProfileOption } from "./site-selection-utils";

interface RiskProfileCardProps {
  data: RiskProfileOption;
  locationName?: string;
}

const SEVERITY_COLOR: Record<string, string> = {
  HIGH: "bg-red-500/20 text-red-300 border-red-500/30",
  MEDIUM: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  LOW: "bg-green-500/20 text-green-300 border-green-500/30",
};

const TOLERANCE_COLOR: Record<string, string> = {
  CONSERVATIVE: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  BALANCED: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
  AGGRESSIVE: "bg-orange-500/20 text-orange-300 border-orange-500/30",
};

export const RiskProfileCard = ({ data, locationName }: RiskProfileCardProps) => {
  const normalized = normalizeRiskProfileOption(data);
  const risks = normalized.riskAssessment.risks;
  const highRisks = risks.filter((risk) => risk.severity === "HIGH").length;

  return (
    <div className="bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-800 rounded-2xl p-5 text-white shadow-xl">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">Shield</span>
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
            TOLERANCE_COLOR[normalized.riskTolerance] ??
            "bg-gray-500/20 text-gray-300 border-gray-500/30"
          }`}
        >
          {normalized.riskTolerance}
        </span>
      </div>

      <div className="grid grid-cols-4 gap-2 mb-4">
        <KpiTile
          label="Contingency"
          value={`RM ${(normalized.contingencyBudget / 1000).toFixed(0)}k`}
        />
        <KpiTile label="Risks Tracked" value={`${risks.length}`} />
        <KpiTile label="High Severity" value={`${highRisks}`} />
        <KpiTile
          label="Check Freq."
          value={normalized.monitoringApproach.checkFrequency.split(" ")[0] ?? "-"}
        />
      </div>

      <div className="bg-white/10 rounded-xl p-3 mb-4">
        <p className="text-[10px] text-indigo-300 uppercase tracking-wide font-semibold mb-2">
          Risk Assessment
        </p>
        <div className="space-y-2">
          {risks.map((risk, i) => (
            <div key={i} className="border border-white/10 rounded-lg p-2">
              <div className="flex items-start justify-between gap-2 mb-1">
                <p className="text-xs text-indigo-100 flex-1 leading-snug">{risk.risk}</p>
                <span
                  className={`shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                    SEVERITY_COLOR[risk.severity] ??
                    "bg-gray-500/20 text-gray-300 border-gray-500/30"
                  }`}
                >
                  {risk.severity}
                </span>
              </div>
              <p className="text-[10px] text-indigo-400">
                Impact: RM {risk.impact.toLocaleString()} · Likelihood: {risk.likelihood}
              </p>
              <p className="text-[10px] text-emerald-400 mt-0.5">↳ {risk.mitigation}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-white/10 rounded-xl p-3">
          <p className="text-[10px] text-indigo-300 uppercase tracking-wide font-semibold mb-2">
            Mitigation
          </p>
          {normalized.mitigationStrategies.map((strategy, i) => (
            <div key={i} className="flex items-start gap-1.5 text-xs text-indigo-100 mb-1">
              <span className="text-indigo-400 shrink-0">Shield</span>
              {strategy}
            </div>
          ))}
        </div>
        <div className="bg-white/10 rounded-xl p-3">
          <p className="text-[10px] text-indigo-300 uppercase tracking-wide font-semibold mb-2">
            If/Then Plans
          </p>
          {normalized.contingencyPlans.slice(0, 3).map((plan, i) => (
            <div key={i} className="mb-1.5">
              <p className="text-[10px] text-orange-300 font-medium">{plan.trigger}</p>
              <p className="text-[10px] text-indigo-200">→ {plan.action}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white/10 rounded-xl p-3 mb-4">
        <p className="text-[10px] text-indigo-300 uppercase tracking-wide font-semibold mb-2">
          Financial Buffers
        </p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          <MetricRow
            label="Operating Reserve"
            value={`RM ${normalized.financialBuffers.operatingReserve.toLocaleString()}`}
          />
          <MetricRow
            label="Marketing Buffer"
            value={`RM ${normalized.financialBuffers.marketingBuffer.toLocaleString()}`}
          />
          <MetricRow
            label="Staffing Buffer"
            value={`RM ${normalized.financialBuffers.staffingBuffer.toLocaleString()}`}
          />
          <MetricRow
            label="Contingency Fund"
            value={`RM ${normalized.financialBuffers.contingencyFund.toLocaleString()}`}
          />
        </div>
        <div className="mt-2 pt-2 border-t border-white/10">
          <MetricRow
            label="Total Contingency"
            value={`RM ${normalized.financialBuffers.totalContingency.toLocaleString()}`}
            bold
          />
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

const MetricRow = ({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) => (
  <div className="flex justify-between items-center">
    <span className="text-[10px] text-indigo-300">{label}</span>
    <span className={`text-xs ${bold ? "font-bold text-white" : "font-semibold text-indigo-100"}`}>
      {value}
    </span>
  </div>
);
