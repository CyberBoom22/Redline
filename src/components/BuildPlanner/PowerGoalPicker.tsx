import React from 'react';
import { UserIntent } from '../../types';
import { Flame, Volume2, Wrench, Zap } from 'lucide-react';

interface PowerGoalPickerProps {
  stockWhp: number;
  goalWhp: number;
  onGoalWhpChange: (whp: number) => void;
  intent: UserIntent;
  onIntentChange: (intent: UserIntent) => void;
}

export const PowerGoalPicker: React.FC<PowerGoalPickerProps> = ({
  stockWhp,
  goalWhp,
  onGoalWhpChange,
  intent,
  onIntentChange
}) => {
  // Preset benchmarks based on engine stock
  const minWhp = stockWhp;
  const maxWhp = Math.min(700, stockWhp + 300);

  const presets = [
    { label: 'Stock Baseline', whp: stockWhp },
    { label: 'Stage 1 (Tune Only)', whp: Math.round(stockWhp + 60) },
    { label: 'Stage 2 (Bolt-ons)', whp: Math.round(stockWhp + 110) },
    { label: 'Stage 2+ (Flex Fuel / E85)', whp: Math.round(stockWhp + 160) },
    { label: 'Big Turbo (600+ WHP)', whp: Math.round(stockWhp + 240) }
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-5">
      {/* Intent Branch Picker */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Why Are You Here Today?
          </label>
          <span className="text-[10px] text-slate-500 font-mono">PRD Section 01</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => onIntentChange('power')}
            id="intent-power"
            className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              intent === 'power'
                ? 'bg-red-950/60 border-red-500 text-white shadow-md'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-red-500" />
            <span>Power Goal</span>
          </button>

          <button
            onClick={() => onIntentChange('sound')}
            id="intent-sound"
            className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              intent === 'sound'
                ? 'bg-red-950/60 border-red-500 text-white shadow-md'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Volume2 className="w-3.5 h-3.5 text-red-500" />
            <span>Sound & Exhaust</span>
          </button>

          <button
            onClick={() => onIntentChange('repair')}
            id="intent-repair"
            className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              intent === 'repair'
                ? 'bg-red-950/60 border-red-500 text-white shadow-md'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Wrench className="w-3.5 h-3.5 text-red-500" />
            <span>Repair & Care</span>
          </button>
        </div>
      </div>

      {/* Target Horsepower Slider */}
      <div className="space-y-3 pt-2 border-t border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-red-500" />
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wide">
              Target Wheel Horsepower (WHP)
            </span>
          </div>
          <div className="font-mono text-2xl font-extrabold text-red-500 bg-red-950/50 border border-red-900/60 px-3 py-1 rounded-xl">
            {goalWhp} <span className="text-xs text-slate-400 font-normal">WHP</span>
          </div>
        </div>

        {/* Range Input Slider */}
        <input
          type="range"
          min={minWhp}
          max={maxWhp}
          step={5}
          value={goalWhp}
          onChange={(e) => onGoalWhpChange(Number(e.target.value))}
          className="w-full h-2 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-red-600 focus:outline-none"
        />

        {/* Quick Presets */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {presets.map((preset) => (
            <button
              key={preset.whp}
              onClick={() => onGoalWhpChange(preset.whp)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-medium transition-all border ${
                goalWhp === preset.whp
                  ? 'bg-red-600 text-white border-red-500 font-bold'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              {preset.label} ({preset.whp} WHP)
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
