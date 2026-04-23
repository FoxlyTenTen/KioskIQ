/**
 * ProductCard Component
 *
 * Displays product research results from the ProductResearchAgent.
 */
import React from "react";
import { type ProductResearchData } from "./types";

export const ProductCard = ({ data }: { data: ProductResearchData }) => {
    return (
        <div className="bg-white/80 backdrop-blur-md rounded-xl p-4 my-3 border-2 border-[#E9D5FF] shadow-elevation-md animate-fade-in-up">
            {/* Header */}
            <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">🛍️</span>
                <div>
                    <h3 className="text-lg font-bold text-purple-900">Recommended Gear for {data.query}</h3>
                    <p className="text-xs text-purple-600">Based on destination requirements</p>
                </div>
            </div>

            <div className="space-y-3">
                {data.results.map((p, i) => (
                    <div key={i} className="flex flex-col gap-2 bg-white/90 p-3 rounded-lg border border-[#F3E8FF] shadow-sm">

                        {/* Top Row: Name and Price */}
                        <div className="flex justify-between items-start">
                            <div>
                                <div className="font-semibold text-gray-900">{p.product_name}</div>
                                <div className="flex items-center gap-2 text-xs mt-0.5">
                                    <span className="text-yellow-500 font-medium">⭐ {p.rating}</span>
                                    <span className="text-gray-400">•</span>
                                    <span className="text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded">{p.key_feature}</span>
                                </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                                <div className="font-bold text-lg text-emerald-600">RM {p.best_deal.price}</div>
                                <div className="text-[10px] text-gray-500">at {p.best_deal.retailer}</div>
                            </div>
                        </div>

                        {/* Description */}
                        <p className="text-xs text-gray-600 leading-relaxed">{p.description}</p>

                    </div>
                ))}
            </div>
        </div>
    );
};
