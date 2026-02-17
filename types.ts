
export type WeatherType = 'Clear' | 'Rain' | 'Heavy Rain' | 'Fog';
export type EventType = 'None' | 'Festival' | 'Accident' | 'Roadwork';
export type TrafficLevel = 'Low' | 'Moderate' | 'High' | 'Critical';
export type ThemeMode = 'light' | 'dark';
export type MapViewMode = 'standard' | 'satellite';
export type Language = 'en' | 'mr' | 'hi';

export interface Junction {
  id: string;
  name: string;
  lat: number;
  lng: number;
  density: number; // 0 - 100
  signalTiming: number; // seconds of green
  status: TrafficLevel;
}

export interface NavigationStep {
  instruction: { en: string; mr: string; hi: string };
  distance: string;
  target: [number, number];
  icon: 'straight' | 'left' | 'right' | 'arrive';
}

export interface SimulationState {
  time: string;
  weather: WeatherType;
  activeEvent: EventType;
  junctions: Junction[];
  emergencyActive: boolean;
  isDriveMode: boolean;
  currentRoad: string;
  language: Language;
  currentNavStep: number;
  destinationId: string | null;
  optimizedRoute: [number, number][];
}

export interface AIInsight {
  type: 'prediction' | 'optimization' | 'alert';
  message: string;
  targetId?: string;
  impactScore: number;
}
