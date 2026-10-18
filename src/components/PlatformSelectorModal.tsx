import React, { useState } from 'react';
import { VehicleSelection, PlatformId, EngineId } from '../types';
import { PLATFORMS, TRANSMISSIONS } from '../data/platforms';
import { normalizeVin, validateVin } from '../lib/vin';
import { Check, Search, AlertCircle } from 'lucide-react';
import { Modal } from './ui/Modal';
import { ModalBar } from './billet/ModalBar';

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
      header={<ModalBar title="Select Your Engine & Platform" onClose={onClose} />}
      footer={
        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-black/15 px-5 py-3 sm:px-6">
          <button onClick={onClose} className="btn btn-outline btn-sm">
            Cancel
          </button>
          <button onClick={handleSave} id="confirm-vehicle-btn" className="btn btn-primary btn-sm">
            Confirm Platform Selection
          </button>
        </div>
      }
    >
      {/* The shell caps the panel height and scrolls this body, so no local
          max-h belongs here. */}
      <div className="space-y-6 p-5 sm:p-6">
        {/* VIN Decoder Quick Option */}
        <div className="well space-y-2 p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <label htmlFor="vin-input" className="field-label mb-0 flex items-center gap-1.5">
              <Search className="h-3.5 w-3.5 text-accent-deep" aria-hidden="true" />
              <span>VIN Decode (Tap-Selector Shortcut)</span>
            </label>
            <span className="text-[14px] text-text-3">BMW WBA... or Infiniti JN1...</span>
          </div>
          <form onSubmit={handleVinLookup} className="flex flex-col gap-2 sm:flex-row">
            <input
              id="vin-input"
              type="text"
              value={vinInput}
              onChange={(e) => setVinInput(e.target.value)}
              placeholder="Enter VIN (e.g. WBA5R3G09M... or JN1CV7AP...)"
              aria-describedby={vinError || vinWarning ? 'vin-feedback' : undefined}
              className="field flex-1 uppercase"
            />
            <button type="submit" className="btn btn-secondary btn-sm">
              Decode VIN
            </button>
          </form>
          <div id="vin-feedback" aria-live="polite">
            {vinError && (
              <p className="mt-1 flex items-start gap-1.5 text-[15px] font-semibold text-accent-deep">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{vinError}</span>
              </p>
            )}
            {vinWarning && <p className="mt-2 text-[15px] font-semibold text-text-2">{vinWarning}</p>}
          </div>
        </div>

        {/* Platform Step 1: Pick Platform Family */}
        <fieldset>
          <legend className="field-label">1. Platform Family</legend>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {PLATFORMS.map((plat) => {
              const isSelected = selectedPlatform === plat.id;
              return (
                <button
                  type="button"
                  key={plat.id}
                  onClick={() => handlePlatformChange(plat.id)}
                  aria-pressed={isSelected}
                  className="toggle flex-col items-stretch p-4 text-left"
                >
                  <span className="flex items-start justify-between gap-2">
                    <span className="font-bold">{plat.name}</span>
                    {isSelected && <Check className="h-4 w-4 shrink-0 text-accent-bright" aria-hidden="true" />}
                  </span>
                  <span className={`line-clamp-2 text-[14px] font-normal ${isSelected ? 'text-dark-muted' : 'text-text-2'}`}>
                    {plat.description}
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>

        {/* Step 2: Engine Variant */}
        <fieldset>
          <legend className="field-label">2. Engine Variant</legend>
          <div className="space-y-2">
            {currentPlatformObj.engines.map((eng) => {
              const isSelected = selectedEngine === eng.id;
              return (
                <button
                  type="button"
                  key={eng.id}
                  onClick={() => {
                    setSelectedEngine(eng.id);
                    setSelectedChassis(eng.chassisList[0]);
                    setSelectedTrim(eng.trims[0]);
                  }}
                  aria-pressed={isSelected}
                  className="toggle w-full justify-between p-3.5 text-left"
                >
                  <span>
                    <span className="block font-bold">{eng.name}</span>
                    <span className={`mt-0.5 block text-[14px] font-normal ${isSelected ? 'text-dark-muted' : 'text-text-2'}`}>
                      Stock: <span className="font-bold">{eng.stockWhp} WHP</span> / {eng.stockWtq} WTQ @ {eng.stockBoostPsi} PSI boost
                    </span>
                  </span>
                  {isSelected && <Check className="h-4 w-4 shrink-0 text-accent-bright" aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        </fieldset>

        {/* Step 3: Chassis & Trim */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="chassis-select" className="field-label">
              Chassis
            </label>
            <select
              id="chassis-select"
              value={selectedChassis}
              onChange={(e) => setSelectedChassis(e.target.value)}
              className="field"
            >
              {currentEngineObj.chassisList.map((ch) => (
                <option key={ch} value={ch}>{ch}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="trim-select" className="field-label">
              Trim Level
            </label>
            <select
              id="trim-select"
              value={selectedTrim}
              onChange={(e) => setSelectedTrim(e.target.value)}
              className="field"
            >
              {currentEngineObj.trims.map((tm) => (
                <option key={tm} value={tm}>{tm}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Step 4: Transmission */}
        <fieldset>
          <legend className="field-label">Transmission</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {TRANSMISSIONS.map((trans) => (
              <button
                type="button"
                key={trans}
                onClick={() => setTransmission(trans)}
                aria-pressed={transmission === trans}
                className="toggle justify-center text-center text-[14px]"
              >
                {trans}
              </button>
            ))}
          </div>
        </fieldset>
      </div>
    </Modal>
  );
};
