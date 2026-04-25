"use client";

import React, { useState, useEffect } from "react";
import { CopilotKit, useCopilotChat } from "@copilotkit/react-core";
import { CopilotChat } from "@copilotkit/react-ui";
import { useCopilotAction, useCoAgent } from "@copilotkit/react-core";
import "@copilotkit/react-ui/styles.css";
import "./style.css";

import type {
  TravelChatProps,
  ProductResearchData,
  MessageActionRenderProps,
  FinancialPlanData,
  MasterFinancialPlanData,
  SummaryPlanData,
  FeasibilityData,
  InvestmentStrategyData,
  SiteSelectionData,
} from "./types";

import { MessageToA2A } from "./a2a/MessageToA2A";
import { MessageFromA2A } from "./a2a/MessageFromA2A";
import { FinancialPlanningForm } from "./forms/FinancialPlanningForm";
import { ExpansionDetailsForm } from "./forms/ExpansionDetailsForm";
import { ProductCard } from "./ProductCard";
import { MasterPlanCard } from "./MasterPlanCard";
import { SummaryPlanCard } from "./SummaryPlanCard";
import { FeasibilityCard } from "./FeasibilityCard";
import { InvestmentCard } from "./InvestmentCard";
import { SiteSelectionCard } from "./SiteSelectionCard";
import { ExpansionFeasibilityCard } from "./ExpansionFeasibilityCard";
import type { ExpansionFeasibilityData } from "./ExpansionFeasibilityCard";
import { normalizeSiteSelectionData } from "./site-selection-utils";

// ─────────────────────────────────────────────────────────────────────────────

