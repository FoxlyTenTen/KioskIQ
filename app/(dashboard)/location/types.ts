
export interface Competitor {
  name: string;
  distance: string;
  coordinates?: { lat: number; lng: number };
}

export interface RecommendedLocation {
  id: string;
  name: string;
  imageUrl: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  finalScore: number;
  demandScore: number;
  competitionLevel: 'High' | 'Medium' | 'Low';
  costFit: number;
  baseRent: number;
  competitors: Competitor[];
  pros: string[];
  cons: string[];
  riskLevel: 'Low' | 'Medium' | 'High';
  summary: string;
}
