
import React, { useState } from 'react';
import { Search, Navigation, MapPin, AlertTriangle, Cloud, Clock, ChevronRight, Activity, Car, ShieldCheck, ShieldAlert, Thermometer, Info } from 'lucide-react';
import { BARAMATI_LOCATIONS } from '../constants';
import { Location, RouteAnalysis, TrafficLevel } from '../types';

interface NavigationPanelProps {
  onStartRoute: (source: Location, dest: Location) => void;
  onStartDrive: () => void;
  analysis: RouteAnalysis | null;
  isLoading: boolean;
  activeRoute: { source: Location; dest: Location } | null;
  isDriving: boolean;
}

const NavigationPanel: React.FC<NavigationPanelProps> = ({ 
  onStartRoute, 
  onStartDrive,
  analysis, 
  isLoading,
  activeRoute,
  isDriving
}) => {
  const [source, setSource] = useState<Location | null>(null);
  const [dest, setDest] = useState<Location | null>(null);

  const handleGo = () => {
    if (source && dest) {
      onStartRoute(source, dest);
    }
  };

  const getTrafficColor = (level: TrafficLevel) => {
    switch(level) {
      case TrafficLevel.LOW: return 'text-green-500';
      case TrafficLevel.MODERATE: return 'text-yellow-500';
      case TrafficLevel.HEAVY: return 'text-orange-500';
      case TrafficLevel.JAMMED: return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getSafetyColor = (score: number) => {
    if (score >= 8) return 'text-emerald-500';
    if (score >= 5) return 'text-amber-500';
    return 'text-red-500';
  };

  const getSafetyBg = (score: number) => {
    if (score >= 8) return 'bg-emerald-50';
    if (score >= 5) return 'bg-amber-50';
    return 'bg-red-50';
  };

  return (
    <div className="w-full h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-6 border-b border-gray-100">
        <h1 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-2 tracking-tight">
          <div className="bg-blue-600 p-1.5 rounded-lg text-white shadow-lg shadow-blue-200">
            <Navigation size={22} />
          </div>
          Baramati AI
        </h1>
        
        <div className="space-y-4">
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              <MapPin size={18} />
            </div>
            <select 
              className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 outline-none appearance-none text-slate-700 font-medium transition-all"
              value={source?.name || ''}
              onChange={(e) => setSource(BARAMATI_LOCATIONS.find(l => l.name === e.target.value) || null)}
            >
              <option value="">Choose start location...</option>
              {BARAMATI_LOCATIONS.map(loc => (
                <option key={loc.name} value={loc.name}>{loc.name}</option>
              ))}
            </select>
          </div>

          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500">
              <MapPin size={18} />
            </div>
            <select 
              className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 outline-none appearance-none text-slate-700 font-medium transition-all"
              value={dest?.name || ''}
              onChange={(e) => setDest(BARAMATI_LOCATIONS.find(l => l.name === e.target.value) || null)}
            >
              <option value="">Where to?</option>
              {BARAMATI_LOCATIONS.map(loc => (
                <option key={loc.name} value={loc.name}>{loc.name}</option>
              ))}
            </select>
          </div>

          <button 
            onClick={handleGo}
            disabled={!source || !dest || isLoading}
            className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-xl shadow-blue-500/20 active:scale-[0.98] ${
              !source || !dest || isLoading 
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' 
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isLoading ? <Activity className="animate-spin w-5 h-5" /> : 'Analyze Route'}
          </button>
        </div>
      </div>

      {/* Intelligence Dashboard */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
        {!activeRoute && !isLoading && (
          <div className="text-center py-16 opacity-30 px-10">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
               <Search className="w-10 h-10 text-slate-400" />
            </div>
            <p className="text-sm font-semibold text-slate-600">Select source and destination for AI prediction</p>
          </div>
        )}

        {isLoading && (
          <div className="space-y-4">
            <div className="h-24 bg-slate-50 rounded-3xl animate-pulse" />
            <div className="h-48 bg-slate-50 rounded-3xl animate-pulse" />
          </div>
        )}

        {analysis && activeRoute && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100">
                <div className="flex items-center gap-2 text-slate-400 text-[10px] uppercase tracking-widest font-black mb-1">
                  <Clock size={14} /> Time
                </div>
                <div className="text-2xl font-black text-slate-900 leading-tight">{analysis.estimatedTimeMins} <span className="text-xs font-bold text-slate-400">m</span></div>
              </div>
              <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100">
                <div className="flex items-center gap-2 text-slate-400 text-[10px] uppercase tracking-widest font-black mb-1">
                  <Activity size={14} /> Traffic
                </div>
                <div className={`text-2xl font-black leading-tight ${getTrafficColor(analysis.overallTraffic)}`}>
                  {analysis.overallTraffic}
                </div>
              </div>
            </div>

            {/* SAFETY SCORE BREAKDOWN SECTION */}
            <div className={`${getSafetyBg(analysis.safetyScore)} p-5 rounded-3xl border border-slate-100 transition-all`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-slate-600 text-[11px] font-black uppercase tracking-widest">
                  <ShieldCheck size={16} className={getSafetyColor(analysis.safetyScore)} />
                  Safety Score
                </div>
                <div className={`text-2xl font-black ${getSafetyColor(analysis.safetyScore)}`}>
                  {analysis.safetyScore}/10
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="bg-white/60 rounded-2xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Activity size={14} className="text-slate-400" />
                    <span className="text-xs font-bold text-slate-700">Traffic Congestion</span>
                  </div>
                  <div className={`h-1.5 w-16 rounded-full bg-slate-200 overflow-hidden`}>
                    <div 
                      className={`h-full ${analysis.overallTraffic === TrafficLevel.LOW ? 'bg-emerald-500 w-full' : analysis.overallTraffic === TrafficLevel.MODERATE ? 'bg-amber-500 w-2/3' : 'bg-red-500 w-1/3'}`} 
                    />
                  </div>
                </div>

                <div className="bg-white/60 rounded-2xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Cloud size={14} className="text-slate-400" />
                    <span className="text-xs font-bold text-slate-700">Weather Condition</span>
                  </div>
                  <span className="text-[10px] font-black uppercase text-emerald-600">Optimal</span>
                </div>

                <div className="bg-white/60 rounded-2xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <AlertTriangle size={14} className="text-slate-400" />
                    <span className="text-xs font-bold text-slate-700">Active Hazards</span>
                  </div>
                  <span className={`text-[10px] font-black uppercase ${analysis.alerts.length === 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {analysis.alerts.length} Detected
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200/50">
                 <p className="text-[10px] text-slate-500 font-medium leading-relaxed italic">
                   "AI suggests {analysis.safetyScore >= 8 ? 'maximum speed' : 'cautious driving'} based on current urban variables."
                 </p>
              </div>
            </div>

            {/* START DRIVE BUTTON */}
            <button 
              onClick={onStartDrive}
              className="w-full py-5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-3xl font-black text-lg flex items-center justify-center gap-3 transition-all shadow-xl shadow-emerald-500/30 active:scale-95 group"
            >
              <Car className="group-hover:translate-x-1 transition-transform" size={24} />
              DRIVE NOW
            </button>

            <div className="bg-blue-50/50 p-5 rounded-3xl border border-blue-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-blue-600 p-2.5 rounded-xl text-white shadow-lg shadow-blue-200">
                  <Cloud size={20} />
                </div>
                <div>
                  <div className="text-[10px] text-blue-600 font-black uppercase tracking-tight">Weather Impact</div>
                  <div className="text-blue-900 font-bold">{analysis.weatherCondition}</div>
                </div>
              </div>
            </div>

            {analysis.alerts.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-1">Active Awareness</h3>
                {analysis.alerts.map((alert, idx) => (
                  <div 
                    key={idx}
                    className={`p-5 rounded-3xl border-2 flex gap-4 transition-all ${
                      alert.severity === 'CRITICAL' 
                        ? 'bg-red-50 border-red-100' 
                        : 'bg-amber-50 border-amber-100'
                    }`}
                  >
                    <div className="shrink-0">
                      <div className={`p-2 rounded-xl ${
                        alert.severity === 'CRITICAL' ? 'bg-red-600' : 'bg-amber-500'
                      } text-white shadow-lg`}>
                        <AlertTriangle size={18} />
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-black uppercase tracking-tight text-slate-900">{alert.type} Hazard</div>
                      <p className="text-xs text-slate-600 font-medium leading-relaxed mt-1">{alert.message}</p>
                      <div className="mt-3 text-[10px] font-bold uppercase text-slate-400 bg-white/50 inline-block px-2 py-0.5 rounded-full">
                        {alert.distanceAheadKm.toFixed(1)} km ahead
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <div className="p-6 bg-slate-50 border-t border-slate-100 text-[10px] text-slate-400 flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-bold">
           <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
           AI ROUTE ENGINE 3.0
        </div>
        <span className="flex items-center gap-1 opacity-70">
          Baramati Live <ChevronRight size={10} />
        </span>
      </div>
    </div>
  );
};

export default NavigationPanel;
