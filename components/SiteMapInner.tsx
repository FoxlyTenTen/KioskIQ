"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { type SiteSelectionOption } from "./types";
import { normalizeSiteSelectionOption } from "./site-selection-utils";

// Fix default Leaflet marker icons broken by webpack
const DefaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

const TargetIcon = L.divIcon({
  className: "custom-icon",
  html: `<div style="background:#3b82f6;width:32px;height:32px;border-radius:50%;border:3px solid white;box-shadow:0 4px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;color:white;font-size:14px;">★</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

function MapFly({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 15);
  }, [center, map]);
  return null;
}

export default function SiteMapInner({ data }: { data: SiteSelectionOption }) {
  const normalized = normalizeSiteSelectionOption(data);

  if (!normalized.coordinates) return null;
  const center: [number, number] = [normalized.coordinates.lat, normalized.coordinates.lng];

  return (
    <MapContainer
      center={center}
      zoom={15}
      style={{ height: "100%", width: "100%" }}
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      />
      <MapFly center={center} />

      {/* Target location marker */}
      <Marker position={center} icon={TargetIcon}>
        <Popup>
          <div className="min-w-[140px]">
            <p className="font-bold text-blue-700 border-b pb-1 mb-1">{normalized.name}</p>
            <p className="text-xs text-gray-600">{normalized.type}</p>
            <p className="text-xs font-semibold mt-1">Score: {normalized.scores.overallScore}/100</p>
            <p className="text-xs">Rent: RM {normalized.metrics.rentMonthlyRM.toLocaleString()}/mo</p>
            <p className="text-xs">Drive: {normalized.metrics.driveTimeFromCityCentre}</p>
          </div>
        </Popup>
      </Marker>

      {/* Competitor markers */}
      {normalized.competitors?.map((comp, i) => (
        <CircleMarker
          key={i}
          center={[comp.coordinates.lat, comp.coordinates.lng]}
          radius={7}
          pathOptions={{ fillColor: "#ef4444", color: "white", weight: 2, fillOpacity: 0.85 }}
        >
          <Popup>
            <div className="text-xs">
              <p className="font-bold text-red-600">Competitor</p>
              <p>{comp.name}</p>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
