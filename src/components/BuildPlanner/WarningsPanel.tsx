import React from 'react';
import { TieredWarning } from '../../types';
import { ShieldAlert, ExternalLink, CheckSquare, Square } from 'lucide-react';

interface WarningsPanelProps {
  warnings: TieredWarning[];
  acknowledgedIds: string[];
  onAcknowledgeWarning: (id: string) => void;
}

const TIER_CONFIG = {
  1: { badge: 'TIER 1 · WILL BREAK (Deterministic - Gated)', badgeClass: 'chip chip-accent', cardClass: 'border-accent' },
  2: { badge: 'TIER 2 · SHORTENS LIFE (Probabilistic Wear)', badgeClass: 'chip bg-ink border-ink text-on-dark', cardClass: '' },
  3: { badge: 'TIER 3 · KNOW THIS (Informational / CARB)', badgeClass: 'chip text-text-3', cardClass: '' },
} as const;

export const WarningsPanel: React.FC<WarningsPanelProps> = ({
  warnings,
  acknowledgedIds,
  onAcknowledgeWarning
}) => {
  if (warnings.length === 0) {
    return (
      <section className="plate space-y-2 p-6 text-center">
        <ShieldAlert className="mx-auto h-6 w-6 text-text-3" aria-hidden="true" />
        <h2 className="h-section etch text-ink">Zero High-Risk Warnings At Current Power Level</h2>
        <p className="mx-auto max-w-md text-[16px] text-text-2">
          Your target WHP is well within OEM safety margins. Standard scheduled maintenance applies.
        </p>
      </section>
    );
  }

  return (
    <section className="plate space-y-5 p-5">
      <div className="space-y-1 border-b border-black/15 pb-3">
        <div className="flex items-start gap-2">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-accent-deep" aria-hidden="true" />
          <h2 className="h-section etch text-ink">Tiered Risk Warnings &amp; Consequence Pricing</h2>
        </div>
        <span className="label-ui text-text-3">PRD Section 02 &amp; 04</span>
      </div>

      <div className="space-y-4">
        {warnings.map((w) => {
          const isAcknowledged = acknowledgedIds.includes(w.id);
          const tierConfig = TIER_CONFIG[w.tier];

          return (
            <article key={w.id} className={`well space-y-3 p-4 ${tierConfig.cardClass}`}>
              <span className={`${tierConfig.badgeClass} whitespace-normal`}>{tierConfig.badge}</span>

              <div>
                <h3 className="font-bold text-ink">{w.title}</h3>
                <p className="mt-1 text-[15px] text-text-2">{w.description}</p>
              </div>

              {/* Dollar Cost attached: Prevention vs Failure */}
              <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-[3px] bg-dark-border text-on-dark">
                <div className="bg-ink px-3 py-2">
                  <dt className="label-ui text-dark-muted">Preventive</dt>
                  <dd className="num text-[16px]">~${w.preventiveCost}</dd>
                </div>
                <div className="bg-ink px-3 py-2">
                  <dt className="label-ui text-dark-muted">Engine failure</dt>
                  <dd className="num text-[16px] text-accent-bright">~${w.failureCost}</dd>
                </div>
              </dl>

              {/* Real Evidence Citation Link Out & Acknowledgment Gate */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-black/15 pt-2">
                <a
                  href={w.evidenceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="link text-[14px] text-text-2 hover:text-ink"
                >
                  <ExternalLink className="h-4 w-4 shrink-0 text-accent-deep" aria-hidden="true" />
                  <span>Evidence: {w.evidenceSource}</span>
                </a>

                {w.tier === 1 && (
                  <button
                    onClick={() => onAcknowledgeWarning(w.id)}
                    aria-pressed={isAcknowledged}
                    className={`btn btn-sm ${isAcknowledged ? 'btn-secondary' : 'btn-primary'}`}
                  >
                    {isAcknowledged ? (
                      <>
                        <CheckSquare className="h-4 w-4" aria-hidden="true" />
                        <span>Acknowledged & Logged</span>
                      </>
                    ) : (
                      <>
                        <Square className="h-4 w-4" aria-hidden="true" />
                        <span>Acknowledge Risk Before Building</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};
