import React from 'react';
import { PlatformId } from '../../types';
import { VETTED_TUNERS } from '../../data/tuners';
import { UserCheck, ExternalLink, ShieldCheck, Star, MapPin, Zap, Cpu } from 'lucide-react';

interface TunersListProps {
  platformId: PlatformId;
}

export const TunersList: React.FC<TunersListProps> = ({ platformId }) => {
  const filteredTuners = VETTED_TUNERS.filter(t => t.platformsSupported.includes(platformId));

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-2">
        <div className="flex items-center gap-2">
          <UserCheck className="w-6 h-6 text-red-500" />
          <h2 className="text-xl font-bold font-mono text-white uppercase tracking-wider">
            Tuning Strategy — Flash-At-Home vs Vetted Tuners
          </h2>
        </div>
        <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
          Flash-at-home (BM3, MHD, EcuTek OTS) when that's the honest answer; vetted local/remote custom tuner shortlist when custom hardware or high ethanol blends demand custom calibration.
        </p>
      </div>

      {/* Tuners Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredTuners.map((tuner) => (
          <div
            key={tuner.id}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-lg hover:border-slate-700 transition-all flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-1.5 text-xs text-amber-400 font-bold font-mono">
                    <Star className="w-3.5 h-3.5 fill-current" />
                    <span>{tuner.rating}</span>
                    <span className="text-slate-500">({tuner.reviewCount} reviews)</span>
                  </div>
                  <h3 className="font-bold text-base text-white mt-1 font-mono">{tuner.name}</h3>
                </div>

                {tuner.verifiedHandshake && (
                  <span className="text-[10px] font-mono bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded font-bold flex items-center gap-1 whitespace-nowrap">
                    <ShieldCheck className="w-3 h-3" />
                    <span>Vetted Handshake</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1 text-xs text-slate-400 font-mono">
                <MapPin className="w-3.5 h-3.5 text-red-400" />
                <span>{tuner.location}</span>
              </div>

              {/* Specialties */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block">
                  Calibrator Specialties:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {tuner.specialties.map((spec, i) => (
                    <span
                      key={i}
                      className="text-[11px] font-mono bg-slate-950 text-slate-300 border border-slate-800 px-2 py-0.5 rounded"
                    >
                      {spec}
                    </span>
                  ))}
                </div>
              </div>

              {/* Flash Platforms Supported */}
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block">
                  Flash Software Supported:
                </span>
                <div className="flex flex-wrap gap-1">
                  {tuner.flashSoftware.map((sw, i) => (
                    <span
                      key={i}
                      className="text-[10px] font-mono bg-red-950/60 text-red-300 border border-red-900/60 px-2 py-0.2 rounded"
                    >
                      {sw}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
              <span className="text-[11px] text-slate-500 font-mono">
                Direct Handshake List
              </span>
              <a
                href={tuner.contactUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl shadow-md transition-all font-mono flex items-center gap-1.5"
              >
                <span>Book Calibration</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
