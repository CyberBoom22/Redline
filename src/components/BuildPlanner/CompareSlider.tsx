import React, { useState } from 'react';
import { EngineId, Part, TieredWarning } from '../../types';
import { ALL_PARTS } from '../../data/parts';
import { ALL_WARNINGS } from '../../data/warnings';
import { AlertOctagon } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { ModalBar } from '../billet/ModalBar';

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

  const renderOption = (
    key: 'A' | 'B',
    power: number,
    setPower: (n: number) => void,
    build: ReturnType<typeof getBuildDetails>
  ) => (
    <section className="panel-dark space-y-5 p-5" aria-labelledby={`compare-option-${key}`}>
      <div className="flex items-center justify-between gap-3 border-b border-dark-border pb-3">
        <h3 id={`compare-option-${key}`} className="label-ui text-dark-muted">
          Option {key} Target
        </h3>
        <span className="text-on-dark">
          <span className="num text-[26px]">{power}</span> <span className="label-ui text-accent-bright">WHP</span>
        </span>
      </div>

      {/* Slider */}
      <div>
        <label htmlFor={`compare-range-${key}`} className="sr-only">
          Option {key} target WHP
        </label>
        <input
          id={`compare-range-${key}`}
          type="range"
          min={stockWhp}
          max={stockWhp + 250}
          step={10}
          value={power}
          onChange={(e) => setPower(Number(e.target.value))}
          className="range"
        />
        <div className="flex justify-between text-[14px] text-dark-muted">
          <span>Stock ({stockWhp})</span>
          <span>{stockWhp + 250} WHP</span>
        </div>
      </div>

      {/* Metrics Summary */}
      <dl className="grid grid-cols-2 gap-2">
        <div className="well-dark p-3">
          <dt className="label-ui text-dark-muted">Parts Total</dt>
          <dd className="num mt-1 text-[18px] text-on-dark">${build.partsCost}</dd>
        </div>
        <div className="well-dark p-3">
          <dt className="label-ui text-dark-muted">All-In (w/ Labor)</dt>
          <dd className="num mt-1 text-[18px] text-on-dark">${build.allInCost}</dd>
        </div>
      </dl>

      {/* Warnings Exposure List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h4 className="font-bold uppercase tracking-[0.5px] text-on-dark">Exposure & Risk Warnings</h4>
          <span className="status-required text-[13px]">{build.warnings.length} Active</span>
        </div>
        {build.warnings.length === 0 ? (
          <p className="well-dark p-3 text-[15px] text-on-dark">
            Low exposure — stock components operates safely within factory margins.
          </p>
        ) : (
          <ul className="rows-dark border-y border-dark-border">
            {build.warnings.map(w => (
              <li key={w.id} className="py-2.5">
                <div className="flex items-start gap-1.5 font-semibold text-on-dark">
                  <AlertOctagon
                    className={`mt-1 h-4 w-4 shrink-0 ${w.tier === 1 ? 'text-accent-bright' : 'text-dark-muted'}`}
                    aria-hidden="true"
                  />
                  <span>Tier {w.tier}: {w.title}</span>
                </div>
                <div className="mt-1 flex justify-between gap-2 pl-5 text-[14px] text-dark-muted">
                  <span>Prevent: ~${w.preventiveCost}</span>
                  <span className="text-accent-bright">Failure: ~${w.failureCost}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-5xl"
      header={
        <ModalBar
          title="Side-By-Side Build & Risk Comparison"
          subtitle="Compare power vs exposure side-by-side to see how risk tiers and required parts shift."
          onClose={onClose}
        />
      }
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-black/15 px-5 py-3 sm:px-6">
          <p className="text-[15px] text-text-2">
            Cost delta: <span className="num text-ink">${Math.abs(buildB.allInCost - buildA.allInCost)}</span> for{' '}
            <span className="num text-accent-deep">{Math.abs(powerB - powerA)} WHP</span> difference.
          </p>
          <button onClick={onClose} className="btn btn-secondary btn-sm">
            Close Comparison
          </button>
        </div>
      }
    >
      {/* Side-By-Side Grid. The shell caps the panel height and scrolls this
          body, so no local max-h belongs here — two nested scroll containers
          would fight each other. */}
      <div className="grid grid-cols-1 gap-5 p-4 sm:p-6 md:grid-cols-2">
        {renderOption('A', powerA, setPowerA, buildA)}
        {renderOption('B', powerB, setPowerB, buildB)}
      </div>
    </Modal>
  );
};
