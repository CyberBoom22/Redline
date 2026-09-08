import React from 'react';
import { UserFlowDoor } from '../../types';
import { Target, CheckSquare, Info } from 'lucide-react';

interface DoorSelectionProps {
  doorMode: UserFlowDoor;
  onSelectDoor: (door: UserFlowDoor) => void;
}

export const DoorSelection: React.FC<DoorSelectionProps> = ({ doorMode, onSelectDoor }) => {
  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-red-400" />
          <span>Build Planning Flow ("Two Doors, One Output")</span>
        </label>
        <span className="text-[11px] text-slate-500 hidden sm:inline">
          Both doors feed the exact same calculated path from stock
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Door 1: Goal-First */}
        <button
          onClick={() => onSelectDoor('goal_first')}
          id="door-goal-first"
          className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 ${
            doorMode === 'goal_first'
              ? 'bg-red-950/40 border-red-500/80 text-white shadow-lg ring-1 ring-red-500/30'
              : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <div className={`p-2 rounded-lg ${doorMode === 'goal_first' ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-400'} text-xs font-bold`}>
            <Target className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-xs text-slate-100 flex items-center gap-2">
              <span>Goal-First ("Plan me to WHP")</span>
              {doorMode === 'goal_first' && <span className="text-[10px] bg-red-900 text-red-300 px-1.5 py-0.2 rounded font-mono">ACTIVE</span>}
            </div>
            <p className="text-[11px] text-slate-400 mt-1 leading-snug">
              Select your targeted horsepower goal. Stage0 maps out the exact parts, required supporting mods, and risk warnings to get there.
            </p>
          </div>
        </button>

        {/* Door 2: Inventory-First */}
        <button
          onClick={() => onSelectDoor('inventory_first')}
          id="door-inventory-first"
          className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 ${
            doorMode === 'inventory_first'
              ? 'bg-red-950/40 border-red-500/80 text-white shadow-lg ring-1 ring-red-500/30'
              : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <div className={`p-2 rounded-lg ${doorMode === 'inventory_first' ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-400'} text-xs font-bold`}>
            <CheckSquare className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-xs text-slate-100 flex items-center gap-2">
              <span>Inventory-First ("Here's what I have")</span>
              {doorMode === 'inventory_first' && <span className="text-[10px] bg-red-900 text-red-300 px-1.5 py-0.2 rounded font-mono">ACTIVE</span>}
            </div>
            <p className="text-[11px] text-slate-400 mt-1 leading-snug">
              Check off your existing modifications. Stage0 pre-checks your inventory on the fixed path and exposes missing critical gaps.
            </p>
          </div>
        </button>
      </div>
    </div>
  );
};
