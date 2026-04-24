
'use client';

import { MapContainer, TileLayer, Marker, Popup, useMap, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { RecommendedLocation } from './types';
import { useEffect } from 'react';

// Fix for default marker icons
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

const RecIcon = (color: string) => L.divIcon({
  className: 'custom-icon',
  html: `<div style="background-color: ${color}; width: 28px; height: 28px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 6px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 10px;">★</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 14);
  }, [center, map]);
  return null;
}

interface LocationMapProps {
  locations: RecommendedLocation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  center?: [number, number];
}

export default function LocationMap({ locations, selectedId, onSelect, center = [3.1390, 101.6869] }: LocationMapProps) {
  const selectedLoc = locations.find(l => l.id === selectedId);

  return (
    <div className="h-full w-full rounded-2xl overflow-hidden shadow-2xl bg-slate-100 border-2 border-white/50 backdrop-blur-sm">
      <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }} zoomControl={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        <MapUpdater center={center} />
        
        {/* Recommended Locations */}
        {locations.map((loc) => (
          <Marker 
            key={loc.id} 
            position={[loc.coordinates.lat, loc.coordinates.lng]}
            icon={selectedId === loc.id ? RecIcon('#f43f5e') : RecIcon('#3b82f6')}
            eventHandlers={{
              click: () => onSelect(loc.id),
            }}
          >
            <Popup className="custom-popup">
              <div className="p-2 min-w-[150px]">
                <h3 className="font-bold text-slate-900 border-b pb-1 mb-2">{loc.name}</h3>
                <div className="space-y-1 text-xs">
                  <p className="flex justify-between"><span>Score:</span> <span className="font-bold text-indigo-600">{loc.finalScore}/100</span></p>
                  <p className="flex justify-between"><span>Demand:</span> <span className="font-semibold">{loc.demandScore}</span></p>
                  <p className="flex justify-between"><span>Cost Fit:</span> <span>{loc.costFit}%</span></p>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Competitors of Selected Location */}
        {selectedLoc?.competitors.map((comp, idx) => (
          comp.coordinates && (
            <CircleMarker
              key={`comp-${idx}`}
              center={[comp.coordinates.lat, comp.coordinates.lng]}
              radius={6}
              pathOptions={{ fillColor: '#ef4444', color: 'white', weight: 2, fillOpacity: 0.8 }}
            >
              <Popup>
                <div className="text-xs font-bold text-red-600">Competitor: {comp.name}</div>
              </Popup>
            </CircleMarker>
          )
        ))}

      </MapContainer>
    </div>
  );
}
