import React, { useEffect, useRef, useState } from 'react';
import { VehicleSelection, Part, TieredWarning } from '../types';
import { PLATFORMS, getGoalRange } from '../data/platforms';
import { Modal } from './ui/Modal';
import { Share2, CheckSquare, Square, Printer, ChevronDown, ExternalLink, Link2 } from 'lucide-react';
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
  stockWhp: number;
  /** Link that restores this exact build. */
  shareUrl: string;
  onTogglePartOwned: (partId: string) => void;
  onGoalWhpChange: (whp: number) => void;
  onAcknowledgeWarning: (warningId: string) => void;
}

type ShareStatus = 'idle' | 'copied' | 'manual';

const TIER_LABEL: Record<TieredWarning['tier'], string> = {
  1: 'Will break',
  2: 'Shortens life',
  3: 'Know this',
};

export const BuildSummaryModal: React.FC<BuildSummaryModalProps> = ({
  isOpen,
  onClose,
  vehicle,
  goalWhp,
  projectedWhp,
  parts,
  ownedPartIds,
  warnings,
  acknowledgedWarningIds,
  stockWhp,
  shareUrl,
  onTogglePartOwned,
  onGoalWhpChange,
  onAcknowledgeWarning
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [shareStatus, setShareStatus] = useState<ShareStatus>('idle');

  // A link copied before an edit no longer describes the build.
  useEffect(() => setShareStatus('idle'), [shareUrl]);

  if (!isOpen) return null;

  const currentPlatform = PLATFORMS.find(p => p.id === vehicle.platformId);
  const currentEngine = currentPlatform?.engines.find(e => e.id === vehicle.engineId);
  const goalRange = getGoalRange(stockWhp);

  const selectedParts = parts.filter(p => ownedPartIds.includes(p.id));
  const partsTotal = selectedParts.reduce((sum, p) => sum + p.price, 0);
  const laborTotal = selectedParts.reduce((sum, p) => sum + p.estLaborCost, 0);
  const allInTotal = partsTotal + laborTotal;
  const gapWhp = Math.max(0, goalWhp - projectedWhp);

  const toggleExpanded = (key: string) =>
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Stage0 Build Card - ${vehicle.trim}`,
          text: `Check out my ${vehicle.trim} build summary on Stage0: ${projectedWhp} WHP projected / ${goalWhp} WHP goal!`,
          url: shareUrl
        });
        return;
      } catch (err) {
        // The person closed the share sheet; nothing else to do.
        if ((err as DOMException).name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareStatus('copied');
    } catch {
      // No clipboard permission: show the link so it can be copied by hand.
      setShareStatus('manual');
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
          title="Stage0 Build Card"
          subtitle="The group chat screenshot screen"
          onClose={onClose}
          actions={
            <>
              <button onClick={handleShare} className="btn btn-ghost-dark btn-sm" aria-label="Share link to this build">
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
      {/* Share feedback. Polite live region so the copy is announced. */}
      <div aria-live="polite" className="print:hidden">
        {shareStatus === 'copied' && (
          <p className="flex items-center gap-2 border-b border-black/15 bg-plate px-5 py-2.5 text-[15px] text-text-2 sm:px-8">
            <Link2 className="h-4 w-4 shrink-0 text-anodize-deep" aria-hidden="true" />
            Link copied. Anyone who opens it sees this exact build.
          </p>
        )}
        {shareStatus === 'manual' && (
          <div className="space-y-1.5 border-b border-black/15 bg-plate px-5 py-3 sm:px-8">
            <label htmlFor="build-share-url" className="field-label mb-0">Copy this link to share the build</label>
            <input
              id="build-share-url"
              readOnly
              value={shareUrl}
              onFocus={(e) => e.currentTarget.select()}
              className="field font-normal"
            />
          </div>
        )}
      </div>

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

        {/* Goal control. Same range and step as the planner's slider. */}
        <div className="well-dark space-y-1 px-4 py-3 print:hidden">
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="build-card-goal" className="label-ui text-dark-muted">Adjust build goal</label>
            <span className="num shrink-0 text-[16px] text-on-dark">{goalWhp} WHP</span>
          </div>
          <input
            id="build-card-goal"
            type="range"
            min={goalRange.min}
            max={goalRange.max}
            step={goalRange.step}
            value={goalWhp}
            onChange={(e) => onGoalWhpChange(Number(e.target.value))}
            className="range"
          />
          <div className="flex justify-between text-[13px] text-dark-muted">
            <span>Stock ({goalRange.min})</span>
            <span>{goalRange.max} WHP</span>
          </div>
        </div>

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
        <section className="space-y-2" aria-labelledby="build-card-parts">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h4 id="build-card-parts" className="label-ui text-dark-muted">Installed &amp; Planned Parts</h4>
            <span className="text-[14px] text-dark-muted print:hidden">
              {selectedParts.length} of {parts.length} checked · tap to add or remove
            </span>
          </div>
          <ul className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
            {parts.map(p => {
              const isChecked = ownedPartIds.includes(p.id);
              const key = `part:${p.id}`;
              const isOpen = expanded.has(key);
              const panelId = `build-card-part-${p.id}`;
              return (
                <li key={p.id} className="border-b border-dark-border">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onTogglePartOwned(p.id)}
                      aria-pressed={isChecked}
                      className={`flex min-h-[44px] min-w-0 flex-1 items-center gap-2 py-1.5 pr-2 text-left text-[15px] hover:text-on-dark ${
                        isChecked ? 'text-on-dark' : 'text-dark-muted'
                      }`}
                    >
                      {isChecked ? (
                        <CheckSquare className="h-4 w-4 shrink-0 text-accent-bright" aria-hidden="true" />
                      ) : (
                        <Square className="h-4 w-4 shrink-0" aria-hidden="true" />
                      )}
                      <span className={`min-w-0 flex-1 ${isChecked ? 'font-semibold' : ''}`}>{p.name}</span>
                      <span className="num shrink-0 text-[13px] text-dark-muted">${p.price}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleExpanded(key)}
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      aria-label={`${isOpen ? 'Hide' : 'Show'} details for ${p.name}`}
                      className="icon-btn text-dark-muted hover:text-on-dark print:hidden"
                    >
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                        aria-hidden="true"
                      />
                    </button>
                  </div>
                  {isOpen && (
                    <div id={panelId} className="space-y-1.5 pb-3 pl-6 text-[14px]">
                      <p className="border-l-2 border-accent pl-2.5 italic text-on-dark">"{p.verdict}"</p>
                      <dl className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-dark-muted">
                        <dt>Gain</dt>
                        <dd className="text-on-dark">+{p.whpGain} WHP</dd>
                        <dt>Est. labor</dt>
                        <dd className="text-on-dark">${p.estLaborCost} ({p.installTimeHours}h)</dd>
                        <dt>Difficulty</dt>
                        <dd className="text-on-dark">{p.difficulty}</dd>
                        <dt>Brand</dt>
                        <dd className="text-on-dark">{p.brand}</dd>
                      </dl>
                      {p.isSupportingMod && <p className="status-required text-[13px]">Required supporting mod</p>}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        {/* Risk Warnings Summary */}
        {warnings.length > 0 && (
          <section className="space-y-2" aria-labelledby="build-card-warnings">
            <h4 id="build-card-warnings" className="label-ui text-dark-muted">Risk &amp; Consequence Warnings</h4>
            <ul className="rows-dark border-y border-dark-border">
              {warnings.map(w => {
                const key = `warning:${w.id}`;
                const isOpen = expanded.has(key);
                const isAcknowledged = acknowledgedWarningIds.includes(w.id);
                const panelId = `build-card-warning-${w.id}`;
                return (
                  <li key={w.id} className="space-y-2 py-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex min-w-0 items-start gap-1">
                        <button
                          type="button"
                          onClick={() => toggleExpanded(key)}
                          aria-expanded={isOpen}
                          aria-controls={panelId}
                          className="-ml-1 flex min-h-[44px] min-w-0 items-start gap-1.5 text-left"
                        >
                          <ChevronDown
                            className={`mt-1 h-4 w-4 shrink-0 text-dark-muted transition-transform print:hidden ${isOpen ? 'rotate-180' : ''}`}
                            aria-hidden="true"
                          />
                          <span className={`font-bold uppercase tracking-[0.5px] ${w.tier === 1 ? 'text-accent-bright' : 'text-on-dark'}`}>
                            Tier {w.tier}: {w.title}
                          </span>
                        </button>
                      </div>
                      <div className="shrink-0 whitespace-nowrap pl-6 text-[14px] sm:pl-3 sm:text-right">
                        <div className="text-on-dark">Prevent: ~${w.preventiveCost}</div>
                        <div className="text-accent-bright">Failure: ~${w.failureCost}</div>
                      </div>
                    </div>

                    {/* The description always prints; on screen it opens on demand. */}
                    <div id={panelId} className={`space-y-2 pl-6 text-[14px] ${isOpen ? '' : 'hidden print:block'}`}>
                      <p className="text-dark-muted">
                        <span className="label-ui mr-2 text-dark-muted">{TIER_LABEL[w.tier]}</span>
                        {w.description}
                      </p>
                      {w.evidenceUrl && (
                        <a
                          href={w.evidenceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="link text-dark-muted hover:text-on-dark print:hidden"
                        >
                          <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
                          <span>Evidence: {w.evidenceSource}</span>
                        </a>
                      )}
                    </div>

                    {w.tier === 1 && (
                      <div className="pl-6">
                        <button
                          type="button"
                          onClick={() => onAcknowledgeWarning(w.id)}
                          aria-pressed={isAcknowledged}
                          className={`btn btn-sm ${isAcknowledged ? 'btn-ghost-dark' : 'btn-primary'}`}
                        >
                          {isAcknowledged ? (
                            <CheckSquare className="h-4 w-4" aria-hidden="true" />
                          ) : (
                            <Square className="h-4 w-4" aria-hidden="true" />
                          )}
                          <span>{isAcknowledged ? 'Risk acknowledged' : 'Acknowledge risk'}</span>
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
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
