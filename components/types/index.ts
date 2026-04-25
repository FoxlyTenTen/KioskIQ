/**
 * Shared Type Definitions
 *
 * This file contains all TypeScript interfaces and types used across
 * the application. Centralizing types makes them easier to maintain and reuse.
 */

import { ActionRenderProps } from "@copilotkit/react-core";

// ============================================================================
// A2A Action Types
// ============================================================================

/**
 * Type for the send_message_to_a2a_agent action parameters
 */
export type MessageActionRenderProps = ActionRenderProps<
  [
    {
      readonly name: "agentName";
      readonly type: "string";
      readonly description: "The name of the A2A agent to send the message to";
    },
    {
      readonly name: "task";
      readonly type: "string";
      readonly description: "The message to send to the A2A agent";
    }
  ]
>;

/**
 * Type for financial planning form action parameters
 */
export type FinancialPlanningActionRenderProps = ActionRenderProps<
  [
    {
      readonly name: "goalDescription";
      readonly type: "string";
      readonly description: "Description of the goal (e.g., 'Buy iPhone 17')";
    },
    {
      readonly name: "planType";
      readonly type: "string";
      readonly description: "Plan Type (short, medium, long)";
      readonly enum: ["short", "medium", "long"];
    },
    {
      readonly name: "monthlyIncome";
      readonly type: "number";
      readonly description: "Monthly Income";
    },
    {
      readonly name: "monthlyTargetedExpenses";
      readonly type: "number";
      readonly description: "Monthly Targeted Expenses";
    },
    {
      readonly name: "savingGoalEnd";
      readonly type: "number";
      readonly description: "Saving Goal End Amount";
    },
    {
      readonly name: "riskTolerance";
      readonly type: "string";
      readonly description: "Risk Tolerance (Conservative, Moderate, Aggressive)";
      readonly enum: ["Conservative", "Moderate", "Aggressive"];
    }
  ]
>;

// ============================================================================
// Agent Data Structures
// ============================================================================

// Product Research
export interface ProductResult {
  product_name: string;
  rating: string;
  key_feature: string;
  description: string;
  best_deal: {
    price: number;
    retailer: string;
    link: string;
  };
}

export interface ProductResearchData {
  query: string;
  results: ProductResult[];
}

// Transaction List
export interface Transaction {
  transaction_id: string;
  name: string;
  amount: number;
  category: string;
  date: string;
  description: string;
  type: string;
}

export interface TransactionData {
  transactions: Transaction[];
  total_amount: number;
  count: number;
}

// Financial Plan
export interface FinancialPlanData {
  goalDescription: string;
  planType: string;
  monthlyIncome: number;
  monthlyTargetedExpenses: number;
  savingGoalEnd: number;
  riskTolerance: string;
  advice: string;
  budgetBreakdown: {
    category: string;
    amount: number;
    percentage: number;
    status: string;
  }[];
}

// Master Financial Plan
export interface Milestone {
  month: number;
  saved_amount: number;
  description: string;
}

export interface MasterFinancialPlanData {
  plan_title: string;
  goal: string;
  target_amount: number;
  monthly_contribution: number;
  months_to_goal: number;
  feasibility: string;
  milestones: Milestone[];
  recommendation: string;
}

// Summary Plan
export interface SummaryPlanData {
  goalDescription: string;
  planType: string;
  monthlyIncome: number;
  monthlyTargetedExpenses: number;
  savingGoalEnd: number;
  riskTolerance: string;
  dashboard_message: string;
  timestamp: string;
}

// Feasibility Data
export interface FeasibilityData {
  monthlyIncome: number;
  monthlyTargetedExpenses: number;
  freeCashflow: number;
  savingGoalEnd: number;
  months: number;
  requiredMonthlySaving: number;
  gap: number;
  savingsRate: number | null;
  status: "feasible" | "challenging" | "unrealistic";
  feedback_message: string;
}

// Site Selection Data
export interface SiteCompetitor {
  name: string;
  coordinates: { lat: number; lng: number };
}

export interface SiteSelectionOption {
  optionId: string;
  name: string;
  type: string;
  summary: string;
  coordinates?: { lat: number; lng: number };
  competitors?: SiteCompetitor[];
  metrics: {
    footTrafficDaily: number;
    rentMonthlyRM: number;
    competitorCount: number;
    populationNearby: number;
    driveTimeFromCityCentre: string;
  };
  scores: {
    footTrafficScore: number;
    affordabilityScore: number;
    competitionScore: number;
    growthScore: number;
    overallScore: number;
  };
  pros: string[];
  cons: string[];
}

export interface SiteSelectionData {
  agentName: string;
  actionType: string;
  targetArea: string;
  userPrompt: string;
  options: SiteSelectionOption[];
  nextStep: string;
}

// Investment Data
export interface InvestmentStrategyData {
  strategyName: string;
  riskLevel: string;
  allocation: Record<string, number>;
  recommendedVehicles: string[];
  expectedReturn: string;
  rationale: string;
}

// ============================================================================
// Component Props
// ============================================================================

export interface TravelChatProps {
  // Data Props (for Shared State Sync)
  financialPlanData?: FinancialPlanData | null;
  summaryPlanData?: SummaryPlanData | null;
  feasibilityData?: FeasibilityData | null;
  investmentData?: InvestmentStrategyData | null;

  // Update Handlers
  onProductUpdate?: (data: ProductResearchData | null) => void;
  onTransactionUpdate?: (data: TransactionData | null) => void;
  onFinancialPlanUpdate?: (data: FinancialPlanData | null) => void;
  onMasterPlanUpdate?: (data: MasterFinancialPlanData | null) => void;
  onSummaryPlanUpdate?: (data: SummaryPlanData | null) => void;
  onFeasibilityUpdate?: (data: FeasibilityData | null) => void;
  onInvestmentUpdate?: (data: InvestmentStrategyData | null) => void;
  onSelectedSiteUpdate?: (data: SiteSelectionOption) => void;
  onExpansionFeasibilityUpdate?: (data: import("../ExpansionFeasibilityCard").ExpansionFeasibilityData) => void;
}

export interface AgentStyle {
  bgColor: string;
  textColor: string;
  borderColor: string;
  icon: string;
  framework: string;
}
