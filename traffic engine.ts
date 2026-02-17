
import { SimulationState, Junction, TrafficLevel } from '../types';
import { JUNCTION_CONNECTIONS } from '../constants';

export const getTrafficStatus = (density: number): TrafficLevel => {
  if (density > 85) return 'Critical';
  if (density > 65) return 'High';
  if (density > 35) return 'Moderate';
  return 'Low';
};

export const calculateNextState = (state: SimulationState): SimulationState => {
  const { junctions, weather, activeEvent, time } = state;
  const hour = parseInt(time.split(':')[0]);
  const isPeakHour = (hour >= 8 && hour <= 11) || (hour >= 17 && hour <= 20);

  const updatedJunctions = junctions.map(junction => {
    let baseChange = (Math.random() - 0.45) * 5;
    
    if (isPeakHour) baseChange += 4;
    if (weather === 'Rain') baseChange += 3;
    if (weather === 'Heavy Rain') baseChange += 8;
    if (activeEvent === 'Festival') baseChange += 10;
    if (activeEvent === 'Accident') baseChange += 15;

    const mitigation = (junction.signalTiming / 100) * 2;
    let newDensity = Math.min(100, Math.max(0, junction.density + baseChange - mitigation));
    
    return {
      ...junction,
      density: Math.round(newDensity),
      status: getTrafficStatus(newDensity)
    };
  });

  return { ...state, junctions: updatedJunctions };
};

export const predictFutureCongestion = (junctions: Junction[], minutes: number): string[] => {
  return junctions
    .filter(j => j.density + (minutes * 0.5) > 80)
    .map(j => `Potential critical jam at ${j.name} in approx. ${minutes} mins`);
};

// Simplified Dijkstra for the virtual city
export const findOptimizedRoute = (
  startId: string, 
  endId: string, 
  junctions: Junction[], 
  isEmergency: boolean
): [number, number][] => {
  const distances: Record<string, number> = {};
  const prev: Record<string, string | null> = {};
  const queue: string[] = [];

  junctions.forEach(j => {
    distances[j.id] = Infinity;
    prev[j.id] = null;
    queue.push(j.id);
  });

  distances[startId] = 0;

  while (queue.length > 0) {
    queue.sort((a, b) => distances[a] - distances[b]);
    const u = queue.shift()!;

    if (u === endId) break;

    const neighbors = JUNCTION_CONNECTIONS[u] || [];
    neighbors.forEach(vId => {
      const vJunction = junctions.find(j => j.id === vId);
      if (!vJunction) return;

      // Weight factor: density affects travel time/cost
      // For emergency, high density is even more costly unless we "force" clear lanes
      const densityWeight = isEmergency ? (vJunction.density * 0.5) : vJunction.density;
      const weight = 1 + (densityWeight / 10);
      
      const alt = distances[u] + weight;
      if (alt < distances[vId]) {
        distances[vId] = alt;
        prev[vId] = u;
      }
    });
  }

  const path: [number, number][] = [];
  let curr: string | null = endId;
  while (curr) {
    const j = junctions.find(j => j.id === curr);
    if (j) path.unshift([j.lat, j.lng]);
    curr = prev[curr];
  }

  return path;
};
