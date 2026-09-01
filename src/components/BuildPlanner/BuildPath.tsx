import React from 'react';
import { Part, TieredWarning, PartTier } from '../../types';
import { CheckSquare, Square, AlertOctagon, ExternalLink, Youtube, ShieldAlert, DollarSign, Wrench, ChevronDown, Sparkles } from 'lucide-react';

interface BuildPathProps {
  parts: Part[];
  ownedPartIds: string[];
  onTogglePartOwned: (partId: string) => void;
  warnings: TieredWarning[];
  onAcknowledgeWarning: (warningId: string) => void;
  acknowledgedWarningIds: string[];
  goalWhp: number;
}

export const BuildPath: React.FC<BuildPathProps> = ({
  parts,
  ownedPartIds,
  onTogglePartOwned,
  warnings,
  onAcknowledgeWarning,
  acknowledgedWarningIds,
  goalWhp
}) => {
  // Group parts by category
  const categories = [
    { key: 'tune', title: '1. ECU / TCU Flash Calibration' },
    { key: 'downpipe', title: '2. Exhaust Downpipe (Spool & Flow)' },
    { key: 'intake', title: '3. Air Intake & Filtration' },
    { key: 'chargepipe_intercooler', title: '4. Chargepipe & Intercooler Cooling' },
    { key: 'fueling', title: '5. High Pressure Fueling (HPFP / Flex Fuel)' },
    { key: 'turbo', title: '6. Upgraded Turbocharger System' },
    { key: 'drivetrain', title: '7. Drivetrain & Supporting Modifications' }
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div>
          <h3 className="text-base font-bold text-slate-100 font-mono tracking-wide uppercase flex items-center gap-2">
            <span>Standard Calculated Build Path</span>
            <span className="text-[10px] bg-red-950 text-red-400 border border-red-800 px-2 py-0.5 rounded font-mono">
              Stock Baseline Model
            </span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Calculated identically for every stock vehicle. Check boxes to mark inventory you already own.
          </p>
        </div>
      </div>

      {/* Path List by Category */}
      <div className="space-y-6 relative">
        {/* Continuous line connecting steps */}
        <div className="absolute left-[21px] top-4 bottom-4 w-0.5 bg-slate-800 pointer-events-none" />

        {categories.map((cat, idx) => {
          const categoryParts = parts.filter(p => p.category === cat.key);
          if (categoryParts.length === 0) return null;

          // Check if user owns at least one part in this category
          const hasOwnedInCat = categoryParts.some(p => ownedPartIds.includes(p.id));

          return (
            <div key={cat.key} className="relative pl-10 space-y-3">
              {/* Category Step Marker */}
              <div className="absolute left-3 top-1 -translate-x-1/2 w-5 h-5 rounded-full bg-slate-950 border-2 border-red-500 flex items-center justify-center text-[10px] font-mono font-bold text-red-400">
                {idx + 1}
              </div>

              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-300 font-mono uppercase tracking-wider">
                  {cat.title}
                </h4>
                <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded ${
                  hasOwnedInCat ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-slate-950 text-amber-400 border border-amber-900/60'
                }`}>
                  {hasOwnedInCat ? 'INSTALLED / CHECKED' : 'GAP IN PATH'}
                </span>
              </div>

              {/* List of parts in category */}
              <div className="space-y-2.5">
                {categoryParts.map((part) => {
                  const isChecked = ownedPartIds.includes(part.id);

                  // Tier styling badge
                  const tierBadges: Record<PartTier, { label: string; style: string }> = {
                    cheap: { label: 'Budget', style: 'bg-emerald-950/80 text-emerald-400 border-emerald-800/60' },
                    mid: { label: 'Mid-Tier', style: 'bg-blue-950/80 text-blue-400 border-blue-800/60' },
                    expensive: { label: 'Premium', style: 'bg-purple-950/80 text-purple-400 border-purple-800/60' },
                    oem: { label: 'OEM Upgrade', style: 'bg-slate-800 text-slate-300 border-slate-700' }
                  };

                  return (
                    <div
                      key={part.id}
                      className={`p-4 rounded-xl border transition-all ${
                        isChecked
                          ? 'bg-slate-950/90 border-slate-750 text-slate-200'
                          : 'bg-slate-950/40 border-slate-800/80 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        {/* Checkbox & Part Title */}
                        <div className="flex items-start gap-3">
                          <button
                            onClick={() => onTogglePartOwned(part.id)}
                            className="mt-0.5 text-red-500 hover:text-red-400 transition-colors"
                          >
                            {isChecked ? (
                              <CheckSquare className="w-5 h-5 text-emerald-500 fill-emerald-950" />
                            ) : (
                              <Square className="w-5 h-5 text-slate-600 hover:text-slate-400" />
                            )}
                          </button>

                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-sm text-slate-100">{part.name}</span>
                              <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${tierBadges[part.tier].style}`}>
                                {tierBadges[part.tier].label}
                              </span>
                              {part.isSupportingMod && (
                                <span className="text-[10px] font-mono bg-amber-950/80 text-amber-400 border border-amber-800/60 px-1.5 py-0.2 rounded">
                                  REQUIRED SUPPORTING MOD
                                </span>
                              )}
                            </div>

                            {/* Honest Verdict Line */}
                            <p className="text-xs text-red-400/90 font-medium italic mt-1 bg-red-950/20 border-l-2 border-red-500/60 pl-2.5 py-0.5">
                              "{part.verdict}"
                            </p>

                            <p className="text-xs text-slate-400 mt-1.5">
                              {part.description}
                            </p>
                          </div>
                        </div>

                        {/* Price & Gains */}
                        <div className="text-right whitespace-nowrap flex flex-col items-end">
                          <div className="font-mono text-base font-extrabold text-emerald-400">
                            ${part.price}
                          </div>
                          <div className="text-[10px] font-mono text-slate-400">
                            +{part.whpGain} WHP gain
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                            Est. Labor: ${part.estLaborCost} ({part.installTimeHours}h)
                          </div>
                        </div>
                      </div>

                      {/* Part Action links & Care note */}
                      <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-3">
                          {part.installGuideUrl && (
                            <a
                              href={part.installGuideUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] text-slate-400 hover:text-red-400 flex items-center gap-1 font-mono transition-colors"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>Install Guide</span>
                            </a>
                          )}
                          {part.youtubeGuideUrl && (
                            <a
                              href={part.youtubeGuideUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] text-slate-400 hover:text-red-400 flex items-center gap-1 font-mono transition-colors"
                            >
                              <Youtube className="w-3 h-3 text-red-500" />
                              <span>YouTube Walkthrough</span>
                            </a>
                          )}
                        </div>

                        {part.careInstructions && (
                          <div className="text-[11px] text-slate-400 font-mono bg-slate-900 px-2 py-1 rounded border border-slate-800 flex items-center gap-1.5">
                            <Wrench className="w-3 h-3 text-amber-400" />
                            <span>{part.careInstructions}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Inline Embedded Warnings for this category if triggered */}
              {warnings.map((w) => {
                // If warning is triggered at current goal WHP and relates to this category
                const isAcknowledged = acknowledgedWarningIds.includes(w.id);
                const isCatMatch = 
                  (cat.key === 'drivetrain' && w.id.includes('zf8')) ||
                  (cat.key === 'chargepipe_intercooler' && (w.id.includes('chargepipe') || w.id.includes('heat_soak'))) ||
                  (cat.key === 'turbo' && w.id.includes('rod'));

                if (!isCatMatch) return null;

                return (
                  <div
                    key={w.id}
                    className={`p-4 rounded-xl border text-xs space-y-2 mt-2 transition-all ${
                      w.tier === 1
                        ? 'bg-red-950/70 border-red-600/80 text-red-100 shadow-lg'
                        : 'bg-amber-950/50 border-amber-700/60 text-amber-100'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        <AlertOctagon className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <div className="font-extrabold font-mono text-sm uppercase tracking-wide flex items-center gap-2">
                            <span>TIER {w.tier}: {w.title}</span>
                          </div>
                          <p className="text-slate-300 text-xs mt-1 leading-relaxed">
                            {w.description}
                          </p>
                        </div>
                      </div>

                      {/* Cost Contrast: Prevention vs Failure */}
                      <div className="text-right whitespace-nowrap bg-slate-950/80 p-2.5 rounded-lg border border-slate-800 font-mono text-[11px]">
                        <div className="text-emerald-400 font-bold">
                          Preventive: ~${w.preventiveCost}
                        </div>
                        <div className="text-red-400 font-bold mt-0.5">
                          Failure: ~${w.failureCost}
                        </div>
                      </div>
                    </div>

                    {/* Evidence Source & Active Acknowledge Checkbox */}
                    <div className="pt-2 border-t border-red-900/40 flex flex-wrap items-center justify-between gap-2">
                      <a
                        href={w.evidenceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-slate-300 hover:text-white underline flex items-center gap-1 font-mono"
                      >
                        <ExternalLink className="w-3 h-3 text-red-400" />
                        <span>Evidence: {w.evidenceSource}</span>
                      </a>

                      {w.tier === 1 && (
                        <button
                          onClick={() => onAcknowledgeWarning(w.id)}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold font-mono transition-all ${
                            isAcknowledged
                              ? 'bg-emerald-950 text-emerald-400 border-emerald-700'
                              : 'bg-red-900 hover:bg-red-800 text-white border-red-600 animate-pulse'
                          }`}
                        >
                          <CheckSquare className="w-4 h-4" />
                          <span>
                            {isAcknowledged ? 'Risk Decision Logged & Acknowledged' : 'Acknowledge "Will Break" Decision'}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};
