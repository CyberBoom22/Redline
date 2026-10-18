import React from 'react';
import { UserIntent } from '../../types';
import { Volume2, Wrench, Zap } from 'lucide-react';

interface PowerGoalPickerProps {
  stockWhp: number;
  goalWhp: number;
  onGoalWhpChange: (whp: number) => void;
  intent: UserIntent;
  onIntentChange: (intent: UserIntent) => void;
}

const INTENTS: { id: UserIntent; label: string; Icon: typeof Zap }[] = [
  { id: 'power', label: 'Power Goal', Icon: Zap },
  { id: 'sound', label: 'Sound & Exhaust', Icon: Volume2 },
  { id: 'repair', label: 'Repair & Care', Icon: Wrench },
];

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
    <section className="plate space-y-5 p-5">
      {/* Intent Branch Picker */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h2 id="intent-heading" className="label-ui etch text-text-3">Why Are You Here Today?</h2>
          <span className="label-ui text-text-3">PRD Section 01</span>
        </div>
        <div role="group" aria-labelledby="intent-heading" className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:grid-cols-1">
          {INTENTS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => onIntentChange(id)}
              id={`intent-${id}`}
              aria-pressed={intent === id}
              className="toggle justify-center text-[14px] font-bold"
            >
              <Icon className={`h-4 w-4 ${intent === id ? 'text-accent-bright' : 'text-accent-deep'}`} aria-hidden="true" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Target Horsepower Slider */}
      <div className="space-y-3 border-t border-black/15 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label htmlFor="goal-whp-range" className="font-bold uppercase tracking-[0.5px] text-ink">
            Target Wheel Horsepower (WHP)
          </label>
          <div className="rounded-[3px] bg-ink px-3 py-1.5 text-on-dark">
            <span className="num text-[22px]">{goalWhp}</span>{' '}
            <span className="label-ui text-dark-muted">WHP</span>
          </div>
        </div>

        {/* Range Input Slider */}
        <input
          id="goal-whp-range"
          type="range"
          min={minWhp}
          max={maxWhp}
          step={5}
          value={goalWhp}
          onChange={(e) => onGoalWhpChange(Number(e.target.value))}
          className="range"
        />

        {/* Quick Presets */}
        <div className="flex flex-wrap items-center gap-2">
          {presets.map((preset) => (
            <button
              key={preset.whp}
              onClick={() => onGoalWhpChange(preset.whp)}
              aria-pressed={goalWhp === preset.whp}
              className="toggle px-3 text-[14px]"
            >
              {preset.label} ({preset.whp} WHP)
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};
