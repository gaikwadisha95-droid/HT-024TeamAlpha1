
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMap, useMapEvents } from 'react-leaflet';
import { SimulationState, AIInsight, EventType, WeatherType, ThemeMode, MapViewMode, Language, Junction } from './types';
import { BARAMATI_CENTER, INITIAL_JUNCTIONS } from './constants';
import { calculateNextState, findOptimizedRoute } from './services/trafficEngine';
import { getAIInsights, getBaramatiLiveUpdates, speakTrafficAlert } from './services/gemini';
import { 
  LucideActivity, LucideNavigation, LucideBrainCircuit,
  LucideSun, LucideMoon, LucideLayers, LucideVolume2, LucideVolumeX, LucideMic,
  LucideArrowUpRight, LucideGripVertical, LucideLanguages,
  LucideArrowUp, LucideMapPin, LucideCircleStop, LucideSiren, LucideSearch, LucideX, LucideClock,
  LucideChevronRight, LucideLocateFixed, LucideArrowUpLeft, LucideArrowUpRight as LucideArrowRight, LucideCircleCheck
} from 'lucide-react';

const TRANSLATIONS = {
  en: { 
    drive: "Start", exit: "Exit", heading: "Heading towards", weather: "Weather", alerts: "Alerts", 
    density: "Density", welcome: "Baramati Sentinel", setDest: "Where to?", emergency: "Emergency", 
    directions: "Directions", recenter: "Re-center", in: "in", meters: "m", proceed: "Proceed to", arrived: "You have arrived!"
  },
  mr: { 
    drive: "सुरू करा", exit: "बाहेर पडा", heading: "कडे जात आहे", weather: "हवामान", alerts: "सूचना", 
    density: "घनता", welcome: "बारामती सेंटिनेल", setDest: "कुठे जायचे?", emergency: "आणीबाणी", 
    directions: "दिशा", recenter: "पुन्हा केंद्र करा", in: "मध्ये", meters: "मी", proceed: "कडे जा", arrived: "तुम्ही पोहोचला आहात!"
  },
  hi: { 
    drive: "शुरू करें", exit: "बाहर निकलें", heading: "की ओर जा रहे हैं", weather: "मौसम", alerts: "अलर्ट", 
    density: "घनता", welcome: "बारामती सेंटिनेल", setDest: "कहाँ जाना है?", emergency: "आपातकालीन", 
    directions: "दिशा-निर्देश", recenter: "पुनः केंद्रित करें", in: "में", meters: "मी", proceed: "की ओर बढ़ें", arrived: "आप पहुँच गए हैं!"
  }
};

// Component to handle map following and manual interaction
const MapController = ({ center, zoom, follow, onManualInteraction }: { center: [number, number], zoom: number, follow: boolean, onManualInteraction: () => void }) => {
  const map = useMap();
  
  useMapEvents({
    dragstart: () => onManualInteraction(),
    zoomstart: () => onManualInteraction(),
  });

  useEffect(() => {
    if (follow) {
      map.setView(center, zoom, { animate: true });
    }
  }, [center, zoom, follow, map]);

  return null;
};

