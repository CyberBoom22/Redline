import React, { useRef } from 'react';
import { VehicleSelection, Part, TieredWarning } from '../types';
import { PLATFORMS } from '../data/platforms';
import { Modal } from './ui/Modal';
import { Share2, CheckSquare, Square, Printer } from 'lucide-react';
import { ModalBar } from './billet/ModalBar';
import { Logo } from './billet/Logo';

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
      header={
        <ModalBar
          className="print:hidden"
          title="Stage0 Build Card — The Group Chat Screenshot Screen"
          onClose={onClose}
          actions={
            <>
              <button onClick={handleShare} className="btn btn-ghost-dark btn-sm" aria-label="Share">
                <Share2 className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">Share</span>
              </button>
              <button onClick={handlePrint} className="btn btn-ghost-dark btn-sm" aria-label="Print / PDF">
                <Printer className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">Print / PDF</span>
              </button>
            </>
          }
        />
      }
    >
      {/* The Screenshot Printable Container */}
      <div ref={cardRef} id="build-card" className="space-y-6 bg-ink p-5 text-on-dark sm:p-8 print:p-0">
        {/* Header Branding */}
        <div className="flex flex-col gap-4 border-b border-dark-border pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline gap-3">
              <Logo />
              <span className="label-ui text-dark-muted">Build summary</span>
            </div>
            <h3 className="mt-2 text-[20px] font-bold text-on-dark">
              {vehicle.year} {vehicle.trim} ({vehicle.chassis})
            </h3>
            <p className="text-[15px] text-dark-muted">
              Engine: {currentEngine?.name} | Trans: {vehicle.transmission}
            </p>
          </div>

          <div className="sm:text-right">
            <div className="num text-[30px] leading-tight text-on-dark">
              {projectedWhp} <span className="text-accent-bright">WHP</span>
            </div>
            <div className="text-[15px] text-dark-muted">Target: {goalWhp} WHP</div>
          </div>
        </div>

        {/* Instrument Cluster Metrics */}
        <dl className="grid grid-cols-1 gap-px overflow-hidden rounded-[3px] bg-dark-border sm:grid-cols-3">
          <div className="bg-ink p-3">
            <dt className="label-ui text-dark-muted">Projected WHP</dt>
            <dd className="num mt-1 text-[22px] text-on-dark">{projectedWhp}</dd>
          </div>
          <div className="bg-ink p-3">
            <dt className="label-ui text-dark-muted">Goal WHP</dt>
            <dd className="num mt-1 text-[22px] text-on-dark">{goalWhp}</dd>
          </div>
          <div className="bg-ink p-3">
            <dt className="label-ui text-dark-muted">Parts Total</dt>
            <dd className="num mt-1 text-[22px] text-on-dark">${partsTotal.toLocaleString()}</dd>
          </div>
        </dl>

        {/* Gap Callout */}
        <div className="well-dark flex flex-col gap-2 p-4 text-[15px] sm:flex-row sm:items-center sm:justify-between">
          <span className="text-on-dark">
            {gapWhp === 0
              ? 'Target WHP achieved with current selected bolt-on combination!'
              : `You're ${gapWhp} WHP short — standard bolt-ons are done here.`}
          </span>
          <span className="font-bold text-on-dark">
            Realistic All-In (w/ Labor): <span className="num">${allInTotal.toLocaleString()}</span>
          </span>
        </div>

        {/* Checklist of parts */}
        <section className="space-y-2">
          <h4 className="label-ui text-dark-muted">Installed &amp; Planned Parts</h4>
          <ul className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
            {parts.map(p => {
              const isChecked = ownedPartIds.includes(p.id);
              return (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-3 border-b border-dark-border py-2 text-[15px]"
                >
                  <span className={`flex items-center gap-2 ${isChecked ? 'text-on-dark' : 'text-dark-muted'}`}>
                    {isChecked ? (
                      <CheckSquare className="h-4 w-4 shrink-0 text-accent-bright" aria-label="Checked" />
                    ) : (
                      <Square className="h-4 w-4 shrink-0" aria-label="Not checked" />
                    )}
                    <span className={isChecked ? 'font-semibold' : ''}>{p.name}</span>
                  </span>
                  <span className="num shrink-0 text-[13px] text-dark-muted">${p.price}</span>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Risk Warnings Summary */}
        {warnings.length > 0 && (
          <section className="space-y-2">
            <h4 className="label-ui text-dark-muted">Risk &amp; Consequence Warnings</h4>
            <ul className="rows-dark border-y border-dark-border">
              {warnings.map(w => (
                <li key={w.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className={`font-bold uppercase tracking-[0.5px] ${w.tier === 1 ? 'text-accent-bright' : 'text-on-dark'}`}>
                      Tier {w.tier}: {w.title}
                    </div>
                    <div className="text-[14px] text-dark-muted">{w.description}</div>
                  </div>
                  <div className="shrink-0 whitespace-nowrap text-[14px] sm:pl-3 sm:text-right">
                    <div className="text-on-dark">Prevent: ~${w.preventiveCost}</div>
                    <div className="text-accent-bright">Failure: ~${w.failureCost}</div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Mandatory PRD Disclaimer */}
        <div className="border-t border-dark-border pt-4 text-[14px] text-dark-muted">
          <strong className="text-on-dark">THE DISCLAIMER:</strong> All build paths are calculated from a stock vehicle. Checking off mods you already have only marks your place on that path — it doesn't change the path, recalculate for your specific car, or account for its condition, history, or mileage. You'll still see every step and every precaution, whether you've done it or not. This is reference information, not advice for your individual vehicle.
        </div>
      </div>
    </Modal>
  );
};
