"use client";

import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export interface MonthlyProjection {
  month: number;
  revenue: number;
  cost: number;
  profit: number;
}

export interface ExpansionFeasibilityData {
  agentName: string;
  locationName: string;
  monthlyRent: number;
  projectedMonthlyRevenue: number;
  projectedMonthlyCost: number;
  projectedMonthlyProfit: number;
  breakEvenMonths: number;
  initialInvestmentRM: number;
  roi12months: number;
  revenuePerVisitor: number;
  conversionRate: number;
  avgSpendRM: number;
  staffCostMonthly: number;
  cogsMonthly: number;
  utilitiesMonthly: number;
  opr_rate: number;
  riskLevel: "low" | "moderate" | "high";
  viabilityStatus: "viable" | "challenging" | "not_viable";
  recommendation: string;
  monthlyProjections: MonthlyProjection[];
}

const RM = (n: number) =>
  `RM ${n.toLocaleString("en-MY", { maximumFractionDigits: 0 })}`;

const viabilityConfig = {
  viable: { label: "Viable", bg: "bg-green-100", text: "text-green-800", border: "border-green-300" },
  challenging: { label: "Challenging", bg: "bg-yellow-100", text: "text-yellow-800", border: "border-yellow-300" },
  not_viable: { label: "Not Viable", bg: "bg-red-100", text: "text-red-800", border: "border-red-300" },
};

const riskConfig = {
  low: { label: "Low Risk", color: "text-green-600", dot: "bg-green-500" },
  moderate: { label: "Moderate Risk", color: "text-yellow-600", dot: "bg-yellow-500" },
  high: { label: "High Risk", color: "text-red-600", dot: "bg-red-500" },
};

export function ExpansionFeasibilityCard({ data }: { data: ExpansionFeasibilityData }) {
  const viability = viabilityConfig[data.viabilityStatus] ?? viabilityConfig.challenging;
  const risk = riskConfig[data.riskLevel] ?? riskConfig.moderate;

  const chartData = (data.monthlyProjections ?? []).map((m) => ({
    month: `M${m.month}`,
    Revenue: m.revenue,
    Cost: m.cost,
    Profit: m.profit,
  }));

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium opacity-75 uppercase tracking-wide">Expansion Feasibility</p>
            <h3 className="text-lg font-bold mt-0.5">{data.locationName}</h3>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span
              className={`text-xs font-semibold px-3 py-1 rounded-full border ${viability.bg} ${viability.text} ${viability.border}`}
            >
              {viability.label}
            </span>
            <span className={`text-xs font-medium flex items-center gap-1 ${risk.color} bg-white/90 px-2 py-0.5 rounded-full`}>
              <span className={`w-2 h-2 rounded-full ${risk.dot}`} />
              {risk.label}
            </span>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* KPI tiles */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Monthly Revenue", value: RM(data.projectedMonthlyRevenue), sub: `Conv. ${data.conversionRate}%` },
            { label: "Monthly Profit", value: RM(data.projectedMonthlyProfit), sub: `Cost ${RM(data.projectedMonthlyCost)}` },
            { label: "Break-even", value: `${data.breakEvenMonths} mo`, sub: `Invest ${RM(data.initialInvestmentRM)}` },
            { label: "12-mo ROI", value: `${data.roi12months.toFixed(1)}%`, sub: `OPR ${data.opr_rate}%` },
          ].map((kpi) => (
            <div key={kpi.label} className="bg-muted/40 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">{kpi.label}</p>
              <p className="text-lg font-bold">{kpi.value}</p>
              <p className="text-xs text-muted-foreground">{kpi.sub}</p>
            </div>
          ))}
        </div>

        {/* Cost breakdown */}
        <div>
          <h4 className="text-sm font-semibold mb-2">Monthly Cost Breakdown</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            {[
              { label: "Rent", value: RM(data.monthlyRent) },
              { label: "Staff", value: RM(data.staffCostMonthly) },
              { label: "COGS", value: RM(data.cogsMonthly) },
              { label: "Utilities", value: RM(data.utilitiesMonthly) },
            ].map((item) => (
              <div key={item.label} className="flex justify-between bg-muted/30 rounded px-2 py-1">
                <span className="text-muted-foreground">{item.label}</span>
                <span className="font-medium">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 12-month chart */}
        {chartData.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-3">12-Month Projection</h4>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.08)" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tickFormatter={(v) => `RM${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10 }} width={52} />
                <Tooltip formatter={(v: number) => RM(v)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="Revenue" stroke="#6366f1" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Cost" stroke="#f59e0b" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Profit" stroke="#10b981" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Recommendation */}
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
          <p className="text-xs font-semibold text-indigo-700 mb-1">AI Recommendation</p>
          <p className="text-sm text-indigo-900">{data.recommendation}</p>
        </div>
      </div>
    </div>
  );
}
