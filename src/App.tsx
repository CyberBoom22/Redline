import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { VehicleSelection, UserFlowDoor, UserIntent } from './types';
import { PLATFORMS, DEFAULT_VEHICLE } from './data/platforms';
import { getPartsForEngine } from './data/parts';
import { getWarningsForBuild } from './data/warnings';

// Components
import { Header } from './components/Header';
import { PlatformSelectorModal } from './components/PlatformSelectorModal';
import { InstrumentCluster } from './components/BuildPlanner/InstrumentCluster';
import { DoorSelection } from './components/BuildPlanner/DoorSelection';
import { PowerGoalPicker } from './components/BuildPlanner/PowerGoalPicker';
import { BuildPath } from './components/BuildPlanner/BuildPath';
import { CompareSlider } from './components/BuildPlanner/CompareSlider';
import { WarningsPanel } from './components/BuildPlanner/WarningsPanel';
import { BuildSummaryModal } from './components/BuildSummaryModal';

// Tabs
import { PartsMarketplace } from './components/Marketplace/PartsMarketplace';
import { DynoTracker } from './components/DynoTracker/DynoTracker';
import { SoundHub } from './components/SoundHub/SoundHub';
import { PartsCare } from './components/PartsCare/PartsCare';
import { TunersList } from './components/Tuners/TunersList';

