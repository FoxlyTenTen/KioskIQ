"use client";

import { useState, useEffect } from "react";

import { type ItineraryData, type BudgetData, type WeatherData, type RestaurantData, type ProductResearchData, type FinancialPlanData, type MasterFinancialPlanData, type SummaryPlanData, type FeasibilityData, type InvestmentStrategyData } from "@/components/types";
import { ItineraryCard } from "@/components/ItineraryCard";
import { BudgetBreakdown } from "@/components/BudgetBreakdown";
import { WeatherCard } from "@/components/WeatherCard";
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

export default function Home() {
  const [itineraryData, setItineraryData] = useState<ItineraryData | null>(null);
  const [budgetData, setBudgetData] = useState<BudgetData | null>(null);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [restaurantData, setRestaurantData] = useState<RestaurantData | null>(null);
  const [productData, setProductData] = useState<ProductResearchData | null>(null);
  const [financialPlanData, setFinancialPlanData] = useState<FinancialPlanData | null>(null);
  const [masterPlanData, setMasterPlanData] = useState<MasterFinancialPlanData | null>(null);
  const [summaryPlanData, setSummaryPlanData] = useState<SummaryPlanData | null>(null);
  const [feasibilityData, setFeasibilityData] = useState<FeasibilityData | null>(null);
  const [investmentData, setInvestmentData] = useState<InvestmentStrategyData | null>(null);

  return (
    <div className="relative flex h-screen overflow-hidden bg-[#DEDEE9] p-2">
      {/* Background Blobs */}
      <div className="absolute w-[445.84px] h-[445.84px] left-[1040px] top-[11px] rounded-full z-0"
        style={{ background: 'rgba(255, 172, 77, 0.2)', filter: 'blur(103.196px)' }} />
      <div className="absolute w-[609.35px] h-[609.35px] left-[1338.97px] top-[624.5px] rounded-full z-0"
        style={{ background: '#C9C9DA', filter: 'blur(103.196px)' }} />
      <div className="absolute w-[609.35px] h-[609.35px] left-[670px] top-[-365px] rounded-full z-0"
        style={{ background: '#C9C9DA', filter: 'blur(103.196px)' }} />
      <div className="absolute w-[609.35px] h-[609.35px] left-[507.87px] top-[702.14px] rounded-full z-0"
        style={{ background: '#F3F3FC', filter: 'blur(103.196px)' }} />
      <div className="absolute w-[445.84px] h-[445.84px] left-[127.91px] top-[331px] rounded-full z-0"
        style={{ background: 'rgba(255, 243, 136, 0.3)', filter: 'blur(103.196px)' }} />
      <div className="absolute w-[445.84px] h-[445.84px] left-[-205px] top-[802.72px] rounded-full z-0"
        style={{ background: 'rgba(255, 172, 77, 0.2)', filter: 'blur(103.196px)' }} />

      <div className="flex flex-1 overflow-hidden z-10 gap-2">
        {/* Chat Panel - Left Side */}
        <div className="w-[450px] flex-shrink-0 border-2 border-white bg-white/50 backdrop-blur-md shadow-elevation-lg flex flex-col rounded-lg overflow-hidden">
          <div className="p-6 border-b border-[#DBDBE5]">
            <h1 className="text-2xl font-semibold text-[#010507] mb-1">Planning Assistant</h1>
            <p className="text-sm text-[#57575B] leading-relaxed">
              Multi-Agent Demo:{" "}
              <span className="text-[#1B936F] font-semibold">Orchestrator</span> +{" "}
              <span className="text-[#BEC2FF] font-semibold">Specialists</span>
            </p>
            <p className="text-xs text-[#838389] mt-1">3D Visualization Template</p>
          </div>

          <div className="flex-1 overflow-hidden">
            <TravelChat
              financialPlanData={financialPlanData}
              summaryPlanData={summaryPlanData}
              feasibilityData={feasibilityData}
              investmentData={investmentData}
              onItineraryUpdate={setItineraryData}
              onBudgetUpdate={setBudgetData}
              onWeatherUpdate={setWeatherData}
              onRestaurantUpdate={setRestaurantData}
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
        <div className="flex-1 overflow-y-auto rounded-lg bg-white/30 backdrop-blur-sm">
          <div className="max-w-5xl mx-auto p-8">
            <div className="mb-8">
              <h2 className="text-3xl font-semibold text-[#010507] mb-2">Financial Planning Dashboard</h2>
              <p className="text-[#57575B]">Real-time financial insights & visualization</p>
            </div>

            {/* Empty State */}
            {!masterPlanData && !financialPlanData && !itineraryData && !budgetData && !weatherData && !productData && !summaryPlanData && !feasibilityData && !investmentData && (
              <div className="flex items-center justify-center h-[400px] bg-white/60 backdrop-blur-md rounded-xl border-2 border-dashed border-[#DBDBE5] shadow-elevation-sm">
                <div className="text-center">
                  <div className="text-6xl mb-4">📊</div>
                  <h3 className="text-xl font-semibold text-[#010507] mb-2">
                    Start Your Planning Journey
                  </h3>
                  <p className="text-[#57575B] max-w-md">
                    Use the assistant to create financial plans, investment strategies, and feasibility analysis.
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

            {itineraryData && (
              <div className="mb-4">
                <ItineraryCard data={itineraryData} restaurantData={restaurantData} />
              </div>
            )}

            {(weatherData || budgetData) && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {weatherData && (
                  <div>
                    <WeatherCard data={weatherData} />
                  </div>
                )}
                {budgetData && (
                  <div>
                    <BudgetBreakdown data={budgetData} />
                  </div>
                )}
              </div>
            )}

            {productData && (
              <div className="mt-4">
                <ProductCard data={productData} />
              </div>
            )}

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
