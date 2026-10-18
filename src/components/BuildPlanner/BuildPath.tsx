import React from 'react';
import { Part, TieredWarning, PartTier } from '../../types';
import { CheckSquare, Square, AlertOctagon, ExternalLink, Youtube, Wrench } from 'lucide-react';

interface BuildPathProps {
  parts: Part[];
  ownedPartIds: string[];
  onTogglePartOwned: (partId: string) => void;
  warnings: TieredWarning[];
  onAcknowledgeWarning: (warningId: string) => void;
  acknowledgedWarningIds: string[];
  goalWhp: number;
}

// Tier label per part. Outlined chips, neutral except Premium, which keeps the
// purple it always had; the label still says which tier it is.
const TIER_LABELS: Record<PartTier, string> = {
  cheap: 'Budget',
  mid: 'Mid-Tier',
  expensive: 'Premium',
  oem: 'OEM Upgrade'
};

export const BuildPath: React.FC<BuildPathProps> = ({
  parts,
  ownedPartIds,
  onTogglePartOwned,
  warnings,
  onAcknowledgeWarning,
  acknowledgedWarningIds,
  goalWhp
}) => {
  // Group parts by category. Each step is labelled as a machining op:
  // OP 10, OP 20, … in path order.
  const categories = [
    { key: 'tune', title: 'ECU / TCU Flash Calibration' },
    { key: 'downpipe', title: 'Exhaust Downpipe (Spool & Flow)' },
    { key: 'intake', title: 'Air Intake & Filtration' },
    { key: 'chargepipe_intercooler', title: 'Chargepipe & Intercooler Cooling' },
    { key: 'fueling', title: 'High Pressure Fueling (HPFP / Flex Fuel)' },
    { key: 'turbo', title: 'Upgraded Turbocharger System' },
    { key: 'drivetrain', title: 'Drivetrain & Supporting Modifications' }
  ];

  return (
    <section className="panel-dark space-y-6 p-5 sm:p-6" aria-labelledby="build-path-title">
      <div className="space-y-2 border-b border-dark-border pb-4">
        <div className="flex flex-wrap items-center gap-3">
          <h2 id="build-path-title" className="h-section">Standard Calculated Build Path</h2>
          <span className="chip text-dark-muted">Stock Baseline Model</span>
        </div>
        <p className="text-[15px] text-dark-muted">
          Calculated identically for every stock vehicle. Check boxes to mark inventory you already own.
        </p>
      </div>

      {/* Path List by Category */}
      <ol className="space-y-8">
        {categories.map((cat, idx) => {
          const categoryParts = parts.filter(p => p.category === cat.key);
          if (categoryParts.length === 0) return null;

          // Check if user owns at least one part in this category
          const hasOwnedInCat = categoryParts.some(p => ownedPartIds.includes(p.id));

          return (
            <li key={cat.key} className="space-y-3">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <div className="op-label">OP {(idx + 1) * 10}</div>
                  <h3 className="font-bold text-on-dark">{cat.title}</h3>
                </div>
                <span className={`text-[13px] ${hasOwnedInCat ? 'status-recommended' : 'status-required'}`}>
                  {hasOwnedInCat ? 'Installed / Checked' : 'Gap in Path'}
                </span>
              </div>

              {/* List of parts in category */}
              <ul className="rows-dark border-y border-dark-border">
                {categoryParts.map((part) => {
                  const isChecked = ownedPartIds.includes(part.id);

                  return (
                    <li key={part.id} className="py-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        {/* Checkbox & Part Title */}
                        <div className="flex min-w-0 items-start gap-2">
                          <button
                            onClick={() => onTogglePartOwned(part.id)}
                            aria-pressed={isChecked}
                            aria-label={`${isChecked ? 'Unmark' : 'Mark'} ${part.name} as owned`}
                            className="icon-btn -ml-2.5 -mt-2.5 text-dark-muted hover:text-on-dark"
                          >
                            {isChecked ? (
                              <CheckSquare className="h-5 w-5 text-accent-bright" aria-hidden="true" />
                            ) : (
                              <Square className="h-5 w-5" aria-hidden="true" />
                            )}
                          </button>

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold text-on-dark">{part.name}</span>
                              <span className={`chip ${part.tier === 'expensive' ? 'text-anodize-bright' : 'text-dark-muted'}`}>{TIER_LABELS[part.tier]}</span>
                              {part.isSupportingMod && (
                                <span className="status-required text-[13px]">Required supporting mod</span>
                              )}
                            </div>

                            {/* Honest Verdict Line */}
                            <p className="mt-1.5 border-l-2 border-accent pl-3 text-[15px] font-medium italic text-on-dark">
                              "{part.verdict}"
                            </p>

                            <p className="mt-1.5 text-[15px] text-dark-muted">{part.description}</p>
                          </div>
                        </div>

                        {/* Price & Gains */}
                        <div className="flex shrink-0 flex-row flex-wrap items-baseline gap-x-3 pl-9 sm:flex-col sm:flex-nowrap sm:items-end sm:gap-0 sm:pl-0 sm:text-right">
                          <div className="num text-[18px] text-on-dark">${part.price}</div>
                          <div className="whitespace-nowrap text-[14px] text-dark-muted">+{part.whpGain} WHP gain</div>
                          <div className="whitespace-nowrap text-[14px] text-dark-muted">
                            Est. Labor: ${part.estLaborCost} ({part.installTimeHours}h)
                          </div>
                        </div>
                      </div>

                      {/* Part Action links & Care note */}
                      {(part.installGuideUrl || part.youtubeGuideUrl || part.careInstructions) && (
                        <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 pl-9 text-[14px]">
                          <div className="flex flex-wrap items-center gap-x-4">
                            {part.installGuideUrl && (
                              <a
                                href={part.installGuideUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="link text-dark-muted hover:text-on-dark"
                              >
                                <ExternalLink className="h-4 w-4" aria-hidden="true" />
                                <span>Install Guide</span>
                              </a>
                            )}
                            {part.youtubeGuideUrl && (
                              <a
                                href={part.youtubeGuideUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="link text-dark-muted hover:text-on-dark"
                              >
                                <Youtube className="h-4 w-4" aria-hidden="true" />
                                <span>YouTube Walkthrough</span>
                              </a>
                            )}
                          </div>

                          {part.careInstructions && (
                            <div className="well-dark flex items-center gap-2 px-2.5 py-1.5 text-dark-muted">
                              <Wrench className="h-4 w-4 shrink-0" aria-hidden="true" />
                              <span>{part.careInstructions}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>

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
                    className={`well-dark space-y-3 p-4 ${w.tier === 1 ? 'border-accent' : ''}`}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex items-start gap-2.5">
                        <AlertOctagon
                          className={`mt-0.5 h-5 w-5 shrink-0 ${w.tier === 1 ? 'text-accent-bright' : 'text-dark-muted'}`}
                          aria-hidden="true"
                        />
                        <div>
                          <div className="font-bold uppercase tracking-[0.5px] text-on-dark">
                            Tier {w.tier}: {w.title}
                          </div>
                          <p className="mt-1 text-[15px] text-dark-muted">{w.description}</p>
                        </div>
                      </div>

                      {/* Cost Contrast: Prevention vs Failure */}
                      <div className="shrink-0 whitespace-nowrap pl-7 text-[14px] sm:pl-0 sm:text-right">
                        <div className="text-on-dark">
                          Preventive: <span className="num">~${w.preventiveCost}</span>
                        </div>
                        <div className="text-accent-bright">
                          Failure: <span className="num">~${w.failureCost}</span>
                        </div>
                      </div>
                    </div>

                    {/* Evidence Source & Active Acknowledge Checkbox */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-dark-border pt-2">
                      <a
                        href={w.evidenceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="link text-[14px] text-dark-muted hover:text-on-dark"
                      >
                        <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
                        <span>Evidence: {w.evidenceSource}</span>
                      </a>

                      {w.tier === 1 && (
                        <button
                          onClick={() => onAcknowledgeWarning(w.id)}
                          aria-pressed={isAcknowledged}
                          className={`btn btn-sm ${isAcknowledged ? 'btn-ghost-dark' : 'btn-primary'}`}
                        >
                          <CheckSquare className="h-4 w-4" aria-hidden="true" />
                          <span>
                            {isAcknowledged ? 'Risk Decision Logged & Acknowledged' : 'Acknowledge "Will Break" Decision'}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </li>
          );
        })}
      </ol>
    </section>
  );
};
