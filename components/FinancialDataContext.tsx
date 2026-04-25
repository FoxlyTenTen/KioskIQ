"use client";

import React, { createContext, useContext, useState } from "react";
import type {
  ProductResearchData,
  FinancialPlanData,
  MasterFinancialPlanData,
  SummaryPlanData,
  FeasibilityData,
  InvestmentStrategyData,
  SiteSelectionOption,
} from "./types";
import type { ExpansionFeasibilityData } from "./ExpansionFeasibilityCard";

interface FinancialDataState {
  productData: ProductResearchData | null;
  financialPlanData: FinancialPlanData | null;
  masterPlanData: MasterFinancialPlanData | null;
  summaryPlanData: SummaryPlanData | null;
  feasibilityData: FeasibilityData | null;
  investmentData: InvestmentStrategyData | null;
  selectedSiteOption: SiteSelectionOption | null;
  expansionFeasibilityData: ExpansionFeasibilityData | null;
  setProductData: (d: ProductResearchData | null) => void;
  setFinancialPlanData: (d: FinancialPlanData | null) => void;
  setMasterPlanData: (d: MasterFinancialPlanData | null) => void;
  setSummaryPlanData: (d: SummaryPlanData | null) => void;
  setFeasibilityData: (d: FeasibilityData | null) => void;
  setInvestmentData: (d: InvestmentStrategyData | null) => void;
  setSelectedSiteOption: (d: SiteSelectionOption | null) => void;
  setExpansionFeasibilityData: (d: ExpansionFeasibilityData | null) => void;
}

const FinancialDataContext = createContext<FinancialDataState | null>(null);

export function FinancialDataProvider({ children }: { children: React.ReactNode }) {
  const [productData, setProductData] = useState<ProductResearchData | null>(null);
  const [financialPlanData, setFinancialPlanData] = useState<FinancialPlanData | null>(null);
  const [masterPlanData, setMasterPlanData] = useState<MasterFinancialPlanData | null>(null);
  const [summaryPlanData, setSummaryPlanData] = useState<SummaryPlanData | null>(null);
  const [feasibilityData, setFeasibilityData] = useState<FeasibilityData | null>(null);
  const [investmentData, setInvestmentData] = useState<InvestmentStrategyData | null>(null);
  const [selectedSiteOption, setSelectedSiteOption] = useState<SiteSelectionOption | null>(null);
  const [expansionFeasibilityData, setExpansionFeasibilityData] = useState<ExpansionFeasibilityData | null>(null);

  return (
    <FinancialDataContext.Provider
      value={{
        productData,
        financialPlanData,
        masterPlanData,
        summaryPlanData,
        feasibilityData,
        investmentData,
        selectedSiteOption,
        expansionFeasibilityData,
        setProductData,
        setFinancialPlanData,
        setMasterPlanData,
        setSummaryPlanData,
        setFeasibilityData,
        setInvestmentData,
        setSelectedSiteOption,
        setExpansionFeasibilityData,
      }}
    >
      {children}
    </FinancialDataContext.Provider>
  );
}

export function useFinancialData() {
  const ctx = useContext(FinancialDataContext);
  if (!ctx) throw new Error("useFinancialData must be used within FinancialDataProvider");
  return ctx;
}
