import React from "react";
import { type FinancialPlanData } from "./types";

interface FinancialPlanProps {
    data: FinancialPlanData;
    onUpdate?: (data: FinancialPlanData) => void;
}

export const FinancialPlanCard: React.FC<FinancialPlanProps> = ({ data, onUpdate }) => {
    const handleUpdate = (field: keyof FinancialPlanData, value: any) => {
        if (!onUpdate) return;
        onUpdate({
            ...data,
            [field]: value
        });
    };

    const handleBudgetUpdate = (index: number, field: string, value: any) => {
        if (!onUpdate) return;
        const newBreakdown = [...data.budgetBreakdown];
        newBreakdown[index] = { ...newBreakdown[index], [field]: value };
        onUpdate({
            ...data,
            budgetBreakdown: newBreakdown
        });
    };
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("en-MY", {
            style: "currency",
            currency: "MYR",
            minimumFractionDigits: 0,
        }).format(amount);
    };

    return (
        <div className="bg-white/60 backdrop-blur-md rounded-xl p-6 my-3 border-2 border-[#DBDBE5] shadow-elevation-md animate-fade-in-up">
            <div className="mb-4 border-b border-[#DBDBE5] pb-4">
                <h2 className="text-2xl font-semibold text-[#010507] mb-2">My Financial Plan</h2>
                <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="bg-green-50 p-3 rounded-lg border border-green-100 group cursor-text">
                        <p className="text-xs text-green-600 uppercase font-bold">Monthly Income</p>
                        {onUpdate ? (
                            <input
                                type="number"
                                className="text-xl font-bold text-[#010507] bg-transparent w-full focus:outline-none focus:border-b focus:border-green-300"
                                value={data.monthlyIncome}
                                onChange={(e) => handleUpdate('monthlyIncome', Number(e.target.value))}
                            />
                        ) : (
                            <p className="text-xl font-bold text-[#010507]">{formatCurrency(data.monthlyIncome)}</p>
                        )}
                    </div>
                    <div className="bg-red-50 p-3 rounded-lg border border-red-100 group cursor-text">
                        <p className="text-xs text-red-600 uppercase font-bold">Monthly Expenses</p>
                        {onUpdate ? (
                            <input
                                type="number"
                                className="text-xl font-bold text-[#010507] bg-transparent w-full focus:outline-none focus:border-b focus:border-red-300"
                                value={data.monthlyTargetedExpenses}
                                onChange={(e) => handleUpdate('monthlyTargetedExpenses', Number(e.target.value))}
                            />
                        ) : (
                            <p className="text-xl font-bold text-[#010507]">{formatCurrency(data.monthlyTargetedExpenses)}</p>
                        )}
                    </div>
                </div>
            </div>

            <div className="mb-4">
                <div className="flex flex-col gap-2 mb-2">
                    <div className="flex items-center gap-2">
                        <span className="font-semibold text-[#010507] whitespace-nowrap">Savings Goal:</span>
                        {onUpdate ? (
                            <input
                                type="text"
                                className="font-semibold text-[#010507] bg-transparent w-full border-b border-dashed border-gray-300 focus:border-blue-500 focus:outline-none"
                                value={data.goalDescription}
                                onChange={(e) => handleUpdate('goalDescription', e.target.value)}
                            />
                        ) : (
                            <span className="font-semibold text-[#010507]">{data.goalDescription}</span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-[#57575B]">Target:</span>
                        {onUpdate ? (
                            <div className="flex items-center text-sm text-[#57575B]">
                                RM
                                <input
                                    type="number"
                                    className="ml-1 bg-transparent border-b border-dashed border-gray-300 focus:border-blue-500 focus:outline-none w-24"
                                    value={data.savingGoalEnd}
                                    onChange={(e) => handleUpdate('savingGoalEnd', Number(e.target.value))}
                                />
                            </div>
                        ) : (
                            <span className="text-sm text-[#57575B]">{formatCurrency(data.savingGoalEnd)}</span>
                        )}
                    </div>
                </div>

                <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 mb-2 flex items-center gap-2">
                    <p className="text-sm text-[#010507]">Risk Tolerance:</p>
                    {onUpdate ? (
                        <select
                            value={data.riskTolerance}
                            onChange={(e) => handleUpdate('riskTolerance', e.target.value)}
                            className="bg-transparent font-bold text-[#010507] focus:outline-none border-b border-blue-200"
                        >
                            <option value="Conservative">Conservative</option>
                            <option value="Moderate">Moderate</option>
                            <option value="Aggressive">Aggressive</option>
                        </select>
                    ) : (
                        <span className="font-bold text-sm text-[#010507]">{data.riskTolerance}</span>
                    )}
                </div>
            </div>

            <div className="mb-4">
                <h3 className="font-semibold text-[#010507] mb-2">Budget Breakdown</h3>
                <div className="space-y-2">
                    {data.budgetBreakdown.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between text-sm p-2 bg-white/50 rounded hover:bg-white/80 transition-colors">
                            {onUpdate ? (
                                <input
                                    value={item.category}
                                    onChange={(e) => handleBudgetUpdate(idx, 'category', e.target.value)}
                                    className="bg-transparent focus:outline-none w-1/3"
                                />
                            ) : (
                                <span>{item.category}</span>
                            )}

                            <div className="flex items-center gap-2">
                                {onUpdate ? (
                                    <div className="flex items-center">
                                        RM
                                        <input
                                            type="number"
                                            value={item.amount}
                                            onChange={(e) => handleBudgetUpdate(idx, 'amount', Number(e.target.value))}
                                            className="bg-transparent font-mono focus:outline-none w-16 text-right"
                                        />
                                    </div>
                                ) : (
                                    <span className="font-mono">{formatCurrency(item.amount)}</span>
                                )}
                                <span className={`text-xs px-2 py-0.5 rounded-full ${item.status === 'Warning' || item.status === 'Over Budget' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>{item.status}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-[#F3F3FC] p-4 rounded-lg border border-[#DBDBE5]">
                <h3 className="text-sm font-bold text-[#5c5c6d] mb-1">🤖 Coach's Advice</h3>
                <p className="text-sm text-[#010507] leading-relaxed whitespace-pre-wrap">{data.advice}</p>
            </div>
        </div>
    );
};
