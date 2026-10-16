import React from 'react';
import { Gauge, AlertTriangle, DollarSign, ShieldAlert, Layers } from 'lucide-react';

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
    <section className="panel-dark space-y-5 p-5 sm:p-6" aria-label="Build totals">
      {/* Top Cockpit Numbers: 3 main numbers at one glance */}
      <div className="grid grid-cols-1 gap-px overflow-hidden rounded-[3px] border border-dark-border bg-dark-border sm:grid-cols-3">
        {/* Metric 1: Projected WHP */}
        <div className="bg-ink p-4">
          <div className="flex items-center justify-between">
            <span className="label-ui text-dark-muted">Projected power</span>
            <Gauge className="h-4 w-4 text-dark-muted" aria-hidden="true" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="num text-[34px] leading-none text-on-dark">{projectedWhp}</span>
            <span className="label-ui text-accent-bright">WHP</span>
          </div>
          <p className="mt-2 text-[15px] text-dark-muted">
            +{(projectedWhp - stockWhp)} WHP over stock ({stockWhp})
          </p>
        </div>

        {/* Metric 2: Target Goal WHP */}
        <div className="bg-ink p-4">
          <div className="flex items-center justify-between">
            <span className="label-ui text-dark-muted">Build goal</span>
            <span className="chip text-dark-muted">Target</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="num text-[34px] leading-none text-on-dark">{goalWhp}</span>
            <span className="label-ui text-dark-muted">WHP</span>
          </div>
          <div className="mt-2 flex items-center justify-between gap-2 text-[15px]">
            <span className="text-dark-muted">Target status:</span>
            <span className={isGoalReached ? 'font-bold text-on-dark' : 'status-required'}>
              {isGoalReached ? 'Goal Reached' : `${gapWhp} WHP short`}
            </span>
          </div>
        </div>

        {/* Metric 3: Parts Total ($) */}
        <div className="bg-ink p-4">
          <div className="flex items-center justify-between">
            <span className="label-ui text-dark-muted">Parts cost</span>
            <DollarSign className="h-4 w-4 text-dark-muted" aria-hidden="true" />
          </div>
          <div className="mt-2">
            <span className="num text-[34px] leading-none text-on-dark">${partsTotal.toLocaleString()}</span>
          </div>
          <p className="mt-2 text-[15px] text-dark-muted">Direct bolt-on parts total</p>
        </div>
      </div>

      {/* Honest Gap Callout & Compare Toggle */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
        {/* Gap Callout Box */}
        <div className="well-dark flex flex-1 items-start gap-3 p-4">
          {isGoalReached ? (
            <Gauge className="mt-0.5 h-5 w-5 shrink-0 text-on-dark" aria-hidden="true" />
          ) : (
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-accent-bright" aria-hidden="true" />
          )}
          <div>
            <div className="font-bold uppercase tracking-[0.5px] text-on-dark">
              {isGoalReached
                ? 'Goal WHP Target Reached!'
                : `You're ${gapWhp} WHP short — standard bolt-ons are done here.`}
            </div>
            <p className="mt-0.5 text-[15px] text-dark-muted">
              {isGoalReached
                ? 'Your build path satisfies the targeted power band. Review risk warnings below.'
                : 'To close the gap, check upgraded turbo or high ethanol (E85) fuel kits.'}
            </p>
          </div>
        </div>

        {/* Realistic All-In Cost Card & Compare Side-by-Side Switcher */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
          <div className="well-dark px-4 py-3 sm:text-right">
            <div className="label-ui text-dark-muted">Realistic all-in (parts + supporting + labor)</div>
            <div className="num mt-1 text-[26px] leading-tight text-on-dark">${allInTotal.toLocaleString()}</div>
          </div>

          <button
            onClick={onOpenCompareSlider}
            id="compare-slider-btn"
            aria-pressed={showCompareModal}
            className={`btn btn-sm whitespace-nowrap ${showCompareModal ? 'btn-primary' : 'btn-ghost-dark'}`}
          >
            <Layers className="h-4 w-4" aria-hidden="true" />
            <span>Compare Power vs Exposure</span>
          </button>
        </div>
      </div>

      {/* Unacknowledged Gated Warnings Banner if applicable */}
      {unacknowledgedGatedWarningsCount > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[3px] border border-accent p-3 text-[15px] text-on-dark">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 shrink-0 text-accent-bright" aria-hidden="true" />
            <span>
              <strong className="text-accent-bright">{unacknowledgedGatedWarningsCount} Required "Will Break" Warning(s)</strong> need active checkbox acknowledgment before continuing!
            </span>
          </div>
          <span className="chip chip-accent">Gated</span>
        </div>
      )}
    </section>
  );
};
