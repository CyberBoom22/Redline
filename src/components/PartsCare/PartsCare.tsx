import React, { useState } from 'react';
import { EngineId } from '../../types';
import { ALL_PARTS } from '../../data/parts';
import { AlertTriangle, RefreshCw, CheckCircle, Clock } from 'lucide-react';
import { PageHeader } from '../billet/PageHeader';

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

  const FILTERS: { id: typeof filterType; label: string }[] = [
    { id: 'all', label: 'All Care Types' },
    { id: 'serviceable', label: 'Serviceable (Clean & Re-Oil)' },
    { id: 'replace_interval', label: 'Replace-on-Interval' },
    { id: 'fit_and_forget', label: 'Fit-and-Forget' },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <PageHeader
        eyebrow="Parts care"
        title="Parts Care — The Ownership Maintenance Layer"
        description="The one content type not tied to buying. Sourced from manufacturers: maintenance intervals, wash/re-oil cautions, and spark plug gapping guidelines."
      >
        {/* Filter Pills */}
        <span id="care-filter-label" className="field-label">Care type</span>
        <div role="group" aria-labelledby="care-filter-label" className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilterType(f.id)}
              aria-pressed={filterType === f.id}
              className="toggle text-[14px]"
            >
              {f.label}
            </button>
          ))}
        </div>
      </PageHeader>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {filteredParts.map((part) => {
          const isOwned = ownedPartIds.includes(part.id);

          const careConfig = {
            serviceable: { badge: 'TYPE · SERVICEABLE (Clean & Re-Oil)', icon: RefreshCw },
            replace_interval: { badge: 'TYPE · REPLACE-ON-INTERVAL', icon: Clock },
            fit_and_forget: { badge: 'TYPE · FIT-AND-FORGET', icon: CheckCircle }
          }[part.careType];

          const IconComponent = careConfig.icon;

          return (
            <article
              key={part.id}
              className={`plate space-y-3 p-5 ${isOwned ? 'outline outline-2 -outline-offset-2 outline-accent' : ''}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black/15 pb-3">
                <span className="chip whitespace-normal text-text-3">{careConfig.badge}</span>

                {isOwned && <span className="chip chip-accent">Installed on your build</span>}
              </div>

              <div>
                <h2 className="etch text-[18px] font-bold leading-snug text-ink">{part.name}</h2>
                <p className="label-ui mt-1 text-text-3">{part.brand}</p>
              </div>

              {/* Maintenance Procedure & Warnings */}
              <div className="space-y-2 rounded-[3px] bg-ink p-4 text-on-dark">
                <div className="flex items-start gap-2">
                  <IconComponent className="mt-1 h-4 w-4 shrink-0 text-dark-muted" aria-hidden="true" />
                  <p className="text-[15px] font-medium">{part.careInstructions}</p>
                </div>

                {part.careIntervalMiles && (
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-dark-border pt-2 text-[14px]">
                    <span className="text-dark-muted">Service Interval:</span>
                    <span className="font-bold">Every {part.careIntervalMiles.toLocaleString()} miles</span>
                  </div>
                )}
              </div>

              {/* MAF Caution banner for serviceable oiled filters */}
              {part.careType === 'serviceable' && (
                <div className="well flex items-start gap-2 border-accent p-3 text-[15px] text-text-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-accent-deep" aria-hidden="true" />
                  <span>
                    <strong className="text-ink">Owner Mistake Caution:</strong> Over-oiling cotton filters causes oil droplet migration that coats and contaminates the MAF sensor wire!
                  </span>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
};
