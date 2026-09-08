import React, { useState } from 'react';
import { EngineId, Part, TieredWarning } from '../../types';
import { ALL_PARTS } from '../../data/parts';
import { ALL_WARNINGS } from '../../data/warnings';
import { Layers, X, Gauge, AlertOctagon, DollarSign, ArrowRight, Check } from 'lucide-react';
import { Modal } from '../ui/Modal';

interface CompareSliderProps {
  isOpen: boolean;
  onClose: () => void;
  engineId: EngineId;
  stockWhp: number;
}

export const CompareSlider: React.FC<CompareSliderProps> = ({
  isOpen,
  onClose,
  engineId,
  stockWhp
}) => {
  const [powerA, setPowerA] = useState<number>(stockWhp + 100); // e.g. 450 WHP
  const [powerB, setPowerB] = useState<number>(stockWhp + 170); // e.g. 520 WHP

  if (!isOpen) return null;

  const engineParts = ALL_PARTS.filter(p => p.engineIds.includes(engineId));

  // Build calculation helper
  const getBuildDetails = (targetWhp: number) => {
    const requiredParts = engineParts.filter(p => (stockWhp + p.whpGain) <= targetWhp || p.isSupportingMod);
    const partsCost = requiredParts.reduce((sum, p) => sum + p.price, 0);
    const laborCost = requiredParts.reduce((sum, p) => sum + p.estLaborCost, 0);
    const warnings = ALL_WARNINGS.filter(w => w.engineId === engineId && targetWhp >= w.minWhpTrigger);
    const gatedWarnings = warnings.filter(w => w.tier === 1);

    return {
      requiredParts,
      partsCost,
      laborCost,
      allInCost: partsCost + laborCost,
      warnings,
      gatedWarnings
    };
  };

  const buildA = getBuildDetails(powerA);
  const buildB = getBuildDetails(powerB);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-5xl"
      backdropClassName="bg-slate-950/85"
      header={
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-2.5">
            <Layers className="w-5 h-5 text-red-500" />
            <div>
              <h2 className="text-lg font-bold font-mono tracking-wide text-white uppercase">
                Side-By-Side Build & Risk Comparison
              </h2>
              <p className="text-xs text-slate-400">
                Compare power vs exposure side-by-side to see how risk tiers and required parts shift.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      }
      footer={
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950 flex justify-between items-center text-xs">
          <div className="text-slate-400">
            Cost delta: <span className="font-mono font-bold text-white">${Math.abs(buildB.allInCost - buildA.allInCost)}</span> for <span className="font-mono font-bold text-red-400">{Math.abs(powerB - powerA)} WHP</span> difference.
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl transition-all"
          >
            Close Comparison
          </button>
        </div>
      }
    >
      {/* Side-By-Side Grid. The shell caps the panel height and scrolls this
          body, so no local max-h belongs here — two nested scroll containers
          would fight each other. */}
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Plan A Column */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-5 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                  Option A Target
                </span>
                <span className="font-mono text-2xl font-extrabold text-red-500">
                  {powerA} <span className="text-xs text-slate-400">WHP</span>
                </span>
              </div>

              {/* Slider A */}
              <div className="space-y-1">
                <input
                  type="range"
                  min={stockWhp}
                  max={stockWhp + 250}
                  step={10}
                  value={powerA}
                  onChange={(e) => setPowerA(Number(e.target.value))}
                  className="w-full h-2 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-red-600"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>Stock ({stockWhp})</span>
                  <span>{stockWhp + 250} WHP</span>
                </div>
              </div>

              {/* Metrics Summary A */}
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                  <div className="text-slate-400 text-[10px]">Parts Total</div>
                  <div className="text-emerald-400 font-bold text-base mt-0.5">${buildA.partsCost}</div>
                </div>
                <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                  <div className="text-slate-400 text-[10px]">All-In (w/ Labor)</div>
                  <div className="text-slate-100 font-bold text-base mt-0.5">${buildA.allInCost}</div>
                </div>
              </div>

              {/* Warnings Exposure List A */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-300 font-mono uppercase flex items-center justify-between">
                  <span>Exposure & Risk Warnings</span>
                  <span className="text-[10px] text-red-400 font-mono">{buildA.warnings.length} Active</span>
                </div>
                {buildA.warnings.length === 0 ? (
                  <p className="text-xs text-emerald-400 font-mono bg-emerald-950/40 p-2.5 rounded-lg border border-emerald-900">
                    Low exposure — stock components operates safely within factory margins.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {buildA.warnings.map(w => (
                      <div key={w.id} className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs">
                        <div className="font-bold text-red-400 flex items-center gap-1">
                          <AlertOctagon className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>Tier {w.tier}: {w.title}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1 font-mono flex justify-between">
                          <span>Prevent: ~${w.preventiveCost}</span>
                          <span className="text-red-400">Failure: ~${w.failureCost}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Plan B Column */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-5 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                  Option B Target
                </span>
                <span className="font-mono text-2xl font-extrabold text-red-500">
                  {powerB} <span className="text-xs text-slate-400">WHP</span>
                </span>
              </div>

              {/* Slider B */}
              <div className="space-y-1">
                <input
                  type="range"
                  min={stockWhp}
                  max={stockWhp + 250}
                  step={10}
                  value={powerB}
                  onChange={(e) => setPowerB(Number(e.target.value))}
                  className="w-full h-2 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-red-600"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>Stock ({stockWhp})</span>
                  <span>{stockWhp + 250} WHP</span>
                </div>
              </div>

              {/* Metrics Summary B */}
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                  <div className="text-slate-400 text-[10px]">Parts Total</div>
                  <div className="text-emerald-400 font-bold text-base mt-0.5">${buildB.partsCost}</div>
                </div>
                <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                  <div className="text-slate-400 text-[10px]">All-In (w/ Labor)</div>
                  <div className="text-slate-100 font-bold text-base mt-0.5">${buildB.allInCost}</div>
                </div>
              </div>

              {/* Warnings Exposure List B */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-300 font-mono uppercase flex items-center justify-between">
                  <span>Exposure & Risk Warnings</span>
                  <span className="text-[10px] text-red-400 font-mono">{buildB.warnings.length} Active</span>
                </div>
                {buildB.warnings.length === 0 ? (
                  <p className="text-xs text-emerald-400 font-mono bg-emerald-950/40 p-2.5 rounded-lg border border-emerald-900">
                    Low exposure — stock components operates safely within factory margins.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {buildB.warnings.map(w => (
                      <div key={w.id} className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs">
                        <div className="font-bold text-red-400 flex items-center gap-1">
                          <AlertOctagon className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>Tier {w.tier}: {w.title}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1 font-mono flex justify-between">
                          <span>Prevent: ~${w.preventiveCost}</span>
                          <span className="text-red-400">Failure: ~${w.failureCost}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
      </div>
    </Modal>
  );
};
