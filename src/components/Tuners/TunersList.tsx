import React from 'react';
import { PlatformId } from '../../types';
import { VETTED_TUNERS } from '../../data/tuners';
import { ExternalLink, ShieldCheck, Star, MapPin } from 'lucide-react';
import { PageHeader } from '../billet/PageHeader';

interface TunersListProps {
  platformId: PlatformId;
}

export const TunersList: React.FC<TunersListProps> = ({ platformId }) => {
  const filteredTuners = VETTED_TUNERS.filter(t => t.platformsSupported.includes(platformId));

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <PageHeader
        eyebrow="Vetted tuners"
        title="Tuning Strategy — Flash-At-Home vs Vetted Tuners"
        description="Flash-at-home (BM3, MHD, EcuTek OTS) when that's the honest answer; vetted local/remote custom tuner shortlist when custom hardware or high ethanol blends demand custom calibration."
      />

      {/* Tuners Cards Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {filteredTuners.map((tuner) => (
          <article key={tuner.id} className="plate flex flex-col justify-between gap-4 p-5">
            <div className="space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-[15px] text-text-2">
                    <Star className="h-4 w-4 fill-current text-ink" aria-hidden="true" />
                    <span className="num text-ink">{tuner.rating}</span>
                    <span>({tuner.reviewCount} reviews)</span>
                  </div>
                  <h2 className="etch mt-1 text-[18px] font-bold leading-snug text-ink">{tuner.name}</h2>
                </div>

                {tuner.verifiedHandshake && (
                  <span className="chip bg-ink border-ink text-on-dark">
                    <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Vetted Handshake</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 text-[15px] text-text-2">
                <MapPin className="h-4 w-4 shrink-0 text-accent-deep" aria-hidden="true" />
                <span>{tuner.location}</span>
              </div>

              {/* Specialties */}
              <div className="space-y-1.5">
                <h3 className="label-ui text-text-3">Calibrator Specialties:</h3>
                <ul className="flex flex-wrap gap-1.5">
                  {tuner.specialties.map((spec, i) => (
                    <li key={i} className="well px-2 py-0.5 text-[14px] text-text-2">
                      {spec}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Flash Platforms Supported */}
              <div className="space-y-1.5">
                <h3 className="label-ui text-text-3">Flash Software Supported:</h3>
                <ul className="flex flex-wrap gap-1.5">
                  {tuner.flashSoftware.map((sw, i) => (
                    <li key={i} className="chip text-ink">
                      {sw}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-black/15 pt-3">
              <span className="label-ui text-text-3">Direct Handshake List</span>
              <a
                href={tuner.contactUrl}
                target="_blank"
                rel="noreferrer"
                className="btn btn-primary btn-sm"
              >
                <span>Book Calibration</span>
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};