export default function App() {
  const [vehicle, setVehicle] = useState<VehicleSelection>(DEFAULT_VEHICLE);
  const [doorMode, setDoorMode] = useState<UserFlowDoor>('goal_first');
  const [intent, setIntent] = useState<UserIntent>('power');
  const [goalWhp, setGoalWhp] = useState<number>(500);

  // Default pre-checked inventory (e.g., stage 1 tune + dropin filter)
  const [ownedPartIds, setOwnedPartIds] = useState<string[]>([
    'b58_bootmod3',
    'b58_oem_filter_dropin'
  ]);

  const [acknowledgedWarningIds, setAcknowledgedWarningIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'planner' | 'marketplace' | 'dyno' | 'sound' | 'care' | 'tuners'>('planner');

  // Modals
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState<boolean>(false);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState<boolean>(false);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState<boolean>(false);

  // Engine Specs lookup
  const currentPlatform = PLATFORMS.find(p => p.id === vehicle.platformId) || PLATFORMS[0];
  const currentEngine = currentPlatform.engines.find(e => e.id === vehicle.engineId) || currentPlatform.engines[0];
  const stockWhp = currentEngine.stockWhp;
  const stockWtq = currentEngine.stockWtq;

  // Parts for current engine
  const engineParts = getPartsForEngine(vehicle.engineId);

  // Calculate stats
  const selectedOwnedParts = engineParts.filter(p => ownedPartIds.includes(p.id));
  const totalWhpGains = selectedOwnedParts.reduce((sum, p) => sum + p.whpGain, 0);
  const projectedWhp = stockWhp + totalWhpGains;

  const partsTotal = selectedOwnedParts.reduce((sum, p) => sum + p.price, 0);
  const supportingTotal = selectedOwnedParts.filter(p => p.isSupportingMod).reduce((sum, p) => sum + p.price, 0);
  const laborTotal = selectedOwnedParts.reduce((sum, p) => sum + p.estLaborCost, 0);

  const gapWhp = Math.max(0, goalWhp - projectedWhp);

  // Triggered warnings at highest power level between projected & target goal
  const warnings = getWarningsForBuild(vehicle.engineId, Math.max(projectedWhp, goalWhp));
  const unacknowledgedGatedWarnings = warnings.filter(w => w.tier === 1 && !acknowledgedWarningIds.includes(w.id));

  // Toggle part inventory state
  const handleTogglePartOwned = (partId: string) => {
    if (ownedPartIds.includes(partId)) {
      setOwnedPartIds(ownedPartIds.filter(id => id !== partId));
    } else {
      setOwnedPartIds([...ownedPartIds, partId]);
    }
  };

  // Toggle warning acknowledgment
  const handleAcknowledgeWarning = (warningId: string) => {
    if (acknowledgedWarningIds.includes(warningId)) {
      setAcknowledgedWarningIds(acknowledgedWarningIds.filter(id => id !== warningId));
    } else {
      setAcknowledgedWarningIds([...acknowledgedWarningIds, warningId]);
    }
  };

  const handleSelectVehicle = (newVehicle: VehicleSelection) => {
    setVehicle(newVehicle);
    const newPlatform = PLATFORMS.find(p => p.id === newVehicle.platformId)!;
    const newEngine = newPlatform.engines.find(e => e.id === newVehicle.engineId)!;
    setGoalWhp(newEngine.stockWhp + 110);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-red-600 selection:text-white">
      {/* Header Bar */}
      <Header
        vehicle={vehicle}
        onOpenVehicleModal={() => setIsVehicleModalOpen(true)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenSummaryModal={() => setIsSummaryModalOpen(true)}
      />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Main View Router */}
        {activeTab === 'planner' && (
          <div className="space-y-6">
            {/* Instrument Cluster Top Cockpit HUD */}
            <InstrumentCluster
              stockWhp={stockWhp}
              projectedWhp={projectedWhp}
              goalWhp={goalWhp}
              partsTotal={partsTotal}
              supportingTotal={supportingTotal}
              laborTotal={laborTotal}
              gapWhp={gapWhp}
              unacknowledgedGatedWarningsCount={unacknowledgedGatedWarnings.length}
              onOpenCompareSlider={() => setIsCompareModalOpen(true)}
              showCompareModal={isCompareModalOpen}
            />

            {/* Core User Flow Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Controls & Goal Selection */}
              <div className="space-y-6">
                <DoorSelection
                  doorMode={doorMode}
                  onSelectDoor={setDoorMode}
                />

                <PowerGoalPicker
                  stockWhp={stockWhp}
                  goalWhp={goalWhp}
                  onGoalWhpChange={setGoalWhp}
                  intent={intent}
                  onIntentChange={setIntent}
                />

                {/* Tiered Risk Warnings Panel */}
                <WarningsPanel
                  warnings={warnings}
                  acknowledgedIds={acknowledgedWarningIds}
                  onAcknowledgeWarning={handleAcknowledgeWarning}
                />
              </div>

              {/* Right Column (2 cols wide): The Standard Calculated Path */}
              <div className="lg:col-span-2">
                <BuildPath
                  parts={engineParts}
                  ownedPartIds={ownedPartIds}
                  onTogglePartOwned={handleTogglePartOwned}
                  warnings={warnings}
                  onAcknowledgeWarning={handleAcknowledgeWarning}
                  acknowledgedWarningIds={acknowledgedWarningIds}
                  goalWhp={goalWhp}
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Parts Catalog Marketplace */}
        {activeTab === 'marketplace' && (
          <PartsMarketplace
            engineId={vehicle.engineId}
            ownedPartIds={ownedPartIds}
            onTogglePartOwned={handleTogglePartOwned}
          />
        )}

        {/* Tab 3: Interactive Dyno Visualizer */}
        {activeTab === 'dyno' && (
          <DynoTracker
            vehicle={vehicle}
            stockWhp={stockWhp}
            stockWtq={stockWtq}
            projectedWhp={projectedWhp}
            goalWhp={goalWhp}
          />
        )}

        {/* Tab 4: Sound & Exhaust Branch */}
        {activeTab === 'sound' && (
          <SoundHub engineId={vehicle.engineId} />
        )}

        {/* Tab 5: Parts Care Ownership Layer */}
        {activeTab === 'care' && (
          <PartsCare
            engineId={vehicle.engineId}
            ownedPartIds={ownedPartIds}
          />
        )}

        {/* Tab 6: Vetted Tuner Network */}
        {activeTab === 'tuners' && (
          <TunersList platformId={vehicle.platformId} />
        )}
      </main>

      {/* Footer Disclaimer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-8 text-slate-500 text-xs font-mono">
        <div className="max-w-7xl mx-auto px-4 text-center space-y-2">
          <p className="max-w-3xl mx-auto leading-relaxed text-slate-400">
            <strong>THE DISCLAIMER:</strong> All build paths are calculated from a stock vehicle. Checking off mods you already have only marks your place on that path — it doesn't change the path, recalculate for your specific car, or account for its condition, history, or mileage. You'll still see every step and every precaution, whether you've done it or not. This is reference information, not advice for your individual vehicle.
          </p>
          <p className="text-[10px] text-slate-600 pt-2">
            STAGE0 v0.2 · BMW B58 & Infiniti VQ/VR Pilot Edition · Confidential Reference Information
          </p>
          {/* Operator entry point. Deliberately plain: hiding the URL is not a
              control, and pretending otherwise invites treating it as one. The
              gate is Row Level Security, which returns nothing to anyone who is
              not the administrator, whether or not they find this link. */}
          <p className="pt-1">
            <Link
              to="/admin/login"
              className="text-[10px] text-slate-700 hover:text-slate-500 font-mono uppercase tracking-widest transition-colors"
            >
              Operator sign in
            </Link>
          </p>
        </div>
      </footer>

      {/* Modals */}
      <PlatformSelectorModal
        isOpen={isVehicleModalOpen}
        onClose={() => setIsVehicleModalOpen(false)}
        vehicle={vehicle}
        onSelectVehicle={handleSelectVehicle}
      />

      <BuildSummaryModal
        isOpen={isSummaryModalOpen}
        onClose={() => setIsSummaryModalOpen(false)}
        vehicle={vehicle}
        goalWhp={goalWhp}
        projectedWhp={projectedWhp}
        parts={engineParts}
        ownedPartIds={ownedPartIds}
        warnings={warnings}
        acknowledgedWarningIds={acknowledgedWarningIds}
      />

      <CompareSlider
        isOpen={isCompareModalOpen}
        onClose={() => setIsCompareModalOpen(false)}
        engineId={vehicle.engineId}
        stockWhp={stockWhp}
      />
    </div>
  );
}
