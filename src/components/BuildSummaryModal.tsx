import React, { useRef } from 'react';
import { VehicleSelection, Part, TieredWarning } from '../types';
import { PLATFORMS } from '../data/platforms';
import { Modal } from './ui/Modal';
import { Gauge, X, Share2, CheckSquare, Square, AlertOctagon, DollarSign, Printer, Download } from 'lucide-react';

interface BuildSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicle: VehicleSelection;
  goalWhp: number;
  projectedWhp: number;
  parts: Part[];
  ownedPartIds: string[];
  warnings: TieredWarning[];
  acknowledgedWarningIds: string[];
}

export const BuildSummaryModal: React.FC<BuildSummaryModalProps> = ({
  isOpen,
  onClose,
  vehicle,
  goalWhp,
  projectedWhp,
  parts,
  ownedPartIds,
  warnings,
  acknowledgedWarningIds
}) => {
  const cardRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const currentPlatform = PLATFORMS.find(p => p.id === vehicle.platformId);
  const currentEngine = currentPlatform?.engines.find(e => e.id === vehicle.engineId);
  const stockWhp = currentEngine?.stockWhp || 330;

  const selectedParts = parts.filter(p => ownedPartIds.includes(p.id));
  const partsTotal = selectedParts.reduce((sum, p) => sum + p.price, 0);
  const laborTotal = selectedParts.reduce((sum, p) => sum + p.estLaborCost, 0);
  const allInTotal = partsTotal + laborTotal;
  const gapWhp = Math.max(0, goalWhp - projectedWhp);

  const handlePrint = () => {
    window.print();
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `Stage0 Build Card - ${vehicle.trim}`,
        text: `Check out my ${vehicle.trim} build summary on Stage0: ${projectedWhp} WHP projected / ${goalWhp} WHP goal!`,
        url: window.location.href
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Build Card link copied to clipboard!');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-4xl"
      backdropClassName="bg-slate-950/90"
      header={
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950 print:hidden">
          <div className="flex items-center gap-2">
            <Gauge className="w-5 h-5 text-red-500" />
            <h2 className="text-base font-bold font-mono text-white uppercase tracking-wider">
              Stage0 Build Card — The Group Chat Screenshot Screen
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 border border-slate-700 transition-all"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 border border-slate-700 transition-all"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF</span>
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      }
    >
      {/* The Screenshot Printable Container */}
        <div ref={cardRef} id="build-card" className="p-8 space-y-6 bg-slate-950 text-slate-100 print:p-0">
          {/* Header Branding */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black font-mono tracking-wider text-red-500 uppercase">
                  STAGE0
                </span>
                <span className="text-xs text-slate-400 font-mono">BUILD SUMMARY</span>
              </div>
              <h3 className="text-lg font-bold text-white mt-1">
                {vehicle.year} {vehicle.trim} ({vehicle.chassis})
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                Engine: {currentEngine?.name} | Trans: {vehicle.transmission}
              </p>
            </div>

            <div className="text-right font-mono">
              <div className="text-3xl font-extrabold text-red-500">{projectedWhp} WHP</div>
              <div className="text-xs text-slate-400">Target: {goalWhp} WHP</div>
            </div>
          </div>

          {/* Instrument Cluster Metrics */}
          <div className="grid grid-cols-3 gap-4 text-center font-mono">
            <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase">Projected WHP</div>
              <div className="text-xl font-bold text-white mt-1">{projectedWhp}</div>
            </div>
            <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase">Goal WHP</div>
              <div className="text-xl font-bold text-slate-300 mt-1">{goalWhp}</div>
            </div>
            <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase">Parts Total</div>
              <div className="text-xl font-bold text-emerald-400 mt-1">${partsTotal.toLocaleString()}</div>
            </div>
          </div>

          {/* Gap Callout */}
          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono flex items-center justify-between">
            <span className="text-slate-300">
              {gapWhp === 0 
                ? 'Target WHP achieved with current selected bolt-on combination!' 
                : `You're ${gapWhp} WHP short — standard bolt-ons are done here.`}
            </span>
            <span className="font-bold text-slate-100">
              Realistic All-In (w/ Labor): ${allInTotal.toLocaleString()}
            </span>
          </div>

          {/* Checklist of parts */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase font-mono tracking-wider">
              Installed & Planned Parts
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {parts.map(p => {
                const isChecked = ownedPartIds.includes(p.id);
                return (
                  <div
                    key={p.id}
                    className={`p-2.5 rounded-lg border flex items-center justify-between ${
                      isChecked
                        ? 'bg-emerald-950/30 border-emerald-800/80 text-emerald-200'
                        : 'bg-slate-900 border-slate-800 text-slate-500'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {isChecked ? <CheckSquare className="w-4 h-4 text-emerald-400" /> : <Square className="w-4 h-4" />}
                      <span className="font-medium">{p.name}</span>
                    </div>
                    <span className="font-mono text-[11px]">${p.price}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Risk Warnings Summary */}
          {warnings.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase font-mono tracking-wider">
                Risk & Consequence Warnings
              </h4>
              <div className="space-y-2 text-xs">
                {warnings.map(w => (
                  <div key={w.id} className="p-3 rounded-lg bg-red-950/30 border border-red-800/80 text-red-200 flex items-center justify-between">
                    <div>
                      <div className="font-bold font-mono">TIER {w.tier}: {w.title}</div>
                      <div className="text-[11px] text-slate-400">{w.description}</div>
                    </div>
                    <div className="font-mono text-right text-[11px] whitespace-nowrap pl-3">
                      <div className="text-emerald-400">Prevent: ~${w.preventiveCost}</div>
                      <div className="text-red-400">Failure: ~${w.failureCost}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Mandatory PRD Disclaimer */}
          <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-500 leading-relaxed font-mono">
            <strong>THE DISCLAIMER:</strong> All build paths are calculated from a stock vehicle. Checking off mods you already have only marks your place on that path — it doesn't change the path, recalculate for your specific car, or account for its condition, history, or mileage. You'll still see every step and every precaution, whether you've done it or not. This is reference information, not advice for your individual vehicle.
          </div>
      </div>
    </Modal>
  );
};
