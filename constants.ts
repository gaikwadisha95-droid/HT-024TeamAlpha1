import { Junction } from './types';

export const BARAMATI_CENTER: [number, number] = [18.1506, 74.5771];

export const INITIAL_JUNCTIONS: Junction[] = [
  { id: 'j1', name: 'Bhigwan Chowk', lat: 18.1534, lng: 74.5791, density: 45, signalTiming: 45, status: 'Moderate' },
  { id: 'j2', name: 'Pencil Chowk', lat: 18.1612, lng: 74.5824, density: 30, signalTiming: 45, status: 'Low' },
  { id: 'j3', name: 'Indapur Road Junction', lat: 18.1465, lng: 74.5855, density: 60, signalTiming: 60, status: 'High' },
  { id: 'j4', name: 'Court Area Junction', lat: 18.1568, lng: 74.5721, density: 25, signalTiming: 30, status: 'Low' },
  { id: 'j5', name: 'Railway Station Gate', lat: 18.1501, lng: 74.5898, density: 55, signalTiming: 45, status: 'Moderate' },
  { id: 'j6', name: 'Gunawadi Chowk', lat: 18.1685, lng: 74.5745, density: 20, signalTiming: 30, status: 'Low' },
  { id: 'j7', name: 'Morgaon Road T-Point', lat: 18.1412, lng: 74.5655, density: 35, signalTiming: 45, status: 'Moderate' },
];

export const WEATHER_OPTIONS = ['Clear', 'Rain', 'Heavy Rain', 'Fog'];
export const EVENT_OPTIONS = ['None', 'Festival', 'Accident', 'Roadwork'];