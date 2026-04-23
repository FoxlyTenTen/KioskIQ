"use client";

import React from "react";
import {
    MasterFinancialPlanData,
    InvestmentStrategyData,
    FeasibilityData,
    SummaryPlanData,
    FinancialPlanData
} from "./types";
import { Download } from "lucide-react";

interface DownloadReportButtonProps {
    masterPlanData: MasterFinancialPlanData | null;
    investmentData: InvestmentStrategyData | null;
    feasibilityData: FeasibilityData | null;
    summaryPlanData: SummaryPlanData | null;
    financialPlanData: FinancialPlanData | null;
}

export const DownloadReportButton: React.FC<DownloadReportButtonProps> = ({
    masterPlanData,
    investmentData,
    feasibilityData,
    summaryPlanData,
    financialPlanData
}) => {
    // Only show if at least one piece of data exists
    if (!masterPlanData && !investmentData && !feasibilityData && !summaryPlanData && !financialPlanData) {
        return null;
    }

    const generateReport = () => {
        const sections: string[] = [];
        const timestamp = new Date().toLocaleString();

        sections.push(`# FINANCIAL PLAN REPORT`);
        sections.push(`Generated on: ${timestamp}`);
        sections.push(`----------------------------------------\n`);

        // 1. Summary
        if (summaryPlanData) {
            sections.push(`## 1. FINANCIAL DASHBOARD SUMMARY`);
            sections.push(`Goal: ${summaryPlanData.goalDescription}`);
            sections.push(`Plan Type: ${summaryPlanData.planType}`);
            sections.push(`Monthly Income: $${summaryPlanData.monthlyIncome}`);
            sections.push(`Targeted Expenses: $${summaryPlanData.monthlyTargetedExpenses}`);
            sections.push(`Saving Goal: $${summaryPlanData.savingGoalEnd}`);
            sections.push(`Risk Tolerance: ${summaryPlanData.riskTolerance}`);
            sections.push(`\n`);
        }

        // 2. Feasibility
        if (feasibilityData) {
            sections.push(`## 2. FEASIBILITY ANALYSIS`);
            sections.push(`Status: ${feasibilityData.status.toUpperCase()}`);
            sections.push(`Free Cashflow: $${feasibilityData.freeCashflow}`);
            sections.push(`Required Monthly Saving: $${feasibilityData.requiredMonthlySaving.toFixed(2)}`);
            sections.push(`Gap: $${feasibilityData.gap.toFixed(2)}`);
            sections.push(`Feedback: ${feasibilityData.feedback_message}`);
            sections.push(`\n`);
        }

        // 3. Investment Strategy
        if (investmentData) {
            sections.push(`## 3. INVESTMENT STRATEGY`);
            sections.push(`Strategy: ${investmentData.strategyName}`);
            sections.push(`Risk Level: ${investmentData.riskLevel}`);
            sections.push(`Expected Return: ${investmentData.expectedReturn}`);
            sections.push(`Rationale: ${investmentData.rationale}`);
            sections.push(`Allocation:`);
            Object.entries(investmentData.allocation).forEach(([asset, pct]) => {
                sections.push(` - ${asset}: ${pct}%`);
            });
            sections.push(`Recommended Vehicles: ${investmentData.recommendedVehicles.join(", ")}`);
            sections.push(`\n`);
        }

        // 4. Financial Plan (Coach)
        if (financialPlanData) {
            sections.push(`## 4. DETAILED BUDGET & ADVICE`);
            sections.push(`Advice: ${financialPlanData.advice}`);
            sections.push(`Budget Breakdown:`);
            financialPlanData.budgetBreakdown.forEach(item => {
                sections.push(` - ${item.category}: $${item.amount} (${item.percentage}%)`);
            });
            sections.push(`\n`);
        }

        // 5. Master Plan
        if (masterPlanData) {
            sections.push(`## 5. MASTER FINANCIAL PLAN`);
            sections.push(`Title: ${masterPlanData.plan_title}`);
            sections.push(`Total Target: $${masterPlanData.target_amount}`);
            sections.push(`Monthly Contribution: $${masterPlanData.monthly_contribution}`);
            sections.push(`Advice: ${masterPlanData.recommendation}`);
            sections.push(`Milestones:`);
            masterPlanData.milestones.forEach((m, i) => {
                sections.push(` [Month ${m.month}] Saved: $${m.saved_amount} - ${m.description}`);
            });
        }

        return sections.join("\n");
    };

    const handleDownload = () => {
        window.print();
    };

    return (
        <button
            onClick={handleDownload}
            className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 font-semibold animate-in slide-in-from-bottom-10 print:hidden"
        >
            <Download className="w-5 h-5" />
            Save as PDF
        </button>
    );
};
