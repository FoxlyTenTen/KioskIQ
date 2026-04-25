/**
 * CopilotKit API Route with A2A Middleware
 *
 * Sets up the connection between:
 * - Frontend (CopilotKit) → A2A Middleware → Orchestrator → A2A Agents
 *
 * KEY CONCEPTS:
 * - AG-UI Protocol: Agent-UI communication (CopilotKit ↔ Orchestrator)
 * - A2A Protocol: Agent-to-agent communication (Orchestrator ↔ Specialized Agents)
 * - A2A Middleware: Injects send_message_to_a2a_agent tool to bridge AG-UI and A2A
 */

import {
  CopilotRuntime,
  ExperimentalEmptyAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from "@copilotkit/runtime";
import { HttpAgent } from "@ag-ui/client";
import { A2AMiddlewareAgent } from "@ag-ui/a2a-middleware";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  // STEP 1: Define A2A agent URLs
  // STEP 1: Define A2A agent URLs
  const productAgentUrl = process.env.PRODUCT_AGENT_URL || "http://localhost:9006";
  const coachAgentUrl = process.env.COACH_AGENT_URL || "http://localhost:9007";
  const databaseAgentUrl = process.env.DATABASE_AGENT_URL || "http://localhost:9008";
  const plannerAgentUrl = process.env.PLANNER_AGENT_URL || "http://localhost:9009";
  const summaryAgentUrl = process.env.SUMMARY_AGENT_URL || "http://localhost:9010";
  const feasibilityAgentUrl = process.env.FEASIBILITY_AGENT_URL || "http://localhost:9011";
  const investmentAgentUrl = process.env.INVESTMENT_AGENT_URL || "http://localhost:9012";
  const forecastAgentUrl = process.env.FORECAST_AGENT_URL || "http://localhost:9025";
  const siteSelectionAgentUrl = process.env.SITE_SELECTION_AGENT_URL || "http://localhost:9020";
  const expansionFeasibilityAgentUrl = process.env.EXPANSION_FEASIBILITY_AGENT_URL || "http://localhost:9021";
  const marketResearcherAgentUrl = process.env.MARKET_RESEARCHER_AGENT_URL || "http://localhost:9022";
  const riskManagerAgentUrl = process.env.RISK_MANAGER_AGENT_URL || "http://localhost:9023";
  const strategicPlannerAgentUrl = process.env.STRATEGIC_PLANNER_AGENT_URL || "http://localhost:9024";

  // STEP 2: Define orchestrator URL (speaks AG-UI Protocol)
  const orchestratorUrl = process.env.ORCHESTRATOR_URL || "http://localhost:9000";

  // STEP 3: Wrap orchestrator with HttpAgent (AG-UI client)
  const orchestrationAgent = new HttpAgent({
    url: orchestratorUrl,
  });

  // STEP 4: Create A2A Middleware Agent
  const a2aMiddlewareAgent = new A2AMiddlewareAgent({
    description:
      "Financial planning assistant with specialized agents.",

    agentUrls: [
      productAgentUrl,
      coachAgentUrl,
      databaseAgentUrl,
      plannerAgentUrl,
      summaryAgentUrl,
      feasibilityAgentUrl,
      investmentAgentUrl,
      forecastAgentUrl,
      siteSelectionAgentUrl,
      expansionFeasibilityAgentUrl,
      marketResearcherAgentUrl,
      riskManagerAgentUrl,
      strategicPlannerAgentUrl,
    ],

    orchestrationAgent,

    // Workflow instructions (middleware auto-adds routing info)
    instructions: `
      You are a Financial Planning Assistant that orchestrates specialized agents.

      AVAILABLE AGENTS:
      - Forecast Agent (ADK): ML-powered demand forecasting using live Supabase data. Predicts daily orders, revenue, AOV, stockout risk, expiry waste, reorder quantities, and top sellers for outlet-1/outlet-2/outlet-3. Use for any forecast or prediction request.
      - Coach Agent (ADK): Analyzes spending, provides conversational advice, AND creates structured financial plans.
      - Database Agent (ADK): Handles database operations.
      - Prod Research Agent (ADK): Finds best deals.
      - Summary Agent (ADK): Displays a real-time dashboard summary of user input.
      - Feasibility Agent (ADK): Deterministically checks plan feasibility (math-based).
      - Investment Agent (ADK): Recommends investment strategies based on profile.
      - Site Selection Expert Agent (ADK): Analyses Malaysian mall/commercial locations for F&B kiosk expansion. Returns 3 candidate sites with foot traffic, rent, competition scores, pros and cons.
      - Expansion Feasibility Agent (ADK): Projects financial feasibility for a selected F&B kiosk expansion location. Returns monthly revenue, profit, break-even timeline, ROI, and risk classification. Use the exact name "Expansion Feasibility Agent" when calling this agent.
      - Market Researcher (ADK): Analyses competitor market segments and demographics for a chosen location. Returns 3 market strategy options (Premium/Value/Niche) for the user to select. Use the exact name "Market Researcher" when calling this agent.
      - Risk Manager (ADK): Generates 3 risk management profiles (Conservative/Balanced/Aggressive) based on all prior selections. Returns risk assessments, mitigation strategies, contingency plans, and financial buffers. Use the exact name "Risk Manager" when calling this agent.
      - Strategic Planner (ADK): Synthesises all prior selections into 3 expansion roadmaps. Returns phased roadmaps with timelines, investment schedules, milestones, and a final recommendation. Use the exact name "Strategic Planner" when calling this agent.

      WORKFLOW STRATEGY (SEQUENTIAL):

      1. **Financial Planning Master Flow**:
         - Trigger: User wants a "financial plan" or "savings plan".
         - Step 1: Call 'gather_financial_planning_details' (form).
         - Step 2: Call Summary Agent -> Display Dashboard (MANDATORY immediate confirmation).
         - Step 3: Call Feasibility Agent -> Check Math (Are inputs realistic?).
         - Step 4: Call Investment Agent -> Get Strategy (Allocation & Vehicles).
         - Step 5 (Optional): If goal is a product, Call Product Agent.
         - Step 6: Call Financial Planner Agent -> Synthesize Master Plan.

      2. **Transaction Management**:
         - Trigger: "I spent $50", "List my expenses".
         - Add: Call 'gather_transaction_details' -> Database Agent ('add_transaction').
         - View: Call Database Agent ('get_user_transactions') -> Show results.

      4. **Business Location Expansion**:
         - Trigger: "I want to expand my business location", "open a second kiosk", "new outlet", "site selection", "find me a new location", "expand my business".
         - Step 1: Call 'gather_expansion_details' (HITL form — collects targetArea, budgetRange, businessType). Wait for user to submit.
         - Step 2: Call Site Selection Expert Agent with the submitted form data (targetArea, budgetRange, businessType).
         - Step 3: The agent returns JSON with 3 location options. Call 'display_site_selection_options' with the full agent response to show the HITL selection card.
         - Step 4: Wait for user to select a location option (respond() will fire).
         - Step 5: Confirm the selection and tell the user their chosen location.
         - Step 6: Call Expansion Feasibility Agent with the selected location's metrics (name, rent, foot traffic, competitor count, scores).
         - Step 7: Call 'display_expansion_feasibility' with the full agent JSON response to show the projection card.
         - Step 8: Call Market Researcher with the selected location name, coordinates, and targetArea.
         - Step 9: Call 'display_market_strategy_options' with the full agent JSON response to show the HITL strategy selection card.
         - Step 10: Wait for user to select a strategy (respond() will fire with the selected strategy).
         - Step 11: Confirm the chosen strategy.
         - Step 12: Call Risk Manager with all prior selections.
         - Step 13: Call 'display_risk_profile_options' with the full agent JSON response.
         - Step 14: Wait for user to select a risk profile (respond() fires).
         - Step 15: Confirm the chosen risk profile.
         - Step 16: Call Strategic Planner with all prior selections.
         - Step 17: Call 'display_strategic_roadmap_options' with the full agent JSON response.
         - Step 18: Wait for user to select a roadmap (respond() fires).
         - Step 19: Congratulate the user with a brief expansion plan summary.
         - DO NOT trigger the financial planning flow for this.

      3. **Ad-Hoc Product Shopping / Quick Advice**:
         - Trigger: queries like "Can I afford x?", "Check price of y", "Is buying z good?".
         - ACTION: Call Product Research Agent (for price) OR Financial Coach Agent (in MODE 1: Chatbot).
         - DO NOT trigger the 'Financial Planning Master Flow' (Step 1 form) for simple questions.

      CRITICAL RULES:
      - Call agents ONE AT A TIME.
      - Wait for results.
    `,
  });

  // STEP 5: Create CopilotKit Runtime
  const runtime = new CopilotRuntime({
    agents: {
      a2a_chat: a2aMiddlewareAgent, // Must match frontend: <CopilotKit agent="a2a_chat">
    },
  });

  // STEP 6: Set up Next.js endpoint handler
  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime,
    serviceAdapter: new ExperimentalEmptyAdapter(),
    endpoint: "/api/copilotkit",
  });

  return handleRequest(request);
}
