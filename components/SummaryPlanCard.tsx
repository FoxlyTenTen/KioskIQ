import React from "react";
import { SummaryPlanData } from "./types";

interface SummaryPlanCardProps {
    data: SummaryPlanData;
    onUpdate?: (data: SummaryPlanData) => void;
}

export const SummaryPlanCard: React.FC<SummaryPlanCardProps> = ({ data, onUpdate }) => {
    const handleUpdate = (field: keyof SummaryPlanData, value: any) => {
        if (!onUpdate) return;
        onUpdate({ ...data, [field]: value });
    };
    if (!data) return null;

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("en-MY", {
            style: "currency",
            currency: "MYR",
            minimumFractionDigits: 0,
        }).format(amount);
    };

    return (
        <div className="bg-white/80 backdrop-blur-md rounded-xl p-5 my-4 border-2 border-cyan-200 shadow-xl animate-scale-in">
            <div className="flex justify-between items-center mb-4 border-b border-cyan-100 pb-2">
                <div>
                    <h2 className="text-lg font-bold text-gray-900">⚡ Financial Dashboard</h2>
                    <p className="text-xs text-gray-500">{data.timestamp}</p>
                </div>
                <div className="text-2xl">📋</div>
            </div>

            <div className="bg-cyan-50/50 p-3 rounded-lg border border-cyan-100 mb-4">
                <p className="text-sm text-cyan-800 font-medium italic">"{data.dashboard_message}"</p>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm group cursor-text">
                    <p className="text-xs text-gray-500 uppercase font-bold">Goal</p>
                    {onUpdate ? (
                        <input
                            type="text"
                            value={data.goalDescription}
                            onChange={(e) => handleUpdate('goalDescription', e.target.value)}
                            className="text-base font-bold text-gray-900 bg-transparent w-full focus:outline-none focus:border-b focus:border-cyan-300"
                        />
                    ) : (
                        <p className="text-base font-bold text-gray-900">{data.goalDescription}</p>
                    )}

                    <div className="flex items-center text-xs text-blue-600 mt-1">
                        Target: {onUpdate ? (
                            <div className="flex items-center ml-1">
                                RM
                                <input
                                    type="number"
                                    value={data.savingGoalEnd}
                                    onChange={(e) => handleUpdate('savingGoalEnd', Number(e.target.value))}
                                    className="bg-transparent w-20 focus:outline-none focus:border-b focus:border-blue-300 ml-1"
                                />
                            </div>
                        ) : (
                            formatCurrency(data.savingGoalEnd)
                        )}
                    </div>
                </div>
                <div className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm group cursor-text">
                    <p className="text-xs text-gray-500 uppercase font-bold">Profile</p>

                    <div className="flex items-center text-sm font-semibold text-gray-900 mb-1">
                        Income:
                        {onUpdate ? (
                            <input
                                type="number"
                                value={data.monthlyIncome}
                                onChange={(e) => handleUpdate('monthlyIncome', Number(e.target.value))}
                                className="bg-transparent w-20 ml-1 focus:outline-none focus:border-b focus:border-green-300"
                            />
                        ) : (
                            <span className="ml-1">{formatCurrency(data.monthlyIncome)}</span>
                        )}
                    </div>

                    <div className="flex items-center text-xs text-gray-600">
                        Exp:
                        {onUpdate ? (
                            <input
                                type="number"
                                value={data.monthlyTargetedExpenses}
                                onChange={(e) => handleUpdate('monthlyTargetedExpenses', Number(e.target.value))}
                                className="bg-transparent w-20 ml-1 focus:outline-none focus:border-b focus:border-red-300"
                            />
                        ) : (
                            <span className="ml-1">{formatCurrency(data.monthlyTargetedExpenses)}</span>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex justify-between items-center pt-2">
                <div className="flex items-center text-xs font-semibold px-2 py-1 bg-gray-100 rounded text-gray-600 uppercase">
                    Risk:
                    {onUpdate ? (
                        <select
                            value={data.riskTolerance}
                            onChange={(e) => handleUpdate('riskTolerance', e.target.value)}
                            className="bg-transparent focus:outline-none ml-1 cursor-pointer"
                        >
                            <option value="Conservative">Conservative</option>
                            <option value="Moderate">Moderate</option>
                            <option value="Aggressive">Aggressive</option>
                        </select>
                    ) : (
                        <span className="ml-1">{data.riskTolerance}</span>
                    )}
                </div>
                <div className="flex items-center text-xs font-semibold px-2 py-1 bg-gray-100 rounded text-gray-600 uppercase">
                    Type:
                    {onUpdate ? (
                        <select
                            value={data.planType}
                            onChange={(e) => handleUpdate('planType', e.target.value)}
                            className="bg-transparent focus:outline-none ml-1 cursor-pointer"
                        >
                            <option value="short">Short</option>
                            <option value="medium">Medium</option>
                            <option value="long">Long</option>
                        </select>
                    ) : (
                        <span className="ml-1">{data.planType}</span>
                    )}
                </div>
            </div>
        </div>
    );
};
