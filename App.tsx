import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Menu, X, LocateFixed, AlertTriangle, Navigation, Square, Zap, ChevronRight, Map as MapIcon, Cloud, Info, Clock, ArrowRight, ZapOff, RefreshCcw } from 'lucide-react';
import NavigationPanel from './components/NavigationPanel';
import LoginPage from './components/Loginpage';
import { BARAMATI_CENTER } from './constants';
import { Location, RouteAnalysis, TrafficLevel } from './types';
import { analyzeRouteIntelligence } from './services/geminiService';

// Helper for real distance calculation (Haversine formula)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Fix for default Leaflet marker icons
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-shadow.png',
});

const alertIcon = L.divIcon({
  className: 'custom-div-icon',
  html: `<div style="background-color: #ef4444; width: 18px; height: 18px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 15px rgba(239, 68, 68, 0.5); animation: pulse 1.5s infinite;"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9]
});

const vehicleIcon = L.divIcon({
  className: 'custom-vehicle-icon',
  html: `<div style="background-color: #3b82f6; width: 32px; height: 32px; border-radius: 50%; border: 4px solid white; box-shadow: 0 10px 20px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;">
            <div style="width: 0; height: 0; border-left: 8px solid transparent; border-right: 8px solid transparent; border-bottom: 16px solid white; margin-bottom: 2px;"></div>
         </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16]
});

