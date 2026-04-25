"use client";

import React from "react";
import { Check } from "lucide-react";

export interface StepConfig {
  label: string;
  icon: string;
}

interface AgentStepperProps {
  steps: StepConfig[];
  currentStep: number; // 0-based index of the active step. -1 = not started yet.
}

export function AgentStepper({ steps, currentStep }: AgentStepperProps) {
  return (
    <div className="px-4 py-3 border-b border-border bg-gradient-to-b from-background to-muted/20">
      {/* Workflow label */}
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3 text-center">
        Agent Pipeline
      </p>

      <div className="flex items-start justify-between relative">
        {steps.map((step, idx) => {
          const isCompleted = idx < currentStep;
          const isActive = idx === currentStep;
          const isUpcoming = idx > currentStep;
          const isLast = idx === steps.length - 1;

          return (
            <React.Fragment key={idx}>
              {/* Step node + label */}
              <div className="flex flex-col items-center z-10" style={{ minWidth: 52 }}>
                {/* Circle */}
                <div
                  className={[
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 relative",
                    isCompleted
                      ? "bg-emerald-500 text-white shadow-[0_0_10px_rgba(16,185,129,0.45)]"
                      : isActive
                      ? "bg-blue-500 text-white shadow-[0_0_12px_rgba(59,130,246,0.55)] ring-2 ring-blue-300 ring-offset-1"
                      : "bg-muted border border-border text-muted-foreground",
                  ].join(" ")}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4 stroke-[3]" />
                  ) : (
                    <span className="text-xs leading-none">{step.icon}</span>
                  )}

                  {/* Active pulse ring */}
                  {isActive && (
                    <span className="absolute inset-0 rounded-full animate-ping bg-blue-400 opacity-30" />
                  )}
                </div>

                {/* Label */}
                <span
                  className={[
                    "mt-1.5 text-center leading-tight transition-all duration-300",
                    "text-[9.5px] font-medium max-w-[54px]",
                    isCompleted
                      ? "text-emerald-600"
                      : isActive
                      ? "text-blue-600 font-semibold"
                      : "text-muted-foreground",
                  ].join(" ")}
                >
                  {step.label}
                </span>
              </div>

              {/* Connecting line between nodes */}
              {!isLast && (
                <div className="flex-1 mt-4 mx-1 h-0.5 rounded-full overflow-hidden relative">
                  {/* Gray base track */}
                  <div className="absolute inset-0 bg-border rounded-full" />
                  {/* Colored fill — expands left-to-right when completed */}
                  <div
                    className={[
                      "absolute inset-0 rounded-full transition-all duration-500",
                      idx < currentStep
                        ? "bg-emerald-500 w-full"
                        : idx === currentStep - 1
                        ? "bg-emerald-500 w-full"
                        : "w-0",
                    ].join(" ")}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

// ─── Workflow Definitions ──────────────────────────────────────────────────────

export const FINANCIAL_WORKFLOW_STEPS: StepConfig[] = [
  { label: "Summary", icon: "📊" },
  { label: "Feasibility", icon: "🧮" },
  { label: "Investment", icon: "📈" },
  { label: "Master Plan", icon: "🎯" },
];

export const EXPANSION_WORKFLOW_STEPS: StepConfig[] = [
  { label: "Site Selection", icon: "🗺️" },
  { label: "Exp. Feasibility", icon: "💰" },
];

// Agent name → workflow type + step index
export const AGENT_STEP_MAP: Record<
  string,
  { workflow: "financial" | "expansion"; stepIndex: number }
> = {
  "Summary Agent":               { workflow: "financial", stepIndex: 0 },
  "Feasibility Agent":           { workflow: "financial", stepIndex: 1 },
  "Investment Agent":            { workflow: "financial", stepIndex: 2 },
  "Financial Planner Agent":     { workflow: "financial", stepIndex: 3 },
  "Site Selection Expert Agent": { workflow: "expansion", stepIndex: 0 },
  "Expansion Feasibility Agent": { workflow: "expansion", stepIndex: 1 },
};
