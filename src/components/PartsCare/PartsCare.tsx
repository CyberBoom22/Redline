import React, { useState } from 'react';
import { EngineId } from '../../types';
import { ALL_PARTS } from '../../data/parts';
import { Wrench, AlertTriangle, RefreshCw, CheckCircle, Clock, ShieldCheck, ExternalLink } from 'lucide-react';

interface PartsCareProps {
  engineId: EngineId;
  ownedPartIds: string[];
}

export const PartsCare: React.FC<PartsCareProps> = ({ engineId, ownedPartIds }) => {
  const [filterType, setFilterType] = useState<'all' | 'serviceable' | 'replace_interval' | 'fit_and_forget'>('all');

  const engineParts = ALL_PARTS.filter(p => p.engineIds.includes(engineId) && p.careInstructions);

  const filteredParts = engineParts.filter(p => {
    if (filterType === 'all') return true;
    return p.careType === filterType;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-2">
        <div className="flex items-center gap-2">
          <Wrench className="w-6 h-6 text-red-500" />
          <h2 className="text-xl font-bold font-mono text-white uppercase tracking-wider">
            Parts Care — The Ownership Maintenance Layer
          </h2>
        </div>
        <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
          The one content type not tied to buying. Sourced from manufacturers: maintenance intervals, wash/re-oil cautions, and spark plug gapping guidelines.
        </p>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 pt-4 border-t border-slate-800 text-xs font-mono">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-lg border font-bold transition-all ${
              filterType === 'all'
                ? 'bg-red-600 text-white border-red-500'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            All Care Types
          </button>
          <button
            onClick={() => setFilterType('serviceable')}
            className={`px-3 py-1.5 rounded-lg border font-bold transition-all ${
              filterType === 'serviceable'
                ? 'bg-red-600 text-white border-red-500'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            Serviceable (Clean & Re-Oil)
          </button>
          <button
            onClick={() => setFilterType('replace_interval')}
            className={`px-3 py-1.5 rounded-lg border font-bold transition-all ${
              filterType === 'replace_interval'
                ? 'bg-red-600 text-white border-red-500'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            Replace-on-Interval
          </button>
          <button
            onClick={() => setFilterType('fit_and_forget')}
            className={`px-3 py-1.5 rounded-lg border font-bold transition-all ${
              filterType === 'fit_and_forget'
                ? 'bg-red-600 text-white border-red-500'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            Fit-and-Forget
          </button>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredParts.map((part) => {
          const isOwned = ownedPartIds.includes(part.id);

          const careConfig = {
            serviceable: {
              badge: 'TYPE · SERVICEABLE (Clean & Re-Oil)',
              style: 'bg-blue-950/80 text-blue-400 border-blue-800',
              icon: RefreshCw
            },
            replace_interval: {
              badge: 'TYPE · REPLACE-ON-INTERVAL',
              style: 'bg-amber-950/80 text-amber-400 border-amber-800',
              icon: Clock
            },
            fit_and_forget: {
              badge: 'TYPE · FIT-AND-FORGET',
              style: 'bg-emerald-950/80 text-emerald-400 border-emerald-800',
              icon: CheckCircle
            }
          }[part.careType];

          const IconComponent = careConfig.icon;

          return (
            <div
              key={part.id}
              className={`p-5 rounded-2xl border bg-slate-900 space-y-3 transition-all ${
                isOwned ? 'border-red-500/70 shadow-lg' : 'border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border uppercase ${careConfig.style}`}>
                  {careConfig.badge}
                </span>

                {isOwned && (
                  <span className="text-[10px] font-mono bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded border border-emerald-800 font-bold">
                    INSTALLED ON YOUR BUILD
                  </span>
                )}
              </div>

              <div>
                <h3 className="font-bold text-base text-white font-mono">{part.name}</h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">{part.brand}</p>
              </div>

              {/* Maintenance Procedure & Warnings */}
              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-xs">
                <div className="flex items-start gap-2">
                  <IconComponent className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-slate-200 leading-relaxed font-medium">
                    {part.careInstructions}
                  </p>
                </div>

                {part.careIntervalMiles && (
                  <div className="text-[11px] font-mono text-amber-400 pt-1 border-t border-slate-900 flex items-center justify-between">
                    <span>Service Interval:</span>
                    <span className="font-bold">Every {part.careIntervalMiles.toLocaleString()} miles</span>
                  </div>
                )}
              </div>

              {/* MAF Caution banner for serviceable oiled filters */}
              {part.careType === 'serviceable' && (
                <div className="p-2.5 rounded-lg bg-amber-950/40 border border-amber-800/80 text-[11px] text-amber-200 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <span>
                    <strong>Owner Mistake Caution:</strong> Over-oiling cotton filters causes oil droplet migration that coats and contaminates the MAF sensor wire!
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