const MapController: React.FC<{ center: [number, number]; isDriving: boolean }> = ({ center, isDriving }) => {
  const map = useMap();
  useEffect(() => {
    if (isDriving) {
      map.setView(center, 18, { animate: true, duration: 1 });
      const container = map.getContainer();
      container.style.transition = 'transform 1s ease-in-out';
      container.style.transform = 'perspective(1000px) rotateX(25deg)';
    } else {
      map.flyTo(center, 14, { duration: 1.5 });
      const container = map.getContainer();
      container.style.transform = 'none';
    }
  }, [center, isDriving, map]);
  return null;
};

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [activeRoute, setActiveRoute] = useState<{ source: Location; dest: Location } | null>(null);
  const [analysis, setAnalysis] = useState<RouteAnalysis | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isDriving, setIsDriving] = useState(false);
  const [currentPos, setCurrentPos] = useState<[number, number]>(BARAMATI_CENTER);
  const [mapView, setMapView] = useState<[number, number]>(BARAMATI_CENTER);
  const [driveProgress, setDriveProgress] = useState(0);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [distRemaining, setDistRemaining] = useState(0);
  
  // UI states for notifications
  const [showWeatherToast, setShowWeatherToast] = useState(false);
  const [showTrafficModal, setShowTrafficModal] = useState(false);
  const [errorType, setErrorType] = useState<'QUOTA' | 'GENERAL' | null>(null);
  
  const watchIdRef = useRef<number | null>(null);

  // Check for existing login
  useEffect(() => {
    const savedUser = localStorage.getItem('baramati_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
      setIsAuthenticated(true);
    }
  }, []);

  const stopNavigation = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsDriving(false);
    setDriveProgress(0);
    setActiveRoute(null);
    setAnalysis(null);
    setIsSidebarOpen(true);
    setMapView(BARAMATI_CENTER);
    setCurrentSpeed(0);
    setDistRemaining(0);
    setShowWeatherToast(false);
    setShowTrafficModal(false);
    setErrorType(null);
  };

  const handleStartDrive = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    setIsDriving(true);
    setIsSidebarOpen(false);
    setShowTrafficModal(false);
    setErrorType(null);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, speed } = position.coords;
        const newCoords: [number, number] = [latitude, longitude];
        setCurrentPos(newCoords);
        
        const kmh = speed ? Math.round(speed * 3.6) : 0;
        setCurrentSpeed(kmh);

        if (activeRoute) {
          const remaining = calculateDistance(latitude, longitude, activeRoute.dest.lat, activeRoute.dest.lng);
          setDistRemaining(remaining);
          
          const total = calculateDistance(activeRoute.source.lat, activeRoute.source.lng, activeRoute.dest.lat, activeRoute.dest.lng);
          const progress = Math.max(0, Math.min(1, 1 - (remaining / total)));
          setDriveProgress(progress);

          if (remaining < 0.02) {
            stopNavigation();
            alert("You have arrived at your destination!");
          }
        }
      },
      (error) => {
        console.error("GPS Error:", error);
        alert("Unable to retrieve your location. Check GPS settings.");
        stopNavigation();
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
    );
  };

  const useFallbackMode = () => {
    const fallbackData: RouteAnalysis = {
      overallTraffic: TrafficLevel.LOW,
      estimatedTimeMins: 12,
      weatherCondition: "Clear (Offline Cache)",
      safetyScore: 9,
      alerts: []
    };
    setAnalysis(fallbackData);
    setErrorType(null);
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  const handleStartRoute = async (source: Location, dest: Location) => {
    setIsLoading(true);
    setErrorType(null);
    setActiveRoute({ source, dest });
    setMapView([source.lat, source.lng]);
    setCurrentPos([source.lat, source.lng]);
    setDriveProgress(0);
    setIsDriving(false);
    setShowWeatherToast(false);
    setShowTrafficModal(false);
    
    try {
      const result = await analyzeRouteIntelligence(source.name, dest.name);
      setAnalysis(result);
      
      setShowWeatherToast(true);
      setTimeout(() => setShowWeatherToast(false), 5000);

      if (result.overallTraffic === TrafficLevel.HEAVY || result.overallTraffic === TrafficLevel.JAMMED) {
        setShowTrafficModal(true);
      }

      if (window.innerWidth < 768) setIsSidebarOpen(false);
    } catch (error: any) {
      if (error.message === 'QUOTA_EXCEEDED') {
        setErrorType('QUOTA');
      } else {
        setErrorType('GENERAL');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = (userData: { name: string; email: string }) => {
    setUser(userData);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('baramati_user');
    setIsAuthenticated(false);
    setUser(null);
    stopNavigation();
  };

  const timeRemaining = analysis ? Math.ceil((distRemaining / 40) * 60) : 0;

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return (
    <>
      {!isAuthenticated ? (
        <LoginPage onLogin={handleLogin} />
      ) : (
        <div className="relative h-screen w-screen overflow-hidden flex flex-col md:flex-row bg-slate-950">
          
          {/* QUOTA EXCEEDED / ERROR MODAL */}
          {errorType && (
            <div className="absolute inset-0 z-[5000] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
              <div className="w-full max-w-md bg-white rounded-[40px] p-10 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-500 text-center">
                <div className="inline-flex items-center justify-center w-24 h-24 bg-amber-50 rounded-full mb-8">
                  <ZapOff size={48} className="text-amber-500" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 mb-4">
                  {errorType === 'QUOTA' ? 'AI Quota Exceeded' : 'Service Unavailable'}
                </h2>
                <p className="text-slate-500 text-sm font-medium mb-10 leading-relaxed px-4">
                  {errorType === 'QUOTA' 
                    ? "The Baramati Smart AI is processing too many requests right now. You can try again in a moment or use standard navigation without live AI analysis."
                    : "We're having trouble connecting to the Baramati AI engine. Please check your connection or use standard navigation."}
                </p>
                
                <div className="flex flex-col gap-3">
                  <button 
                    onClick={() => activeRoute && handleStartRoute(activeRoute.source, activeRoute.dest)}
                    className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-blue-700 transition-all active:scale-95 shadow-xl shadow-blue-200"
                  >
                    <RefreshCcw size={18} /> Retry AI Analysis
                  </button>
                  <button 
                    onClick={useFallbackMode}
                    className="w-full py-4 bg-white text-slate-700 rounded-2xl font-bold border border-slate-200 hover:bg-slate-50 transition-all"
                  >
                    Use Standard Navigation
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* WEATHER TOAST */}
          {showWeatherToast && analysis && (
            <div className="absolute top-6 right-6 z-[3000] animate-in slide-in-from-right fade-in duration-500">
              <div className="bg-white/95 backdrop-blur-md shadow-2xl rounded-2xl p-4 flex items-center gap-4 border border-blue-50">
                <div className="bg-blue-500 p-2.5 rounded-xl text-white">
                  <Cloud size={20} />
                </div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-0.5">Forecast</div>
                  <div className="text-sm font-bold text-slate-800">{analysis.weatherCondition}</div>
                </div>
                <button onClick={() => setShowWeatherToast(false)} className="text-slate-300 hover:text-slate-500 transition-colors">
                  <X size={16} />
                </button>
              </div>
            </div>
          )}

          {/* TRAFFIC INTIMATION MODAL */}
          {showTrafficModal && analysis && (
            <div className="absolute inset-0 z-[4000] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
              <div className="w-full max-w-sm bg-white rounded-[40px] p-8 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-500">
                <div className="flex justify-center mb-6">
                  <div className="relative">
                    <div className="absolute inset-0 bg-red-500 blur-2xl opacity-20 animate-pulse"></div>
                    <div className="bg-red-500 p-6 rounded-full text-white relative">
                      <AlertTriangle size={40} />
                    </div>
                  </div>
                </div>
                <h2 className="text-2xl font-black text-center text-slate-900 mb-2">Traffic Intimation</h2>
                <p className="text-center text-slate-500 text-sm font-medium mb-8 leading-relaxed">
                  Heavy congestion detected near major junctions in Baramati. Expect significant delays on your current route.
                </p>
                
                <div className="bg-slate-50 rounded-3xl p-5 mb-8 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Clock className="text-red-500" size={20} />
                    <span className="text-sm font-bold text-slate-700">Estimated Delay</span>
                  </div>
                  <span className="text-lg font-black text-red-600">+{Math.round(analysis.estimatedTimeMins * 0.4)} min</span>
                </div>

                <div className="flex flex-col gap-3">
                  <button 
                    onClick={handleStartDrive}
                    className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-black transition-all active:scale-95"
                  >
                    Proceed Anyway <ArrowRight size={18} />
                  </button>
                  <button 
                    onClick={() => setShowTrafficModal(false)}
                    className="w-full py-4 bg-white text-slate-500 rounded-2xl font-bold border border-slate-200 hover:bg-slate-50 transition-all"
                  >
                    Find Alternative
                  </button>
                </div>
              </div>
            </div>
          )}

          <aside className={`
            fixed inset-y-0 left-0 z-[1000] w-full md:w-96 bg-white shadow-2xl transition-transform duration-500 ease-in-out
            ${isSidebarOpen && !isDriving ? 'translate-x-0' : '-translate-x-full'}
            md:relative md:translate-x-0 ${isDriving ? 'hidden' : 'block'}
          `}>
            <NavigationPanel 
              onStartRoute={handleStartRoute} 
              onStartDrive={handleStartDrive}
              analysis={analysis} 
              isLoading={isLoading}
              activeRoute={activeRoute}
              isDriving={isDriving}
            />
            <button 
              onClick={() => setIsSidebarOpen(false)}
              className="md:hidden absolute top-4 right-4 p-2 text-gray-400"
            >
              <X size={24} />
            </button>
          </aside>

          <main className="flex-1 relative overflow-hidden">
            
            {isDriving && activeRoute && (
              <div className="absolute top-0 left-0 right-0 z-[2000] p-4 flex justify-center">
                <div className="w-full max-w-lg bg-emerald-600 shadow-2xl rounded-3xl p-5 flex items-center gap-5 border border-emerald-500 animate-in slide-in-from-top duration-500">
                  <div className="bg-white/20 p-4 rounded-2xl text-white">
                    <Navigation size={32} className="rotate-45" />
                  </div>
                  <div className="flex-1">
                    <div className="text-emerald-100 text-xs font-black uppercase tracking-widest mb-1">Live Navigation</div>
                    <div className="text-white text-xl font-bold leading-tight truncate">
                      Heading to {activeRoute.dest.name}
                    </div>
                  </div>
                  <div className="text-right border-l border-emerald-500/50 pl-5">
                    <div className="text-white text-2xl font-black">{(distRemaining * 1000).toFixed(0)}</div>
                    <div className="text-emerald-200 text-[10px] font-bold uppercase">Meters</div>
                  </div>
                </div>
              </div>
            )}

            {isDriving && (
              <div className="absolute bottom-0 left-0 right-0 z-[2000] p-6 pointer-events-none">
                <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-end md:items-center justify-between gap-4">
                  
                  <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-700/50 p-6 rounded-full shadow-2xl pointer-events-auto flex flex-col items-center justify-center w-32 h-32 transition-all">
                    <div className="text-4xl font-black text-white tabular-nums">{currentSpeed}</div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">KM/H</div>
                  </div>

                  <div className="flex-1 bg-white shadow-2xl rounded-[40px] p-2 flex items-center pointer-events-auto border border-slate-200">
                    <div className="flex-1 grid grid-cols-3 divide-x divide-slate-100 py-3 px-6">
                      <div className="text-center">
                        <div className="text-2xl font-black text-slate-900 tabular-nums">{timeRemaining || '--'} <span className="text-sm font-bold text-slate-400">min</span></div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">ETA</div>
                      </div>
                      <div className="text-center px-4">
                        <div className="text-2xl font-black text-blue-600 tabular-nums">{distRemaining.toFixed(1)} <span className="text-sm font-bold text-blue-400">km</span></div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Distance</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-black text-slate-900">Live</div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Tracking</div>
                      </div>
                    </div>
                    <button 
                      onClick={stopNavigation}
                      className="bg-red-500 hover:bg-red-600 text-white px-8 py-5 rounded-[32px] font-black text-sm tracking-widest transition-all active:scale-95 shadow-lg shadow-red-200"
                    >
                      EXIT
                    </button>
                  </div>

                  {analysis?.alerts.length ? (
                    <div className="bg-amber-500 text-white p-5 rounded-full shadow-2xl animate-pulse pointer-events-auto">
                      <AlertTriangle size={24} />
                    </div>
                  ) : <div className="w-14"></div>}
                </div>
              </div>
            )}

            {!isDriving && (
              <header className="absolute top-0 left-0 right-0 z-[500] pointer-events-none p-4">
                <div className="flex justify-between items-center max-w-7xl mx-auto">
                  <button 
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="pointer-events-auto bg-white p-3.5 rounded-2xl shadow-xl text-gray-700 active:scale-95 border border-gray-100"
                  >
                    <Menu size={20} />
                  </button>
                  <div className="flex items-center gap-3">
                    <div className="pointer-events-auto bg-white/90 backdrop-blur px-6 py-3 rounded-full shadow-2xl text-[10px] font-black text-blue-600 border border-white flex items-center gap-3 tracking-widest uppercase">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse ring-4 ring-emerald-100"></div>
                      {user?.name || 'User'}
                    </div>
                    <button
                      onClick={handleLogout}
                      className="pointer-events-auto bg-white/90 backdrop-blur px-4 py-3 rounded-full shadow-2xl text-[10px] font-black text-red-600 border border-white hover:bg-red-50 transition-all"
                    >
                      Logout
                    </button>
                  </div>
                </div>
              </header>
            )}

            <MapContainer 
              center={BARAMATI_CENTER} 
              zoom={14} 
              zoomControl={false}
              className="w-full h-full"
            >
              <TileLayer
                attribution='&copy; OpenStreetMap contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              
              <MapController center={isDriving ? currentPos : mapView} isDriving={isDriving} />

              {activeRoute && (
                <>
                  {!isDriving && (
                    <>
                      <Marker position={[activeRoute.source.lat, activeRoute.source.lng]} />
                      <Marker position={[activeRoute.dest.lat, activeRoute.dest.lng]} />
                    </>
                  )}
                  <Polyline 
                    positions={[
                      [activeRoute.source.lat, activeRoute.source.lng],
                      [activeRoute.dest.lat, activeRoute.dest.lng]
                    ]} 
                    color={isDriving ? "#3b82f6" : "#2563eb"}
                    weight={isDriving ? 12 : 6}
                    opacity={0.8}
                    lineJoin="round"
                    lineCap="round"
                  />
                </>
              )}

              {isDriving && (
                <Marker position={currentPos} icon={vehicleIcon} />
              )}

              {analysis?.alerts.map((alert, idx) => (
                <Marker 
                  key={idx} 
                  position={[alert.location[0], alert.location[1]]} 
                  icon={alertIcon}
                >
                  <Popup>
                    <div className="p-1">
                      <span className="font-bold text-red-600 uppercase text-[10px] block mb-1">{alert.type} ALERT</span>
                      <p className="text-sm font-medium">{alert.message}</p>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>

            {!isDriving && (
              <div className="absolute bottom-10 right-8 z-[500] flex flex-col gap-4">
                <button 
                  onClick={() => {
                    if (navigator.geolocation) {
                      navigator.geolocation.getCurrentPosition((pos) => {
                        setMapView([pos.coords.latitude, pos.coords.longitude]);
                      });
                    }
                  }}
                  className="bg-white p-4 rounded-2xl shadow-2xl text-blue-600 border border-gray-100 active:scale-95 transition-all hover:bg-blue-50"
                >
                  <LocateFixed size={24} />
                </button>
                <button 
                  className="bg-white p-4 rounded-2xl shadow-2xl text-slate-700 border border-gray-100 active:scale-95 transition-all hover:bg-slate-50"
                >
                  <MapIcon size={24} />
                </button>
              </div>
            )}
          </main>

          <style>{`
            @keyframes pulse {
              0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
              70% { transform: scale(1.1); box-shadow: 0 0 0 15px rgba(239, 68, 68, 0); }
              100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
            }
            .leaflet-tile-pane { filter: contrast(1.05) brightness(1.02); }
            .leaflet-container { background: #f1f5f9 !important; }
          `}</style>
        </div>
      )}
    </>
  );
};

export default App;