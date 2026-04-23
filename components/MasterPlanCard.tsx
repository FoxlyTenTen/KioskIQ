import React from "react";
import { MasterFinancialPlanData } from "./types";

interface MasterPlanCardProps {
    data: MasterFinancialPlanData;
}

export const MasterPlanCard: React.FC<MasterPlanCardProps> = ({ data }) => {
    const formatCurrency = (amount: number | undefined) => {
        if (amount === undefined || amount === null) return "RM 0";
        return new Intl.NumberFormat("en-MY", {
            style: "currency",
            currency: "MYR",
            minimumFractionDigits: 0,
        }).format(amount);
    };

    const getFeasibilityColor = (feasibility: string = "") => {
        switch (feasibility.toLowerCase()) {
            case "high":
                return "text-green-600 bg-green-50 border-green-200";
            case "medium":
                return "text-yellow-600 bg-yellow-50 border-yellow-200";
            case "low":
                return "text-red-600 bg-red-50 border-red-200";
            default:
                return "text-gray-600 bg-gray-50 border-gray-200";
        }
    };

    if (!data) return null;

    return (
        <div className="bg-white/80 backdrop-blur-md rounded-xl p-6 my-4 border-2 border-purple-200 shadow-xl animate-scale-in">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-1">{data.plan_title || "Financial Plan"}</h2>
                    <p className="text-sm text-gray-500">Goal: {data.goal || "Not specified"}</p>
                </div>
                <div className={`px-4 py-1.5 rounded-full border text-sm font-bold ${getFeasibilityColor(data.feasibility)}`}>
                    Feasibility: {data.feasibility || "Unknown"}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                    <p className="text-xs text-blue-600 font-bold uppercase mb-1">Target Amount</p>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(data.target_amount)}</p>
                </div>
                <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100">
                    <p className="text-xs text-indigo-600 font-bold uppercase mb-1">Est. Time to Goal</p>
                    <p className="text-2xl font-bold text-gray-900">{data.months_to_goal || 0} Months</p>
                    <p className="text-xs text-indigo-400 mt-1">Saving {formatCurrency(data.monthly_contribution)}/mo</p>
                </div>
            </div>

            <div className="mb-6">
                <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                    <span>🚩</span> Milestones
                </h3>
                <div className="relative border-l-2 border-purple-100 ml-3 space-y-6">
                    {(data.milestones || []).map((milestone, idx) => (
                        <div key={idx} className="ml-6 relative">
                            <div className="absolute -left-[31px] bg-purple-100 border-2 border-purple-500 w-4 h-4 rounded-full"></div>
                            <p className="font-bold text-gray-800 text-sm">Month {milestone.month}</p>
                            <div className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm mt-1">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-xs font-semibold text-purple-600">Accumulated</span>
                                    <span className="text-sm font-bold text-gray-900">{formatCurrency(milestone.saved_amount)}</span>
                                </div>
                                <p className="text-xs text-gray-500">{milestone.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-4 rounded-lg border border-purple-100">
                <h3 className="text-sm font-bold text-purple-900 mb-1">💡 Professional Recommendation</h3>
                <p className="text-sm text-gray-700 leading-relaxed italic">"{data.recommendation || "No recommendation provided."}"</p>
            </div>
        </div>
    );
};