const ChatInner = (props: TravelChatProps) => {
  const {
    onProductUpdate,
    onFinancialPlanUpdate,
    onMasterPlanUpdate,
    onSummaryPlanUpdate,
    onFeasibilityUpdate,
    onInvestmentUpdate,
    onSelectedSiteUpdate,
    onExpansionFeasibilityUpdate,
  } = props;

  // ── Shared agent state (co-agent sync) ──────────────────────────────────────
  const { state: financialState, setState: setFinancialState } = useCoAgent<{
    financial_plan?: FinancialPlanData;
    summary_plan?: SummaryPlanData;
    feasibility?: FeasibilityData;
    investment?: InvestmentStrategyData;
  }>({ name: "a2a_chat", initialState: {} });

  useEffect(() => {
    if (props.financialPlanData)
      setFinancialState({ ...financialState, financial_plan: props.financialPlanData });
  }, [props.financialPlanData]);

  useEffect(() => {
    if (props.summaryPlanData)
      setFinancialState({ ...financialState, summary_plan: props.summaryPlanData });
  }, [props.summaryPlanData]);

  useEffect(() => {
    if (props.feasibilityData)
      setFinancialState({ ...financialState, feasibility: props.feasibilityData });
  }, [props.feasibilityData]);

  useEffect(() => {
    if (props.investmentData)
      setFinancialState({ ...financialState, investment: props.investmentData });
  }, [props.investmentData]);

  useEffect(() => {
    if (financialState?.financial_plan &&
      JSON.stringify(financialState.financial_plan) !== JSON.stringify(props.financialPlanData))
      props.onFinancialPlanUpdate?.(financialState.financial_plan);

    if (financialState?.summary_plan &&
      JSON.stringify(financialState.summary_plan) !== JSON.stringify(props.summaryPlanData))
      props.onSummaryPlanUpdate?.(financialState.summary_plan);

    if (financialState?.feasibility &&
      JSON.stringify(financialState.feasibility) !== JSON.stringify(props.feasibilityData))
      props.onFeasibilityUpdate?.(financialState.feasibility);

    if (financialState?.investment &&
      JSON.stringify(financialState.investment) !== JSON.stringify(props.investmentData))
      props.onInvestmentUpdate?.(financialState.investment);
  }, [financialState]);

  // ── Extract structured data from A2A result messages ────────────────────────
  const { visibleMessages } = useCopilotChat();

  useEffect(() => {
    for (const message of visibleMessages) {
      const msg = message as any;
      if (msg.type !== "ResultMessage" || msg.actionName !== "send_message_to_a2a_agent") continue;

      try {
        const raw: string | object = msg.result;
        let parsed: any;

        if (typeof raw === "string") {
          const clean = raw.startsWith("A2A Agent Response: ")
            ? raw.slice("A2A Agent Response: ".length)
            : raw;
          parsed = JSON.parse(clean);
        } else if (typeof raw === "object" && raw !== null) {
          parsed = raw;
        }

        if (!parsed) continue;

        if (parsed.query && Array.isArray(parsed.results))
          onProductUpdate?.(parsed as ProductResearchData);
        else if (parsed.monthlyIncome && Array.isArray(parsed.budgetBreakdown))
          onFinancialPlanUpdate?.(parsed as FinancialPlanData);
        else if (parsed.plan_title && Array.isArray(parsed.milestones))
          onMasterPlanUpdate?.(parsed as MasterFinancialPlanData);
        else if (parsed.dashboard_message && parsed.timestamp)
          onSummaryPlanUpdate?.(parsed as SummaryPlanData);
        else if (parsed.feedback_message && parsed.gap !== undefined) {
          if (typeof parsed.gap !== "number") parsed.gap = Number(parsed.gap);
          onFeasibilityUpdate?.(parsed as FeasibilityData);
        } else if (parsed.allocation && parsed.strategyName)
          onInvestmentUpdate?.(parsed as InvestmentStrategyData);
        else if (parsed.agentName === "Expansion Feasibility Agent" && parsed.breakEvenMonths !== undefined)
          onExpansionFeasibilityUpdate?.(parsed as ExpansionFeasibilityData);
      } catch (_) {}
    }
  }, [visibleMessages, onProductUpdate, onFinancialPlanUpdate, onMasterPlanUpdate]);

  // ── A2A visualiser ───────────────────────────────────────────────────────────
  useCopilotAction({
    name: "send_message_to_a2a_agent",
    description: "Sends a message to an A2A agent",
    available: "frontend",
    parameters: [
      { name: "agentName", type: "string", description: "The name of the A2A agent" },
      { name: "task",      type: "string", description: "The message to send"       },
    ],
    render: (actionRenderProps: MessageActionRenderProps) => (
      <>
        <MessageToA2A {...actionRenderProps} />
        <MessageFromA2A {...actionRenderProps} />
      </>
    ),
  });

  // ── HITL: Financial planning form ────────────────────────────────────────────
  useCopilotAction({
    name: "gather_financial_planning_details",
    description: "Gather financial planning details from the user",
    parameters: [
      { name: "goalDescription",          type: "string", required: false },
      { name: "planType",                 type: "string", required: false },
      { name: "monthlyIncome",            type: "number", required: false },
      { name: "monthlyTargetedExpenses",  type: "number", required: false },
      { name: "savingGoalEnd",            type: "number", required: false },
      { name: "riskTolerance",            type: "string", required: false },
    ],
    renderAndWaitForResponse: ({ args, respond }) => (
      <FinancialPlanningForm args={args} respond={respond} />
    ),
  });

  // ── Display actions (push data to canvas) ───────────────────────────────────
  useCopilotAction({
    name: "display_product_research",
    description: "Display product research results",
    available: "frontend",
    parameters: [{ name: "data", type: "object", description: "Product research data" }],
    render: ({ args }) => {
      if (!args.data) return <></>;
      return <ProductCard data={args.data as ProductResearchData} />;
    },
  });

  useCopilotAction({
    name: "display_master_plan",
    description: "Display the Master Financial Plan",
    available: "frontend",
    parameters: [{ name: "data", type: "object", description: "Master plan data" }],
    render: ({ args }) => {
      if (!args.data) return <></>;
      return <MasterPlanCard data={args.data as MasterFinancialPlanData} />;
    },
  });

  useCopilotAction({
    name: "display_summary_plan",
    description: "Display the Summary Plan Dashboard",
    available: "frontend",
    parameters: [{ name: "data", type: "object", description: "Summary plan data" }],
    render: ({ args }) => {
      if (!args.data) return <></>;
      return <SummaryPlanCard data={args.data as SummaryPlanData} />;
    },
  });

  useCopilotAction({
    name: "display_feasibility_check",
    description: "Display the Feasibility Check Results",
    available: "frontend",
    parameters: [{ name: "data", type: "object", description: "Feasibility data" }],
    render: ({ args }) => {
      if (!args.data) return <></>;
      return <FeasibilityCard data={args.data as FeasibilityData} />;
    },
  });

  useCopilotAction({
    name: "display_investment_strategy",
    description: "Display the Investment Strategy",
    available: "frontend",
    parameters: [{ name: "data", type: "object", description: "Investment strategy data" }],
    render: ({ args }) => {
      if (!args.data) return <></>;
      return <InvestmentCard data={args.data as InvestmentStrategyData} />;
    },
  });

  useCopilotAction({
    name: "display_expansion_feasibility",
    description: "Display the Expansion Financial Feasibility analysis card to the user (MANDATORY HITL STEP)",
    available: "frontend",
    parameters: [{ name: "data", type: "object", description: "Expansion feasibility data" }],
    renderAndWaitForResponse: ({ args, respond }) => {
      if (!args.data) return <></>;
      const feasData = args.data as ExpansionFeasibilityData;
      
      // Update canvas state
      onExpansionFeasibilityUpdate?.(feasData);

      return (
        <div className="space-y-3">
          <ExpansionFeasibilityCard data={feasData} />
          <button
            onClick={() => respond?.("Expansion feasibility analysis reviewed and accepted.")}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl shadow-md transition-all active:scale-[0.98] text-sm"
          >
            Confirm Analysis & Finish
          </button>
        </div>
      );
    },
  });

  // ── HITL: Expansion details form ─────────────────────────────────────────────
  useCopilotAction({
    name: "gather_expansion_details",
    description: "Gather business location expansion details from the user",
    parameters: [
      { name: "targetArea",    type: "string", required: false },
      { name: "budgetRange",   type: "string", required: false },
      { name: "businessType",  type: "string", required: false },
    ],
    renderAndWaitForResponse: ({ args, respond }) => (
      <ExpansionDetailsForm args={args} respond={respond} />
    ),
  });

  // ── HITL: Site selection card ─────────────────────────────────────────────────
  useCopilotAction({
    name: "display_site_selection_options",
    description: "Display 3 candidate location options for the user to choose from",
    parameters: [
      { name: "agentName",   type: "string",   required: false },
      { name: "actionType",  type: "string",   required: false },
      { name: "targetArea",  type: "string",   required: false },
      { name: "userPrompt",  type: "string",   required: false },
      { name: "options",     type: "object[]", required: false },
      { name: "nextStep",    type: "string",   required: false },
    ],
    renderAndWaitForResponse: ({ args, respond }) => {
      const data = normalizeSiteSelectionData(args);
      if (!data?.options?.length) return <></>;
      const wrappedRespond = respond
        ? (selection: object) => {
            const opt = data.options.find(
              (o) => o.optionId === (selection as any).selectedOptionId
            );
            if (opt) onSelectedSiteUpdate?.(opt);
            respond(selection);
          }
        : undefined;
      return <SiteSelectionCard data={data} respond={wrappedRespond} />;
    },
  });

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="h-full">
      <CopilotChat
        className="h-full"
        labels={{
          initial:
            "👋 Hi! I'm your Personal Financial Assistant.\n\nI can help you create a financial plan, track expenses, find deals on products, and analyse business expansion locations!",
        }}
        instructions="You are a helpful Financial Assistant. Help users plan their finances, track expenses, research products, and analyse business expansion locations."
      />
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────

export default function TravelChat(props: TravelChatProps) {
  return (
    <CopilotKit runtimeUrl="/api/copilotkit" showDevConsole={false} agent="a2a_chat">
      <ChatInner {...props} />
    </CopilotKit>
  );
}
