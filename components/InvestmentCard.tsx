import React from "react";
import { InvestmentStrategyData } from "./types";

interface InvestmentCardProps {
    data: InvestmentStrategyData;
    onUpdate?: (data: InvestmentStrategyData) => void;
}

export const InvestmentCard: React.FC<InvestmentCardProps> = ({ data, onUpdate }) => {
    const handleUpdate = (field: keyof InvestmentStrategyData, value: any) => {
        if (!onUpdate) return;
        onUpdate({ ...data, [field]: value });
    };
    // Generate allocation bars
    const renderAllocationBars = () => {
        return Object.entries(data.allocation).map(([asset, percentage], index) => (
            <div key={asset} className="mb-3">
                <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-gray-700">{asset}</span>
                    <span className="text-gray-900">{percentage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                        className="h-2 rounded-full"
                        style={{
                            width: `${percentage}%`,
                            backgroundColor: `hsl(${210 + (index * 40)}, 70%, 50%)`, // Dynamic blues/purples
                        }}
                    ></div>
                </div>
            </div>
        ));
    };

    return (
        <div className="bg-white/80 backdrop-blur-xl rounded-xl p-6 my-4 border border-blue-100 shadow-lg animate-fade-in relative overflow-hidden">
            {/* Decorative background element */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-100 to-purple-100 rounded-bl-full opacity-50 z-0"></div>

            <div className="relative z-10">
                <div className="flex flex-col gap-1 mb-6">
                    <div className="flex justify-between items-start">
                        <span className="px-2 py-0.5 bg-blue-100/50 text-blue-700 text-[10px] font-bold uppercase tracking-wider rounded border border-blue-200">
                            📈 Investment Strategy
                        </span>
                        <span className={`px-3 py-1 text-xs font-bold rounded-full border ${data.riskLevel.toLowerCase().includes('high') || data.riskLevel.toLowerCase().includes('aggressive')
                            ? 'bg-red-50 text-red-600 border-red-200'
                            : data.riskLevel.toLowerCase().includes('moderate')
                                ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                                : 'bg-green-50 text-green-700 border-green-200'
                            }`}>
                            {onUpdate ? (
                                <select
                                    value={data.riskLevel}
                                    onChange={(e) => handleUpdate('riskLevel', e.target.value)}
                                    className="bg-transparent focus:outline-none cursor-pointer"
                                >
                                    <option value="Conservative">Conservative</option>
                                    <option value="Moderate">Moderate</option>
                                    <option value="Aggressive">Aggressive</option>
                                    <option value="High">High</option>
                                </select>
                            ) : (
                                `${data.riskLevel} Risk`
                            )}
                        </span>
                    </div>

                    <h2 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-indigo-600 leading-tight mt-2 group cursor-text">
                        {onUpdate ? (
                            <input
                                value={data.strategyName}
                                onChange={(e) => handleUpdate('strategyName', e.target.value)}
                                className="bg-transparent w-full focus:outline-none border-b border-indigo-200"
                            />
                        ) : data.strategyName}
                    </h2>
                </div>

                <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100 mb-6">
                    <p className="text-sm text-gray-700 leading-relaxed italic">
                        "{data.rationale}"
                    </p>
                    <div className="mt-2 flex items-center gap-2 text-xs font-semibold text-blue-800">
                        <span>🎯 Expected Return:</span>
                        <span className="bg-white px-2 py-0.5 rounded shadow-sm border border-blue-100 group cursor-text">
                            {onUpdate ? (
                                <input
                                    value={data.expectedReturn}
                                    onChange={(e) => handleUpdate('expectedReturn', e.target.value)}
                                    className="bg-transparent w-20 focus:outline-none text-center"
                                />
                            ) : data.expectedReturn}
                        </span>
                    </div>
                </div>

                <div className="mb-6">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                        Portfolio Allocation
                    </h3>
                    <div className="bg-white/50 p-4 rounded-lg border border-gray-100">
                        {renderAllocationBars()}
                    </div>
                </div>

                <div>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                        Recommended Investments
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {data.recommendedVehicles.map((vehicle, idx) => (
                            <span
                                key={idx}
                                className="px-3 py-1.5 bg-white text-gray-700 text-xs font-medium rounded-md shadow-sm border border-gray-200 flex items-center gap-1"
                            >
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                {vehicle}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
