"use client";

import { useFinancialData } from "@/components/FinancialDataContext";
import { ProductCard } from "@/components/ProductCard";
import { FinancialPlanCard } from "@/components/FinancialPlanCard";
import { MasterPlanCard } from "@/components/MasterPlanCard";
import { SummaryPlanCard } from "@/components/SummaryPlanCard";
import { FeasibilityCard } from "@/components/FeasibilityCard";
import { InvestmentCard } from "@/components/InvestmentCard";
import { DownloadReportButton } from "@/components/DownloadReportButton";

export default function PlanningPage() {
  const {
    productData,
    financialPlanData,
    masterPlanData,
    summaryPlanData,
    feasibilityData,
    investmentData,
    setFinancialPlanData,
    setSummaryPlanData,
    setFeasibilityData,
    setInvestmentData,
  } = useFinancialData();

  const isEmpty =
    !masterPlanData &&
    !financialPlanData &&
    !productData &&
    !summaryPlanData &&
    !feasibilityData &&
    !investmentData;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-2">Financial Planning Results</h2>
        <p className="text-muted-foreground">
          Detailed breakdown and AI-generated insights for your business plan.
        </p>
      </div>

      {isEmpty && (
        <div className="flex items-center justify-center h-[400px] bg-muted/20 rounded-xl border-2 border-dashed border-border shadow-sm">
          <div className="text-center">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-xl font-semibold mb-2">Start Your Planning Journey</h3>
            <p className="text-muted-foreground max-w-md">
              Use the assistant on the right to create financial plans, investment strategies, and feasibility analysis.
            </p>
          </div>
        </div>
      )}

      {financialPlanData && (
        <div className="mb-4">
          <FinancialPlanCard data={financialPlanData} onUpdate={setFinancialPlanData} />
        </div>
      )}

      {(summaryPlanData || feasibilityData) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {summaryPlanData && (
            <SummaryPlanCard data={summaryPlanData} onUpdate={setSummaryPlanData} />
          )}
          {feasibilityData && (
            <FeasibilityCard data={feasibilityData} onUpdate={setFeasibilityData} />
          )}
        </div>
      )}

      {investmentData && (
        <div className="mb-4">
          <InvestmentCard data={investmentData} onUpdate={setInvestmentData} />
        </div>
      )}

      {masterPlanData && (
        <div className="mb-4">
          <MasterPlanCard data={masterPlanData} />
        </div>
      )}

      {productData && (
        <div className="mt-4">
          <ProductCard data={productData} />
        </div>
      )}

      <div className="mt-8 flex justify-end">
        <DownloadReportButton
          masterPlanData={masterPlanData}
          investmentData={investmentData}
          feasibilityData={feasibilityData}
          summaryPlanData={summaryPlanData}
          financialPlanData={financialPlanData}
        />
      </div>
    </div>
  );
}
