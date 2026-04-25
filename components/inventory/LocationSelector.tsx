'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Location {
  location_id: string;
  location_name: string;
}

interface LocationSelectorProps {
  selectedLocation: string;
  onSelect: (locationId: string) => void;
}

export function LocationSelector({ selectedLocation, onSelect }: LocationSelectorProps) {
  const [locations, setLocations] = useState<Location[]>([]);

  useEffect(() => {
    supabase
      .from('locations')
      .select('location_id, location_name')
      .order('location_name')
      .then(({ data }) => {
        if (data && data.length > 0) setLocations(data);
      });
  }, []);

  if (locations.length === 0) return null;

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-muted-foreground font-medium">Location:</span>
      <div className="flex gap-2 flex-wrap">
        {locations.map(loc => (
          <button
            key={loc.location_id}
            onClick={() => onSelect(loc.location_id)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
              selectedLocation === loc.location_id
                ? 'bg-primary text-primary-foreground shadow-md scale-105'
                : 'bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            }`}
          >
            {loc.location_name}
          </button>
        ))}
      </div>
    </div>
  );
}