const DraggableSidebar = ({ children, theme }: { children: React.ReactNode, theme: ThemeMode }) => {
  const [pos, setPos] = useState({ x: 20, y: 20 });
  const [dragging, setDragging] = useState(false);
  const offset = useRef({ x: 0, y: 0 });

  const onMouseDown = (e: React.MouseEvent) => {
    setDragging(true);
    offset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (dragging) {
        setPos({ x: e.clientX - offset.current.x, y: e.clientY - offset.current.y });
      }
    };
    const onMouseUp = () => setDragging(false);
    if (dragging) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [dragging, pos.x, pos.y]);

  return (
    <div 
      style={{ left: pos.x, top: pos.y, position: 'absolute' }}
      className={`z-[2000] w-80 shadow-2xl rounded-3xl border flex flex-col overflow-hidden select-none ${theme === 'dark' ? 'bg-slate-900/95 border-slate-700' : 'bg-white/95 border-slate-200'}`}
    >
      <div onMouseDown={onMouseDown} className="h-10 flex items-center justify-center cursor-grab active:cursor-grabbing bg-slate-500/10 border-b border-white/5 transition-colors">
        <LucideGripVertical className="opacity-40" size={16} />
      </div>
      <div className="p-5 flex-1 overflow-y-auto max-h-[75vh] custom-scrollbar pointer-events-auto">
        {children}
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [state, setState] = useState<SimulationState>({
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    weather: 'Clear',
    activeEvent: 'None',
    junctions: INITIAL_JUNCTIONS,
    emergencyActive: false,
    isDriveMode: false,
    currentRoad: 'Station Road',
    language: 'en',
    currentNavStep: 0,
    destinationId: null,
    optimizedRoute: []
  });

  const [theme, setTheme] = useState<ThemeMode>('dark');
  const [mapView, setMapView] = useState<MapViewMode>('standard');
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([]);
  const [isSimulating, setIsSimulating] = useState(true);
  const [liveAssistantData, setLiveAssistantData] = useState({ text: '', grounding: [] });
  const [userPos, setUserPos] = useState<[number, number]>(BARAMATI_CENTER);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFollowing, setIsFollowing] = useState(true);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const lastSpokenRef = useRef<number>(-1);

  // Helper to get color based on density
  const getDensityColor = (density: number) => {
    if (density > 85) return '#ef4444'; // Red (Critical)
    if (density > 65) return '#f97316'; // Orange (High)
    if (density > 35) return '#eab308'; // Yellow (Moderate)
    return '#22c55e'; // Green (Low)
  };

  // Distance helper
  const getDistance = (p1: [number, number], p2: [number, number]) => {
    const R = 6371e3; // meters
    const φ1 = p1[0] * Math.PI/180;
    const φ2 = p2[0] * Math.PI/180;
    const Δφ = (p2[0]-p1[0]) * Math.PI/180;
    const Δλ = (p2[1]-p1[1]) * Math.PI/180;
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // in meters
  };

  // Simulation Loop
  useEffect(() => {
    const timer = setInterval(() => {
      setState(prev => ({ ...prev, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }));
    }, 1000);
    const trafficInterval = setInterval(() => {
      if (isSimulating) setState(prev => calculateNextState(prev));
    }, 5000);
    return () => { clearInterval(timer); clearInterval(trafficInterval); };
  }, [isSimulating]);

  // Route calculation
  useEffect(() => {
    if (state.destinationId) {
      let nearestId = 'j1';
      let minDist = Infinity;
      state.junctions.forEach(j => {
        const d = Math.sqrt(Math.pow(j.lat - userPos[0], 2) + Math.pow(j.lng - userPos[1], 2));
        if (d < minDist) { minDist = d; nearestId = j.id; }
      });

      const route = findOptimizedRoute(nearestId, state.destinationId, state.junctions, state.emergencyActive);
      setState(prev => ({ ...prev, optimizedRoute: route }));
    } else {
      setState(prev => ({ ...prev, optimizedRoute: [] }));
    }
  }, [state.destinationId, state.emergencyActive, state.junctions, userPos]);

  // Movement simulation
  useEffect(() => {
    if (state.isDriveMode && state.optimizedRoute.length > 0) {
      const moveInterval = setInterval(() => {
        setUserPos(prev => {
          const nextTarget = state.optimizedRoute[state.currentNavStep + 1];
          if (!nextTarget) return prev;

          const latDiff = (nextTarget[0] - prev[0]) * 0.15;
          const lngDiff = (nextTarget[1] - prev[1]) * 0.15;
          const distToTarget = Math.sqrt(Math.pow(nextTarget[0] - prev[0], 2) + Math.pow(nextTarget[1] - prev[1], 2));
          
          if (distToTarget < 0.0002 && state.currentNavStep < state.optimizedRoute.length - 2) {
            setState(s => ({ ...s, currentNavStep: s.currentNavStep + 1 }));
          }
          return [prev[0] + latDiff, prev[1] + lngDiff];
        });
      }, 1500);
      return () => clearInterval(moveInterval);
    }
  }, [state.isDriveMode, state.currentNavStep, state.optimizedRoute]);

  // Navigation Logic
  const nextStepInfo = useMemo(() => {
    if (!state.isDriveMode || state.optimizedRoute.length === 0) return null;
    const isAtEnd = state.currentNavStep === state.optimizedRoute.length - 1;
    if (isAtEnd) return { instruction: TRANSLATIONS[state.language].arrived, distance: 0, nextName: "" };

    const nextPoint = state.optimizedRoute[state.currentNavStep + 1];
    const dist = Math.round(getDistance(userPos, nextPoint));
    const nextJunction = state.junctions.find(j => j.lat === nextPoint[0] && j.lng === nextPoint[1]);
    const instruction = `${TRANSLATIONS[state.language].proceed} ${nextJunction?.name || ""}`;
    
    return { instruction, distance: dist, nextName: nextJunction?.name || "" };
  }, [state.isDriveMode, state.optimizedRoute, state.currentNavStep, userPos, state.language, state.junctions]);

  // Audio Alerts Effect
  useEffect(() => {
    const announceAlert = async () => {
      if (!isAudioEnabled || !state.isDriveMode || !nextStepInfo) return;
      if (lastSpokenRef.current === state.currentNavStep) return;

      const msg = `${nextStepInfo.instruction}. ${TRANSLATIONS[state.language].in} ${nextStepInfo.distance} ${TRANSLATIONS[state.language].meters}.`;
      
      const audioBase64 = await speakTrafficAlert(msg, state.language);
      if (audioBase64) {
        lastSpokenRef.current = state.currentNavStep;
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        const binaryString = atob(audioBase64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
        const dataInt16 = new Int16Array(bytes.buffer);
        const buffer = audioContextRef.current.createBuffer(1, dataInt16.length, 24000);
        buffer.getChannelData(0).set(Array.from(dataInt16).map(v => v / 32768.0));
        const source = audioContextRef.current.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContextRef.current.destination);
        source.start();
      }
    };
    announceAlert();
  }, [state.currentNavStep, state.isDriveMode, isAudioEnabled, state.language, nextStepInfo]);

  const handleSelectDestination = (id: string) => {
    setState(prev => ({ ...prev, destinationId: id, currentNavStep: 0 }));
    setSearchQuery('');
    setIsFollowing(true);
  };

  const fetchUpdates = useCallback(async () => {
    const [insights, updates] = await Promise.all([getAIInsights(state), getBaramatiLiveUpdates(state.language)]);
    setAiInsights(insights);
    setLiveAssistantData(updates);
  }, [state.language, state.weather, state.activeEvent]);

  useEffect(() => { fetchUpdates(); }, [fetchUpdates]);

  const t = TRANSLATIONS[state.language];

  const destinationJunction = useMemo(() => {
    return state.junctions.find(j => j.id === state.destinationId);
  }, [state.destinationId, state.junctions]);

  const filteredJunctions = useMemo(() => {
    if (!searchQuery) return [];
    return state.junctions.filter(j => j.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [searchQuery, state.junctions]);

  return (
    <div className={`flex h-screen overflow-hidden ${theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      
      {!state.isDriveMode && (
        <DraggableSidebar theme={theme}>
          <div className="flex items-center justify-between mb-4">
            <LucideActivity className="text-blue-500 w-8 h-8" />
            <div className="flex gap-2">
              <button onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} className="p-2 bg-slate-500/10 rounded-full hover:bg-slate-500/20"><LucideSun size={14} /></button>
              <button onClick={() => setState(s => ({ ...s, language: s.language === 'en' ? 'mr' : s.language === 'mr' ? 'hi' : 'en' }))} className="p-2 bg-slate-500/10 rounded-full text-[10px] font-bold hover:bg-slate-500/20"><LucideLanguages size={14} /> {state.language.toUpperCase()}</button>
            </div>
          </div>

          {/* Search Box with Clear Button */}
          <div className="relative mb-6">
            <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'} focus-within:ring-2 focus-within:ring-blue-500/50`}>
              <LucideSearch size={18} className="text-slate-500" />
              <input 
                type="text" 
                placeholder={t.setDest} 
                className="bg-transparent border-none outline-none w-full text-sm font-medium"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="p-1 hover:bg-slate-500/20 rounded-full transition-colors"
                >
                  <LucideX size={16} className="text-slate-500" />
                </button>
              )}
            </div>
            {filteredJunctions.length > 0 && (
              <div className={`absolute top-full left-0 right-0 mt-2 z-50 rounded-2xl border shadow-2xl overflow-hidden ${theme === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
                {filteredJunctions.map(j => (
                  <button 
                    key={j.id} 
                    onClick={() => handleSelectDestination(j.id)}
                    className="w-full text-left px-5 py-3 text-sm hover:bg-blue-500/10 flex items-center gap-3 border-b last:border-none border-slate-700/50"
                  >
                    <LucideMapPin size={14} className="text-blue-500" /> {j.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {state.destinationId ? (
            <div className="space-y-4 mb-6 animate-in fade-in duration-300">
              <div className="flex items-center justify-between">
                <p className="text-xs font-black uppercase tracking-widest opacity-40">{t.directions}</p>
                <button onClick={() => setState(s => ({ ...s, destinationId: null }))} className="text-[10px] font-bold text-blue-500 hover:underline">RESET</button>
              </div>
              <div className={`p-5 rounded-2xl border ${theme === 'dark' ? 'bg-blue-600/5 border-blue-500/30' : 'bg-blue-50 border-blue-200'}`}>
                <p className="text-lg font-black leading-tight mb-1">{destinationJunction?.name}</p>
                <div className="flex items-center gap-4 text-xs font-bold opacity-60">
                   <span className="flex items-center gap-1"><LucideClock size={12} /> ~8 min</span>
                   <span className="flex items-center gap-1"><LucideNavigation size={12} /> 2.4 km</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => {
                    setState(s => ({ ...s, isDriveMode: true, emergencyActive: false }));
                    setIsFollowing(true);
                  }}
                  className="py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg"
                >
                  <LucideNavigation size={16} /> {t.drive}
                </button>
                <button 
                  onClick={() => {
                    setState(s => ({ ...s, isDriveMode: true, emergencyActive: true }));
                    setIsFollowing(true);
                  }}
                  className="py-4 bg-red-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg"
                >
                  <LucideSiren size={16} /> {t.emergency}
                </button>
              </div>
            </div>
          ) : (
            <div className="mb-6">
              <p className="text-xs font-bold opacity-40 uppercase tracking-widest mb-4">Nearby Landmarks</p>
              <div className="space-y-2">
                {state.junctions.slice(0, 3).map(j => (
                  <button 
                    key={j.id} 
                    onClick={() => handleSelectDestination(j.id)}
                    className={`w-full text-left px-4 py-3 rounded-xl border flex items-center justify-between group transition-all ${theme === 'dark' ? 'bg-slate-800/50 border-slate-700 hover:border-blue-500/50' : 'bg-slate-50 border-slate-200 hover:border-blue-500/50'}`}
                  >
                    <span className="text-sm font-medium">{j.name}</span>
                    <LucideChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-6">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-3">{t.alerts}</p>
              <div className={`p-4 rounded-2xl border text-[11px] leading-relaxed max-h-32 overflow-y-auto custom-scrollbar ${theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-100 border-slate-200'}`}>
                {liveAssistantData.text || "Scanning city sensors..."}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-3">AI SENTINEL</p>
              <div className="space-y-2">
                {aiInsights.map((ins, i) => (
                  <div key={i} className="p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-xl text-[10px] flex gap-3">
                    <LucideBrainCircuit size={16} className="text-indigo-500 shrink-0" />
                    <span>{ins.message}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DraggableSidebar>
      )}

      {/* DRIVE MODE NAVIGATION OVERLAY (Top) */}
      {state.isDriveMode && (
        <div className="absolute inset-x-0 top-0 z-[3000] p-6 pointer-events-none">
          <div className={`max-w-xl mx-auto rounded-[2.5rem] p-6 shadow-2xl flex items-center gap-6 border-b-8 pointer-events-auto transition-all ${state.emergencyActive ? 'bg-red-600 border-red-800' : 'bg-green-600 border-green-800'} text-white`}>
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center shrink-0">
              {state.emergencyActive ? <LucideSiren size={48} className="animate-pulse" /> : (
                nextStepInfo?.distance === 0 ? <LucideCircleCheck size={48} /> : <LucideArrowUp size={48} />
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm font-black opacity-80 uppercase mb-1 tracking-widest">
                {state.emergencyActive ? "EMERGENCY CLEARANCE ACTIVE" : t.heading}
              </p>
              <p className="text-2xl font-black tracking-tight leading-snug">
                {nextStepInfo?.instruction}
              </p>
              {nextStepInfo && nextStepInfo.distance > 0 && (
                <p className="text-sm font-bold opacity-70">
                  {t.in} {nextStepInfo.distance} {t.meters}
                </p>
              )}
            </div>
            <button 
              onClick={() => setIsAudioEnabled(!isAudioEnabled)}
              className={`p-5 rounded-full transition-all shadow-lg ${isAudioEnabled ? 'bg-white text-blue-600' : 'bg-white/20 text-white'}`}
            >
              {isAudioEnabled ? <LucideVolume2 size={28} /> : <LucideVolumeX size={28} />}
            </button>
          </div>
        </div>
      )}

      <main className="flex-1 relative">
        <MapContainer center={BARAMATI_CENTER} zoom={15} className="h-full w-full" zoomControl={false}>
          <TileLayer url={mapView === 'satellite' ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" : (theme === 'dark' ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png")} />
          
          <MapController 
            center={userPos} 
            zoom={state.isDriveMode ? 18 : 15} 
            follow={isFollowing} 
            onManualInteraction={() => setIsFollowing(false)} 
          />
          
          {state.optimizedRoute.length > 0 && (
            <Polyline 
              positions={state.optimizedRoute} 
              pathOptions={{ 
                color: state.emergencyActive ? '#ef4444' : '#3b82f6', 
                weight: 10, 
                opacity: 0.7,
                dashArray: state.emergencyActive ? '10, 15' : '0',
                lineJoin: 'round'
              }} 
            />
          )}

          {/* Visual representation of traffic density */}
          {state.junctions.map(j => (
            <React.Fragment key={j.id}>
              <Circle 
                center={[j.lat, j.lng]} 
                radius={150} 
                pathOptions={{ 
                  color: getDensityColor(j.density),
                  fillColor: getDensityColor(j.density),
                  fillOpacity: state.destinationId === j.id ? 0.6 : 0.2,
                  weight: state.destinationId === j.id ? 5 : 2
                }} 
              />
              <Marker position={[j.lat, j.lng]}>
                <Popup className="custom-popup">
                  <div className="p-1 text-center">
                    <p className="font-black text-sm mb-1">{j.name}</p>
                    <p className="text-[10px] opacity-60 font-bold uppercase mb-3">CONGESTION: {j.density}%</p>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectDestination(j.id);
                      }}
                      className="w-full py-2 bg-blue-600 text-white text-[10px] font-black rounded-xl uppercase tracking-widest hover:bg-blue-500"
                    >
                      Set as Target
                    </button>
                  </div>
                </Popup>
              </Marker>
            </React.Fragment>
          ))}
          
          <Marker position={userPos}>
             <Circle center={userPos} radius={state.isDriveMode ? 10 : 30} pathOptions={{ fillColor: '#3b82f6', fillOpacity: 1, weight: 3, color: '#fff' }} />
          </Marker>
        </MapContainer>

        {/* DRIVE MODE BOTTOM UI */}
        {state.isDriveMode && (
          <>
            {!isFollowing && (
              <button 
                onClick={() => setIsFollowing(true)}
                className="absolute bottom-44 left-1/2 -translate-x-1/2 z-[3000] px-6 py-3 bg-white text-slate-900 rounded-full font-black shadow-2xl flex items-center gap-2 hover:scale-105 transition-transform animate-in fade-in slide-in-from-bottom-2"
              >
                <LucideLocateFixed size={18} className="text-blue-500" /> {t.recenter}
              </button>
            )}
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-full max-w-2xl px-6 z-[3000] pointer-events-none">
              <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 shadow-2xl flex items-center justify-between border-t border-slate-700/30 pointer-events-auto">
                <div className="flex items-center gap-8">
                  <div className="text-center">
                    <p className={`text-5xl font-black ${state.emergencyActive ? 'text-red-500' : 'text-blue-500'}`}>
                      {state.emergencyActive ? '60' : '38'}
                    </p>
                    <p className="text-[10px] font-bold opacity-40 tracking-widest uppercase">KM/H</p>
                  </div>
                  <div className="h-12 w-px bg-slate-500/20"></div>
                  <div>
                    <p className="text-2xl font-black tracking-tight">{state.time}</p>
                    <div className="flex items-center gap-1 text-[10px] font-bold opacity-40 uppercase tracking-widest mt-1">
                      <LucideCircleStop size={10} className="text-red-500" /> ARRIVAL: {new Date(Date.now() + 180000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setState(s => ({ ...s, isDriveMode: false, currentNavStep: 0, emergencyActive: false }));
                    setIsFollowing(true);
                  }}
                  className="px-10 py-5 bg-slate-900 dark:bg-slate-800 text-white rounded-full font-black shadow-xl hover:bg-black transition-all uppercase tracking-widest text-sm"
                >
                  {t.exit}
                </button>
              </div>
            </div>
          </>
        )}

        {/* MAP TOOLS */}
        {!state.isDriveMode && (
          <div className="absolute bottom-6 right-6 flex flex-col gap-4 z-[2000]">
            <button 
              onClick={() => setMapView(v => v === 'standard' ? 'satellite' : 'standard')}
              className="p-5 bg-white dark:bg-slate-800 rounded-full shadow-2xl border border-slate-700/10 hover:scale-110 transition-transform text-blue-500"
            >
              <LucideLayers size={24} />
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
