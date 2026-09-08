import React, { useState } from 'react';
import { VehicleSelection, PlatformId, EngineId } from '../types';
import { PLATFORMS } from '../data/platforms';
import { normalizeVin, validateVin } from '../lib/vin';
import { X, Check, Car, Cpu, Search, AlertCircle } from 'lucide-react';
import { Modal } from './ui/Modal';

interface PlatformSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicle: VehicleSelection;
  onSelectVehicle: (v: VehicleSelection) => void;
}

export const PlatformSelectorModal: React.FC<PlatformSelectorModalProps> = ({
  isOpen,
  onClose,
  vehicle,
  onSelectVehicle
}) => {
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformId>(vehicle.platformId);
  const [selectedEngine, setSelectedEngine] = useState<EngineId>(vehicle.engineId);
  const [selectedChassis, setSelectedChassis] = useState<string>(vehicle.chassis);
  const [selectedTrim, setSelectedTrim] = useState<string>(vehicle.trim);
  const [transmission, setTransmission] = useState<VehicleSelection['transmission']>(vehicle.transmission);
  const [vinInput, setVinInput] = useState<string>(vehicle.vin || '');
  const [vinError, setVinError] = useState<string | null>(null);
  const [vinWarning, setVinWarning] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentPlatformObj = PLATFORMS.find(p => p.id === selectedPlatform)!;
  const currentEngineObj = currentPlatformObj.engines.find(e => e.id === selectedEngine) || currentPlatformObj.engines[0];

  const handlePlatformChange = (pId: PlatformId) => {
    setSelectedPlatform(pId);
    const newPlatformObj = PLATFORMS.find(p => p.id === pId)!;
    const defaultEng = newPlatformObj.engines[0];
    setSelectedEngine(defaultEng.id);
    setSelectedChassis(defaultEng.chassisList[0]);
    setSelectedTrim(defaultEng.trims[0]);
  };

  const handleVinLookup = (e: React.FormEvent) => {
    e.preventDefault();
    setVinError(null);
    setVinWarning(null);
    const cleanVin = normalizeVin(vinInput);
    if (!cleanVin || cleanVin.length < 5) {
      setVinError('Please enter at least 5 characters of your VIN (e.g., WBA5R... or JN1CV...)');
      return;
    }

    // A partial entry is still a useful shortcut, so prefix decoding is left
    // alone. Once the input is VIN-length, it is validated properly: format
    // errors block, a failed check digit only warns.
    if (cleanVin.length === 17) {
      const result = validateVin(cleanVin);
      if (!result.ok) {
        setVinError(result.error);
        return;
      }
      setVinWarning(result.warning);
    }

    // Attempt VIN decode logic matching platform VIN prefixes
    for (const plat of PLATFORMS) {
      for (const eng of plat.engines) {
        if (eng.vinPrefixes.some(prefix => cleanVin.startsWith(prefix))) {
          setSelectedPlatform(plat.id);
          setSelectedEngine(eng.id);
          setSelectedChassis(eng.chassisList[0]);
          setSelectedTrim(eng.trims[0]);
          setVinError(null);
          return;
        }
      }
    }

    setVinError('VIN pattern not recognised for current B58 or VQ/VR pilot platforms. Automatically defaulted to nearest match.');
  };

  const handleSave = () => {
    onSelectVehicle({
      platformId: selectedPlatform,
      engineId: selectedEngine,
      chassis: selectedChassis,
      trim: selectedTrim,
      year: 2021,
      transmission,
      vin: vinInput
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-2xl"
      backdropClassName="bg-slate-950/80"
      header={
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-2.5">
            <Car className="w-5 h-5 text-red-500" />
            <h2 className="text-lg font-bold font-mono tracking-wide text-white uppercase">
              Select Your Engine & Platform
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      }
      footer={
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-800 bg-slate-950">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            id="confirm-vehicle-btn"
            className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-red-900/40 transition-all border border-red-500/40"
          >
            Confirm Platform Selection
          </button>
        </div>
      }
    >
      {/* The shell caps the panel height and scrolls this body, so no local
          max-h belongs here. */}
      <div className="p-6 space-y-6">
          {/* VIN Decoder Quick Option */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
                <Search className="w-3.5 h-3.5 text-red-400" />
                <span>VIN Decode (Tap-Selector Shortcut)</span>
              </label>
              <span className="text-[10px] text-slate-400">BMW WBA... or Infiniti JN1...</span>
            </div>
            <form onSubmit={handleVinLookup} className="flex gap-2">
              <input
                type="text"
                value={vinInput}
                onChange={(e) => setVinInput(e.target.value)}
                placeholder="Enter VIN (e.g. WBA5R3G09M... or JN1CV7AP...)"
                className="flex-1 bg-slate-900 border border-slate-750 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500 font-mono uppercase"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-lg transition-all border border-slate-700"
              >
                Decode VIN
              </button>
            </form>
            {vinError && (
              <p className="text-[11px] text-amber-400 flex items-center gap-1 mt-1">
                <AlertCircle className="w-3 h-3" />
                <span>{vinError}</span>
              </p>
            )}
            {vinWarning && (
              <p className="text-[11px] text-amber-400 mt-2 leading-relaxed">{vinWarning}</p>
            )}
          </div>

          {/* Platform Step 1: Pick Platform Family */}
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
              1. Platform Family
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PLATFORMS.map((plat) => {
                const isSelected = selectedPlatform === plat.id;
                return (
                  <button
                    key={plat.id}
                    onClick={() => handlePlatformChange(plat.id)}
                    className={`p-4 rounded-xl text-left border transition-all ${
                      isSelected
                        ? 'bg-red-950/30 border-red-500 text-white ring-1 ring-red-500/50'
                        : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono font-bold text-sm text-slate-100">{plat.name}</span>
                      {isSelected && <Check className="w-4 h-4 text-red-500" />}
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-2">{plat.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Engine Variant */}
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
              2. Engine Variant
            </label>
            <div className="space-y-2">
              {currentPlatformObj.engines.map((eng) => {
                const isSelected = selectedEngine === eng.id;
                return (
                  <button
                    key={eng.id}
                    onClick={() => {
                      setSelectedEngine(eng.id);
                      setSelectedChassis(eng.chassisList[0]);
                      setSelectedTrim(eng.trims[0]);
                    }}
                    className={`w-full p-3.5 rounded-xl text-left border flex items-center justify-between transition-all ${
                      isSelected
                        ? 'bg-red-950/40 border-red-500 text-white'
                        : 'bg-slate-950/40 border-slate-800 text-slate-300 hover:bg-slate-850'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-sm text-slate-100">{eng.name}</div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        Stock: <span className="text-red-400 font-mono font-bold">{eng.stockWhp} WHP</span> / <span className="text-slate-300 font-mono">{eng.stockWtq} WTQ</span> @ {eng.stockBoostPsi} PSI boost
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-red-500" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 3: Chassis & Trim */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                Chassis
              </label>
              <select
                value={selectedChassis}
                onChange={(e) => setSelectedChassis(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-red-500 font-medium"
              >
                {currentEngineObj.chassisList.map((ch) => (
                  <option key={ch} value={ch}>{ch}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                Trim Level
              </label>
              <select
                value={selectedTrim}
                onChange={(e) => setSelectedTrim(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-red-500 font-medium"
              >
                {currentEngineObj.trims.map((tm) => (
                  <option key={tm} value={tm}>{tm}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Step 4: Transmission */}
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
              Transmission
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              {(['ZF8 Speed Auto', '6-Speed Manual', '7-Speed Auto', 'DCT'] as const).map((trans) => (
                <button
                  key={trans}
                  onClick={() => setTransmission(trans)}
                  className={`py-2 px-3 rounded-lg border font-medium text-center transition-all ${
                    transmission === trans
                      ? 'bg-red-950/60 border-red-500 text-white font-bold'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {trans}
                </button>
              ))}
            </div>
          </div>
      </div>
    </Modal>
  );
};
