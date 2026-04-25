import React from "react";
import { type SiteSelectionOption } from "./types";

const SCORE_COLOR = (score: number) =>
  score >= 75 ? "text-emerald-600" : score >= 55 ? "text-yellow-600" : "text-red-600";

export const SelectedSiteCard = ({ data }: { data: SiteSelectionOption }) => (
  <div className="bg-white/60 backdrop-blur-md rounded-xl p-6 my-3 border-2 border-emerald-200 shadow-elevation-md animate-fade-in-up">
    <div className="flex items-center gap-3 mb-4 border-b border-[#DBDBE5] pb-4">
      <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 text-xl border border-emerald-200">
        ✓
      </div>
      <div>
        <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">Selected Location</p>
        <h2 className="text-xl font-bold text-[#010507]">{data.name}</h2>
        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{data.type}</span>
      </div>
      <div className="ml-auto text-right">
        <p className="text-xs text-[#57575B]">Overall Score</p>
        <p className={`text-2xl font-bold ${SCORE_COLOR(data.scores.overallScore)}`}>
          {data.scores.overallScore}
        </p>
      </div>
    </div>

    <p className="text-sm text-[#57575B] mb-4">{data.summary}</p>

    <div className="grid grid-cols-2 gap-3 mb-4">
      <div className="bg-[#F3F3FC] p-3 rounded-lg">
        <p className="text-xs text-[#57575B] mb-1">Monthly Rent</p>
        <p className="font-bold text-[#010507]">RM {data.metrics.rentMonthlyRM.toLocaleString()}</p>
      </div>
      <div className="bg-[#F3F3FC] p-3 rounded-lg">
        <p className="text-xs text-[#57575B] mb-1">Daily Foot Traffic</p>
        <p className="font-bold text-[#010507]">{data.metrics.footTrafficDaily.toLocaleString()}</p>
      </div>
      <div className="bg-[#F3F3FC] p-3 rounded-lg">
        <p className="text-xs text-[#57575B] mb-1">Nearby Population</p>
        <p className="font-bold text-[#010507]">{data.metrics.populationNearby.toLocaleString()}</p>
      </div>
      <div className="bg-[#F3F3FC] p-3 rounded-lg">
        <p className="text-xs text-[#57575B] mb-1">Competitors Nearby</p>
        <p className="font-bold text-[#010507]">{data.metrics.competitorCount}</p>
      </div>
    </div>

    <div className="grid grid-cols-2 gap-4">
      <div>
        <p className="text-xs font-semibold text-emerald-700 mb-1">Pros</p>
        <ul className="space-y-1">
          {data.pros.map((p, i) => (
            <li key={i} className="text-xs text-[#010507] flex gap-1">
              <span className="text-emerald-500 shrink-0">✓</span> {p}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <p className="text-xs font-semibold text-red-600 mb-1">Cons</p>
        <ul className="space-y-1">
          {data.cons.map((c, i) => (
            <li key={i} className="text-xs text-[#010507] flex gap-1">
              <span className="text-red-400 shrink-0">✗</span> {c}
            </li>
          ))}
        </ul>
      </div>
    </div>

    <div className="mt-4 grid grid-cols-4 gap-2">
      {Object.entries({
        "Foot Traffic": data.scores.footTrafficScore,
        "Affordability": data.scores.affordabilityScore,
        "Competition": data.scores.competitionScore,
        "Growth": data.scores.growthScore,
      }).map(([label, score]) => (
        <div key={label} className="text-center bg-white/80 rounded-lg p-2 border border-[#DBDBE5]">
          <p className={`text-lg font-bold ${SCORE_COLOR(score)}`}>{score}</p>
          <p className="text-[10px] text-[#57575B] leading-tight">{label}</p>
        </div>
      ))}
    </div>
  </div>
);
