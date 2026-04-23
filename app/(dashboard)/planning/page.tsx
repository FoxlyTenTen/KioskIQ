"use client";

import { useState, useEffect } from "react";

import { type ProductResearchData, type FinancialPlanData, type MasterFinancialPlanData, type SummaryPlanData, type FeasibilityData, type InvestmentStrategyData } from "@/components/types";
import { ProductCard } from "@/components/ProductCard";
import { FinancialPlanCard } from "@/components/FinancialPlanCard";
import { MasterPlanCard } from "@/components/MasterPlanCard";
import { SummaryPlanCard } from "@/components/SummaryPlanCard";
import { FeasibilityCard } from "@/components/FeasibilityCard";
import { InvestmentCard } from "@/components/InvestmentCard";
import { DownloadReportButton } from "@/components/DownloadReportButton";
import dynamic from "next/dynamic";

const TravelChat = dynamic(() => import("@/components/travel-chat"), {
  ssr: false,
});

export default function PlanningPage() {
  const [productData, setProductData] = useState<ProductResearchData | null>(null);
  const [financialPlanData, setFinancialPlanData] = useState<FinancialPlanData | null>(null);
  const [masterPlanData, setMasterPlanData] = useState<MasterFinancialPlanData | null>(null);
  const [summaryPlanData, setSummaryPlanData] = useState<SummaryPlanData | null>(null);
  const [feasibilityData, setFeasibilityData] = useState<FeasibilityData | null>(null);
  const [investmentData, setInvestmentData] = useState<InvestmentStrategyData | null>(null);

  return (
    <div className="flex h-[calc(100vh-120px)] overflow-hidden gap-4">
      {/* Chat Panel - Left Side */}
      <div className="w-[450px] flex-shrink-0 border border-border bg-card shadow-sm flex flex-col rounded-xl overflow-hidden">
        <div className="p-6 border-b border-border bg-muted/30">
          <h1 className="text-xl font-semibold mb-1">Planning Assistant</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Multi-Agent System: <span className="text-primary font-semibold">Orchestrator</span> + <span className="text-primary/70 font-semibold">Specialists</span>
          </p>
        </div>

        <div className="flex-1 overflow-hidden">
          <TravelChat
            financialPlanData={financialPlanData}
            summaryPlanData={summaryPlanData}
            feasibilityData={feasibilityData}
            investmentData={investmentData}
            onProductUpdate={setProductData}
            onFinancialPlanUpdate={setFinancialPlanData}
            onMasterPlanUpdate={setMasterPlanData}
            onSummaryPlanUpdate={setSummaryPlanData}
            onFeasibilityUpdate={setFeasibilityData}
            onInvestmentUpdate={setInvestmentData}
          />
        </div>
      </div>

      {/* Visualization Panel - Right Side */}
      <div className="flex-1 overflow-y-auto rounded-xl border border-border bg-card/50">
        <div className="max-w-5xl mx-auto p-8">
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-2">Financial Planning Results</h2>
            <p className="text-muted-foreground">Detailed breakdown and AI-generated insights for your business plan.</p>
          </div>

          {/* Empty State */}
          {!masterPlanData && !financialPlanData && !productData && !summaryPlanData && !feasibilityData && !investmentData && (
            <div className="flex items-center justify-center h-[400px] bg-muted/20 rounded-xl border-2 border-dashed border-border shadow-sm">
              <div className="text-center">
                <div className="text-6xl mb-4">📊</div>
                <h3 className="text-xl font-semibold mb-2">
                  Start Your Planning Journey
                </h3>
                <p className="text-muted-foreground max-w-md">
                  Use the assistant on the left to create financial plans, investment strategies, and feasibility analysis.
                </p>
              </div>
            </div>
          )}

          {/* Planning Visualizations */}
          {financialPlanData && (
            <div className="mb-4">
              <FinancialPlanCard
                data={financialPlanData}
                onUpdate={(updated) => setFinancialPlanData(updated)}
              />
            </div>
          )}

          {(summaryPlanData || feasibilityData) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {summaryPlanData && (
                <div>
                  <SummaryPlanCard
                    data={summaryPlanData}
                    onUpdate={(updated) => setSummaryPlanData(updated)}
                  />
                </div>
              )}
              {feasibilityData && (
                <div>
                  <FeasibilityCard
                    data={feasibilityData}
                    onUpdate={(updated) => setFeasibilityData(updated)}
                  />
                </div>
              )}
            </div>
          )}

          {investmentData && (
            <div className="mb-4">
              <InvestmentCard
                data={investmentData}
                onUpdate={(updated) => setInvestmentData(updated)}
              />
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
      </div>
    </div>
  );
}
