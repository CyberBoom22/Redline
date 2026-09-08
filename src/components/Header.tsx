import React from 'react';
import { VehicleSelection } from '../types';
import { PLATFORMS } from '../data/platforms';
import { Gauge, Sliders, ShoppingBag, Activity, Volume2, Wrench, UserCheck, Search, ShieldAlert } from 'lucide-react';

interface HeaderProps {
  vehicle: VehicleSelection;
  onOpenVehicleModal: () => void;
  activeTab: 'planner' | 'marketplace' | 'dyno' | 'sound' | 'care' | 'tuners';
  setActiveTab: (tab: 'planner' | 'marketplace' | 'dyno' | 'sound' | 'care' | 'tuners') => void;
  onOpenSummaryModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  vehicle,
  onOpenVehicleModal,
  activeTab,
  setActiveTab,
  onOpenSummaryModal
}) => {
  const currentPlatform = PLATFORMS.find(p => p.id === vehicle.platformId);
  const currentEngine = currentPlatform?.engines.find(e => e.id === vehicle.engineId);

  return (
    <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 text-slate-100 shadow-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between py-3.5 gap-4 border-b border-slate-800/60">
          {/* Logo & Tagline */}
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-red-800 text-white shadow-lg shadow-red-900/40 ring-1 ring-red-500/30">
              <Gauge className="w-6 h-6 animate-pulse" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full ring-2 ring-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-2xl tracking-wider text-white font-mono uppercase bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                  STAGE0
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-red-950/80 text-red-400 border border-red-800/60 uppercase tracking-widest">
                  v0.2
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                The honest build planner for forced-induction platforms
              </p>
            </div>
          </div>

          {/* Vehicle Selector Badge */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            <button
              onClick={onOpenVehicleModal}
              id="vehicle-selector-btn"
              className="flex items-center gap-3 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-750 hover:border-red-500/50 transition-all text-left group shadow-inner"
            >
              <div className="w-8 h-8 rounded-lg bg-red-950/60 text-red-400 border border-red-800/40 flex items-center justify-center font-mono font-bold text-xs">
                {vehicle.platformId === 'b58' ? 'B58' : 'VQ'}
              </div>
              <div className="text-xs">
                <div className="text-slate-400 text-[10px] uppercase tracking-wider font-semibold flex items-center gap-1">
                  <span>{vehicle.chassis}</span>
                  <span>•</span>
                  <span>{vehicle.transmission}</span>
                </div>
                <div className="font-bold text-slate-100 group-hover:text-red-400 transition-colors flex items-center gap-1.5">
                  <span>{vehicle.trim}</span>
                  <Search className="w-3 h-3 text-slate-400 group-hover:text-red-400" />
                </div>
              </div>
            </button>

            {/* Quick Export Summary Button */}
            <button
              onClick={onOpenSummaryModal}
              id="open-summary-btn"
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-semibold text-xs shadow-md shadow-red-900/30 transition-all border border-red-500/40 whitespace-nowrap"
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Build Card</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 overflow-x-auto py-2 scrollbar-none text-xs font-medium">
          <button
            onClick={() => setActiveTab('planner')}
            id="tab-planner"
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all whitespace-nowrap ${
              activeTab === 'planner'
                ? 'bg-red-600/20 text-red-400 border border-red-500/40 font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Build Planner</span>
          </button>

          <button
            onClick={() => setActiveTab('marketplace')}
            id="tab-marketplace"
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all whitespace-nowrap ${
              activeTab === 'marketplace'
                ? 'bg-red-600/20 text-red-400 border border-red-500/40 font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Parts Catalog</span>
          </button>

          <button
            onClick={() => setActiveTab('dyno')}
            id="tab-dyno"
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all whitespace-nowrap ${
              activeTab === 'dyno'
                ? 'bg-red-600/20 text-red-400 border border-red-500/40 font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Dyno Visualizer</span>
          </button>

          <button
            onClick={() => setActiveTab('sound')}
            id="tab-sound"
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all whitespace-nowrap ${
              activeTab === 'sound'
                ? 'bg-red-600/20 text-red-400 border border-red-500/40 font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Volume2 className="w-4 h-4" />
            <span>Sound & Exhaust</span>
          </button>

          <button
            onClick={() => setActiveTab('care')}
            id="tab-care"
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all whitespace-nowrap ${
              activeTab === 'care'
                ? 'bg-red-600/20 text-red-400 border border-red-500/40 font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Wrench className="w-4 h-4" />
            <span>Parts Care</span>
          </button>

          <button
            onClick={() => setActiveTab('tuners')}
            id="tab-tuners"
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all whitespace-nowrap ${
              activeTab === 'tuners'
                ? 'bg-red-600/20 text-red-400 border border-red-500/40 font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Vetted Tuners</span>
          </button>
        </nav>
      </div>
    </header>
  );
};
