import React, { useState } from 'react';
import { EngineId } from '../../types';
import { SOUND_CLIPS } from '../../data/soundClips';
import { Play, Square } from 'lucide-react';
import { PageHeader } from '../billet/PageHeader';

interface SoundHubProps {
  engineId: EngineId;
}

export const SoundHub: React.FC<SoundHubProps> = ({ engineId }) => {
  const [playingId, setPlayingId] = useState<string | null>(null);

  const engineClips = SOUND_CLIPS.filter(c => c.engineId === engineId || true);

  const handleTogglePlay = (id: string) => {
    if (playingId === id) {
      setPlayingId(null);
    } else {
      setPlayingId(id);

      // Web Audio API Synth Tone Simulation for exhaust note
      try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContext) {
          const ctx = new AudioContext();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = id.includes('catless') ? 'sawtooth' : 'triangle';
          osc.frequency.setValueAtTime(120, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(380, ctx.currentTime + 1.2);
          osc.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 2.5);

          gain.gain.setValueAtTime(0.15, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 2.5);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start();
          osc.stop(ctx.currentTime + 2.5);

          setTimeout(() => setPlayingId(null), 2500);
        }
      } catch (err) {
        setTimeout(() => setPlayingId(null), 2000);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <PageHeader
        eyebrow="Sound & exhaust"
        title="Sound & Exhaust Branch — Clips, Drone & CARB Legality"
        description="Sound is its own dedicated branch, not power-lite. Review decibel intensity, highway drone meters (1-5), and regional CARB emissions inspection compliance before picking exhaust hardware."
      />

      {/* Sound Cards Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {engineClips.map((clip) => {
          const isPlaying = playingId === clip.id;

          return (
            <article
              key={clip.id}
              className={`plate space-y-4 p-5 ${isPlaying ? 'outline outline-2 -outline-offset-2 outline-accent' : ''}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="etch text-[18px] font-bold leading-snug text-ink">{clip.title}</h2>
                  <p className="mt-0.5 text-[15px] text-text-2">{clip.setupDescription}</p>
                </div>

                <button
                  onClick={() => handleTogglePlay(clip.id)}
                  id={`play-sound-${clip.id}`}
                  aria-pressed={isPlaying}
                  aria-label={`${isPlaying ? 'Stop' : 'Play'} ${clip.title}`}
                  className={`icon-btn ${isPlaying ? 'bg-accent text-white' : 'bg-ink text-on-dark hover:bg-[#2a2e33]'}`}
                >
                  {isPlaying ? <Square className="h-5 w-5 fill-current" aria-hidden="true" /> : <Play className="ml-0.5 h-5 w-5 fill-current" aria-hidden="true" />}
                </button>
              </div>

              {/* Volume & Drone Indicators */}
              <dl className="grid grid-cols-1 gap-3 rounded-[3px] bg-ink p-3 text-on-dark sm:grid-cols-2">
                <div>
                  <dt className="label-ui text-dark-muted">Exhaust Volume</dt>
                  <dd className="mt-1 flex items-center gap-2">
                    <span className="flex gap-0.5" aria-hidden="true">
                      {[...Array(10)].map((_, i) => (
                        <span
                          key={i}
                          className={`h-3 w-1.5 ${i < clip.volumeRating ? 'bg-accent' : 'bg-dark-border'}`}
                        />
                      ))}
                    </span>
                    <span className="num text-[14px]">{clip.volumeRating}/10</span>
                  </dd>
                </div>

                <div>
                  <dt className="label-ui text-dark-muted">Cabin Highway Drone</dt>
                  <dd className="mt-1 flex items-center gap-2">
                    <span className="flex gap-0.5" aria-hidden="true">
                      {[...Array(5)].map((_, i) => (
                        <span
                          key={i}
                          className={`h-3 w-2 ${
                            i < clip.droneRating
                              ? (clip.droneRating >= 4 ? 'bg-accent' : 'bg-on-dark')
                              : 'bg-dark-border'
                          }`}
                        />
                      ))}
                    </span>
                    <span className="num text-[14px]">{clip.droneRating}/5</span>
                  </dd>
                </div>
              </dl>

              {/* CARB Legality Badge & Notes */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 text-[15px]">
                  <span className="text-text-2">Emissions Readiness:</span>
                  <span className={clip.carbCompliant ? 'chip bg-ink border-ink text-on-dark' : 'chip chip-accent'}>
                    {clip.carbCompliant ? 'CARB Legal / High Flow' : 'NOT CARB Legal (Off-Road)'}
                  </span>
                </div>

                <p className="well p-3 text-[15px] italic text-text-2">"{clip.notes}"</p>
              </div>

              {/* Dynamic Equalizer Bar Visualizer when playing */}
              {isPlaying && (
                <div className="flex h-8 items-end justify-between overflow-hidden rounded-[3px] bg-ink px-2 pt-1" aria-hidden="true">
                  {clip.audioFreqs?.map((freq, idx) => (
                    <div
                      key={idx}
                      className="w-2 bg-accent motion-safe:animate-bounce"
                      style={{
                        height: `${Math.min(100, Math.max(15, (freq / 1000) * 100))}%`,
                        animationDelay: `${idx * 0.08}s`
                      }}
                    />
                  ))}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
};
