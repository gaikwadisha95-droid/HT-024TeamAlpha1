
export interface Location {
  name: string;
  lat: number;
  lng: number;
}

export enum TrafficLevel {
  LOW = 'LOW',
  MODERATE = 'MODERATE',
  HEAVY = 'HEAVY',
  JAMMED = 'JAMMED'
}

export interface RouteAlert {
  type: 'TRAFFIC' | 'EMERGENCY' | 'WEATHER' | 'ROADBLOCK';
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  message: string;
  distanceAheadKm: number;
  location: [number, number];
}

export interface RouteAnalysis {
  overallTraffic: TrafficLevel;
  estimatedTimeMins: number;
  weatherCondition: string;
  alerts: RouteAlert[];
  safetyScore: number;
}
