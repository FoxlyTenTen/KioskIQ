"use client";

import dynamic from "next/dynamic";
import { type SiteSelectionOption } from "./types";

// Leaflet must be loaded client-side only
const MapInner = dynamic(() => import("./SiteMapInner"), { ssr: false });

interface SiteMapCardProps {
  data: SiteSelectionOption;
}

export const SiteMapCard = ({ data }: SiteMapCardProps) => {
  if (!data.coordinates) return null;
  return (
    <div className="bg-white/60 backdrop-blur-md rounded-xl overflow-hidden border-2 border-[#DBDBE5] shadow-elevation-md my-3">
      <div className="px-4 py-3 border-b border-[#DBDBE5] flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-[#010507]">📍 Location Map — {data.name}</h3>
          <p className="text-xs text-[#57575B] mt-0.5">
            {data.competitors?.length ?? 0} F&B competitors shown within 800m
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-[#57575B]">
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-full bg-blue-500 border-2 border-white shadow" />
            Target
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-full bg-red-500 border-2 border-white shadow" />
            Competitor
          </span>
        </div>
      </div>
      <div className="h-[380px] w-full">
        <MapInner data={data} />
      </div>
    </div>
  );
};
