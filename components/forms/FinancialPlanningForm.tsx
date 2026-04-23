/**
 * FinancialPlanningForm Component
 *
 * HITL form that collects financial planning details.
 */

import React, { useState, useEffect } from "react";

interface FinancialPlanningFormProps {
    args: any;
    respond: any;
}

export const FinancialPlanningForm: React.FC<FinancialPlanningFormProps> = ({ args, respond }) => {
    let parsedArgs = args;
    if (typeof args === "string") {
        try {
            parsedArgs = JSON.parse(args);
        } catch (e) {
            parsedArgs = {};
        }
    }

    // State for form fields
    const [goalDescription, setGoalDescription] = useState<string>("");
    const [planType, setPlanType] = useState<string>("medium");
    const [monthlyIncome, setMonthlyIncome] = useState<string>(""); // Use string for input to handle empty state
    const [monthlyTargetedExpenses, setMonthlyTargetedExpenses] = useState<string>("");
    const [savingGoalEnd, setSavingGoalEnd] = useState<string>("");
    const [riskTolerance, setRiskTolerance] = useState<string>("Moderate");

    const [submitted, setSubmitted] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Pre-fill form from orchestrator extraction
    useEffect(() => {
        if (parsedArgs) {
            if (parsedArgs.goalDescription) setGoalDescription(parsedArgs.goalDescription);
            if (parsedArgs.planType) setPlanType(parsedArgs.planType);
            if (parsedArgs.monthlyIncome) setMonthlyIncome(String(parsedArgs.monthlyIncome));
            if (parsedArgs.monthlyTargetedExpenses) setMonthlyTargetedExpenses(String(parsedArgs.monthlyTargetedExpenses));
            if (parsedArgs.savingGoalEnd) setSavingGoalEnd(String(parsedArgs.savingGoalEnd));
            if (parsedArgs.riskTolerance) setRiskTolerance(parsedArgs.riskTolerance);
        }
    }, [parsedArgs]);

    const validateForm = () => {
        const newErrors: Record<string, string> = {};
        const income = Number(monthlyIncome);
        const expenses = Number(monthlyTargetedExpenses);
        const goal = Number(savingGoalEnd);

        if (!goalDescription.trim()) {
            newErrors.goalDescription = "Please enter a description for your goal";
        }
        if (!monthlyIncome || isNaN(income) || income <= 0) {
            newErrors.monthlyIncome = "Please enter valid monthly income (> 0)";
        }
        if (!monthlyTargetedExpenses || isNaN(expenses) || expenses < 0) {
            newErrors.monthlyTargetedExpenses = "Please enter valid expenses (>= 0)";
        }
        if (!savingGoalEnd || isNaN(goal) || goal < 0) {
            newErrors.savingGoalEnd = "Please enter a valid goal amount (>= 0)";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = () => {
        if (!validateForm()) {
            return;
        }

        setSubmitted(true);
        respond?.({
            goalDescription,
            planType,
            monthlyIncome: Number(monthlyIncome),
            monthlyTargetedExpenses: Number(monthlyTargetedExpenses),
            savingGoalEnd: Number(savingGoalEnd),
            riskTolerance
        });
    };

    if (submitted) {
        return (
            <div className="bg-green-50/95 backdrop-blur-md border border-green-200 rounded-xl p-5 my-4 shadow-sm animate-in fade-in slide-in-from-bottom-2">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-xl font-bold border border-green-200">
                        ✓
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-gray-900">Financial Details Submitted</h3>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold uppercase rounded-full tracking-wide">
                                {planType} Plan
                            </span>
                            <span className="text-xs text-gray-500 font-medium">
                                {goalDescription}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const riskLevels = ["Conservative", "Moderate", "Aggressive"];
    const planTypes = [
        { value: "short", label: "Short Term" },
        { value: "medium", label: "Medium Term" },
        { value: "long", label: "Long Term" }
    ];

    return (
        <div className="bg-orange-50/80 backdrop-blur-xl border border-orange-100 rounded-xl p-5 my-4 shadow-lg animate-in fade-in slide-in-from-bottom-5">
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white text-lg shadow-sm">
                        📊
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-gray-900">Financial Plan Setup</h3>
                        <p className="text-[11px] text-orange-700/80 font-medium uppercase tracking-wide">Define your targets</p>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                {/* Goal Description */}
                <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Goal Description *</label>
                    <input
                        type="text"
                        value={goalDescription}
                        onChange={(e) => setGoalDescription(e.target.value)}
                        className={`w-full px-4 py-2.5 text-sm rounded-lg border transition-all duration-200 shadow-sm ${errors.goalDescription
                            ? "border-red-300 bg-red-50 focus:ring-2 focus:ring-red-100"
                            : "border-orange-100 bg-white focus:border-orange-400 focus:ring-4 focus:ring-orange-100/50 focus:outline-none"
                            }`}
                        placeholder="e.g., Buy iPhone 17 Pro Max"
                    />
                    {errors.goalDescription && <p className="text-xs text-red-500 mt-1 font-medium">{errors.goalDescription}</p>}
                </div>

                {/* Plan Type */}
                <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Plan Type</label>
                    <div className="relative">
                        <select
                            value={planType}
                            onChange={(e) => setPlanType(e.target.value)}
                            className="w-full px-4 py-2.5 text-sm rounded-lg border border-orange-100 bg-white focus:border-orange-400 focus:ring-4 focus:ring-orange-100/50 focus:outline-none transition-all duration-200 shadow-sm appearance-none"
                        >
                            {planTypes.map((type) => (
                                <option key={type.value} value={type.value}>
                                    {type.label}
                                </option>
                            ))}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                            ▼
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    {/* Monthly Income */}
                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Monthly Income *</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">$</span>
                            <input
                                type="number"
                                value={monthlyIncome}
                                onChange={(e) => setMonthlyIncome(e.target.value)}
                                className={`w-full pl-7 pr-4 py-2.5 text-sm rounded-lg border transition-all duration-200 shadow-sm ${errors.monthlyIncome
                                    ? "border-red-300 bg-red-50 focus:ring-2 focus:ring-red-100"
                                    : "border-orange-100 bg-white focus:border-orange-400 focus:ring-4 focus:ring-orange-100/50 focus:outline-none"
                                    }`}
                                placeholder="5000"
                            />
                        </div>
                        {errors.monthlyIncome && <p className="text-xs text-red-500 mt-1 font-medium">{errors.monthlyIncome}</p>}
                    </div>

                    {/* Expenses */}
                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Target Expenses *</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">$</span>
                            <input
                                type="number"
                                value={monthlyTargetedExpenses}
                                onChange={(e) => setMonthlyTargetedExpenses(e.target.value)}
                                className={`w-full pl-7 pr-4 py-2.5 text-sm rounded-lg border transition-all duration-200 shadow-sm ${errors.monthlyTargetedExpenses
                                    ? "border-red-300 bg-red-50 focus:ring-2 focus:ring-red-100"
                                    : "border-orange-100 bg-white focus:border-orange-400 focus:ring-4 focus:ring-orange-100/50 focus:outline-none"
                                    }`}
                                placeholder="3000"
                            />
                        </div>
                        {errors.monthlyTargetedExpenses && <p className="text-xs text-red-500 mt-1 font-medium">{errors.monthlyTargetedExpenses}</p>}
                    </div>
                </div>

                {/* Saving Goal End */}
                <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Goal Amount *</label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">$</span>
                        <input
                            type="number"
                            value={savingGoalEnd}
                            onChange={(e) => setSavingGoalEnd(e.target.value)}
                            className={`w-full pl-7 pr-4 py-2.5 text-sm rounded-lg border transition-all duration-200 shadow-sm ${errors.savingGoalEnd
                                ? "border-red-300 bg-red-50 focus:ring-2 focus:ring-red-100"
                                : "border-orange-100 bg-white focus:border-orange-400 focus:ring-4 focus:ring-orange-100/50 focus:outline-none"
                                }`}
                            placeholder="50000"
                        />
                    </div>
                    {errors.savingGoalEnd && <p className="text-xs text-red-500 mt-1 font-medium">{errors.savingGoalEnd}</p>}
                </div>

                {/* Risk Tolerance */}
                <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Risk Tolerance</label>
                    <div className="flex bg-orange-100/50 rounded-lg p-1 border border-orange-100">
                        {riskLevels.map((level) => (
                            <button
                                key={level}
                                onClick={() => setRiskTolerance(level)}
                                className={`flex-1 py-2 text-[11px] font-bold rounded-md transition-all duration-200 ${riskTolerance === level
                                    ? 'bg-white text-orange-600 shadow-sm border border-orange-100'
                                    : 'text-gray-500 hover:bg-white/50 hover:text-orange-500'
                                    }`}
                            >
                                {level}
                            </button>
                        ))}
                    </div>
                </div>

            </div>

            <div className="mt-6">
                <button
                    onClick={handleSubmit}
                    className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold py-3 px-4 text-sm rounded-xl transition-all duration-200 shadow-md hover:shadow-lg transform active:scale-[0.98]"
                >
                    Generate Financial Plan
                </button>
            </div>
        </div>
    );
};
