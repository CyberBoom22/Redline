import React, { useState } from 'react';
import { EngineId } from '../../types';
import { SOUND_CLIPS } from '../../data/soundClips';
import { Volume2, Play, Square, ShieldAlert, VolumeX, AlertTriangle, Radio } from 'lucide-react';

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
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-2">
        <div className="flex items-center gap-2">
          <Volume2 className="w-6 h-6 text-red-500" />
          <h2 className="text-xl font-bold font-mono text-white uppercase tracking-wider">
            Sound & Exhaust Branch — Clips, Drone & CARB Legality
          </h2>
        </div>
        <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
          Sound is its own dedicated branch, not power-lite. Review decibel intensity, highway drone meters (1-5), and regional CARB emissions inspection compliance before picking exhaust hardware.
        </p>
      </div>

      {/* Sound Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {engineClips.map((clip) => {
          const isPlaying = playingId === clip.id;

          return (
            <div
              key={clip.id}
              className={`p-5 rounded-2xl border space-y-4 transition-all bg-slate-900 ${
                isPlaying ? 'border-red-500 ring-1 ring-red-500/50 shadow-2xl' : 'border-slate-800'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold text-base text-white font-mono">{clip.title}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">{clip.setupDescription}</p>
                </div>

                <button
                  onClick={() => handleTogglePlay(clip.id)}
                  id={`play-sound-${clip.id}`}
                  className={`p-3 rounded-xl border flex items-center justify-center transition-all ${
                    isPlaying
                      ? 'bg-red-600 text-white border-red-500 shadow-lg animate-pulse'
                      : 'bg-slate-950 hover:bg-slate-800 text-red-400 border-slate-800'
                  }`}
                >
                  {isPlaying ? <Square className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                </button>
              </div>

              {/* Volume & Drone Indicators */}
              <div className="grid grid-cols-2 gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs font-mono">
                <div>
                  <div className="text-slate-400 text-[10px] uppercase">Exhaust Volume</div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <div className="flex gap-0.5">
                      {[...Array(10)].map((_, i) => (
                        <div
                          key={i}
                          className={`w-1.5 h-3 rounded-xs ${
                            i < clip.volumeRating ? 'bg-red-500' : 'bg-slate-800'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="font-bold text-slate-200">{clip.volumeRating}/10</span>
                  </div>
                </div>

                <div>
                  <div className="text-slate-400 text-[10px] uppercase">Cabin Highway Drone</div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <div className="flex gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <div
                          key={i}
                          className={`w-2 h-3 rounded-xs ${
                            i < clip.droneRating 
                              ? (clip.droneRating >= 4 ? 'bg-red-500' : 'bg-amber-400') 
                              : 'bg-slate-800'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="font-bold text-slate-200">{clip.droneRating}/5</span>
                  </div>
                </div>
              </div>

              {/* CARB Legality Badge & Notes */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400">Emissions Readiness:</span>
                  <span className={`px-2 py-0.5 rounded font-bold ${
                    clip.carbCompliant 
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' 
                      : 'bg-red-950 text-red-400 border border-red-800'
                  }`}>
                    {clip.carbCompliant ? 'CARB Legal / High Flow' : 'NOT CARB Legal (Off-Road)'}
                  </span>
                </div>

                <p className="text-xs text-slate-300 italic bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
                  "{clip.notes}"
                </p>
              </div>

              {/* Dynamic Equalizer Bar Visualizer when playing */}
              {isPlaying && (
                <div className="flex items-end justify-between h-8 px-2 bg-slate-950 rounded-lg border border-red-900/40 overflow-hidden pt-1">
                  {clip.audioFreqs?.map((freq, idx) => (
                    <div
                      key={idx}
                      className="w-2 bg-red-500 rounded-t-xs animate-bounce"
                      style={{
                        height: `${Math.min(100, Math.max(15, (freq / 1000) * 100))}%`,
                        animationDelay: `${idx * 0.08}s`
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
