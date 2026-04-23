"use client";

/**
 * Financial Planning Chat Component
 *
 * Demonstrates key patterns:
 * - A2A Communication: Visualizes message flow between orchestrator and agents
 * - HITL: Financial planning form workflows
 * - Generative UI: Extracts structured data from agent responses
 * - Multi-Agent: Coordinates agents across ADK via A2A Protocol
 */

import React, { useState, useEffect } from "react";
import { CopilotKit, useCopilotChat } from "@copilotkit/react-core";
import { CopilotChat } from "@copilotkit/react-ui";
import { useCopilotAction } from "@copilotkit/react-core";
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
} from "./types";
import { MessageToA2A } from "./a2a/MessageToA2A";
import { MessageFromA2A } from "./a2a/MessageFromA2A";

import { FinancialPlanningForm } from "./forms/FinancialPlanningForm";

import { ProductCard } from "./ProductCard";
import { MasterPlanCard } from "./MasterPlanCard";
import { SummaryPlanCard } from "./SummaryPlanCard";
import { FeasibilityCard } from "./FeasibilityCard";
import { InvestmentCard } from "./InvestmentCard";


// Import useCoAgent from CopilotKit
import { useCoAgent } from "@copilotkit/react-core";

const ChatInner = (props: TravelChatProps) => {
  const {
    onProductUpdate,
    onFinancialPlanUpdate,
    onMasterPlanUpdate,
    onSummaryPlanUpdate,
    onFeasibilityUpdate,
    onInvestmentUpdate,
  } = props;
  // Shared State Management for Financial Planning
  const { state: financialState, setState: setFinancialState } = useCoAgent<{
    financial_plan?: FinancialPlanData;
    summary_plan?: SummaryPlanData;
    feasibility?: FeasibilityData;
    investment?: InvestmentStrategyData;
  }>({
    name: "a2a_chat",
    initialState: {},
  });

  // Sync Props (User Edits) -> Agent State
  useEffect(() => {
    if (props.financialPlanData) setFinancialState({ ...financialState, financial_plan: props.financialPlanData });
  }, [props.financialPlanData]);

  useEffect(() => {
    if (props.summaryPlanData) setFinancialState({ ...financialState, summary_plan: props.summaryPlanData });
  }, [props.summaryPlanData]);

  useEffect(() => {
    if (props.feasibilityData) setFinancialState({ ...financialState, feasibility: props.feasibilityData });
  }, [props.feasibilityData]);

  useEffect(() => {
    if (props.investmentData) setFinancialState({ ...financialState, investment: props.investmentData });
  }, [props.investmentData]);


  // Sync Agent State (Agent Updates) -> Parent Props (UI)
  useEffect(() => {
    if (financialState?.financial_plan && JSON.stringify(financialState.financial_plan) !== JSON.stringify(props.financialPlanData)) {
      props.onFinancialPlanUpdate?.(financialState.financial_plan);
    }
    if (financialState?.summary_plan && JSON.stringify(financialState.summary_plan) !== JSON.stringify(props.summaryPlanData)) {
      props.onSummaryPlanUpdate?.(financialState.summary_plan);
    }
    if (financialState?.feasibility && JSON.stringify(financialState.feasibility) !== JSON.stringify(props.feasibilityData)) {
      props.onFeasibilityUpdate?.(financialState.feasibility);
    }
    if (financialState?.investment && JSON.stringify(financialState.investment) !== JSON.stringify(props.investmentData)) {
      props.onInvestmentUpdate?.(financialState.investment);
    }
  }, [financialState]);
  
  const { visibleMessages } = useCopilotChat();

  // Extract structured data from A2A agent responses
  useEffect(() => {
    const extractDataFromMessages = () => {
      for (const message of visibleMessages) {
        const msg = message as any;

        if (msg.type === "ResultMessage" && msg.actionName === "send_message_to_a2a_agent") {
          try {
            const result = msg.result;
            let parsed;

            if (typeof result === "string") {
              let cleanResult = result;
              if (result.startsWith("A2A Agent Response: ")) {
                cleanResult = result.substring("A2A Agent Response: ".length);
              }
              parsed = JSON.parse(cleanResult);
            } else if (typeof result === "object" && result !== null) {
              parsed = result;
            }

            if (parsed) {
              if (parsed.query && parsed.results && Array.isArray(parsed.results)) {
                onProductUpdate?.(parsed as ProductResearchData);
              }
              else if (parsed.monthlyIncome && parsed.budgetBreakdown && Array.isArray(parsed.budgetBreakdown)) {
                onFinancialPlanUpdate?.(parsed as FinancialPlanData);
              }
              else if (
                parsed.plan_title &&
                parsed.milestones &&
                Array.isArray(parsed.milestones) &&
                typeof parsed.target_amount === 'number' &&
                typeof parsed.monthly_contribution === 'number'
              ) {
                onMasterPlanUpdate?.(parsed as MasterFinancialPlanData);
              }
              else if (parsed.dashboard_message && parsed.timestamp) {
                onSummaryPlanUpdate?.(parsed as SummaryPlanData);
              }
              else if ((typeof parsed.gap === 'number' || !isNaN(Number(parsed.gap))) && parsed.feedback_message) {
                // Ensure gap is a number
                if (typeof parsed.gap !== 'number') parsed.gap = Number(parsed.gap);
                onFeasibilityUpdate?.(parsed as FeasibilityData);
              }
              else if (parsed.allocation && parsed.strategyName) {
                onInvestmentUpdate?.(parsed as InvestmentStrategyData);
              }
            }
          } catch (e) {
          }
        }
      }
    };

    extractDataFromMessages();
  }, [
    visibleMessages,
    onProductUpdate,
    onFinancialPlanUpdate,
    onMasterPlanUpdate,
  ]);

  // Register A2A message visualizer (renders green/blue communication boxes)
  useCopilotAction({
    name: "send_message_to_a2a_agent",
    description: "Sends a message to an A2A agent",
    available: "frontend",
    parameters: [
      {
        name: "agentName",
        type: "string",
        description: "The name of the A2A agent to send the message to",
      },
      {
        name: "task",
        type: "string",
        description: "The message to send to the A2A agent",
      },
    ],
    render: (actionRenderProps: MessageActionRenderProps) => {
      return (
        <>
          <MessageToA2A {...actionRenderProps} />
          <MessageFromA2A {...actionRenderProps} />
        </>
      );
    },
  });




  // Register HITL financial planning form
  useCopilotAction({
    name: "gather_financial_planning_details",
    description: "Gather financial planning details from the user (income, expenses, goal)",
    parameters: [
      {
        name: "goalDescription",
        type: "string",
        description: "Description of the goal (e.g., 'Buy iPhone 17')",
        required: false,
      },
      {
        name: "planType",
        type: "string",
        description: "Plan Type (short, medium, long)",
        required: false,
      },
      {
        name: "monthlyIncome",
        type: "number",
        description: "Monthly Income",
        required: false,
      },
      {
        name: "monthlyTargetedExpenses",
        type: "number",
        description: "Monthly Targeted Expenses",
        required: false,
      },
      {
        name: "savingGoalEnd",
        type: "number",
        description: "Saving Goal End Amount",
        required: false,
      },
      {
        name: "riskTolerance",
        type: "string",
        description: "Risk Tolerance (Conservative, Moderate, Aggressive)",
        required: false,
      }
    ],
    renderAndWaitForResponse: ({ args, respond }) => {
      return <FinancialPlanningForm args={args} respond={respond} />;
    },
  });





  useCopilotAction({
    name: "display_product_research",
    description: "Display product research results",
    available: "frontend",
    parameters: [
      {
        name: "data",
        type: "object",
        description: "The product research data",
      },
    ],
    render: ({ args }) => {
      if (!args.data) return <></>;
      return <ProductCard data={args.data as ProductResearchData} />;
    },
  });



  useCopilotAction({
    name: "display_master_plan",
    description: "Display the Master Financial Plan",
    available: "frontend",
    parameters: [
      {
        name: "data",
        type: "object",
        description: "The master plan data",
      },
    ],
    render: ({ args }) => {
      if (!args.data) return <></>;
      return <MasterPlanCard data={args.data as MasterFinancialPlanData} />;
    },
  });

  useCopilotAction({
    name: "display_summary_plan",
    description: "Display the Summary Plan Dashboard",
    available: "frontend",
    parameters: [
      {
        name: "data",
        type: "object",
        description: "The summary plan data",
      },
    ],
    render: ({ args }) => {
      if (!args.data) return <></>;
      return <SummaryPlanCard data={args.data as SummaryPlanData} />;
    },
  });

  useCopilotAction({
    name: "display_feasibility_check",
    description: "Display the Feasibility Check Results",
    available: "frontend",
    parameters: [
      {
        name: "data",
        type: "object",
        description: "The feasibility data",
      },
    ],
    render: ({ args }) => {
      if (!args.data) return <></>;
      return <FeasibilityCard data={args.data as FeasibilityData} />;
    },
  });

  useCopilotAction({
    name: "display_investment_strategy",
    description: "Display the Investment Strategy",
    available: "frontend",
    parameters: [
      {
        name: "data",
        type: "object",
        description: "The investment strategy data",
      },
    ],
    render: ({ args }) => {
      if (!args.data) return <></>;
      return <InvestmentCard data={args.data as InvestmentStrategyData} />;
    },
  });

  return (
    <div className="h-full">
      <CopilotChat
        className="h-full"
        labels={{
          initial:
            "👋 Hi! I'm your Personal Financial Assistant.\n\nI can help you create a financial plan, track expenses, and find deals on products!",
        }}
        instructions="You are a helpful Financial Assistant. Help users plan their finances, track expenses, and research products."
      />
    </div>
  );
};

export default function TravelChat(props: TravelChatProps) {
  return (
    <CopilotKit runtimeUrl="/api/copilotkit" showDevConsole={false} agent="a2a_chat">
      <ChatInner {...props} />
    </CopilotKit>
  );
}
