import React from 'react';
import { Gauge, AlertTriangle, DollarSign, Wrench, ShieldAlert, ArrowRight, Layers } from 'lucide-react';

interface InstrumentClusterProps {
  stockWhp: number;
  projectedWhp: number;
  goalWhp: number;
  partsTotal: number;
  supportingTotal: number;
  laborTotal: number;
  gapWhp: number;
  unacknowledgedGatedWarningsCount: number;
  onOpenCompareSlider: () => void;
  showCompareModal: boolean;
}

export const InstrumentCluster: React.FC<InstrumentClusterProps> = ({
  stockWhp,
  projectedWhp,
  goalWhp,
  partsTotal,
  supportingTotal,
  laborTotal,
  gapWhp,
  unacknowledgedGatedWarningsCount,
  onOpenCompareSlider,
  showCompareModal
}) => {
  const allInTotal = partsTotal + supportingTotal + laborTotal;
  const isGoalReached = projectedWhp >= goalWhp;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-2xl relative overflow-hidden space-y-4">
      {/* Carbon weave subtle background effect */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-red-600/5 rounded-full blur-3xl pointer-events-none" />

      {/* Top Cockpit Numbers: 3 main numbers at one glance */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-b border-slate-800 pb-4">
        {/* Metric 1: Projected WHP */}
        <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 flex flex-col justify-between relative">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold uppercase tracking-wider">
            <span>Projected Power</span>
            <Gauge className="w-4 h-4 text-red-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-4xl font-extrabold text-white tracking-tight">
              {projectedWhp}
            </span>
            <span className="text-xs font-bold text-red-400 font-mono">WHP</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 font-mono">
            +{(projectedWhp - stockWhp)} WHP over stock ({stockWhp})
          </p>
        </div>

        {/* Metric 2: Target Goal WHP */}
        <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold uppercase tracking-wider">
            <span>Build Goal</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">Target</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-4xl font-extrabold text-slate-200 tracking-tight">
              {goalWhp}
            </span>
            <span className="text-xs font-bold text-slate-400 font-mono">WHP</span>
          </div>
          <div className="text-[11px] font-mono mt-1 flex items-center justify-between">
            <span className="text-slate-400">Target status:</span>
            <span className={`font-bold ${isGoalReached ? 'text-emerald-400' : 'text-amber-400'}`}>
              {isGoalReached ? 'Goal Reached' : `${gapWhp} WHP short`}
            </span>
          </div>
        </div>

        {/* Metric 3: Parts Total ($) */}
        <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold uppercase tracking-wider">
            <span>Parts Cost</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="font-mono text-4xl font-extrabold text-emerald-400 tracking-tight">
              ${partsTotal.toLocaleString()}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 font-mono">
            Direct bolt-on parts total
          </p>
        </div>
      </div>

      {/* Honest Gap Callout & Compare Toggle */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-1">
        {/* Gap Callout Box */}
        <div className="w-full md:w-auto flex-1 p-3.5 rounded-xl bg-slate-950/90 border border-slate-800 flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isGoalReached ? 'bg-emerald-950/80 text-emerald-400' : 'bg-amber-950/80 text-amber-400'} border border-amber-800/30`}>
            {isGoalReached ? <Gauge className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          </div>
          <div className="text-xs">
            <div className="font-bold text-slate-200 uppercase tracking-wide">
              {isGoalReached 
                ? 'Goal WHP Target Reached!' 
                : `You're ${gapWhp} WHP short — standard bolt-ons are done here.`}
            </div>
            <p className="text-slate-400 text-[11px] mt-0.5">
              {isGoalReached
                ? 'Your build path satisfies the targeted power band. Review risk warnings below.'
                : 'To close the gap, check upgraded turbo or high ethanol (E85) fuel kits.'}
            </p>
          </div>
        </div>

        {/* Realistic All-In Cost Card & Compare Side-by-Side Switcher */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <div className="bg-slate-950/90 border border-slate-800 px-4 py-2.5 rounded-xl text-right">
            <div className="text-[10px] text-slate-400 uppercase font-semibold">
              Realistic All-In (Parts + Supporting + Labor)
            </div>
            <div className="font-mono text-lg font-extrabold text-slate-100">
              ${allInTotal.toLocaleString()}
            </div>
          </div>

          <button
            onClick={onOpenCompareSlider}
            id="compare-slider-btn"
            className={`px-4 py-3 rounded-xl border text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap shadow-lg ${
              showCompareModal
                ? 'bg-red-600 text-white border-red-500'
                : 'bg-slate-800 hover:bg-slate-750 text-slate-200 border-slate-700 hover:border-red-500/50'
            }`}
          >
            <Layers className="w-4 h-4 text-red-400" />
            <span>Compare Power vs Exposure</span>
          </button>
        </div>
      </div>

      {/* Unacknowledged Gated Warnings Banner if applicable */}
      {unacknowledgedGatedWarningsCount > 0 && (
        <div className="p-3 rounded-xl bg-red-950/80 border border-red-800/80 text-red-200 text-xs flex items-center justify-between gap-3 animate-pulse">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span>
              <strong>{unacknowledgedGatedWarningsCount} Required "Will Break" Warning(s)</strong> need active checkbox acknowledgment before continuing!
            </span>
          </div>
          <span className="text-[10px] font-mono uppercase bg-red-900 px-2 py-0.5 rounded text-red-200 border border-red-700 font-bold">
            GATED
          </span>
        </div>
      )}
    </div>
  );
};
