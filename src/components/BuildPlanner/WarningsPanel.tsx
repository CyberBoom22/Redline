import React from 'react';
import { TieredWarning } from '../../types';
import { ShieldAlert, AlertOctagon, Info, ExternalLink, CheckSquare, Square, DollarSign } from 'lucide-react';

interface WarningsPanelProps {
  warnings: TieredWarning[];
  acknowledgedIds: string[];
  onAcknowledgeWarning: (id: string) => void;
}

export const WarningsPanel: React.FC<WarningsPanelProps> = ({
  warnings,
  acknowledgedIds,
  onAcknowledgeWarning
}) => {
  if (warnings.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-center space-y-2">
        <div className="w-10 h-10 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-5 h-5" />
        </div>
        <h4 className="font-mono font-bold text-sm text-slate-200 uppercase">
          Zero High-Risk Warnings At Current Power Level
        </h4>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Your target WHP is well within OEM safety margins. Standard scheduled maintenance applies.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-5">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-red-500" />
          <h3 className="text-base font-bold text-slate-100 font-mono uppercase tracking-wide">
            Tiered Risk Warnings & Consequence Pricing
          </h3>
        </div>
        <span className="text-[10px] font-mono bg-red-950 text-red-400 border border-red-800 px-2 py-0.5 rounded uppercase">
          PRD Section 02 & 04
        </span>
      </div>

      <div className="space-y-4">
        {warnings.map((w) => {
          const isAcknowledged = acknowledgedIds.includes(w.id);

          const tierConfig = {
            1: {
              badge: 'TIER 1 · WILL BREAK (Deterministic - Gated)',
              badgeStyle: 'bg-red-950/90 text-red-400 border-red-800',
              cardStyle: 'bg-red-950/20 border-red-800/80'
            },
            2: {
              badge: 'TIER 2 · SHORTENS LIFE (Probabilistic Wear)',
              badgeStyle: 'bg-amber-950/90 text-amber-400 border-amber-800',
              cardStyle: 'bg-amber-950/20 border-amber-800/80'
            },
            3: {
              badge: 'TIER 3 · KNOW THIS (Informational / CARB)',
              badgeStyle: 'bg-slate-800 text-slate-300 border-slate-700',
              cardStyle: 'bg-slate-950/80 border-slate-800'
            }
          }[w.tier];

          return (
            <div
              key={w.id}
              className={`p-4 rounded-xl border space-y-3 transition-all ${tierConfig.cardStyle}`}
            >
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${tierConfig.badgeStyle}`}>
                  {tierConfig.badge}
                </span>

                {/* Dollar Cost attached: Prevention vs Failure */}
                <div className="flex items-center gap-3 font-mono text-xs bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
                  <div>
                    <span className="text-slate-400 text-[10px] block">Preventive:</span>
                    <span className="text-emerald-400 font-bold">~${w.preventiveCost}</span>
                  </div>
                  <div className="w-px h-6 bg-slate-800" />
                  <div>
                    <span className="text-slate-400 text-[10px] block">Engine Failure:</span>
                    <span className="text-red-400 font-bold">~${w.failureCost}</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-sm text-slate-100 font-mono">{w.title}</h4>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  {w.description}
                </p>
              </div>

              {/* Real Evidence Citation Link Out & Acknowledgment Gate */}
              <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                <a
                  href={w.evidenceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-slate-400 hover:text-white flex items-center gap-1.5 font-mono text-[11px] underline transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-red-500" />
                  <span>Evidence: {w.evidenceSource}</span>
                </a>

                {w.tier === 1 && (
                  <button
                    onClick={() => onAcknowledgeWarning(w.id)}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg border font-mono text-xs font-bold transition-all ${
                      isAcknowledged
                        ? 'bg-emerald-950 text-emerald-400 border-emerald-700'
                        : 'bg-red-600 hover:bg-red-500 text-white border-red-500 shadow-md shadow-red-900/40'
                    }`}
                  >
                    {isAcknowledged ? (
                      <>
                        <CheckSquare className="w-4 h-4 text-emerald-400" />
                        <span>Acknowledged & Logged</span>
                      </>
                    ) : (
                      <>
                        <Square className="w-4 h-4" />
                        <span>Acknowledge Risk Before Building</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
