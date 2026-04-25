"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useFinancialData } from "@/components/FinancialDataContext";
import { ProductCard } from "@/components/ProductCard";
import { FinancialPlanCard } from "@/components/FinancialPlanCard";
import { MasterPlanCard } from "@/components/MasterPlanCard";
import { SummaryPlanCard } from "@/components/SummaryPlanCard";
import { FeasibilityCard } from "@/components/FeasibilityCard";
import { InvestmentCard } from "@/components/InvestmentCard";
import { SelectedSiteCard } from "@/components/SelectedSiteCard";
import { SiteMapCard } from "@/components/SiteMapCard";
import { DownloadReportButton } from "@/components/DownloadReportButton";
import { ExpansionFeasibilityCard } from "@/components/ExpansionFeasibilityCard";
import { MarketStrategyCard } from "@/components/MarketStrategyCard";
import { RiskProfileCard } from "@/components/RiskProfileCard";
import { StrategicRoadmapCard } from "@/components/StrategicRoadmapCard";

export default function PlanningPage() {
  const {
    productData,
    financialPlanData,
    masterPlanData,
    summaryPlanData,
    feasibilityData,
    investmentData,
    selectedSiteOption,
    expansionFeasibilityData,
    selectedMarketStrategy,
    selectedRiskProfile,
    selectedRoadmap,
    roadmapData,
    setFinancialPlanData,
    setSummaryPlanData,
    setFeasibilityData,
    setInvestmentData,
  } = useFinancialData();

  const [currentSlide, setCurrentSlide] = useState(0);
  const prevSlideCount = useRef(0);

  // Build the ordered slide list from whatever data is available
  type Slide = { id: string; label: string; icon: string; node: React.ReactNode };
  const slides: Slide[] = [];

  if (selectedSiteOption) {
    slides.push({
      id: "site",
      label: "Selected Location",
      icon: "🗺️",
      node: (
        <div className="space-y-4">
          <SelectedSiteCard data={selectedSiteOption} />
          <SiteMapCard data={selectedSiteOption} />
        </div>
      ),
    });
  }
  if (expansionFeasibilityData) {
    slides.push({
      id: "exp-feasibility",
      label: "Expansion Feasibility",
      icon: "💰",
      node: <ExpansionFeasibilityCard data={expansionFeasibilityData} />,
    });
  }
  if (selectedMarketStrategy) {
    slides.push({
      id: "market-strategy",
      label: "Market Strategy",
      icon: "🎯",
      node: (
        <MarketStrategyCard
          data={selectedMarketStrategy}
          locationName={selectedSiteOption?.name}
        />
      ),
    });
  }
  if (selectedRiskProfile) {
    slides.push({
      id: "risk-profile",
      label: "Risk Profile",
      icon: "🛡️",
      node: (
        <RiskProfileCard
          data={selectedRiskProfile}
          locationName={selectedSiteOption?.name}
        />
      ),
    });
  }
  if (selectedRoadmap) {
    slides.push({
      id: "roadmap",
      label: "Expansion Roadmap",
      icon: "🗺️",
      node: (
        <StrategicRoadmapCard
          data={selectedRoadmap}
          locationName={selectedSiteOption?.name}
          finalRecommendation={roadmapData?.finalRecommendation ?? undefined}
        />
      ),
    });
  }
  if (summaryPlanData) {
    slides.push({
      id: "summary",
      label: "Plan Summary",
      icon: "📊",
      node: <SummaryPlanCard data={summaryPlanData} onUpdate={setSummaryPlanData} />,
    });
  }
  if (feasibilityData) {
    slides.push({
      id: "feasibility",
      label: "Feasibility Check",
      icon: "🧮",
      node: <FeasibilityCard data={feasibilityData} onUpdate={setFeasibilityData} />,
    });
  }
  if (investmentData) {
    slides.push({
      id: "investment",
      label: "Investment Strategy",
      icon: "📈",
      node: <InvestmentCard data={investmentData} onUpdate={setInvestmentData} />,
    });
  }
  if (financialPlanData) {
    slides.push({
      id: "financial-plan",
      label: "Financial Plan",
      icon: "💼",
      node: (
        <FinancialPlanCard data={financialPlanData} onUpdate={setFinancialPlanData} />
      ),
    });
  }
  if (masterPlanData) {
    slides.push({
      id: "master-plan",
      label: "Master Plan",
      icon: "🎯",
      node: <MasterPlanCard data={masterPlanData} />,
    });
  }
  if (productData) {
    slides.push({
      id: "products",
      label: "Product Research",
      icon: "🛍️",
      node: <ProductCard data={productData} />,
    });
  }

  // Auto-advance to the newest slide when a new one arrives
  useEffect(() => {
    if (slides.length > prevSlideCount.current) {
      setCurrentSlide(slides.length - 1);
    }
    prevSlideCount.current = slides.length;
  }, [slides.length]);

  // Clamp current slide if data is removed
  const safeSlide = Math.min(currentSlide, Math.max(0, slides.length - 1));

  const isEmpty = slides.length === 0;

  const prev = () => setCurrentSlide((s) => Math.max(0, s - 1));
  const next = () => setCurrentSlide((s) => Math.min(slides.length - 1, s + 1));

  return (
    <div className="max-w-4xl mx-auto h-full flex flex-col">
      {/* Header */}
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-1">Business Intelligence Canvas</h2>
          <p className="text-sm text-muted-foreground">
            {isEmpty
              ? "Waiting for agent responses…"
              : `${slides.length} result${slides.length > 1 ? "s" : ""} · use arrows to navigate`}
          </p>
        </div>

        {!isEmpty && (
          <DownloadReportButton
            masterPlanData={masterPlanData}
            investmentData={investmentData}
            feasibilityData={feasibilityData}
            summaryPlanData={summaryPlanData}
            financialPlanData={financialPlanData}
          />
        )}
      </div>

      {isEmpty ? (
        <div className="flex-1 flex items-center justify-center bg-muted/20 rounded-xl border-2 border-dashed border-border">
          <div className="text-center">
            <div className="text-6xl mb-4">🏬</div>
            <h3 className="text-xl font-semibold mb-2">Find Your Next Winning Location</h3>
            <p className="text-muted-foreground max-w-md text-sm">
              Tell the AI your expansion goals — it will scout locations, assess feasibility, research the market, and build your retail growth roadmap.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Dot + label breadcrumb */}
          <div className="flex items-center justify-center gap-1.5 mb-5 flex-wrap">
            {slides.map((slide, idx) => (
              <button
                key={slide.id}
                onClick={() => setCurrentSlide(idx)}
                className="flex items-center gap-1.5 group"
                title={slide.label}
              >
                {/* Connecting line before (skip first) */}
                {idx > 0 && (
                  <div
                    className={`h-px w-5 rounded-full transition-all duration-300 ${
                      idx <= safeSlide ? "bg-primary" : "bg-border"
                    }`}
                  />
                )}
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                      idx === safeSlide
                        ? "bg-primary scale-125 shadow-[0_0_6px] shadow-primary/50"
                        : idx < safeSlide
                        ? "bg-primary/60"
                        : "bg-border"
                    }`}
                  />
                  <span
                    className={`text-[10px] font-medium transition-colors duration-200 max-w-[60px] text-center leading-tight ${
                      idx === safeSlide
                        ? "text-primary"
                        : "text-muted-foreground"
                    }`}
                  >
                    {slide.icon} {slide.label}
                  </span>
                </div>
              </button>
            ))}
          </div>

          {/* Slide content */}
          <div className="flex-1 relative overflow-hidden">
            {slides.map((slide, idx) => (
              <div
                key={slide.id}
                className={`absolute inset-0 overflow-y-auto transition-all duration-400 ${
                  idx === safeSlide
                    ? "opacity-100 translate-x-0 pointer-events-auto"
                    : idx < safeSlide
                    ? "opacity-0 -translate-x-8 pointer-events-none"
                    : "opacity-0 translate-x-8 pointer-events-none"
                }`}
                style={{ transition: "opacity 0.35s ease, transform 0.35s ease" }}
              >
                <div className="pb-6">{slide.node}</div>
              </div>
            ))}
          </div>

          {/* Prev / Next controls */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-border shrink-0">
            <button
              onClick={prev}
              disabled={safeSlide === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card text-sm font-medium transition-all duration-200 hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>

            <span className="text-xs text-muted-foreground font-medium tabular-nums">
              {safeSlide + 1} / {slides.length}
            </span>

            <button
              onClick={next}
              disabled={safeSlide === slides.length - 1}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card text-sm font-medium transition-all duration-200 hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
