import React from "react";
import { FeasibilityData } from "./types";

interface FeasibilityCardProps {
    data: FeasibilityData;
    onUpdate?: (data: FeasibilityData) => void;
}

export const FeasibilityCard: React.FC<FeasibilityCardProps> = ({ data, onUpdate }) => {
    const handleUpdate = (field: keyof FeasibilityData, value: any) => {
        if (!onUpdate) return;
        onUpdate({ ...data, [field]: value });
    };
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 0,
        }).format(amount);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "feasible": return "text-green-600 bg-green-50 border-green-200";
            case "challenging": return "text-yellow-600 bg-yellow-50 border-yellow-200";
            case "unrealistic": return "text-red-600 bg-red-50 border-red-200";
            default: return "text-gray-600";
        }
    };

    return (
        <div className="bg-white/90 backdrop-blur-md rounded-xl p-6 my-4 border-2 border-indigo-200 shadow-xl animate-scale-in">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-indigo-900">📊 Feasibility Check</h2>
                <span className={`px-4 py-1.5 rounded-full text-sm font-bold border capitalize ${getStatusColor(data.status)}`}>
                    {data.status}
                </span>
            </div>

            <p className="text-sm text-gray-700 italic mb-6 bg-indigo-50/50 p-3 rounded-lg">
                "{data.feedback_message}"
            </p>

            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="space-y-1 group cursor-text">
                    <p className="text-xs text-gray-500 uppercase font-semibold">Free Cashflow</p>
                    {onUpdate ? (
                        <input
                            type="number"
                            value={data.freeCashflow}
                            onChange={(e) => handleUpdate('freeCashflow', Number(e.target.value))}
                            className="text-xl font-bold text-gray-900 bg-transparent w-full focus:outline-none focus:border-b focus:border-indigo-300"
                        />
                    ) : (
                        <p className="text-xl font-bold text-gray-900">{formatCurrency(data.freeCashflow)}</p>
                    )}
                    <p className="text-[10px] text-gray-400">Income - Expenses</p>
                </div>
                <div className="space-y-1 group cursor-text">
                    <p className="text-xs text-gray-500 uppercase font-semibold">Required Saving/Mo</p>
                    {onUpdate ? (
                        <input
                            type="number"
                            value={data.requiredMonthlySaving}
                            onChange={(e) => handleUpdate('requiredMonthlySaving', Number(e.target.value))}
                            className="text-xl font-bold text-indigo-700 bg-transparent w-full focus:outline-none focus:border-b focus:border-indigo-300"
                        />
                    ) : (
                        <p className="text-xl font-bold text-indigo-700">{formatCurrency(data.requiredMonthlySaving)}</p>
                    )}

                    <p className="text-[10px] text-gray-400">
                        Target / {onUpdate ? (
                            <input
                                type="number"
                                value={data.months}
                                onChange={(e) => handleUpdate('months', Number(e.target.value))}
                                className="bg-transparent w-8 text-center focus:outline-none focus:border-b focus:border-gray-400"
                            />
                        ) : data.months} mos
                    </p>
                </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                <div className="flex justify-between items-center mb-1 group cursor-text">
                    <span className="text-xs font-semibold text-gray-600">The Gap</span>
                    {onUpdate ? (
                        <div className="flex items-center">
                            <span className={`text-lg font-bold mr-1 ${data.gap >= 0 ? "text-green-600" : "text-red-500"}`}>
                                {data.gap >= 0 ? "+" : ""}
                            </span>
                            <input
                                type="number"
                                value={data.gap}
                                onChange={(e) => handleUpdate('gap', Number(e.target.value))}
                                className={`text-lg font-bold bg-transparent w-24 text-right focus:outline-none focus:border-b ${data.gap >= 0 ? "text-green-600 border-green-300" : "text-red-500 border-red-300"}`}
                            />
                        </div>
                    ) : (
                        <span className={`text-lg font-bold ${data.gap >= 0 ? "text-green-600" : "text-red-500"}`}>
                            {data.gap >= 0 ? "+" : ""}{formatCurrency(data.gap)}
                        </span>
                    )}
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div
                        className={`h-2 rounded-full ${data.gap >= 0 ? "bg-green-500" : "bg-red-500"}`}
                        style={{ width: `${Math.min(Math.abs((data.freeCashflow / data.requiredMonthlySaving) * 100) || 50, 100)}%` }}
                    ></div>
                </div>
            </div>
        </div>
    );
};
